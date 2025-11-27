import { GoogleGenerativeAI } from "@google/generative-ai";


export type AIModelMode = 'fast' | 'standard' | 'thinking';

export interface GenerateOptions {
    mode: AIModelMode;
    image?: string;
}

export interface AIProvider {
    generateCode(prompt: string, context: string, options?: GenerateOptions): Promise<string>;
}

class GeminiProvider implements AIProvider {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async generateCode(prompt: string, context: string, options: GenerateOptions = { mode: 'standard' }): Promise<string> {
        let modelName = 'gemini-2.5-flash';

        // Enhanced Model Selection
        switch (options.mode) {
            case 'fast': modelName = 'gemini-2.5-pro'; break;
            case 'thinking': modelName = 'gemini-2.5-pro'; break; // The "Brain"
            default: modelName = 'gemini-2.5-pro'; break;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: modelName });

            const systemPrompt = `
            ROLE: You are Synapse, an elite Senior Frontend Engineer.
            TASK: Edit the code provided in the CONTEXT based on the USER REQUEST.
            
            CRITICAL RULES:
            1. Return ONLY the full, valid file code. No markdown fences (like \`\`\`tsx).
            2. Do not abbreviate code. 
            3. If an image is provided, replicate the design pixel-perfectly.
            4. Maintain existing imports and coding style.
            
            CONTEXT:
            ${context}
            `;

            const parts: any[] = [{ text: systemPrompt }, { text: `USER REQUEST: ${prompt}` }];

            if (options.image) {
                const cleanBase64 = options.image.replace(/^data:image\/\w+;base64,/, "");
                parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } });
            }

            const result = await model.generateContent(parts);
            let text = result.response.text();

            // Cleanup potential markdown residue
            text = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
            return text;

        } catch (e: any) {
            console.error("Gemini Error:", e);
            throw new Error(`AI Generation Failed: ${e.message}`);
        }
    }
}

export class SynapseFactory {
    static create(_provider: string, apiKey: string): AIProvider {
        return new GeminiProvider(apiKey); // Defaulting to Gemini for this demo
    }
}
