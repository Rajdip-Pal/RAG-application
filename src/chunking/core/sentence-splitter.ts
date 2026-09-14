export interface SentenceRange {
    readonly startOffset: number;
    readonly endOffset: number;
}

export interface SentenceSplitter {
    split(text: string): SentenceRange[];
}

/** Deliberately conservative splitting that keeps punctuation and source offsets intact. */
export class BasicSentenceSplitter implements SentenceSplitter {
    public split(text: string): SentenceRange[] {
        const ranges: SentenceRange[] = [];
        const sentencePattern = /[^.!?\n]+(?:[.!?]+(?=\s|$)|(?=\n|$))/g;
        let match: RegExpExecArray | null;
        while ((match = sentencePattern.exec(text)) !== null) {
            const startOffset = match.index;
            const endOffset = startOffset + match[0].length;
            if (match[0].trim().length > 0) ranges.push({ startOffset, endOffset });
        }
        return ranges.length > 0 ? ranges : [{ startOffset: 0, endOffset: text.length }];
    }
}
