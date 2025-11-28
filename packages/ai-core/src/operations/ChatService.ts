import { AIProviderRouter } from '../providers/AIProviderRouter';
import { ContextService } from '../context/ContextService';
import { ModelConfig, LLMMessage, LLMResponse, LLMStreamChunk } from '../types';

export class ChatService {
    constructor(
        private router: AIProviderRouter,
        _contextService: ContextService
    ) { }

    async chat(
        history: LLMMessage[],
        userMessage: string,
        config?: Partial<ModelConfig>
    ): Promise<LLMResponse> {
        const provider = this.router.resolveProvider(config);
        const modelId = config?.modelId || 'gpt-4o';

        // Future: Parse userMessage for @file references and attach context
        // const context = await this.contextService.resolveReferences(userMessage);

        const messages = [
            ...history,
            { role: 'user' as const, content: userMessage }
        ];

        return provider.generate(messages, {
            modelId,
            apiKey: config?.apiKey,
            ...config
        });
    }

    async *streamChat(
        history: LLMMessage[],
        userMessage: string,
        config?: Partial<ModelConfig>
    ): AsyncGenerator<LLMStreamChunk> {
        const provider = this.router.resolveProvider(config);
        const modelId = config?.modelId || 'gpt-4o';

        const messages = [
            ...history,
            { role: 'user' as const, content: userMessage }
        ];

        yield* provider.stream(messages, {
            modelId,
            apiKey: config?.apiKey,
            ...config
        });
    }
}
