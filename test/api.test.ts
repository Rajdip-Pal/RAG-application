import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createApp } from '../src/api/app.js';
import type { RagResponse } from '../src/core/types/RagResponse.js';
import type { DocumentChunk } from '../src/chunking/core/document-chunk.js';
import { VectorStoreError } from '../src/errors/VectorStoreErrors.js';

class FakeRagService {
    public queries: string[] = [];
    public failure: Error | undefined;

    public async answer(query: string): Promise<RagResponse> {
        this.queries.push(query);
        if (this.failure) throw this.failure;
        return { answer: 'mock answer', citations: [] };
    }
}

class FakeIngestionService {
    public source: string | undefined;
    public fileName: string | undefined;
    public failure: Error | undefined;

    public async ingest(source: string, metadata?: { fileName?: string }): Promise<DocumentChunk[]> {
        this.source = source;
        this.fileName = metadata?.fileName;
        if (this.failure) throw this.failure;
        return [];
    }
}

void test('GET /health returns a process health response', async () => {
    const app = createApp({ ragService: new FakeRagService(), ingestionService: new FakeIngestionService() });
    const response = await app.inject({ method: 'GET', url: '/health' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
    await app.close();
});

void test('POST /query validates and delegates the query', async () => {
    const ragService = new FakeRagService();
    const app = createApp({ ragService, ingestionService: new FakeIngestionService() });
    const response = await app.inject({ method: 'POST', url: '/query', payload: { query: 'What is leave?' } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { answer: 'mock answer', citations: [] });
    assert.deepEqual(ragService.queries, ['What is leave?']);
    await app.close();
});

void test('POST /query rejects missing, empty, and whitespace-only queries', async () => {
    const app = createApp({ ragService: new FakeRagService(), ingestionService: new FakeIngestionService() });

    for (const payload of [{}, { query: '' }, { query: '   ' }]) {
        const response = await app.inject({ method: 'POST', url: '/query', payload });
        assert.equal(response.statusCode, 400);
    }
    await app.close();
});

void test('POST /query maps dependency failures to 503', async () => {
    const ragService = new FakeRagService();
    ragService.failure = new VectorStoreError('database unavailable');
    const app = createApp({ ragService, ingestionService: new FakeIngestionService() });
    const response = await app.inject({ method: 'POST', url: '/query', payload: { query: 'question' } });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { error: 'database unavailable' });
    await app.close();
});

void test('POST /documents accepts a Markdown upload and delegates ingestion', async () => {
    const ingestionService = new FakeIngestionService();
    const app = createApp({ ragService: new FakeRagService(), ingestionService });
    const response = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { 'content-type': 'multipart/form-data; boundary=api-test' },
        payload:
            '--api-test\r\nContent-Disposition: form-data; name="file"; filename="leave.md"\r\nContent-Type: text/markdown\r\n\r\n# Leave Policy\r\n--api-test--\r\n',
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { ingested: true, fileName: 'leave.md', chunks: 0 });
    assert.equal(ingestionService.fileName, 'leave.md');
    await app.close();
});

void test('POST /documents accepts a TXT upload', async () => {
    const ingestionService = new FakeIngestionService();
    const app = createApp({ ragService: new FakeRagService(), ingestionService });
    const response = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { 'content-type': 'multipart/form-data; boundary=api-test' },
        payload:
            '--api-test\r\nContent-Disposition: form-data; name="file"; filename="leave.txt"\r\nContent-Type: text/plain\r\n\r\nEmployees receive 20 days.\r\n--api-test--\r\n',
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { ingested: true, fileName: 'leave.txt', chunks: 0 });
    assert.equal(ingestionService.fileName, 'leave.txt');
    await app.close();
});

void test('POST /documents rejects missing and unsupported uploads', async () => {
    const app = createApp({ ragService: new FakeRagService(), ingestionService: new FakeIngestionService() });
    const missing = await app.inject({ method: 'POST', url: '/documents' });
    assert.equal(missing.statusCode, 400);

    const unsupported = await app.inject({
        method: 'POST',
        url: '/documents',
        headers: { 'content-type': 'multipart/form-data; boundary=api-test' },
        payload:
            '--api-test\r\nContent-Disposition: form-data; name="file"; filename="notes.pdf"\r\nContent-Type: application/pdf\r\n\r\ntext\r\n--api-test--\r\n',
    });
    assert.equal(unsupported.statusCode, 400);
    await app.close();
});
