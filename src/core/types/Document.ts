export interface DocumentMetadata {
    readonly source: string;
    readonly fileName: string;
    readonly mimeType?: string;
    readonly [key: string]: unknown;
}

export interface Document {
    readonly id: string;
    readonly content: string;
    readonly metadata: DocumentMetadata;
}
