import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MarkdownChunker } from '../src/chunking/markdown/markdown-chunker.js';
import type { Document } from '../src/core/types/Document.js';

function document(content: string): Document {
    return {
        id: 'document-1',
        content,
        metadata: { source: '/docs/employee-handbook.md', fileName: 'employee-handbook.md' },
    };
}

void test('returns no chunks for an empty document', () => {
    assert.deepEqual(new MarkdownChunker({ maxSize: 100, overlapSize: 10 }).chunk(document('')), []);
});

void test('preserves heading hierarchy and exact paragraph provenance', () => {
    const content = '# Employee Benefits\n\n## Leave Policy\n\nEmployees receive 18 days of annual leave.\n';
    const chunks = new MarkdownChunker({ maxSize: 200, overlapSize: 20 }).chunk(document(content));

    assert.equal(chunks.length, 1);
    assert.deepEqual(chunks[0]?.metadata.headingPath, ['Employee Benefits', 'Leave Policy']);
    assert.match(chunks[0]?.content ?? '', /# Employee Benefits\n## Leave Policy/);
    const startOffset = content.indexOf('Employees receive');
    const endOffset = startOffset + 'Employees receive 18 days of annual leave.'.length;
    assert.deepEqual(chunks[0]?.metadata.sourceSpans, [{ paragraph: 1, startOffset, endOffset }]);
    assert.equal(content.slice(startOffset, endOffset), 'Employees receive 18 days of annual leave.');
});

void test('chunks paragraphs before falling back to sentence and word boundaries', () => {
    const content = 'First sentence is here. Second sentence is here.\n\nA separate paragraph follows.';
    const chunks = new MarkdownChunker({ maxSize: 45, overlapSize: 5 }).chunk(document(content));

    assert.ok(chunks.length >= 2);
    assert.ok(chunks.every((chunk) => chunk.content.length <= 45));
    assert.ok(chunks.every((chunk) => chunk.metadata.sourceSpans.length > 0));
});

void test('keeps code blocks, lists, and table rows structurally intact when they fit', () => {
    const content = [
        '```ts',
        'const answer = 42;',
        '```',
        '',
        '- Authentication',
        '- Authorization',
        '',
        '| Role | Permission |',
        '| --- | --- |',
        '| Admin | Full |',
    ].join('\n');
    const chunks = new MarkdownChunker({ maxSize: 500, overlapSize: 20 }).chunk(document(content));

    assert.equal(chunks.length, 1);
    assert.match(chunks[0]?.content ?? '', /```ts\nconst answer = 42;\n```/);
    assert.match(chunks[0]?.content ?? '', /- Authentication\n- Authorization/);
    assert.match(chunks[0]?.content ?? '', /\| Admin \| Full \|/);
});

void test('overlap is deterministic and remains on semantic unit boundaries', () => {
    const content = 'Paragraph one has useful context.\n\nParagraph two follows.\n\nParagraph three concludes.';
    const chunker = new MarkdownChunker({ maxSize: 55, overlapSize: 30 });
    const first = chunker.chunk(document(content));
    const second = chunker.chunk(document(content));

    assert.deepEqual(first, second);
    assert.ok(first.length >= 2);
    assert.ok(first[1]?.content.includes('Paragraph one') || first[1]?.content.includes('Paragraph two'));
    assert.deepEqual(
        first.map((chunk) => chunk.id),
        second.map((chunk) => chunk.id),
    );
});

void test('rejects invalid sizing configuration', () => {
    assert.throws(() => new MarkdownChunker({ maxSize: 10, overlapSize: 10 }), /overlapSize/);
    assert.throws(() => new MarkdownChunker({ maxSize: 0, overlapSize: 0 }), /maxSize/);
});
