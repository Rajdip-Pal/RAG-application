import type { DocumentChunk } from '../../chunking/core/document-chunk.js';

export interface EmbeddedChunk {
    readonly chunk: DocumentChunk;
    readonly embedding: readonly number[];
}
