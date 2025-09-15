const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("api", {
    search: (query) => ipcRenderer.send("search", query)
})
