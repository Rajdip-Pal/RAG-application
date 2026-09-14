import { DEFAULT_MAX_CONTEXT_CHARACTERS } from '../../constants/rag.js';
import type { ContextBuilder } from '../../core/interfaces/ContextBuilder.js';
import type { Context, ContextSource } from '../../core/types/context.js';
import type { RetrievedChunk } from '../../core/types/retrieval.js';

export interface ContextBuilderOptions {
    /** Character approximation used until a tokenizer-backed size policy is introduced. */
    readonly maxCharacters?: number;
}

export class RankedContextBuilder implements ContextBuilder {
    private readonly maxCharacters: number;

    public constructor(options: ContextBuilderOptions = {}) {
        this.maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CONTEXT_CHARACTERS;
        if (!Number.isInteger(this.maxCharacters) || this.maxCharacters <= 0) {
            throw new RangeError('Context maxCharacters must be a positive integer.');
        }
    }

    public build(chunks: readonly RetrievedChunk[]): Context {
        const sources: ContextSource[] = [];
        const blocks: string[] = [];
        let size = 0;
        const ranked = [...chunks].sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id));

        for (const result of ranked) {
            const source: ContextSource = { sourceId: `S${sources.length + 1}`, chunk: result.chunk, score: result.score };
            const block = formatSource(source);
            const nextSize = size + (blocks.length > 0 ? 2 : 0) + block.length;
            if (nextSize > this.maxCharacters) continue;
            sources.push(source);
            blocks.push(block);
            size = nextSize;
        }

        return { text: blocks.join('\n\n'), sources };
    }
}

function formatSource(source: ContextSource): string {
    const section = source.chunk.metadata.headingPath.join(' → ') || 'Unspecified';
    return [
        `[${source.sourceId}]`,
        `File: ${source.chunk.metadata.fileName}`,
        `Source: ${source.chunk.metadata.source}`,
        `Section: ${section}`,
        `Chunk: ${source.chunk.metadata.chunkIndex}`,
        `Relevance: ${source.score.toFixed(4)}`,
        '',
        source.chunk.content,
    ].join('\n');
}
