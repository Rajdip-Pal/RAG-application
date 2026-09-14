import { BGE_M3_DIMENSIONS } from '../constants/embedding.js';
import type { DatabaseConfig } from '../core/types/DatabaseConfig.js';
import { InvalidConfigurationError } from '../errors/ConfigurationErrors.js';
import type { Environment } from './env.js';

export function createDatabaseConfig(environment: Environment): DatabaseConfig {
    if (!environment.DATABASE_URL) {
        throw new InvalidConfigurationError('DATABASE_URL is required for the PostgreSQL vector store.');
    }
    return { connectionString: environment.DATABASE_URL, embeddingDimensions: BGE_M3_DIMENSIONS };
}
