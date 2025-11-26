import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export type AIModelMode = 'fast' | 'standard' | 'thinking';

export interface GenerateOptions {
    mode: AIModelMode;
    image?: string; // Base64 string
}

export interface AIProvider {
    id: string;
    name: string;
    generateCode(prompt: string, context: string, options?: GenerateOptions): Promise<string>;
}

// 1. Google Gemini Implementation (Yükseltilmiş)
class GeminiProvider implements AIProvider {
    id = 'gemini';
    name = 'Google Gemini';
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async generateCode(prompt: string, context: string, options: GenerateOptions = { mode: 'standard' }): Promise<string> {
        let modelName = 'gemini-2.5-flash';

        // Model Seçimi (Studio Mantığı)
        switch (options.mode) {
            case 'fast':
                modelName = 'gemini-2.5-flash-lite'; // Hızlı yanıtlar için
                break;
            case 'thinking':
                modelName = 'gemini-3-pro-preview'; // Derin düşünme (Refactoring için)
                break;
            case 'standard':
            default:
                modelName = 'gemini-2.5-flash'; // Dengeli
                break;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: modelName });

            // Sistem Promptu
            const systemPrompt = `
            You are Synapse, an expert React/Electron Engineer.
            TASK: Modify the code based on the user request.
            
            RULES:
            1. Output ONLY the COMPLETE updated file content.
            2. Do not use markdown code fences like \`\`\`typescript if possible.
            3. If an image is provided, use it as a visual reference for UI implementation.
            
            CONTEXT (Current File Content):
            ${context}
            `;

            const parts: any[] = [
                { text: systemPrompt },
                { text: `USER REQUEST: ${prompt}` }
            ];

            // Görsel Ekleme (Multimodal)
            if (options.image) {
                // Base64 başlığını temizle
                const cleanBase64 = options.image.includes('base64,')
                    ? options.image.split('base64,')[1]
                    : options.image;

                parts.push({
                    inlineData: {
                        mimeType: "image/png",
                        data: cleanBase64
                    }
                });
            }

            const result = await model.generateContent(parts);
            return result.response.text();

        } catch (e) {
            console.error("Gemini Error:", e);
            return `Error: ${e}`;
        }
    }
}

// 2. Anthropic Claude Implementation
class ClaudeProvider implements AIProvider {
    id = 'claude';
    name = 'Anthropic Claude';
    private client: Anthropic;

    constructor(apiKey: string) {
        this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    }

    async generateCode(prompt: string, context: string, _options?: GenerateOptions): Promise<string> {
        try {
            // Claude entegrasyonu şimdilik sadece metin tabanlı bırakıldı
            const msg = await this.client.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 4096,
                messages: [{ role: "user", content: `CONTEXT:\n${context}\n\nTASK: ${prompt}` }],
            });
            return (msg.content[0] as any).text;
        } catch (e) { return `Error: ${e}`; }
    }
}

// Factory
export class SynapseFactory {
    static create(provider: 'gemini' | 'claude' | 'openai', apiKey: string): AIProvider {
        switch (provider) {
            case 'gemini': return new GeminiProvider(apiKey);
            case 'claude': return new ClaudeProvider(apiKey);
            default: throw new Error("Provider not implemented yet");
        }
    }
}
