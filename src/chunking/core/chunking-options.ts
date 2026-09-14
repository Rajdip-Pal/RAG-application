import { DEFAULT_CHUNK_MAX_SIZE, DEFAULT_CHUNK_OVERLAP_SIZE } from '../../constants/chunking.js';

/** Size values use the injected calculator's unit (characters initially, tokens later). */
export interface ChunkingOptions {
    readonly maxSize: number;
    readonly overlapSize: number;
}

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
    maxSize: DEFAULT_CHUNK_MAX_SIZE,
    overlapSize: DEFAULT_CHUNK_OVERLAP_SIZE,
};

export function validateChunkingOptions(options: ChunkingOptions): void {
    if (!Number.isFinite(options.maxSize) || options.maxSize <= 0) {
        throw new RangeError('Chunking maxSize must be a positive finite number.');
    }
    if (!Number.isFinite(options.overlapSize) || options.overlapSize < 0) {
        throw new RangeError('Chunking overlapSize must be a non-negative finite number.');
    }
    if (options.overlapSize >= options.maxSize) {
        throw new RangeError('Chunking overlapSize must be smaller than maxSize.');
    }
}
