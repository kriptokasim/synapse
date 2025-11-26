import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface AIProvider {
    id: string;
    name: string;
    generateCode(prompt: string, context: string): Promise<string>;
}

// 1. Google Gemini Implementation
class GeminiProvider implements AIProvider {
    id = 'gemini';
    name = 'Google Gemini';
    private client: any;

    constructor(apiKey: string, modelName: string = 'gemini-1.5-pro-latest') {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.client = genAI.getGenerativeModel({ model: modelName });
    }

    async generateCode(prompt: string, context: string): Promise<string> {
        try {
            const result = await this.client.generateContent(`CONTEXT:\n${context}\n\nTASK: ${prompt}`);
            return result.response.text();
        } catch (e) { return `Error: ${e}`; }
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

    async generateCode(prompt: string, context: string): Promise<string> {
        try {
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
