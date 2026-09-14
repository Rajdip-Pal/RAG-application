import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BGE_M3_DIMENSIONS, BGE_M3_MODEL } from '../src/constants/embedding.js';
import { ChunkEmbeddingService } from '../src/application/embedding/ChunkEmbeddingService.js';
import type { EmbeddingProvider } from '../src/core/interfaces/EmbeddingProvider.js';
import type { EmbeddedChunk } from '../src/core/types/embedded-chunk.js';
import type { DocumentChunk } from '../src/chunking/core/document-chunk.js';
import { OllamaEmbeddingProvider } from '../src/providers/embedding/OllamaEmbeddingProvider.js';
import { PgVectorStore, type PgPool } from '../src/providers/vector-store/PgVectorStore.js';

function chunk(id: string, content: string): DocumentChunk {
    return {
        id,
        documentId: 'document-1',
        content,
        metadata: {
            source: '/docs/handbook.md',
            fileName: 'handbook.md',
            headingPath: ['Leave Policy'],
            chunkIndex: Number(id.replace('chunk-', '')),
            sourceSpans: [{ paragraph: 1, startOffset: 10, endOffset: 20 }],
        },
    };
}

function vector(seed: number): number[] {
    return Array.from({ length: BGE_M3_DIMENSIONS }, (_, index) => seed + index / 10_000);
}

class FakeEmbeddingProvider implements EmbeddingProvider {
    public readonly model = BGE_M3_MODEL;
    public readonly dimensions = BGE_M3_DIMENSIONS;
    public readonly batches: string[][] = [];

    public async embed(text: string): Promise<number[]> {
        return vector(text.length);
    }

    public async embedBatch(texts: readonly string[]): Promise<number[][]> {
        this.batches.push([...texts]);
        return texts.map((text) => vector(text.length));
    }
}

void test('embeds chunks in bounded batches while preserving order and provenance', async () => {
    const provider = new FakeEmbeddingProvider();
    const chunks = [chunk('chunk-0', 'first'), chunk('chunk-1', 'second'), chunk('chunk-2', 'third')];
    const embedded = await new ChunkEmbeddingService(provider, 2).embedChunks(chunks);

    assert.deepEqual(provider.batches, [['first', 'second'], ['third']]);
    assert.deepEqual(
        embedded.map((item) => item.chunk.id),
        ['chunk-0', 'chunk-1', 'chunk-2'],
    );
    assert.deepEqual(embedded[0]?.chunk.metadata, chunks[0]?.metadata);
    assert.equal(embedded[0]?.embedding.length, BGE_M3_DIMENSIONS);
});

void test('rejects an embedding count mismatch', async () => {
    const provider: EmbeddingProvider = {
        model: BGE_M3_MODEL,
        dimensions: BGE_M3_DIMENSIONS,
        embed: async () => vector(1),
        embedBatch: async () => [],
    };

    await assert.rejects(new ChunkEmbeddingService(provider).embedChunks([chunk('chunk-0', 'first')]), /returned 0 vectors for 1 chunks/);
});

void test('calls Ollama embedding API and validates BGE-M3 dimensions', async () => {
    let requestBody: Record<string, unknown> | undefined;
    const fetchImplementation: typeof fetch = async (_input, init) => {
        const body = init?.body;
        requestBody = JSON.parse(typeof body === 'string' ? body : JSON.stringify(body)) as Record<string, unknown>;
        return {
            ok: true,
            status: 200,
            json: async () => ({ embeddings: [vector(1), vector(2)] }),
        } as Response;
    };
    const provider = new OllamaEmbeddingProvider(
        { baseUrl: 'http://ollama.test', model: BGE_M3_MODEL, dimensions: BGE_M3_DIMENSIONS },
        fetchImplementation,
    );

    const embeddings = await provider.embedBatch(['one', 'two']);

    assert.deepEqual(requestBody, { model: BGE_M3_MODEL, input: ['one', 'two'] });
    assert.equal(embeddings.length, 2);
    assert.equal(embeddings[0]?.length, BGE_M3_DIMENSIONS);
});

void test('maps pgvector rows back to chunks with provenance and cosine scores', async () => {
    const queries: Array<{ text: string; values?: readonly unknown[] }> = [];
    const pool: PgPool = {
        query: async <Row extends object = Record<string, unknown>>(text: string, values?: readonly unknown[]) => {
            queries.push({ text, values });
            if (text.includes('SELECT')) {
                return {
                    rows: [
                        {
                            id: 'chunk-0',
                            document_id: 'document-1',
                            content: 'first',
                            metadata: chunk('chunk-0', 'first').metadata,
                            score: 0.91,
                        } as Row,
                    ],
                };
            }
            return { rows: [] as Row[] };
        },
        end: async () => undefined,
    };
    const store = new PgVectorStore({ connectionString: 'postgresql://unused', embeddingDimensions: BGE_M3_DIMENSIONS }, pool);
    const embedded: EmbeddedChunk = { chunk: chunk('chunk-0', 'first'), embedding: vector(1) };

    await store.upsert([embedded]);
    const results = await store.search(vector(2), { limit: 3 });

    assert.equal(results[0]?.chunk.id, 'chunk-0');
    assert.deepEqual(results[0]?.chunk.metadata, embedded.chunk.metadata);
    assert.equal(results[0]?.score, 0.91);
    assert.match(queries[0]?.text ?? '', /::vector/);
    assert.match(queries.at(-1)?.text ?? '', /embedding <=>/);
});
