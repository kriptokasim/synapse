"use strict";
const electron = require("electron");
const fs = require("fs/promises");
const path = require("path");
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(__dirname, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  console.error("[Main] Preload path:", preloadPath);
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC ?? __dirname, "electron-vite.svg"),
    backgroundColor: "#fbf7ef",
    // Aether Cream
    frame: false,
    // ⚡ FRAMELESS MODE
    autoHideMenuBar: true,
    // ⚡ HIDE MENU BAR
    titleBarStyle: "hidden",
    // MacOS style
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: true,
      contextIsolation: false,
      // Prototype mode
      webSecurity: false
      // ⚡ CRITICAL: Allows iframe script injection
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
  win.webContents.on("console-message", (event, level, message, line, sourceId) => {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    console.log(`[Renderer][${levels[level]}] ${message} (${sourceId}:${line})`);
  });
  electron.ipcMain.on("window:minimize", () => win?.minimize());
  electron.ipcMain.on("window:maximize", () => {
    if (win?.isMaximized()) win.unmaximize();
    else win?.maximize();
  });
  electron.ipcMain.on("window:close", () => win?.close());
}
electron.ipcMain.handle("dialog:openDirectory", async () => {
  console.log("[Main] Opening directory dialog...");
  try {
    const { canceled, filePaths } = await electron.dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Project Folder",
      buttonLabel: "Open Project"
    });
    if (canceled) {
      console.log("[Main] Dialog canceled");
      return null;
    }
    console.log("[Main] Selected path:", filePaths[0]);
    return filePaths[0];
  } catch (error) {
    console.error("[Main] Dialog Error:", error);
    throw error;
  }
});
electron.ipcMain.handle("fs:readDirectory", async (_, dirPath) => {
  console.log("[Main] Reading directory:", dirPath);
  try {
    await fs.access(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name)
    }));
    return files.sort((a, b) => a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1);
  } catch (error) {
    console.error("[Main] ReadDir Error:", error);
    throw error;
  }
});
electron.ipcMain.handle("fs:readFile", async (_, filePath) => {
  console.log("[Main] Reading file:", filePath);
  return await fs.readFile(filePath, "utf-8");
});
electron.ipcMain.handle("fs:writeFile", async (_, filePath, content) => {
  console.log("[Main] Writing file:", filePath);
  await fs.writeFile(filePath, content, "utf-8");
  return true;
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.whenReady().then(createWindow);
