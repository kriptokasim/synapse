import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public');

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(process.env.VITE_PUBLIC ?? __dirname, 'electron-vite.svg'),
        backgroundColor: '#fbf7ef', // Aether Cream
        frame: false,               // ⚡ FRAMELESS MODE
        autoHideMenuBar: true,      // ⚡ HIDE MENU BAR
        titleBarStyle: 'hidden',    // MacOS style
        webPreferences: {
            preload: path.join(__dirname, 'preload.ts'),
            nodeIntegration: true,
            contextIsolation: false,  // Prototype mode
        },
    });

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(process.env.DIST!, 'index.html'));
    }

    // --- IPC WINDOW CONTROLS ---
    ipcMain.on('window:minimize', () => win?.minimize());
    ipcMain.on('window:maximize', () => {
        if (win?.isMaximized()) win.unmaximize();
        else win?.maximize();
    });
    ipcMain.on('window:close', () => win?.close());
}

// --- ⚡ NEW IPC HANDLERS (FILE SYSTEM) ---

// 1. Open Directory Dialog
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    if (canceled) return null;
    return filePaths[0];
});

// 2. Read Directory (Simple Recursive)
// Note: Production apps should ignore node_modules, .git etc.
ipcMain.handle('fs:readDirectory', async (_, dirPath) => {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = entries.map((entry: any) => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.join(dirPath, entry.name),
        }));
        // Sort: Folders first, then files
        return files.sort((a: any, b: any) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
    } catch (e) {
        console.error(e);
        return [];
    }
});

// 3. Read File
ipcMain.handle('fs:readFile', async (_, filePath) => {
    return await fs.readFile(filePath, 'utf-8');
});

// 4. Write File
ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.whenReady().then(createWindow);
