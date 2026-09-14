export class RetrievalError extends Error {
    public constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = 'RetrievalError';
    }
}

export class InvalidRetrievalQueryError extends RetrievalError {
    public constructor(message: string) {
        super(message);
        this.name = 'InvalidRetrievalQueryError';
    }
}
