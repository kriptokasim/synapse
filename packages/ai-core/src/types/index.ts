export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
    role: LLMRole;
    content: string;
}

export interface ModelConfig {
    modelId: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseUrl?: string;
}

export interface LLMResponse {
    content: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

export interface LLMStreamChunk {
    content: string;
    isComplete: boolean;
}

export interface CodePatch {
    filePath: string;
    originalContent: string;
    newContent: string;
    diff?: string;
}
