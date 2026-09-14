import type { RetrievedChunk, RetrievalOptions } from '../types/retrieval.js';

export interface Retriever {
    retrieve(query: string, options?: RetrievalOptions): Promise<RetrievedChunk[]>;
}
