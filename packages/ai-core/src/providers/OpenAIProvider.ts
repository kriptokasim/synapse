import { AIModelProvider } from './AIModelProvider';
import { LLMMessage, ModelConfig, LLMResponse, LLMStreamChunk } from '../types';

export class OpenAIProvider implements AIModelProvider {
    readonly id = 'openai';
    readonly name = 'OpenAI';

    async generate(messages: LLMMessage[], config: ModelConfig): Promise<LLMResponse> {
        const response = await fetch(`${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.modelId,
                messages: messages,
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxTokens,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.choices[0].message.content,
            usage: {
                inputTokens: data.usage?.prompt_tokens || 0,
                outputTokens: data.usage?.completion_tokens || 0
            }
        };
    }

    async *stream(messages: LLMMessage[], config: ModelConfig): AsyncGenerator<LLMStreamChunk> {
        const response = await fetch(`${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.modelId,
                messages: messages,
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxTokens,
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
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
                if (line.trim() === 'data: [DONE]') return;
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices[0]?.delta?.content || '';
                        if (content) {
                            yield { content, isComplete: false };
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
