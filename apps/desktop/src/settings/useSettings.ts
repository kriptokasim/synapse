import { useEffect, useState } from "react";
import { getSettings, onSettingsChanged, initSettingsStore } from "@synapse/settings";

let initialized = false;

export function useSettings() {
    const [settings, setSettings] = useState(() => {
        if (!initialized) {
            initSettingsStore();
            initialized = true;
        }
        return getSettings();
    });

    useEffect(() => {
        return onSettingsChanged(setSettings);
    }, []);

    return settings;
}
