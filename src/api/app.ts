import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

import type { DocumentIngestionService } from '../application/ingestion/DocumentIngestionService.js';
import type { RagService } from '../application/rag/RagService.js';
import { EmbeddingProviderError } from '../errors/EmbeddingErrors.js';
import { InvalidRagQueryError } from '../errors/RagErrors.js';
import { VectorStoreError } from '../errors/VectorStoreErrors.js';
import { ApiValidationError } from './errors.js';
import { registerDocumentsRoute } from './routes/documents.js';
import { registerHealthRoute } from './routes/health.js';
import { registerQueryRoute } from './routes/query.js';

export interface ApiDependencies {
    readonly ragService: Pick<RagService, 'answer'>;
    readonly ingestionService: Pick<DocumentIngestionService, 'ingest'>;
}

export function createApp(dependencies: ApiDependencies): FastifyInstance {
    const app = Fastify({ logger: false });
    app.register(multipart, { limits: { files: 1, fileSize: 10 * 1024 * 1024 } });

    registerHealthRoute(app);
    registerQueryRoute(app, dependencies.ragService);
    registerDocumentsRoute(app, dependencies.ingestionService);

    app.setErrorHandler((error, request, reply) => {
        const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
        const message = error instanceof Error ? error.message : 'Request failed.';
        const validationError =
            error instanceof ApiValidationError || error instanceof InvalidRagQueryError || errorCode === 'FST_ERR_VALIDATION';
        const dependencyError = error instanceof EmbeddingProviderError || error instanceof VectorStoreError;
        const statusCode = validationError ? 400 : dependencyError ? 503 : 500;
        if (statusCode >= 500) request.log.error(error);
        return reply.code(statusCode).send({
            error: statusCode === 500 ? 'Internal server error' : message,
        });
    });

    return app;
}
