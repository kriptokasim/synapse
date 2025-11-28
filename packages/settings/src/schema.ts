export type AIProviderId = "openai" | "anthropic" | "google" | "ollama";

export type SynapseSettings = {
    theme: "light" | "dark" | "system";
    editor: {
        tabSize: number;
        fontSize: number;
        autoSave: "off" | "onFocusChange" | "afterDelay";
    };
    ai: {
        defaultProvider: AIProviderId;
        defaultModel: string;
        quickEditModel?: string;
        chatModel?: string;
        agentModel?: string;
        temperature: number;
        maxTokens: number;
    };
};

export const DEFAULT_SETTINGS: SynapseSettings = {
    theme: "dark",
    editor: {
        tabSize: 2,
        fontSize: 14,
        autoSave: "off",
    },
    ai: {
        defaultProvider: "google",
        defaultModel: "gemini-2.0-flash-exp",
        quickEditModel: "gemini-2.0-flash-exp",
        chatModel: "gpt-4o-mini",
        agentModel: "claude-3-5-sonnet-20241022",
        temperature: 0.2,
        maxTokens: 2048,
    },
};
