import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AIMessageChunk } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createLLMConfig } from '../src/config/llm.config.js';
import { createLLMProvider } from '../src/composition/createLLMProvider.js';
import { InvalidLLMConfigurationError, UnsupportedLLMProviderError } from '../src/errors/LLMErrors.js';
import { OllamaProvider } from '../src/providers/llm/OllamaProvider.js';

void test('selects the configured provider', () => {
    const config = createLLMConfig({
        LLM_PROVIDER: 'ollama',
        LLM_TEMPERATURE: 1,
        OLLAMA_MODEL: 'qwen3:8b',
        OLLAMA_BASE_URL: 'http://localhost:11434',
    });

    assert.equal(createLLMProvider(config).name, 'ollama');
});

void test('rejects an unsupported provider', () => {
    assert.throws(() => createLLMConfig({ LLM_PROVIDER: 'unsupported' }), InvalidLLMConfigurationError);

    assert.throws(() => createLLMProvider({ provider: 'unsupported' } as never), UnsupportedLLMProviderError);
});

void test('fails when selected provider configuration is incomplete', () => {
    assert.throws(() => createLLMConfig({ LLM_PROVIDER: 'openai' }), InvalidLLMConfigurationError);
});

void test('delegates invocation to the injected chat model', async () => {
    const expected = new AIMessageChunk({ content: 'mocked response' });
    const model = {
        invoke: async () => expected,
    } as unknown as BaseChatModel;
    const provider = new OllamaProvider(
        {
            provider: 'ollama',
            model: 'test-model',
            baseUrl: 'http://localhost:11434',
            temperature: 0,
        },
        model,
    );

    const response = await provider.invoke([['human', 'hello']]);

    assert.equal(response, expected);
});
