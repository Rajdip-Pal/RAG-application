import type { Document as LangChainDocument } from '@langchain/core/documents';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';

import type { Document, DocumentMetadata } from './Document.js';

export function toDocument(source: LangChainDocument): Document {
    const sourcePath = typeof source.metadata.source === 'string' ? source.metadata.source : 'unknown';
    const metadata: DocumentMetadata = {
        ...source.metadata,
        source: sourcePath,
        fileName: basename(sourcePath),
        mimeType: 'text/markdown',
    };

    return {
        id: createHash('sha256').update(`${sourcePath}\n${source.pageContent}`).digest('hex'),
        content: source.pageContent,
        metadata,
    };
}
