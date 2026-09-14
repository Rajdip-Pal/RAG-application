import type { AIMessageChunk, BaseMessageLike } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { Runnable } from '@langchain/core/runnables';
import type { ZodType } from 'zod';
import type { LLMProviderType } from '../types/LLMProviderType.js';
import type { LLMRequest } from '../types/LLMRequest.js';
import type { LLMResponse } from '../types/LLMResponse.js';

export interface LLMProvider {
    readonly name: LLMProviderType;
    readonly model: string;

    getModel(): BaseChatModel;

    invoke(messages: BaseMessageLike[]): Promise<AIMessageChunk>;

    generate(request: LLMRequest): Promise<LLMResponse>;

    withStructuredOutput<T extends Record<string, unknown>>(schema: ZodType<T>): Runnable<BaseLanguageModelInput, T>;
}
