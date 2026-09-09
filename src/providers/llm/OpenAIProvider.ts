import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { OpenAIConfig } from '../../core/types/LLMConfig.js';
import { BaseLLMProvider } from './BaseLLMProvider.js';

export class OpenAIProvider extends BaseLLMProvider {
    public constructor(config: OpenAIConfig, model?: BaseChatModel) {
        super(
            'openai',
            model ??
                new ChatOpenAI({
                    apiKey: config.apiKey,
                    model: config.model,
                    temperature: config.temperature,
                }),
        );
    }
}
