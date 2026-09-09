import type { LLMConfig } from '../core/types/LLMConfig.js';
import type { Environment } from './env.js';
import { parseEnvironment } from './env.js';
import { InvalidLLMConfigurationError } from '../errors/LLMErrors.js';

function required<T>(value: T | undefined, variable: string): T {
    if (!value) {
        throw new InvalidLLMConfigurationError(`${variable} is required for the selected LLM provider.`);
    }

    return value;
}

export function createLLMConfig(environment: Environment = parseEnvironment()): LLMConfig {
    const temperature: number = required(environment.LLM_TEMPERATURE, 'LLM_TEMPERATURE');

    switch (environment.LLM_PROVIDER) {
        case 'ollama':
            return {
                provider: 'ollama',
                model: required(environment.OLLAMA_MODEL, 'OLLAMA_MODEL'),
                baseUrl: required(environment.OLLAMA_BASE_URL, 'OLLAMA_BASE_URL'),
                temperature,
            };
        case 'openai':
            return {
                provider: 'openai',
                apiKey: required(environment.OPENAI_API_KEY, 'OPENAI_API_KEY'),
                model: required(environment.OPENAI_MODEL, 'OPENAI_MODEL'),
                temperature,
            };
        case 'anthropic':
            return {
                provider: 'anthropic',
                apiKey: required(environment.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY'),
                model: required(environment.ANTHROPIC_MODEL, 'ANTHROPIC_MODEL'),
                temperature,
            };
        case 'gemini':
            return {
                provider: 'gemini',
                apiKey: required(environment.GOOGLE_API_KEY, 'GOOGLE_API_KEY'),
                model: required(environment.GEMINI_MODEL, 'GEMINI_MODEL'),
                temperature,
            };
        default:
            throw new InvalidLLMConfigurationError(`Unsupported LLM_PROVIDER: ${environment.LLM_PROVIDER}`);
    }
}
