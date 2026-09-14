import type { ChunkerProvider } from '../chunking/core/chunker-provider.js';
import { MarkdownChunkerProvider } from '../providers/chunking/MarkdownChunkerProvider.js';

export function createChunkerProvider(): ChunkerProvider {
    return new MarkdownChunkerProvider();
}
