import 'dotenv/config';

import { ChunkEmbeddingService } from '../application/embedding/ChunkEmbeddingService.js';
import { DocumentIngestionService } from '../application/ingestion/DocumentIngestionService.js';
import { RankedContextBuilder } from '../application/context/RankedContextBuilder.js';
import { SourceCitationParser } from '../application/citation/SourceCitationParser.js';
import { DefaultPromptBuilder } from '../application/prompt/DefaultPromptBuilder.js';
import { RagService } from '../application/rag/RagService.js';
import { VectorRetrievalService } from '../application/retrieval/VectorRetrievalService.js';
import { createApp } from './app.js';
import { createChunkerProvider } from '../composition/createChunkerProvider.js';
import { createEmbeddingProvider } from '../composition/createEmbeddingProvider.js';
import { createLLMProvider } from '../composition/createLLMProvider.js';
import { createVectorStore } from '../composition/createVectorStore.js';
import { createDatabaseConfig } from '../config/database.config.js';
import { createEmbeddingConfig } from '../config/embedding.config.js';
import { createLLMConfig } from '../config/llm.config.js';
import { parseEnvironment } from '../config/env.js';
import { DirectoryLoaderProvider } from '../providers/document-loader/DirectoryLoaderProvider.js';

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
const ingestionService = new DocumentIngestionService(
    new DirectoryLoaderProvider(),
    createChunkerProvider().get('markdown'),
    new ChunkEmbeddingService(embeddingProvider),
    vectorStore,
);
const app = createApp({ ragService, ingestionService });

await vectorStore.initialize();
await app.listen({ host: environment.HOST ?? '0.0.0.0', port: environment.PORT ?? 3_000 });
