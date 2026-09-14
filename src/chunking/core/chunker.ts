import type { Document } from '../../core/types/Document.js';
import type { DocumentChunk } from './document-chunk.js';

/** Converts a normalized document into ordered, provenance-aware chunks. */
export interface Chunker {
    chunk(document: Document): DocumentChunk[];
}
