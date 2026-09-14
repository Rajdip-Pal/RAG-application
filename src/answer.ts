import 'dotenv/config';

import { DefaultPromptBuilder } from './application/prompt/DefaultPromptBuilder.js';
import { RankedContextBuilder } from './application/context/RankedContextBuilder.js';
import { RagService } from './application/rag/RagService.js';
import { SourceCitationParser } from './application/citation/SourceCitationParser.js';
import { VectorRetrievalService } from './application/retrieval/VectorRetrievalService.js';
import { createEmbeddingProvider } from './composition/createEmbeddingProvider.js';
import { createLLMProvider } from './composition/createLLMProvider.js';
import { createVectorStore } from './composition/createVectorStore.js';
import { createDatabaseConfig } from './config/database.config.js';
import { createEmbeddingConfig } from './config/embedding.config.js';
import { createLLMConfig } from './config/llm.config.js';
import { parseEnvironment } from './config/env.js';

const query = process.argv.slice(2).join(' ').trim();
if (!query) throw new Error('Usage: pnpm answer "your question"');

const environment = parseEnvironment();
const embeddingProvider = createEmbeddingProvider(createEmbeddingConfig(environment));
const vectorStore = createVectorStore(createDatabaseConfig(environment));
const retriever = new VectorRetrievalService(embeddingProvider, vectorStore);
const ragService = new RagService(
    retriever,
    new RankedContextBuilder(),
    new DefaultPromptBuilder(),
    createLLMProvider(createLLMConfig(environment)),
    new SourceCitationParser(),
);

try {
    await vectorStore.initialize();
    console.log(JSON.stringify(await ragService.answer(query), null, 2));
} finally {
    await vectorStore.close();
}
