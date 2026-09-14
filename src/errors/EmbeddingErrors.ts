export class EmbeddingProviderError extends Error {
    public constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = 'EmbeddingProviderError';
    }
}

export class InvalidEmbeddingError extends EmbeddingProviderError {
    public constructor(message: string) {
        super(message);
        this.name = 'InvalidEmbeddingError';
    }
}

export class EmbeddingServiceError extends EmbeddingProviderError {
    public constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'EmbeddingServiceError';
    }
}
