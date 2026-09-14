import type { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { Runnable } from '@langchain/core/runnables';
import type { ZodType } from 'zod';
import type { LLMProvider } from '../../core/interfaces/LLMProvider.js';
import type { LLMProviderType } from '../../core/types/LLMProviderType.js';
import type { LLMRequest } from '../../core/types/LLMRequest.js';
import type { LLMResponse } from '../../core/types/LLMResponse.js';

export abstract class BaseLLMProvider implements LLMProvider {
    public readonly name: LLMProviderType;
    public readonly model: string;

    protected readonly chatModel: BaseChatModel;

    protected constructor(name: LLMProviderType, modelName: string, model: BaseChatModel) {
        this.name = name;
        this.model = modelName;
        this.chatModel = model;
    }

    public getModel(): BaseChatModel {
        return this.chatModel;
    }

    public invoke(messages: BaseMessageLike[]): Promise<AIMessageChunk> {
        return this.chatModel.invoke(messages);
    }

    public async generate(request: LLMRequest): Promise<LLMResponse> {
        const messages: BaseMessageLike[] = [];
        if (request.systemPrompt) messages.push(['system', request.systemPrompt]);
        messages.push(['human', request.userPrompt]);
        const response = await this.invoke(messages);
        return { text: messageContentToText(response.content) };
    }

    public withStructuredOutput<T extends Record<string, unknown>>(schema: ZodType<T>): Runnable<BaseLanguageModelInput, T> {
        return this.chatModel.withStructuredOutput<T>(schema);
    }
}

function messageContentToText(content: AIMessageChunk['content']): string {
    if (typeof content === 'string') return content;
    return content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('');
}
