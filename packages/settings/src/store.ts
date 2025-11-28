import { DEFAULT_SETTINGS, type SynapseSettings } from "./schema";

const STORAGE_KEY = "synapse.settings.v1";

let current: SynapseSettings = DEFAULT_SETTINGS;
const listeners = new Set<(settings: SynapseSettings) => void>();

function loadFromStorage(): SynapseSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function saveToStorage(settings: SynapseSettings) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
}

export function initSettingsStore() {
    current = loadFromStorage();
}

export function getSettings(): SynapseSettings {
    return current;
}

export function updateSettings(partial: Partial<SynapseSettings>) {
    current = {
        ...current,
        ...partial,
        editor: { ...current.editor, ...(partial.editor || {}) },
        ai: { ...current.ai, ...(partial.ai || {}) },
    };
    saveToStorage(current);
    listeners.forEach(fn => fn(current));
}

export function onSettingsChanged(fn: (settings: SynapseSettings) => void) {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}
