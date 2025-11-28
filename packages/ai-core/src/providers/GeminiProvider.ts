import { AIModelProvider } from './AIModelProvider';
import { LLMMessage, ModelConfig, LLMResponse, LLMStreamChunk } from '../types';

export class GeminiProvider implements AIModelProvider {
    readonly id = 'gemini';
    readonly name = 'Google Gemini';

    async generate(messages: LLMMessage[], config: ModelConfig): Promise<LLMResponse> {
        const modelId = config.modelId || 'gemini-pro';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${config.apiKey}`;

        // Extract system instruction
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        // Map to Gemini format and ensure alternating roles starting with user
        let contents: any[] = [];
        let lastRole = '';

        for (const msg of conversationMessages) {
            const role = msg.role === 'user' ? 'user' : 'model';

            // Skip if it's the first message and it's not 'user' (Gemini requirement)
            if (contents.length === 0 && role !== 'user') {
                continue;
            }

            // Merge if same role as last
            if (role === lastRole) {
                const lastContent = contents[contents.length - 1];
                lastContent.parts[0].text += `\n\n${msg.content}`;
            } else {
                contents.push({
                    role,
                    parts: [{ text: msg.content }]
                });
                lastRole = role;
            }
        }

        // If no contents (e.g. only system message or only model messages), add a dummy user message
        if (contents.length === 0) {
            contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
        }

        const body: any = {
            contents,
            generationConfig: {
                temperature: config.temperature,
                maxOutputTokens: config.maxTokens
            }
        };

        if (systemMessage) {
            body.system_instruction = {
                parts: [{ text: systemMessage.content }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[GeminiProvider] API Error Body:', errorText);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
            content,
            usage: {
                inputTokens: data.usageMetadata?.promptTokenCount || 0,
                outputTokens: data.usageMetadata?.candidatesTokenCount || 0
            }
        };
    }

    async *stream(messages: LLMMessage[], config: ModelConfig): AsyncGenerator<LLMStreamChunk> {
        const modelId = config.modelId || 'gemini-pro';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${config.apiKey}&alt=sse`;

        const contents = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
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
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.slice(6);
                        if (jsonStr === '[DONE]') continue;

                        const data = JSON.parse(jsonStr);
                        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        if (content) {
                            yield { content, isComplete: false };
                        }
                    } catch (e) {
                        // ignore parse errors for partial chunks
                    }
                }
            }
        }
        yield { content: '', isComplete: true };
    }
}
