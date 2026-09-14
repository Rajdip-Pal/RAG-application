import type { Document } from '../../core/types/Document.js';
import type { Chunker } from '../core/chunker.js';
import type { DocumentChunk } from '../core/document-chunk.js';
import type { ChunkIdGenerator } from '../core/chunk-id-generator.js';
import { DeterministicChunkIdGenerator } from '../core/chunk-id-generator.js';
import type { ChunkSizeCalculator } from '../core/chunk-size-calculator.js';
import { CharacterSizeCalculator } from '../core/chunk-size-calculator.js';
import { DEFAULT_CHUNKING_OPTIONS, validateChunkingOptions, type ChunkingOptions } from '../core/chunking-options.js';
import type { SentenceSplitter } from '../core/sentence-splitter.js';
import { BasicSentenceSplitter } from '../core/sentence-splitter.js';
import type { SourceSpan } from '../core/source-span.js';
import { MarkdownBlockParser, blockSourceSpan, type MarkdownBlock } from './markdown-block-parser.js';

interface ChunkUnit {
    readonly content: string;
    readonly startOffset: number;
    readonly endOffset: number;
    readonly paragraph: number;
    readonly headingPath: readonly string[];
    readonly sourceSpans: readonly SourceSpan[];
}

export interface MarkdownChunkerDependencies {
    readonly sizeCalculator?: ChunkSizeCalculator;
    readonly sentenceSplitter?: SentenceSplitter;
    readonly idGenerator?: ChunkIdGenerator;
    readonly blockParser?: MarkdownBlockParser;
}

/** Paragraph-first Markdown chunker with semantic fallback splitting and original-source offsets. */
export class MarkdownChunker implements Chunker {
    private readonly sizeCalculator: ChunkSizeCalculator;
    private readonly sentenceSplitter: SentenceSplitter;
    private readonly idGenerator: ChunkIdGenerator;
    private readonly blockParser: MarkdownBlockParser;

    public constructor(
        private readonly options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS,
        dependencies: MarkdownChunkerDependencies = {},
    ) {
        validateChunkingOptions(options);
        this.sizeCalculator = dependencies.sizeCalculator ?? new CharacterSizeCalculator();
        this.sentenceSplitter = dependencies.sentenceSplitter ?? new BasicSentenceSplitter();
        this.idGenerator = dependencies.idGenerator ?? new DeterministicChunkIdGenerator();
        this.blockParser = dependencies.blockParser ?? new MarkdownBlockParser();
    }

    public chunk(document: Document): DocumentChunk[] {
        if (!document.id.trim()) throw new TypeError('Document id must not be empty.');
        if (document.content.length === 0) return [];

        const blocks = this.blockParser.parse(document.content);
        const units = blocks.flatMap((block) => this.toUnits(block));
        const groups: ChunkUnit[][] = [];
        let current: ChunkUnit[] = [];

        for (const unit of units) {
            if (current.length > 0 && !sameHeadingPath(current[0]!.headingPath, unit.headingPath)) {
                groups.push(current);
                current = [];
            }
            if (current.length > 0 && this.sizeOf(current) + this.sizeOf([unit]) + 2 > this.options.maxSize) {
                groups.push(current);
                current = this.overlap(current, unit.headingPath);
                if (this.sizeOf(current) + this.sizeOf([unit]) + 2 > this.options.maxSize) {
                    current = [];
                }
            }
            if (this.sizeOf([unit]) > this.options.maxSize) {
                const pieces = this.splitOversizeUnit(unit);
                for (const piece of pieces) {
                    if (current.length > 0 && this.sizeOf(current) + this.sizeOf([piece]) + 2 > this.options.maxSize) {
                        groups.push(current);
                        current = this.overlap(current, piece.headingPath);
                        if (this.sizeOf(current) + this.sizeOf([piece]) + 2 > this.options.maxSize) {
                            current = [];
                        }
                    }
                    current.push(piece);
                    if (this.sizeOf(current) >= this.options.maxSize) {
                        groups.push(current);
                        current = [];
                    }
                }
            } else {
                current.push(unit);
            }
        }
        if (current.length > 0) groups.push(current);

        return groups.map((group, index) => this.createChunk(document, group, index));
    }

