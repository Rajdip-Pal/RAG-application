import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Document } from '@langchain/core/documents';
import { DirectoryLoaderProvider } from '../src/providers/document-loader/DirectoryLoaderProvider.js';
import { MarkdownLoaderProvider } from '../src/providers/document-loader/MarkdownLoaderProvider.js';
import { TextLoaderProvider } from '../src/providers/document-loader/TextLoaderProvider.js';
import { toDocument } from '../src/core/types/document-adapter.js';

async function withTemporaryDirectory<T>(callback: (directory: string) => Promise<T>): Promise<T> {
    const directory = await mkdtemp(join(tmpdir(), 'document-loader-'));

    try {
        return await callback(directory);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}

void test('loads a Markdown file into a LangChain Document', async () => {
    await withTemporaryDirectory(async (directory) => {
        const filePath = join(directory, 'leave-policy.md');
        const content = '# Leave Policy\n\nEmployees receive 20 days of annual leave.\n';
        await writeFile(filePath, content, 'utf8');

        const documents = await new MarkdownLoaderProvider().load(filePath);

        assert.equal(documents.length, 1);
        assert.ok(documents[0] instanceof Document);
        assert.equal(documents[0]?.pageContent, content);
        assert.equal(documents[0]?.metadata.source, filePath);
    });
});

void test('rejects when the Markdown file does not exist', async () => {
    await withTemporaryDirectory(async (directory) => {
        await assert.rejects(new MarkdownLoaderProvider().load(join(directory, 'missing.md')));
    });
});

void test('loads a TXT file as UTF-8 content with source metadata', async () => {
    await withTemporaryDirectory(async (directory) => {
        const filePath = join(directory, 'leave-policy.txt');
        const content = 'Employee leave policy.\n\nEmployees receive 20 days of annual leave.';
        await writeFile(filePath, content, 'utf8');

        const documents = await new TextLoaderProvider().load(filePath);

        assert.equal(documents.length, 1);
        assert.ok(documents[0] instanceof Document);
        assert.equal(documents[0]?.pageContent, content);
        assert.equal(documents[0]?.metadata.source, filePath);

        const normalized = toDocument(documents[0]!);
        assert.equal(normalized.metadata.source, filePath);
        assert.equal(normalized.metadata.fileName, 'leave-policy.txt');
        assert.equal(normalized.metadata.mimeType, 'text/plain');
        assert.match(normalized.id, /^[a-f0-9]{64}$/);
    });
});

void test('loads an empty TXT file as an empty document', async () => {
    await withTemporaryDirectory(async (directory) => {
        const filePath = join(directory, 'empty.txt');
        await writeFile(filePath, '', 'utf8');

        const documents = await new TextLoaderProvider().load(filePath);

        assert.equal(documents.length, 1);
        assert.equal(documents[0]?.pageContent, '');
        assert.equal(documents[0]?.metadata.source, filePath);
    });
});

void test('does not allow TextLoaderProvider to load unsupported extensions', async () => {
    await assert.rejects(new TextLoaderProvider().load('/tmp/policy.pdf'), /only supports \.txt files/);
});

void test('loads Markdown files from a directory and ignores other extensions', async () => {
    await withTemporaryDirectory(async (directory) => {
        await writeFile(join(directory, 'leave-policy.md'), '# Leave Policy', 'utf8');
        await writeFile(join(directory, 'remote-work.markdown'), '# Remote Work Markdown', 'utf8');
        await writeFile(join(directory, 'remote-work.md'), '# Remote Work', 'utf8');
        await writeFile(join(directory, 'leave-policy.txt'), 'Employees receive 20 days.', 'utf8');
        await writeFile(join(directory, 'ignored.pdf'), 'ignore this', 'utf8');

        const documents = await new DirectoryLoaderProvider().load(directory);
        const contents = documents.map((document) => document.pageContent);

        assert.equal(documents.length, 4);
        assert.deepEqual(contents, ['# Leave Policy', 'Employees receive 20 days.', '# Remote Work Markdown', '# Remote Work']);
        assert.equal(
            documents.some((document) => document.pageContent.includes('ignore this')),
            false,
        );
    });
});

void test('returns an empty array for an empty directory', async () => {
    await withTemporaryDirectory(async (directory) => {
        assert.deepEqual(await new DirectoryLoaderProvider().load(directory), []);
    });
});

void test('rejects when the directory does not exist', async () => {
    await withTemporaryDirectory(async (directory) => {
        await assert.rejects(new DirectoryLoaderProvider().load(join(directory, 'missing')));
    });
});
