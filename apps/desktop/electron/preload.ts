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
    console.warn('[Preload] Failed to use contextBridge, falling back to window assignment:', error);
    (window as any).synapse = api;
}
