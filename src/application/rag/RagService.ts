import { NO_CONTEXT_ANSWER } from '../../constants/rag.js';
import type { CitationParser } from '../../core/interfaces/CitationParser.js';
import type { ContextBuilder } from '../../core/interfaces/ContextBuilder.js';
import type { LLMProvider } from '../../core/interfaces/LLMProvider.js';
import type { PromptBuilder } from '../../core/interfaces/PromptBuilder.js';
import type { Retriever } from '../../core/interfaces/Retriever.js';
import type { RagResponse } from '../../core/types/RagResponse.js';
import type { RetrievalOptions } from '../../core/types/retrieval.js';
import { InvalidRagQueryError } from '../../errors/RagErrors.js';

export class RagService {
    public constructor(
        private readonly retriever: Retriever,
        private readonly contextBuilder: ContextBuilder,
        private readonly promptBuilder: PromptBuilder,
        private readonly llmProvider: LLMProvider,
        private readonly citationParser: CitationParser,
    ) {}

    public async answer(query: string, retrievalOptions?: RetrievalOptions): Promise<RagResponse> {
        if (!query.trim()) throw new InvalidRagQueryError('RAG query must not be empty.');
        const retrieved = await this.retriever.retrieve(query, retrievalOptions);
        const context = this.contextBuilder.build(retrieved);
        if (context.sources.length === 0) return { answer: NO_CONTEXT_ANSWER, citations: [] };
        const response = await this.llmProvider.generate(this.promptBuilder.build(query, context));
        return { answer: response.text, citations: this.citationParser.parse(response.text, context) };
    }
}
