import { OpenAIProvider } from './src/providers/OpenAIProvider';
import { AnthropicProvider } from './src/providers/AnthropicProvider';
import { AIProviderRouter } from './src/providers/AIProviderRouter';

async function main() {
    console.log('Testing AI Core Providers...');

    const router = new AIProviderRouter();
    router.registerProvider(new OpenAIProvider());
    router.registerProvider(new AnthropicProvider());

    console.log('Registered Providers:', router.getAllProviders().map(p => p.name));

    const gptProvider = router.resolveProvider({ modelId: 'gpt-4o' });
    console.log('Resolved for gpt-4o:', gptProvider.name);

    const claudeProvider = router.resolveProvider({ modelId: 'claude-3-5-sonnet' });
    console.log('Resolved for claude-3-5-sonnet:', claudeProvider.name);

    // Mock fetch for actual call test
    global.fetch = async (url, init) => {
        console.log(`\n[MockFetch] Calling ${url}`);
        const body = JSON.parse(init?.body as string);
        console.log('[MockFetch] Model:', body.model);
        console.log('[MockFetch] Messages:', body.messages.length);

        return {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Mock response from OpenAI' } }],
                content: [{ text: 'Mock response from Anthropic' }], // Anthropic format
                usage: { prompt_tokens: 10, completion_tokens: 5, input_tokens: 10, output_tokens: 5 }
            }),
            body: {
                getReader: () => ({
                    read: async () => ({ done: true, value: new Uint8Array() })
                })
            }
        } as any;
    };

    console.log('\nTesting Generation...');
    const response = await gptProvider.generate(
        [{ role: 'user', content: 'Hello' }],
        { modelId: 'gpt-4o', apiKey: 'test-key' }
    );
    console.log('Response:', response.content);

    console.log('\nTests Completed.');
}

main().catch(console.error);
