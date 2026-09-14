import type { EmbeddingProvider } from '../core/interfaces/EmbeddingProvider.js';
import type { EmbeddingConfig } from '../core/types/EmbeddingConfig.js';
import { OllamaEmbeddingProvider } from '../providers/embedding/OllamaEmbeddingProvider.js';

export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
    return new OllamaEmbeddingProvider(config);
}
