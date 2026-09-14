import type { Chunker } from './chunker.js';

export interface ChunkerProvider {
    get(format: string): Chunker;
}