    private toUnits(block: MarkdownBlock): ChunkUnit[] {
        if (block.kind === 'paragraph' || block.kind === 'blockquote') {
            const ranges = this.sentenceSplitter.split(block.content);
            if (ranges.length > 1) {
                return ranges.map((range) => this.unit(block, range.startOffset, range.endOffset));
            }
        }
        if (block.kind === 'list' || block.kind === 'table') {
            if (this.sizeCalculator.calculate(block.content) <= this.options.maxSize) return [this.unit(block, 0, block.content.length)];
            const lines = [...block.content.matchAll(/.*(?:\r\n|\n|\r|$)/g)].filter((match) => match[0].length > 0);
            if (lines.length > 1) {
                const headerLines = block.kind === 'table' ? lines.slice(0, 2) : [];
                return lines.slice(headerLines.length).map((line) => {
                    const start = (line.index ?? 0) + block.startOffset;
                    const text = line[0].replace(/\r?\n$|\r$/, '');
                    const row = this.unit(block, start - block.startOffset, start - block.startOffset + text.length);
                    if (headerLines.length !== 2) return row;
                    const headerStart = headerLines[0]?.index ?? 0;
                    const headerEnd = (headerLines[1]?.index ?? 0) + headerLines[1]![0].replace(/\r?\n$|\r$/, '').length;
                    return {
                        ...row,
                        content: `${block.content.slice(headerStart, headerEnd)}\n${text}`,
                        sourceSpans: [
                            blockSourceSpan(block, block.startOffset + headerStart, block.startOffset + headerEnd),
                            ...row.sourceSpans,
                        ],
                    };
                });
            }
        }
        return [this.unit(block, 0, block.content.length)];
    }

    private unit(block: MarkdownBlock, relativeStart: number, relativeEnd: number): ChunkUnit {
        return {
            content: block.content.slice(relativeStart, relativeEnd),
            startOffset: block.startOffset + relativeStart,
            endOffset: block.startOffset + relativeEnd,
            paragraph: block.paragraph,
            headingPath: block.headingPath,
            sourceSpans: [blockSourceSpan(block, block.startOffset + relativeStart, block.startOffset + relativeEnd)],
        };
    }

    private splitOversizeUnit(unit: ChunkUnit): ChunkUnit[] {
        const pieces: ChunkUnit[] = [];
        let start = 0;
        while (start < unit.content.length) {
            let end = start;
            let lastWhitespace = -1;
            while (end < unit.content.length) {
                const next = end + 1;
                if (/\s/.test(unit.content[end] ?? '')) lastWhitespace = end;
                if (this.sizeCalculator.calculate(unit.content.slice(start, next)) > this.options.maxSize) break;
                end = next;
            }
            if (end === start) end = Math.min(start + this.options.maxSize, unit.content.length);
            else if (end < unit.content.length && lastWhitespace > start) end = lastWhitespace;
            pieces.push({
                ...unit,
                content: unit.content.slice(start, end),
                startOffset: unit.startOffset + start,
                endOffset: unit.startOffset + end,
                sourceSpans: [
                    {
                        paragraph: unit.paragraph,
                        startOffset: unit.startOffset + start,
                        endOffset: unit.startOffset + end,
                    },
                ],
            });
            start = end;
            while (/\s/.test(unit.content[start] ?? '')) start += 1;
        }
        return pieces;
    }

    private overlap(units: readonly ChunkUnit[], headingPath: readonly string[]): ChunkUnit[] {
        const result: ChunkUnit[] = [];
        let size = 0;
        for (let index = units.length - 1; index >= 0; index -= 1) {
            const unit = units[index]!;
            if (!sameHeadingPath(unit.headingPath, headingPath)) break;
            const nextSize = this.sizeCalculator.calculate(unit.content) + (result.length > 0 ? 2 : 0);
            if (size + nextSize > this.options.overlapSize) break;
            result.unshift(unit);
            size += nextSize;
        }
        return result;
    }

    private sizeOf(units: readonly ChunkUnit[]): number {
        const heading = units[0] ? renderHeadingPath(units[0].headingPath) : '';
        const content = [heading, ...units.map((unit) => unit.content)].filter(Boolean).join('\n\n');
        return this.sizeCalculator.calculate(content);
    }

    private createChunk(document: Document, units: readonly ChunkUnit[], chunkIndex: number): DocumentChunk {
        const headingPath = units[0]?.headingPath ?? [];
        const heading = renderHeadingPath(headingPath);
        const content = [heading, ...units.map((unit) => unit.content)].filter(Boolean).join('\n\n');
        const sourceSpans = units.flatMap((unit) => unit.sourceSpans);
        return {
            id: this.idGenerator.generate(document.id, chunkIndex, sourceSpans),
            documentId: document.id,
            content,
            metadata: {
                ...document.metadata,
                source: document.metadata.source,
                fileName: document.metadata.fileName,
                headingPath: [...headingPath],
                chunkIndex,
                sourceSpans,
            },
        };
    }
}

function sameHeadingPath(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function renderHeadingPath(path: readonly string[]): string {
    return path.map((heading, index) => `${'#'.repeat(index + 1)} ${heading}`).join('\n');
}
