import type { SourceSpan } from '../core/source-span.js';

export type MarkdownBlockKind = 'paragraph' | 'list' | 'table' | 'code' | 'blockquote';

export interface MarkdownBlock {
    readonly kind: MarkdownBlockKind;
    readonly content: string;
    readonly startOffset: number;
    readonly endOffset: number;
    readonly paragraph: number;
    readonly headingPath: readonly string[];
}

export interface MarkdownHeading {
    readonly level: number;
    readonly title: string;
}

function isHeading(line: string): MarkdownHeading | undefined {
    const match = /^(?: {0,3})(#{1,6})[ \t]+(.+?)\s*#*[ \t]*$/.exec(line);
    return match?.[1] && match[2] ? { level: match[1].length, title: match[2].trim() } : undefined;
}

function isFence(line: string): boolean {
    return /^ {0,3}(`{3,}|~{3,})/.test(line);
}

function isList(line: string): boolean {
    return /^ {0,3}(?:[-*+] |\d+[.)] )/.test(line);
}

function isTable(lines: readonly string[]): boolean {
    return lines.length >= 2 && lines[0]?.includes('|') === true && /^\s*\|?\s*:?-{3,}/.test(lines[1] ?? '');
}

function blockKind(lines: readonly string[]): MarkdownBlockKind {
    if (isTable(lines)) return 'table';
    if (isList(lines[0] ?? '')) return 'list';
    if (lines.every((line) => /^\s*>/.test(line))) return 'blockquote';
    return 'paragraph';
}

export class MarkdownBlockParser {
    public parse(content: string): MarkdownBlock[] {
        const lines = [...content.matchAll(/.*(?:\r\n|\n|\r|$)/g)].filter((match) => match[0].length > 0);
        const blocks: MarkdownBlock[] = [];
        const headingStack: string[] = [];
        let paragraph = 0;
        let index = 0;

        while (index < lines.length) {
            const line = lines[index]?.[0] ?? '';
            const lineText = line.replace(/\r?\n$|\r$/, '');
            const heading = isHeading(lineText);
            if (heading) {
                headingStack.length = heading.level - 1;
                headingStack[heading.level - 1] = heading.title;
                index += 1;
                continue;
            }
            if (lineText.trim() === '') {
                index += 1;
                continue;
            }

            const startLine = index;
            const collected: RegExpMatchArray[] = [lines[index]!];
            index += 1;
            let inFence = isFence(lineText);
            while (index < lines.length) {
                const nextLine = lines[index]?.[0] ?? '';
                const nextText = nextLine.replace(/\r?\n$|\r$/, '');
                if (inFence) {
                    collected.push(lines[index]!);
                    index += 1;
                    if (isFence(nextText)) inFence = false;
                    continue;
                }
                if (isFence(nextText) || nextText.trim() === '' || isHeading(nextText)) break;
                collected.push(lines[index]!);
                index += 1;
            }

            const startOffset = collected[0]!.index ?? 0;
            const last = collected[collected.length - 1]!;
            const endOffset = (last.index ?? startOffset) + last[0].replace(/\r?\n$|\r$/, '').length;
            const text = content.slice(startOffset, endOffset);
            const kind: MarkdownBlockKind = isFence(lineText)
                ? 'code'
                : blockKind(collected.map((item) => item[0].replace(/\r?\n$|\r$/, '')));
            paragraph += 1;
            blocks.push({ kind, content: text, startOffset, endOffset, paragraph, headingPath: headingStack.filter(Boolean) });
            void startLine;
        }

        return blocks;
    }
}

export function blockSourceSpan(block: MarkdownBlock, startOffset = block.startOffset, endOffset = block.endOffset): SourceSpan {
    return { paragraph: block.paragraph, startOffset, endOffset };
}
