import { basename, extname, join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { FastifyInstance } from 'fastify';

import type { DocumentIngestionService } from '../../application/ingestion/DocumentIngestionService.js';
import { ApiValidationError } from '../errors.js';

export function registerDocumentsRoute(app: FastifyInstance, ingestionService: Pick<DocumentIngestionService, 'ingest'>): void {
    app.post('/documents', async (request, reply) => {
        let upload;
        try {
            upload = await request.file();
        } catch {
            throw new ApiValidationError('A valid multipart Markdown or TXT file upload is required.');
        }
        if (!upload) throw new ApiValidationError('A Markdown or TXT file upload is required.');

        const fileName = basename(upload.filename);
        const extension = extname(fileName).toLowerCase();
        if (extension !== '.md' && extension !== '.markdown' && extension !== '.txt') {
            throw new ApiValidationError('Only .md, .markdown, and .txt files are supported.');
        }

        const temporaryDirectory = await mkdtemp(join(tmpdir(), 'rag-upload-'));
        const temporaryPath = join(temporaryDirectory, fileName);
        try {
            await writeFile(temporaryPath, await upload.toBuffer());
            const chunks = await ingestionService.ingest(temporaryPath, {
                source: fileName,
                fileName,
                mimeType: upload.mimetype,
            });
            return reply.code(201).send({ ingested: true, fileName, chunks: chunks.length });
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
        }
    });
}
