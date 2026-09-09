import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AnthropicConfig } from '../../core/types/LLMConfig.js';
import { BaseLLMProvider } from './BaseLLMProvider.js';

export class AnthropicProvider extends BaseLLMProvider {
    public constructor(config: AnthropicConfig, model?: BaseChatModel) {
        super(
            'anthropic',
            model ??
                new ChatAnthropic({
                    apiKey: config.apiKey,
                    model: config.model,
                    temperature: config.temperature,
                }),
        );
    }
}
