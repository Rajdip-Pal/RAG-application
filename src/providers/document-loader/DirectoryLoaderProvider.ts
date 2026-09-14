import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { Document } from '@langchain/core/documents';

import { BaseDocumentLoaderProvider } from './BaseDocumentLoaderProvider.js';
import { MarkdownLoaderProvider } from './MarkdownLoaderProvider.js';

export class DirectoryLoaderProvider extends BaseDocumentLoaderProvider {
    private readonly markdownLoader: MarkdownLoaderProvider;

    public constructor(markdownLoader: MarkdownLoaderProvider = new MarkdownLoaderProvider()) {
        super();
        this.markdownLoader = markdownLoader;
    }

    public async load(source: string): Promise<Document[]> {
        const entries = await readdir(source, { withFileTypes: true });
        const markdownFiles = entries
            .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.md')
            .map((entry) => entry.name)
            .sort();

        const documents: Document[] = [];
        for (const fileName of markdownFiles) {
            documents.push(...(await this.markdownLoader.load(join(source, fileName))));
        }

        return documents;
    }
}
