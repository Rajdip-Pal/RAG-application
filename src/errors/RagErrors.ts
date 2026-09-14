export class RagError extends Error {
    public constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = 'RagError';
    }
}

export class InvalidRagQueryError extends RagError {
    public constructor(message: string) {
        super(message);
        this.name = 'InvalidRagQueryError';
    }
}
