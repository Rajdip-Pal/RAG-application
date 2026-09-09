import type { LLMConfig } from '../core/types/LLMConfig.js';
import type { Environment } from './env.js';
import { parseEnvironment } from './env.js';
import { InvalidLLMConfigurationError } from '../errors/LLMErrors.js';

function required(value: string | undefined, variable: string): string {
    if (!value) {
        throw new InvalidLLMConfigurationError(`${variable} is required for the selected LLM provider.`);
    }

    return value;
}

export function createLLMConfig(environment: Environment = parseEnvironment()): LLMConfig {
    const temperature = environment.LLM_TEMPERATURE ?? 0;

    switch (environment.LLM_PROVIDER) {
        case 'ollama':
            return {
                provider: 'ollama',
                model: required(environment.OLLAMA_MODEL, 'OLLAMA_MODEL'),
                baseUrl: environment.OLLAMA_BASE_URL ?? 'http://localhost:11434',
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
