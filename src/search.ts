import 'dotenv/config';

import { VectorRetrievalService } from './application/retrieval/VectorRetrievalService.js';
import { createEmbeddingProvider } from './composition/createEmbeddingProvider.js';
import { createVectorStore } from './composition/createVectorStore.js';
import { createDatabaseConfig } from './config/database.config.js';
import { createEmbeddingConfig } from './config/embedding.config.js';
import { parseEnvironment } from './config/env.js';

const query = process.argv.slice(2).join(' ').trim();
if (!query) throw new Error('Usage: pnpm search "your question"');

const environment = parseEnvironment();
const embeddingProvider = createEmbeddingProvider(createEmbeddingConfig(environment));
const vectorStore = createVectorStore(createDatabaseConfig(environment));

try {
    await vectorStore.initialize();
    const retrieval = new VectorRetrievalService(embeddingProvider, vectorStore);
    const results = await retrieval.retrieve(query);
    console.log(JSON.stringify(results, null, 2));
} finally {
    await vectorStore.close();
}
