export class VectorStoreError extends Error {
    public constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = 'VectorStoreError';
    }
}

export class InvalidVectorError extends VectorStoreError {
    public constructor(message: string) {
        super(message);
        this.name = 'InvalidVectorError';
    }
}
