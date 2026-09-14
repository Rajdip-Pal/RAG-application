import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VectorRetrievalService } from '../src/application/retrieval/VectorRetrievalService.js';
import type { EmbeddingProvider } from '../src/core/interfaces/EmbeddingProvider.js';
import type { VectorStore } from '../src/core/interfaces/VectorStore.js';
import type { EmbeddedChunk } from '../src/core/types/embedded-chunk.js';
import type { VectorSearchOptions, VectorSearchResult } from '../src/core/types/vector-search.js';
import type { DocumentChunk } from '../src/chunking/core/document-chunk.js';

function chunk(id: string): DocumentChunk {
    return {
        id,
        documentId: 'document-1',
        content: `content-${id}`,
        metadata: {
            source: '/docs/handbook.md',
            fileName: 'handbook.md',
            headingPath: ['Leave Policy'],
            chunkIndex: Number(id.replace('chunk-', '')),
            sourceSpans: [{ paragraph: 1, startOffset: 10, endOffset: 20 }],
        },
    };
}

class FakeEmbeddingProvider implements EmbeddingProvider {
    public readonly model = 'bge-m3';
    public readonly dimensions = 3;
    public readonly queries: string[] = [];
    public vector = [1, 2, 3];

    public async embed(text: string): Promise<number[]> {
        this.queries.push(text);
        return this.vector;
    }

    public async embedBatch(_texts: readonly string[]): Promise<number[][]> {
        return [];
    }
}

class FakeVectorStore implements VectorStore {
    public embedding: readonly number[] | undefined;
    public options: VectorSearchOptions | undefined;
    public results: VectorSearchResult[] = [
        { chunk: chunk('chunk-0'), score: 0.95 },
        { chunk: chunk('chunk-1'), score: 0.7 },
        { chunk: chunk('chunk-2'), score: 0.3 },
    ];

    public async upsert(_chunks: readonly EmbeddedChunk[]): Promise<void> {}

    public async search(embedding: readonly number[], options: VectorSearchOptions): Promise<VectorSearchResult[]> {
        this.embedding = embedding;
        this.options = options;
        return this.results;
    }
}

void test('embeds the query, applies default topK, and preserves ordered results', async () => {
    const embeddingProvider = new FakeEmbeddingProvider();
    const vectorStore = new FakeVectorStore();
    const results = await new VectorRetrievalService(embeddingProvider, vectorStore).retrieve('leave policy');

    assert.deepEqual(embeddingProvider.queries, ['leave policy']);
    assert.deepEqual(vectorStore.embedding, [1, 2, 3]);
    assert.deepEqual(vectorStore.options, { limit: 5 });
    assert.deepEqual(
        results.map((result) => result.chunk.id),
        ['chunk-0', 'chunk-1', 'chunk-2'],
    );
    assert.deepEqual(results[0]?.chunk.metadata, chunk('chunk-0').metadata);
});

void test('passes custom topK and filters by minimum similarity score', async () => {
    const vectorStore = new FakeVectorStore();
    const results = await new VectorRetrievalService(new FakeEmbeddingProvider(), vectorStore).retrieve('leave', {
        topK: 2,
        minScore: 0.7,
    });

    assert.deepEqual(vectorStore.options, { limit: 2 });
    assert.deepEqual(
        results.map((result) => result.score),
        [0.95, 0.7],
    );
});

void test('rejects empty queries and invalid retrieval options', async () => {
    const retriever = new VectorRetrievalService(new FakeEmbeddingProvider(), new FakeVectorStore());

    await assert.rejects(retriever.retrieve('   '), /must not be empty/);
    await assert.rejects(retriever.retrieve('query', { topK: 0 }), /topK/);
    await assert.rejects(retriever.retrieve('query', { minScore: Number.NaN }), /minScore/);
});

void test('rejects query embeddings with unexpected dimensions', async () => {
    const provider = new FakeEmbeddingProvider();
    provider.vector = [1, 2];
    const vectorStore = new FakeVectorStore();

    await assert.rejects(new VectorRetrievalService(provider, vectorStore).retrieve('query'), /must contain 3 finite numbers/);
    assert.equal(vectorStore.embedding, undefined);
});
