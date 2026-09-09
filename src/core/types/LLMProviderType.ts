export const LLM_PROVIDER_TYPES = ['ollama', 'openai', 'anthropic', 'gemini'] as const;

export type LLMProviderType = (typeof LLM_PROVIDER_TYPES)[number];
