const { app, BrowserWindow } = require("electron")


// make window logic
const createWindow = ()  => {
    const window = new BrowserWindow({
        width: 800,
        height: 600
    })

    window.loadFile("index.html")

    window.webContents.openDevTools()
}

app.whenReady().then(() => {
    createWindow()

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})
