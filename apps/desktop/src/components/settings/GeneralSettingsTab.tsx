import React from "react";
import type { SynapseSettings } from "@synapse/settings";

interface Props {
    draft: SynapseSettings;
    onDraftChange: (settings: SynapseSettings) => void;
}

export const GeneralSettingsTab: React.FC<Props> = ({ draft, onDraftChange }) => {
    const update = (
        partial: Partial<Omit<SynapseSettings, "editor" | "ai">> & {
            editor?: Partial<SynapseSettings["editor"]>;
            ai?: Partial<SynapseSettings["ai"]>;
        }
    ) => {
        onDraftChange({
            ...draft,
            ...partial,
            editor: { ...draft.editor, ...(partial.editor || {}) },
            ai: { ...draft.ai, ...(partial.ai || {}) },
        });
    };

    return (
        <div className="space-y-6">
            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-aether-muted">Appearance</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-aether-text">Theme</label>
                        <select
                            className="rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.theme}
                            onChange={(e) => update({ theme: e.target.value as any })}
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-aether-muted">Editor</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-aether-text">Font Size</label>
                        <input
                            type="number"
                            className="w-20 rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.editor.fontSize}
                            onChange={(e) => update({ editor: { fontSize: parseInt(e.target.value) || 12 } })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-aether-text">Tab Size</label>
                        <input
                            type="number"
                            className="w-20 rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.editor.tabSize}
                            onChange={(e) => update({ editor: { tabSize: parseInt(e.target.value) || 2 } })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-aether-text">Auto Save</label>
                        <select
                            className="rounded border border-aether-border bg-white px-2 py-1 text-xs text-aether-text outline-none focus:border-aether-accent"
                            value={draft.editor.autoSave}
                            onChange={(e) => update({ editor: { autoSave: e.target.value as any } })}
                        >
                            <option value="off">Off</option>
                            <option value="onFocusChange">On Focus Change</option>
                            <option value="afterDelay">After Delay</option>
                        </select>
                    </div>
                </div>
            </section>
        </div>
    );
};
