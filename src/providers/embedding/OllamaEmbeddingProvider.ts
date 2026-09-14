import { BGE_M3_DIMENSIONS, BGE_M3_MODEL } from '../../constants/embedding.js';
import type { EmbeddingProvider } from '../../core/interfaces/EmbeddingProvider.js';
import type { EmbeddingConfig } from '../../core/types/EmbeddingConfig.js';
import { EmbeddingProviderError, InvalidEmbeddingError } from '../../errors/EmbeddingErrors.js';

interface OllamaEmbedResponse {
    readonly embeddings?: unknown;
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
    public readonly dimensions: number;
    public readonly model: string;
    private readonly endpoint: string;

    public constructor(
        config: EmbeddingConfig,
        private readonly fetchImplementation: typeof fetch = fetch,
    ) {
        if (config.model !== BGE_M3_MODEL) {
            throw new RangeError(`Ollama embedding model must be ${BGE_M3_MODEL}.`);
        }
        if (config.dimensions !== BGE_M3_DIMENSIONS) {
            throw new RangeError(`BGE-M3 dimensions must be ${BGE_M3_DIMENSIONS}.`);
        }
        this.dimensions = config.dimensions;
        this.model = config.model;
        this.endpoint = new URL('/api/embed', config.baseUrl).toString();
    }

    public async embed(text: string): Promise<number[]> {
        const embeddings = await this.request([text]);
        const embedding = embeddings[0];
        if (!embedding) throw new InvalidEmbeddingError('Ollama returned no embedding for the input text.');
        return embedding;
    }

    public embedBatch(texts: readonly string[]): Promise<number[][]> {
        if (texts.length === 0) return Promise.resolve([]);
        return this.request(texts);
    }

    private async request(texts: readonly string[]): Promise<number[][]> {
        let response: Response;
        try {
            response = await this.fetchImplementation(this.endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ model: this.model, input: texts }),
            });
        } catch (error) {
            throw new EmbeddingProviderError(`Unable to reach Ollama at ${this.endpoint}.`, error);
        }
        if (!response.ok) {
            throw new EmbeddingProviderError(`Ollama embedding request failed with HTTP ${response.status}.`);
        }
        let payload: OllamaEmbedResponse;
        try {
            payload = (await response.json()) as OllamaEmbedResponse;
        } catch (error) {
            throw new EmbeddingProviderError('Ollama returned invalid JSON.', error);
        }
        if (!Array.isArray(payload.embeddings) || payload.embeddings.length !== texts.length) {
            throw new InvalidEmbeddingError('Ollama returned an invalid number of embeddings.');
        }
        return payload.embeddings.map((value, index) => this.validateEmbedding(value, index));
    }

    private validateEmbedding(value: unknown, index: number): number[] {
        if (!Array.isArray(value) || !value.every((item): item is number => typeof item === 'number' && Number.isFinite(item))) {
            throw new InvalidEmbeddingError(`Ollama returned an invalid embedding at index ${index}.`);
        }
        if (value.length !== this.dimensions) {
            throw new InvalidEmbeddingError(`Ollama returned embedding dimension ${value.length}; expected ${this.dimensions}.`);
        }
        return value;
    }
}
