import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import type { Document } from '@langchain/core/documents';

import { BaseDocumentLoaderProvider } from './BaseDocumentLoaderProvider.js';

export class MarkdownLoaderProvider extends BaseDocumentLoaderProvider {
    public load(source: string): Promise<Document[]> {
        const loader = new TextLoader(source);

        return loader.load();
    }
}
