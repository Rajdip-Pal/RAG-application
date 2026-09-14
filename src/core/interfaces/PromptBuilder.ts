import type { LLMRequest } from '../types/LLMRequest.js';
import type { Context } from '../types/context.js';

export interface PromptBuilder {
    build(query: string, context: Context): LLMRequest;
}
