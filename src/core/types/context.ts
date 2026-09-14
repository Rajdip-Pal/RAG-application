import type { DocumentChunk } from '../../chunking/core/document-chunk.js';

export interface ContextSource {
    readonly sourceId: string;
    readonly chunk: DocumentChunk;
    readonly score: number;
}

export interface Context {
    readonly text: string;
    readonly sources: readonly ContextSource[];
}
