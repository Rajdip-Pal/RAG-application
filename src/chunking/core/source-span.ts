/** A half-open range in the original document content, retained for future citations. */
export interface SourceSpan {
    readonly paragraph: number;
    readonly startOffset: number;
    readonly endOffset: number;
    readonly [key: string]: unknown;
}
