import type { LLMProvider } from '../core/interfaces/LLMProvider.js';
import type { LLMConfig } from '../core/types/LLMConfig.js';
import { UnsupportedLLMProviderError } from '../errors/LLMErrors.js';
import { AnthropicProvider } from '../providers/llm/AnthropicProvider.js';
import { GeminiProvider } from '../providers/llm/GeminiProvider.js';
import { OllamaProvider } from '../providers/llm/OllamaProvider.js';
import { OpenAIProvider } from '../providers/llm/OpenAIProvider.js';

export function createLLMProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
        case 'ollama':
            return new OllamaProvider(config);
        case 'openai':
            return new OpenAIProvider(config);
        case 'anthropic':
            return new AnthropicProvider(config);
        case 'gemini':
            return new GeminiProvider(config);
        default:
            throw new UnsupportedLLMProviderError((config as unknown as { readonly provider: string }).provider);
    }
}
