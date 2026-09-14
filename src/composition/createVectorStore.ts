import type { DatabaseConfig } from '../core/types/DatabaseConfig.js';
import { PgVectorStore } from '../providers/vector-store/PgVectorStore.js';

export function createVectorStore(config: DatabaseConfig): PgVectorStore {
    return new PgVectorStore(config);
}
