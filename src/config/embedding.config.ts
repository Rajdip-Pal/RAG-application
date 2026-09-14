import { BGE_M3_DIMENSIONS, BGE_M3_MODEL, DEFAULT_OLLAMA_BASE_URL } from '../constants/embedding.js';
import type { EmbeddingConfig } from '../core/types/EmbeddingConfig.js';
import type { Environment } from './env.js';

export function createEmbeddingConfig(environment: Environment): EmbeddingConfig {
    return {
        baseUrl: environment.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
        model: environment.OLLAMA_EMBEDDING_MODEL ?? BGE_M3_MODEL,
        dimensions: BGE_M3_DIMENSIONS,
    };
}
