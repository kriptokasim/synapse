"use strict";
const electron = require("electron");
console.log("[Preload] Initializing Synapse Bridge...");
const api = {
  openDirectory: () => electron.ipcRenderer.invoke("dialog:openDirectory"),
  readDirectory: (path) => electron.ipcRenderer.invoke("fs:readDirectory", path),
  readFile: (path) => electron.ipcRenderer.invoke("fs:readFile", path),
  writeFile: (path, content) => electron.ipcRenderer.invoke("fs:writeFile", path, content)
};
try {
  electron.contextBridge.exposeInMainWorld("synapse", api);
} catch (error) {
  console.warn("[Preload] Failed to use contextBridge, falling back to window assignment:", error);
  window.synapse = api;
}
