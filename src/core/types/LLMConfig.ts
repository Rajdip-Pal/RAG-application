import type { LLMProviderType } from './LLMProviderType.js';

interface BaseLLMConfig {
    readonly provider: LLMProviderType;
    readonly temperature: number;
}

export interface OllamaConfig extends BaseLLMConfig {
    readonly provider: 'ollama';
    readonly model: string;
    readonly baseUrl: string;
}

export interface OpenAIConfig extends BaseLLMConfig {
    readonly provider: 'openai';
    readonly apiKey: string;
    readonly model: string;
}

export interface AnthropicConfig extends BaseLLMConfig {
    readonly provider: 'anthropic';
    readonly apiKey: string;
    readonly model: string;
}

export interface GeminiConfig extends BaseLLMConfig {
    readonly provider: 'gemini';
    readonly apiKey: string;
    readonly model: string;
}

export type LLMConfig = OllamaConfig | OpenAIConfig | AnthropicConfig | GeminiConfig;
