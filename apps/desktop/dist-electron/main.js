"use strict";
const electron = require("electron");
const path = require("path");
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(__dirname, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    backgroundColor: "#fbf7ef",
    // Matches Aether theme
    titleBarStyle: "hiddenInset",
    // Mac style
    webPreferences: {
      preload: path.join(__dirname, "preload.ts"),
      nodeIntegration: true,
      contextIsolation: false
      // For prototype speed (Secure later)
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.whenReady().then(createWindow);
