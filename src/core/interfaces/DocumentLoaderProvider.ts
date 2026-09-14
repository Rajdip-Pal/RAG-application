import type { Document } from '@langchain/core/documents';

export interface DocumentLoaderProvider {
    load(source: string): Promise<Document[]>;
}
