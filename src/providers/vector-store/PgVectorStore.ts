import { Pool } from 'pg';

import { BGE_M3_DIMENSIONS } from '../../constants/embedding.js';
import type { VectorStore } from '../../core/interfaces/VectorStore.js';
import type { DatabaseConfig } from '../../core/types/DatabaseConfig.js';
import type { EmbeddedChunk } from '../../core/types/embedded-chunk.js';
import type { VectorSearchOptions, VectorSearchResult } from '../../core/types/vector-search.js';
import type { DocumentChunk, DocumentChunkMetadata } from '../../chunking/core/document-chunk.js';
import { InvalidVectorError, VectorStoreError } from '../../errors/VectorStoreErrors.js';

export interface PgQueryResult<Row extends object = Record<string, unknown>> {
    readonly rows: Row[];
}

export interface PgPool {
    query<Row extends object = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<PgQueryResult<Row>>;
    end(): Promise<void>;
}

interface ChunkRow {
    readonly id: string;
    readonly document_id: string;
    readonly content: string;
    readonly metadata: unknown;
    readonly score: number;
}

/** PostgreSQL implementation using exact cosine-distance search; score is 1 - cosine distance. */
export class PgVectorStore implements VectorStore {
    private readonly dimensions: number;

    public constructor(
        config: DatabaseConfig,
        private readonly pool: PgPool = new Pool({ connectionString: config.connectionString }),
    ) {
        if (config.embeddingDimensions !== BGE_M3_DIMENSIONS) {
            throw new RangeError(`pgvector schema dimensions must be ${BGE_M3_DIMENSIONS}.`);
        }
        this.dimensions = config.embeddingDimensions;
    }

    public async initialize(): Promise<void> {
        try {
            await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata JSONB NOT NULL,
                    embedding vector(${this.dimensions}) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);
        } catch (error) {
            throw new VectorStoreError('Unable to initialize the pgvector schema.', error);
        }
    }

    public async upsert(chunks: readonly EmbeddedChunk[]): Promise<void> {
        for (const embedded of chunks) {
            this.validateVector(embedded.embedding);
            try {
                await this.pool.query(
                    `
                    INSERT INTO chunks (id, document_id, content, metadata, embedding)
                    VALUES ($1, $2, $3, $4::jsonb, $5::vector)
                    ON CONFLICT (id) DO UPDATE SET
                        document_id = EXCLUDED.document_id,
                        content = EXCLUDED.content,
                        metadata = EXCLUDED.metadata,
                        embedding = EXCLUDED.embedding,
                        updated_at = NOW()
                    `,
                    [
                        embedded.chunk.id,
                        embedded.chunk.documentId,
                        embedded.chunk.content,
                        JSON.stringify(embedded.chunk.metadata),
                        toPgVector(embedded.embedding),
                    ],
                );
            } catch (error) {
                throw new VectorStoreError(`Unable to upsert chunk ${embedded.chunk.id}.`, error);
            }
        }
    }

    public async search(embedding: readonly number[], options: VectorSearchOptions): Promise<VectorSearchResult[]> {
        this.validateVector(embedding);
        if (!Number.isInteger(options.limit) || options.limit <= 0) {
            throw new RangeError('Vector search limit must be a positive integer.');
        }
        try {
            const result = await this.pool.query<ChunkRow>(
                `
                SELECT id, document_id, content, metadata,
                       1 - (embedding <=> $1::vector) AS score
                FROM chunks
                ORDER BY embedding <=> $1::vector
                LIMIT $2
                `,
                [toPgVector(embedding), options.limit],
            );
            return result.rows.map((row) => ({ chunk: toDocumentChunk(row), score: Number(row.score) }));
        } catch (error) {
            throw new VectorStoreError('Unable to search the pgvector store.', error);
        }
    }

    public close(): Promise<void> {
        return this.pool.end();
    }

    private validateVector(vector: readonly number[]): void {
        if (vector.length !== this.dimensions || !vector.every((value) => Number.isFinite(value))) {
            throw new InvalidVectorError(`Vector must contain exactly ${this.dimensions} finite numbers.`);
        }
    }
}

function toPgVector(vector: readonly number[]): string {
    return `[${vector.join(',')}]`;
}

function toDocumentChunk(row: ChunkRow): DocumentChunk {
    if (!isDocumentChunkMetadata(row.metadata)) {
        throw new VectorStoreError(`Chunk ${row.id} contains invalid metadata.`);
    }
    return {
        id: row.id,
        documentId: row.document_id,
        content: row.content,
        metadata: row.metadata,
    };
}

function isDocumentChunkMetadata(value: unknown): value is DocumentChunkMetadata {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const metadata = value as Record<string, unknown>;
    return (
        typeof metadata.source === 'string' &&
        typeof metadata.fileName === 'string' &&
        Array.isArray(metadata.headingPath) &&
        metadata.headingPath.every((heading): heading is string => typeof heading === 'string') &&
        Number.isInteger(metadata.chunkIndex) &&
        Array.isArray(metadata.sourceSpans)
    );
}
