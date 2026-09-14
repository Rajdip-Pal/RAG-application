import type { Document } from '@langchain/core/documents';
import type { DocumentLoaderProvider } from '../../core/interfaces/DocumentLoaderProvider.js';

export abstract class BaseDocumentLoaderProvider implements DocumentLoaderProvider {
    public abstract load(source: string): Promise<Document[]>;
}
