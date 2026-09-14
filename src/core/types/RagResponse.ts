import type { Citation } from './Citation.js';

export interface RagResponse {
    readonly answer: string;
    readonly citations: readonly Citation[];
}
