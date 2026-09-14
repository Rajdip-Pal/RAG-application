import type { Chunker } from '../../chunking/core/chunker.js';
import type { DocumentChunk } from '../../chunking/core/document-chunk.js';
import type { DocumentLoaderProvider } from '../../core/interfaces/DocumentLoaderProvider.js';
import type { VectorStore } from '../../core/interfaces/VectorStore.js';
import { toDocument } from '../../core/types/document-adapter.js';
import type { DocumentMetadata } from '../../core/types/Document.js';
import { ChunkEmbeddingService } from '../embedding/ChunkEmbeddingService.js';

export class DocumentIngestionService {
    public constructor(
        private readonly loader: DocumentLoaderProvider,
        private readonly chunker: Chunker,
        private readonly embeddingService: ChunkEmbeddingService,
        private readonly vectorStore: VectorStore,
    ) {}

    public async ingest(
        source: string,
        metadataOverrides: Partial<Pick<DocumentMetadata, 'source' | 'fileName' | 'mimeType'>> = {},
    ): Promise<DocumentChunk[]> {
        const loaded = await this.loader.load(source);
        const chunks = loaded.flatMap((document) => {
            const normalized = toDocument(document);
            return this.chunker.chunk({
                ...normalized,
                metadata: { ...normalized.metadata, ...metadataOverrides },
            });
        });
        const embedded = await this.embeddingService.embedChunks(chunks);
        await this.vectorStore.upsert(embedded);
        return chunks;
    }
}
