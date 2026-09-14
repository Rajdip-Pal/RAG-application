import type { Context } from '../types/context.js';
import type { RetrievedChunk } from '../types/retrieval.js';

export interface ContextBuilder {
    build(chunks: readonly RetrievedChunk[]): Context;
}
