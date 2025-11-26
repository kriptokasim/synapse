import { ipcRenderer, contextBridge } from 'electron';

// --- API DEFINITION ---
contextBridge.exposeInMainWorld('synapse', {
    // 1. Open Folder Dialog
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

    // 2. Read Directory Structure (Recursive)
    readDirectory: (path: string) => ipcRenderer.invoke('fs:readDirectory', path),

    // 3. Read File Content
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),

    // 4. Save File Content
    writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
});
