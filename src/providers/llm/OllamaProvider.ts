import { ChatOllama } from '@langchain/ollama';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { OllamaConfig } from '../../core/types/LLMConfig.js';
import { BaseLLMProvider } from './BaseLLMProvider.js';

export class OllamaProvider extends BaseLLMProvider {
    public constructor(config: OllamaConfig, model?: BaseChatModel) {
        super(
            'ollama',
            model ??
                new ChatOllama({
                    model: config.model,
                    temperature: config.temperature,
                    baseUrl: config.baseUrl,
                }),
        );
    }
}
