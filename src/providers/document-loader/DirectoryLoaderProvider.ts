import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { Document } from '@langchain/core/documents';

import { BaseDocumentLoaderProvider } from './BaseDocumentLoaderProvider.js';
import { MarkdownLoaderProvider } from './MarkdownLoaderProvider.js';
import { TextLoaderProvider } from './TextLoaderProvider.js';

export class DirectoryLoaderProvider extends BaseDocumentLoaderProvider {
    private readonly markdownLoader: MarkdownLoaderProvider;
    private readonly textLoader: TextLoaderProvider;

    public constructor(
        markdownLoader: MarkdownLoaderProvider = new MarkdownLoaderProvider(),
        textLoader: TextLoaderProvider = new TextLoaderProvider(),
    ) {
        super();
        this.markdownLoader = markdownLoader;
        this.textLoader = textLoader;
    }

    public async load(source: string): Promise<Document[]> {
        const sourceStats = await stat(source);
        if (sourceStats.isFile()) return this.loadFile(source);

        const entries = await readdir(source, { withFileTypes: true });
        const supportedFiles = entries
            .filter((entry) => {
                const extension = extname(entry.name).toLowerCase();
                return entry.isFile() && (extension === '.md' || extension === '.markdown' || extension === '.txt');
            })
            .map((entry) => entry.name)
            .sort();

        const documents: Document[] = [];
        for (const fileName of supportedFiles) {
            const filePath = join(source, fileName);
            const loader = extname(fileName).toLowerCase() === '.txt' ? this.textLoader : this.markdownLoader;
            documents.push(...(await loader.load(filePath)));
        }

        return documents;
    }

    private loadFile(source: string): Promise<Document[]> {
        const extension = extname(source).toLowerCase();
        if (extension === '.txt') return this.textLoader.load(source);
        if (extension === '.md' || extension === '.markdown') return this.markdownLoader.load(source);
        throw new TypeError(`Unsupported document extension: ${source}`);
    }
}
