import { AIModelProvider } from './AIModelProvider';
import { ModelConfig } from '../types';

export class AIProviderRouter {
    private providers: Map<string, AIModelProvider> = new Map();
    private defaultProviderId: string = 'openai';

    registerProvider(provider: AIModelProvider) {
        this.providers.set(provider.id, provider);
    }

    getProvider(providerId: string): AIModelProvider | undefined {
        return this.providers.get(providerId);
    }

    getAllProviders(): AIModelProvider[] {
        return Array.from(this.providers.values());
    }

    setDefaultProvider(providerId: string) {
        if (this.providers.has(providerId)) {
            this.defaultProviderId = providerId;
        } else {
            throw new Error(`Provider ${providerId} not registered`);
        }
    }

    resolveProvider(config?: Partial<ModelConfig>): AIModelProvider {
        // If config specifies a provider (implicitly via modelId or explicit field if we had one), use it.
        // For now, we'll assume the config might eventually have a providerId, or we rely on defaults.
        // A simple heuristic: if modelId starts with 'claude', use anthropic.

        if (config?.modelId?.startsWith('claude')) {
            const anthropic = this.providers.get('anthropic');
            if (anthropic) return anthropic;
        }

        if (config?.modelId?.startsWith('gpt')) {
            const openai = this.providers.get('openai');
            if (openai) return openai;
        }

        return this.providers.get(this.defaultProviderId)!;
    }
}
