import type { Document as LangChainDocument } from '@langchain/core/documents';
import { basename, extname } from 'node:path';
import { createHash } from 'node:crypto';

import type { Document, DocumentMetadata } from './Document.js';

export function toDocument(source: LangChainDocument): Document {
    const sourcePath = typeof source.metadata.source === 'string' ? source.metadata.source : 'unknown';
    const metadata: DocumentMetadata = {
        ...source.metadata,
        source: sourcePath,
        fileName: basename(sourcePath),
        mimeType: typeof source.metadata.mimeType === 'string' ? source.metadata.mimeType : mimeTypeFor(sourcePath),
    };

    return {
        id: createHash('sha256').update(`${sourcePath}\n${source.pageContent}`).digest('hex'),
        content: source.pageContent,
        metadata,
    };
}

function mimeTypeFor(source: string): string {
    return extname(source).toLowerCase() === '.txt' ? 'text/plain' : 'text/markdown';
}
