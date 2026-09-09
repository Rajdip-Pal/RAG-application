export class UnsupportedLLMProviderError extends Error {
    public constructor(provider: string) {
        super(`Unsupported LLM provider: ${provider}`);
        this.name = 'UnsupportedLLMProviderError';
    }
}

export class InvalidLLMConfigurationError extends Error {
    public constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = 'InvalidLLMConfigurationError';
    }
}
