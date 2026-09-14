export interface ChunkSizeCalculator {
    calculate(text: string): number;
}

/** A replaceable initial size policy; a tokenizer-backed implementation can be injected later. */
export class CharacterSizeCalculator implements ChunkSizeCalculator {
    public calculate(text: string): number {
        return text.length;
    }
}
