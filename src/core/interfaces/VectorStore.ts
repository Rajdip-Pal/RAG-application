import type { EmbeddedChunk } from '../types/embedded-chunk.js';
import type { VectorSearchOptions, VectorSearchResult } from '../types/vector-search.js';

export interface VectorStore {
    upsert(chunks: readonly EmbeddedChunk[]): Promise<void>;

    search(embedding: readonly number[], options: VectorSearchOptions): Promise<VectorSearchResult[]>;
}
