import type { Chunker } from '../../chunking/core/chunker.js';
import type { ChunkerProvider } from '../../chunking/core/chunker-provider.js';
import { DEFAULT_CHUNKING_OPTIONS, type ChunkingOptions } from '../../chunking/core/chunking-options.js';
import { MarkdownChunker } from '../../chunking/markdown/markdown-chunker.js';

export class MarkdownChunkerProvider implements ChunkerProvider {
    private readonly markdownChunker: MarkdownChunker;

    public constructor(options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS) {
        this.markdownChunker = new MarkdownChunker(options);
    }

    public get(format: string): Chunker {
        if (format.toLowerCase() !== 'markdown' && format.toLowerCase() !== 'md') {
            throw new RangeError(`Unsupported chunker format: ${format}`);
        }
        return this.markdownChunker;
    }
}
