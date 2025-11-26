import { ipcRenderer, contextBridge } from 'electron';

console.log('[Preload] Initializing Synapse Bridge...');

const api = {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    readDirectory: (path: string) => ipcRenderer.invoke('fs:readDirectory', path),
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
};

try {
    contextBridge.exposeInMainWorld('synapse', api);
} catch (error) {
    // Context isolation is disabled, so we fall back to window assignment.
    // This is expected behavior in this configuration.
    (window as any).synapse = api;
}
