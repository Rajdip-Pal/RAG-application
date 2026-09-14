import type { SourceSpan } from './source-span.js';

/** Chunk content plus the source location and structural context needed for citations. */
export interface DocumentChunkMetadata {
    readonly source: string;
    readonly fileName: string;
    readonly headingPath: readonly string[];
    readonly chunkIndex: number;
    readonly sourceSpans: readonly SourceSpan[];
    readonly [key: string]: unknown;
}

export interface DocumentChunk {
    readonly id: string;
    readonly documentId: string;
    readonly content: string;
    readonly metadata: DocumentChunkMetadata;
}
