import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { GeminiConfig } from '../../core/types/LLMConfig.js';
import { BaseLLMProvider } from './BaseLLMProvider.js';

export class GeminiProvider extends BaseLLMProvider {
    public constructor(config: GeminiConfig, model?: BaseChatModel) {
        super(
            'gemini',
            model ??
                new ChatGoogleGenerativeAI({
                    apiKey: config.apiKey,
                    model: config.model,
                    temperature: config.temperature,
                }),
        );
    }
}
