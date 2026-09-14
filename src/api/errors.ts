export class ApiValidationError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = 'ApiValidationError';
    }
}
