import type { SourceSpan } from '../../chunking/core/source-span.js';

export interface Citation {
    readonly sourceId: string;
    readonly source: string;
    readonly fileName: string;
    readonly documentId: string;
    readonly headingPath: readonly string[];
    readonly chunkId: string;
    readonly chunkIndex: number;
    readonly sourceSpans: readonly SourceSpan[];
    readonly score: number;
}
