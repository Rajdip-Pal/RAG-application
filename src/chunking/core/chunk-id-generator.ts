import { createHash } from 'node:crypto';

import type { SourceSpan } from './source-span.js';

export interface ChunkIdGenerator {
    generate(documentId: string, chunkIndex: number, sourceSpans: readonly SourceSpan[]): string;
}

export class DeterministicChunkIdGenerator implements ChunkIdGenerator {
    public generate(documentId: string, chunkIndex: number, sourceSpans: readonly SourceSpan[]): string {
        const location = sourceSpans.map((span) => `${span.paragraph}:${span.startOffset}-${span.endOffset}`).join('|');
        return createHash('sha256').update(`${documentId}:${chunkIndex}:${location}`).digest('hex');
    }
}
