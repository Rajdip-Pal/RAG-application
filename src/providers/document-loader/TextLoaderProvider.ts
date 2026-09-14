import { extname } from 'node:path';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import type { Document } from '@langchain/core/documents';

import { BaseDocumentLoaderProvider } from './BaseDocumentLoaderProvider.js';

export class TextLoaderProvider extends BaseDocumentLoaderProvider {
    public async load(source: string): Promise<Document[]> {
        if (extname(source).toLowerCase() !== '.txt') {
            throw new TypeError(`TextLoaderProvider only supports .txt files: ${source}`);
        }

        return new TextLoader(source).load();
    }
}
