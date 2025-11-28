import React from "react";
import type { SynapseSettings, AIProviderId } from "@synapse/settings";

interface Props {
    draft: SynapseSettings;
    onDraftChange: (settings: SynapseSettings) => void;
}

export const ModelsSettingsTab: React.FC<Props> = ({ draft, onDraftChange }) => {
    const updateAI = (partial: Partial<SynapseSettings['ai']>) => {
        onDraftChange({
            ...draft,
            ai: { ...draft.ai, ...partial },
        });
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-aether-muted">Default Provider</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-aether-text">Provider</label>
                        <select
                            className="rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.ai.defaultProvider}
                            onChange={(e) => updateAI({ defaultProvider: e.target.value as AIProviderId })}
                        >
                            <option value="google">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="ollama">Ollama (Local)</option>
                        </select>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-aether-muted">Model Selection</h3>
                <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-aether-text">Chat Model</label>
                        <input
                            type="text"
                            className="w-full rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.ai.chatModel || ''}
                            onChange={(e) => updateAI({ chatModel: e.target.value })}
                            placeholder="e.g. gpt-4o, claude-3-5-sonnet..."
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-aether-text">Quick Edit Model</label>
                        <input
                            type="text"
                            className="w-full rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.ai.quickEditModel || ''}
                            onChange={(e) => updateAI({ quickEditModel: e.target.value })}
                            placeholder="e.g. gpt-4o-mini..."
                        />
                    </div>
                </div>
            </section>

            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-aether-muted">Parameters</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-aether-text">Temperature</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                className="w-32"
                                value={draft.ai.temperature}
                                onChange={(e) => updateAI({ temperature: parseFloat(e.target.value) })}
                            />
                            <span className="w-8 text-right text-xs text-aether-muted">{draft.ai.temperature}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-aether-text">Max Tokens</label>
                        <input
                            type="number"
                            className="w-20 rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.ai.maxTokens}
                            onChange={(e) => updateAI({ maxTokens: parseInt(e.target.value) || 1024 })}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};
