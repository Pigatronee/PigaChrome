const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  search: (query) => ipcRenderer.send("search", query),
  newTab: () => ipcRenderer.send("new-tab"),
  switchTab: (id) => ipcRenderer.send("switch-tab", id),
  closeTab: (id) => ipcRenderer.send("close-tab", id),
  onUpdateTabs: (callback) => ipcRenderer.on("update-tabs", (event, tabs) => callback(tabs))
});
