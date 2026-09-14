export interface EmbeddingProvider {
    readonly dimensions: number;
    readonly model: string;

    embed(text: string): Promise<number[]>;

    embedBatch(texts: readonly string[]): Promise<number[][]>;
}
