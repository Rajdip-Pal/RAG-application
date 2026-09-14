export type { Chunker } from './core/chunker.js';
export type { ChunkerProvider } from './core/chunker-provider.js';
export { CharacterSizeCalculator, type ChunkSizeCalculator } from './core/chunk-size-calculator.js';
export { DEFAULT_CHUNK_MAX_SIZE, DEFAULT_CHUNK_OVERLAP_SIZE } from '../constants/chunking.js';
export { DEFAULT_CHUNKING_OPTIONS, type ChunkingOptions } from './core/chunking-options.js';
export type { DocumentChunk, DocumentChunkMetadata } from './core/document-chunk.js';
export { DeterministicChunkIdGenerator, type ChunkIdGenerator } from './core/chunk-id-generator.js';
export { BasicSentenceSplitter, type SentenceSplitter } from './core/sentence-splitter.js';
export type { SourceSpan } from './core/source-span.js';
export { MarkdownChunker, type MarkdownChunkerDependencies } from './markdown/markdown-chunker.js';

// Embeddings and vector persistence intentionally remain outside this boundary.
