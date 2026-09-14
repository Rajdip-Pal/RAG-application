import 'dotenv/config';

import { DocumentIngestionService } from './application/ingestion/DocumentIngestionService.js';
import { createChunkerProvider } from './composition/createChunkerProvider.js';
import { createDirectoryLoaderProvider } from './composition/createDirectoryLoaderProvider.js';
import { createEmbeddingProvider } from './composition/createEmbeddingProvider.js';
import { createVectorStore } from './composition/createVectorStore.js';
import { createDatabaseConfig } from './config/database.config.js';
import { createEmbeddingConfig } from './config/embedding.config.js';
import { parseEnvironment } from './config/env.js';
import { ChunkEmbeddingService } from './application/embedding/ChunkEmbeddingService.js';

const environment = parseEnvironment();
const embeddingProvider = createEmbeddingProvider(createEmbeddingConfig(environment));
const vectorStore = createVectorStore(createDatabaseConfig(environment));
const loader = createDirectoryLoaderProvider();
const chunker = createChunkerProvider().get('markdown');
const ingestion = new DocumentIngestionService(loader, chunker, new ChunkEmbeddingService(embeddingProvider), vectorStore);

try {
    await vectorStore.initialize();
    const source = process.argv[2] ?? `${process.cwd()}/documents`;
    const chunks = await ingestion.ingest(source);
    console.log(`Ingested ${chunks.length} chunk(s) using ${embeddingProvider.model}.`);
    console.log(`Stored ${embeddingProvider.dimensions}-dimensional vectors in PostgreSQL.`);
} finally {
    await vectorStore.close();
}
