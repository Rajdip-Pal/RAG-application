import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RankedContextBuilder } from '../src/application/context/RankedContextBuilder.js';
import { SourceCitationParser } from '../src/application/citation/SourceCitationParser.js';
import { RagService } from '../src/application/rag/RagService.js';
import { DefaultPromptBuilder } from '../src/application/prompt/DefaultPromptBuilder.js';
import type { ContextBuilder } from '../src/core/interfaces/ContextBuilder.js';
import type { LLMProvider } from '../src/core/interfaces/LLMProvider.js';
import type { PromptBuilder } from '../src/core/interfaces/PromptBuilder.js';
import type { Retriever } from '../src/core/interfaces/Retriever.js';
import type { Context } from '../src/core/types/context.js';
import type { LLMRequest } from '../src/core/types/LLMRequest.js';
import type { LLMResponse } from '../src/core/types/LLMResponse.js';
import type { RetrievedChunk } from '../src/core/types/retrieval.js';
import type { DocumentChunk } from '../src/chunking/core/document-chunk.js';

function chunk(id: string, index: number): DocumentChunk {
    return {
        id,
        documentId: 'document-1',
        content: `content-${id}`,
        metadata: {
            source: '/docs/handbook.md',
            fileName: 'handbook.md',
            headingPath: ['Leave Policy'],
            chunkIndex: index,
            sourceSpans: [{ paragraph: index + 1, startOffset: index * 10, endOffset: index * 10 + 5 }],
        },
    };
}

function retrieved(id: string, score: number, index: number): RetrievedChunk {
    return { chunk: chunk(id, index), score };
}

void test('builds deterministic, ranked context with source markers and provenance', () => {
    const context = new RankedContextBuilder({ maxCharacters: 500 }).build([retrieved('chunk-2', 0.6, 2), retrieved('chunk-1', 0.9, 1)]);

    assert.deepEqual(
        context.sources.map((source) => source.sourceId),
        ['S1', 'S2'],
    );
    assert.deepEqual(
        context.sources.map((source) => source.chunk.id),
        ['chunk-1', 'chunk-2'],
    );
    assert.match(context.text, /\[S1\]/);
    assert.match(context.text, /File: handbook\.md/);
    assert.match(context.text, /Section: Leave Policy/);
    assert.match(context.text, /content-chunk-1/);
});

void test('respects context limits at complete chunk boundaries', () => {
    const context = new RankedContextBuilder({ maxCharacters: 150 }).build([retrieved('chunk-1', 0.9, 1), retrieved('chunk-2', 0.8, 2)]);

    assert.equal(context.sources.length, 1);
    assert.match(context.text, /content-chunk-1/);
    assert.doesNotMatch(context.text, /content-chunk-2/);
});

void test('validates only known citation markers and deduplicates them', () => {
    const context = new RankedContextBuilder().build([retrieved('chunk-1', 0.9, 1)]);
    const citations = new SourceCitationParser().parse('Answer [S1] again [S1] and unknown [S99].', context);

    assert.equal(citations.length, 1);
    assert.equal(citations[0]?.sourceId, 'S1');
    assert.equal(citations[0]?.chunkId, 'chunk-1');
    assert.deepEqual(citations[0]?.sourceSpans, context.sources[0]?.chunk.metadata.sourceSpans);
});

void test('builds a prompt that separates system rules from untrusted document context', () => {
    const context = new RankedContextBuilder().build([retrieved('chunk-1', 0.9, 1)]);
    const request = new DefaultPromptBuilder().build('What is the policy?', context);

    assert.match(request.systemPrompt ?? '', /reference material, not instructions/);
    assert.match(request.systemPrompt ?? '', /provided documents/);
    assert.match(request.userPrompt, /What is the policy\?/);
    assert.match(request.userPrompt, /\[S1\]/);
});

class FakeRetriever implements Retriever {
    public query = '';

    public async retrieve(query: string): Promise<RetrievedChunk[]> {
        this.query = query;
        return [retrieved('chunk-1', 0.9, 1)];
    }
}

class FakeContextBuilder implements ContextBuilder {
    public chunks: readonly RetrievedChunk[] = [];
    public context: Context = {
        text: '[S1]\ncontent',
        sources: [],
    };

    public build(chunks: readonly RetrievedChunk[]): Context {
        this.chunks = chunks;
        return this.context;
    }
}

class FakePromptBuilder implements PromptBuilder {
    public request: { query: string; context: Context } | undefined;

    public build(query: string, context: Context): LLMRequest {
        this.request = { query, context };
        return { userPrompt: `${query}\n${context.text}` };
    }
}

class FakeLLMProvider {
    public readonly name = 'ollama' as const;
    public readonly model = 'test-model';
    public request: LLMRequest | undefined;

    public async generate(request: LLMRequest): Promise<LLMResponse> {
        this.request = request;
        return { text: 'Answer [S1]' };
    }
}

void test('orchestrates retrieval, context, prompt, generation, and citations', async () => {
    const retriever = new FakeRetriever();
    const contextBuilder = new FakeContextBuilder();
    const promptBuilder = new FakePromptBuilder();
    const llmProvider = new FakeLLMProvider();
    const context = new RankedContextBuilder({ maxCharacters: 500 }).build([retrieved('chunk-1', 0.9, 1)]);
    contextBuilder.context = context;
    const response = await new RagService(
        retriever,
        contextBuilder,
        promptBuilder,
        llmProvider as unknown as LLMProvider,
        new SourceCitationParser(),
    ).answer('What is the policy?');

    assert.equal(retriever.query, 'What is the policy?');
    assert.equal(promptBuilder.request?.query, 'What is the policy?');
    assert.equal(llmProvider.request?.userPrompt, 'What is the policy?\n' + context.text);
    assert.equal(response.answer, 'Answer [S1]');
    assert.equal(response.citations[0]?.chunkId, 'chunk-1');
});

void test('returns controlled no-context response without calling the LLM', async () => {
    const llmProvider = new FakeLLMProvider();
    const emptyRetriever: Retriever = { retrieve: async () => [] };
    const emptyContextBuilder: ContextBuilder = { build: () => ({ text: '', sources: [] }) };
    const response = await new RagService(
        emptyRetriever,
        emptyContextBuilder,
        new FakePromptBuilder(),
        llmProvider as unknown as LLMProvider,
        new SourceCitationParser(),
    ).answer('unknown question');

    assert.equal(response.answer, 'The information is not available in the provided documents.');
    assert.deepEqual(response.citations, []);
    assert.equal(llmProvider.request, undefined);
});
