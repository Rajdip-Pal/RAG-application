import type { DocumentChunk } from '../../chunking/core/document-chunk.js';

export interface VectorSearchOptions {
    readonly limit: number;
}

/** Cosine similarity score: higher values indicate a more similar chunk. */
export interface VectorSearchResult {
    readonly chunk: DocumentChunk;
    readonly score: number;
}
