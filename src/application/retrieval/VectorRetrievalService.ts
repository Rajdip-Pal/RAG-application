import type { EmbeddingProvider } from '../../core/interfaces/EmbeddingProvider.js';
import type { VectorStore } from '../../core/interfaces/VectorStore.js';
import type { VectorSearchOptions, VectorSearchResult } from '../../core/types/vector-search.js';

export class VectorRetrievalService {
    public constructor(
        private readonly embeddingProvider: EmbeddingProvider,
        private readonly vectorStore: VectorStore,
    ) {}

    public async search(query: string, options: VectorSearchOptions): Promise<VectorSearchResult[]> {
        const embedding = await this.embeddingProvider.embed(query);
        return this.vectorStore.search(embedding, options);
    }
}
