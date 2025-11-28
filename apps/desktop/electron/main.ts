import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public');

let win: BrowserWindow | null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
    const preloadPath = path.join(__dirname, 'preload.js');
    console.error('[Main] Preload path:', preloadPath);

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
            preload: preloadPath,
            nodeIntegration: true,
            contextIsolation: false,  // Prototype mode
            webSecurity: false,       // ⚡ CRITICAL: Allows iframe script injection
        },
    });

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(process.env.DIST!, 'index.html'));
    }

    // Pipe renderer logs to terminal
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        console.log(`[Renderer][${levels[level]}] ${message} (${sourceId}:${line})`);
    });

    // --- IPC WINDOW CONTROLS ---
    ipcMain.on('window:minimize', () => win?.minimize());
    ipcMain.on('window:maximize', () => {
        if (win?.isMaximized()) win.unmaximize();
        else win?.maximize();
    });
    ipcMain.on('window:close', () => win?.close());
}

// --- IPC HANDLERS (DEBUGGED) ---

// 1. Open Directory Dialog
ipcMain.handle('dialog:openDirectory', async () => {
    console.log('[Main] Opening directory dialog...');
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Project Folder',
            buttonLabel: 'Open Project'
        });

        if (canceled) {
            console.log('[Main] Dialog canceled');
            return null;
        }

        console.log('[Main] Selected path:', filePaths[0]);
        return filePaths[0];
    } catch (error) {
        console.error('[Main] Dialog Error:', error);
        throw error;
    }
});

// 2. Read Directory
ipcMain.handle('fs:readDirectory', async (_, dirPath) => {
    console.log('[Main] Reading directory:', dirPath);
    try {
        // Check if path exists
        await fs.access(dirPath);

        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = entries.map((entry: any) => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.join(dirPath, entry.name),
        }));

        // Filter out hidden files/node_modules for performance if needed
        // const filtered = files.filter(f => !f.name.startsWith('.') && f.name !== 'node_modules');

        return files.sort((a: any, b: any) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1));
    } catch (error) {
        console.error('[Main] ReadDir Error:', error);
        throw error; // Send error back to renderer
    }
});

// 3. Read File
ipcMain.handle('fs:readFile', async (_, filePath) => {
    console.log('[Main] Reading file:', filePath);
    return await fs.readFile(filePath, 'utf-8');
});

// 4. Write File
ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
    console.log('[Main] Writing file:', filePath);
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.whenReady().then(createWindow);
