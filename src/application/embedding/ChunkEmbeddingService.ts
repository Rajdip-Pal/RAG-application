import type { DocumentChunk } from '../../chunking/core/document-chunk.js';
import type { EmbeddingProvider } from '../../core/interfaces/EmbeddingProvider.js';
import type { EmbeddedChunk } from '../../core/types/embedded-chunk.js';
import { EmbeddingServiceError } from '../../errors/EmbeddingErrors.js';

export class ChunkEmbeddingService {
    public constructor(
        private readonly embeddingProvider: EmbeddingProvider,
        private readonly batchSize = 32,
    ) {
        if (!Number.isInteger(batchSize) || batchSize <= 0) {
            throw new RangeError('Embedding batchSize must be a positive integer.');
        }
    }

    public async embedChunks(chunks: readonly DocumentChunk[]): Promise<EmbeddedChunk[]> {
        const embedded: EmbeddedChunk[] = [];
        for (let start = 0; start < chunks.length; start += this.batchSize) {
            const batch = chunks.slice(start, start + this.batchSize);
            const vectors = await this.embeddingProvider.embedBatch(batch.map((chunk) => chunk.content));
            if (vectors.length !== batch.length) {
                throw new EmbeddingServiceError(`Embedding provider returned ${vectors.length} vectors for ${batch.length} chunks.`);
            }
            vectors.forEach((embedding, index) => {
                if (embedding.length !== this.embeddingProvider.dimensions) {
                    throw new EmbeddingServiceError(
                        `Embedding at index ${start + index} has dimension ${embedding.length}; expected ${this.embeddingProvider.dimensions}.`,
                    );
                }
                embedded.push({ chunk: batch[index]!, embedding: [...embedding] });
            });
        }
        return embedded;
    }
}
