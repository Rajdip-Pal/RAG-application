export interface LLMRequest {
    readonly systemPrompt?: string;
    readonly userPrompt: string;
    readonly temperature?: number;
    readonly maxTokens?: number;
}
