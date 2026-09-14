import type { DocumentChunk } from '../../chunking/core/document-chunk.js';

export interface RetrievalOptions {
    readonly topK?: number;
    readonly minScore?: number;
}

/** A retrieved chunk with a cosine similarity score; higher scores are more relevant. */
export interface RetrievedChunk {
    readonly chunk: DocumentChunk;
    readonly score: number;
}
