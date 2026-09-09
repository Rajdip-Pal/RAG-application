import type { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { Runnable } from '@langchain/core/runnables';
import type { ZodType } from 'zod';
import type { LLMProvider } from '../../core/interfaces/LLMProvider.js';
import type { LLMProviderType } from '../../core/types/LLMProviderType.js';

export abstract class BaseLLMProvider implements LLMProvider {
    public readonly name: LLMProviderType;

    protected readonly model: BaseChatModel;

    protected constructor(name: LLMProviderType, model: BaseChatModel) {
        this.name = name;
        this.model = model;
    }

    public getModel(): BaseChatModel {
        return this.model;
    }

    public invoke(messages: BaseMessageLike[]): Promise<AIMessageChunk> {
        return this.model.invoke(messages);
    }

    public withStructuredOutput<T extends Record<string, unknown>>(schema: ZodType<T>): Runnable<BaseLanguageModelInput, T> {
        return this.model.withStructuredOutput<T>(schema);
    }
}
