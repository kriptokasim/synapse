import { AIModelProvider } from './AIModelProvider';
import { LLMMessage, ModelConfig, LLMResponse, LLMStreamChunk } from '../types';

export class AnthropicProvider implements AIModelProvider {
    readonly id = 'anthropic';
    readonly name = 'Anthropic';

    async generate(messages: LLMMessage[], config: ModelConfig): Promise<LLMResponse> {
        // Anthropic requires system message to be separate
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch(`${config.baseUrl || 'https://api.anthropic.com/v1'}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey || '',
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true' // Since we are in Electron/Browser
            },
            body: JSON.stringify({
                model: config.modelId,
                system: systemMessage?.content,
                messages: userMessages,
                max_tokens: config.maxTokens || 4096,
                temperature: config.temperature ?? 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.statusText} - ${error}`);
        }

        const data = await response.json();
        return {
            content: data.content[0].text,
            usage: {
                inputTokens: data.usage?.input_tokens || 0,
                outputTokens: data.usage?.output_tokens || 0
            }
        };
    }

    async *stream(messages: LLMMessage[], config: ModelConfig): AsyncGenerator<LLMStreamChunk> {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch(`${config.baseUrl || 'https://api.anthropic.com/v1'}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey || '',
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: config.modelId,
                system: systemMessage?.content,
                messages: userMessages,
                max_tokens: config.maxTokens || 4096,
                temperature: config.temperature ?? 0.7,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.statusText} - ${error}`);
        }

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.startsWith('event: ')) {
                    // Handle event types if needed
                }
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'content_block_delta' && data.delta?.text) {
                            yield { content: data.delta.text, isComplete: false };
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk', e);
                    }
                }
            }
        }
        yield { content: '', isComplete: true };
    }
}
