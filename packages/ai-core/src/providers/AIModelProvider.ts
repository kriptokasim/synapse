import { LLMMessage, ModelConfig, LLMResponse, LLMStreamChunk } from '../types';

export interface AIModelProvider {
    readonly id: string;
    readonly name: string;

    generate(messages: LLMMessage[], config: ModelConfig): Promise<LLMResponse>;
    stream(messages: LLMMessage[], config: ModelConfig): AsyncGenerator<LLMStreamChunk>;
}
