import { DEFAULT_RETRIEVAL_TOP_K } from '../../constants/retrieval.js';
import type { EmbeddingProvider } from '../../core/interfaces/EmbeddingProvider.js';
import type { Retriever } from '../../core/interfaces/Retriever.js';
import type { VectorStore } from '../../core/interfaces/VectorStore.js';
import type { RetrievedChunk, RetrievalOptions } from '../../core/types/retrieval.js';
import { InvalidRetrievalQueryError } from '../../errors/RetrievalErrors.js';

export class VectorRetrievalService implements Retriever {
    public constructor(
        private readonly embeddingProvider: EmbeddingProvider,
        private readonly vectorStore: VectorStore,
    ) {}

    public async retrieve(query: string, options: RetrievalOptions = {}): Promise<RetrievedChunk[]> {
        if (!query.trim()) {
            throw new InvalidRetrievalQueryError('Retrieval query must not be empty.');
        }
        const topK = options.topK ?? DEFAULT_RETRIEVAL_TOP_K;
        validateTopK(topK);
        if (options.minScore !== undefined && !Number.isFinite(options.minScore)) {
            throw new InvalidRetrievalQueryError('Retrieval minScore must be a finite number.');
        }
        const embedding = await this.embeddingProvider.embed(query);
        if (embedding.length !== this.embeddingProvider.dimensions || !embedding.every(Number.isFinite)) {
            throw new InvalidRetrievalQueryError(`Query embedding must contain ${this.embeddingProvider.dimensions} finite numbers.`);
        }
        const results = await this.vectorStore.search(embedding, { limit: topK });
        return results.filter((result) => options.minScore === undefined || result.score >= options.minScore);
    }
}

function validateTopK(topK: number): void {
    if (!Number.isInteger(topK) || topK <= 0) {
        throw new InvalidRetrievalQueryError('Retrieval topK must be a positive integer.');
    }
}
