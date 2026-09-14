import type { Citation } from '../types/Citation.js';
import type { Context } from '../types/context.js';

export interface CitationParser {
    parse(answer: string, context: Context): Citation[];
}
