import type { RetrievedChunk } from './retrieval.js';

export interface VectorSearchOptions {
    readonly limit: number;
}

/** Compatibility alias for vector-store callers; retrieval exposes the same domain result. */
export type VectorSearchResult = RetrievedChunk;
