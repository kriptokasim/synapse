import React, { useState } from "react";
import type { SynapseSettings } from "@synapse/settings";

import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { ModelsSettingsTab } from "./ModelsSettingsTab";

interface SettingsDialogProps {
    open: boolean;
    settings: SynapseSettings;
    onClose: () => void;
    onSave: (settings: SynapseSettings) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
    open,
    settings,
    onClose,
    onSave,
}) => {
    const [draft, setDraft] = useState<SynapseSettings>(settings);
    const [activeTab, setActiveTab] = useState<"general" | "models">("general");

    if (!open) return null;

    const handleSave = () => {
        onSave(draft);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
            <div className="w-[720px] max-h-[80vh] rounded-lg bg-white shadow-xl flex flex-col border border-aether-border">
                <div className="flex items-center justify-between border-b border-aether-border px-4 py-3 bg-gray-50/50 rounded-t-lg">
                    <h2 className="text-sm font-semibold text-aether-text">Settings</h2>
                    <button
                        onClick={onClose}
                        className="rounded px-2 py-1 text-xs text-aether-muted hover:bg-aether-border/40 transition-colors"
                    >
                        Esc
                    </button>
                </div>
                <div className="flex flex-1 overflow-hidden h-[500px]">
                    <div className="w-48 border-r border-aether-border bg-gray-50/30 text-xs py-2">
                        <button
                            className={`block w-full px-4 py-2 text-left transition-colors ${activeTab === "general"
                                    ? "bg-white text-aether-accent font-semibold border-l-2 border-aether-accent"
                                    : "text-aether-muted hover:bg-aether-border/20 border-l-2 border-transparent"
                                }`}
                            onClick={() => setActiveTab("general")}
                        >
                            General
                        </button>
                        <button
                            className={`block w-full px-4 py-2 text-left transition-colors ${activeTab === "models"
                                    ? "bg-white text-aether-accent font-semibold border-l-2 border-aether-accent"
                                    : "text-aether-muted hover:bg-aether-border/20 border-l-2 border-transparent"
                                }`}
                            onClick={() => setActiveTab("models")}
                        >
                            AI & Models
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-6 text-xs bg-white">
                        {activeTab === "general" && (
                            <GeneralSettingsTab draft={draft} onDraftChange={setDraft} />
                        )}
                        {activeTab === "models" && (
                            <ModelsSettingsTab draft={draft} onDraftChange={setDraft} />
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-aether-border px-4 py-3 bg-gray-50/50 rounded-b-lg">
                    <button
                        className="rounded px-3 py-1.5 text-xs font-medium text-aether-muted hover:bg-aether-border/40 transition-colors"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="rounded bg-aether-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-aether-accentHover shadow-sm transition-all"
                        onClick={handleSave}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
