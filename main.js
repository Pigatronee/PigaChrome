const { app, BrowserWindow, BrowserView, ipcMain } = require("electron")

let win
let view

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: __dirname + "/preload.js", // see below
            sandbox: true
        }
    })

    win.loadFile("index.html")
    win.webContents.openDevTools()

    // Create the BrowserView that will show search results
    view = new BrowserView()
    win.setBrowserView(view)
    // leave space for the top bar (50px)
    view.setBounds({ x: 0, y: 50, width: 800, height: 550 })
}
app.whenReady().then(createWindow)

// Listen for search requests from renderer
ipcMain.on("search", (event, query) => {
    if (!query) return
    const url = "https://www.google.com/search?q=" + encodeURIComponent(query)
    view.webContents.loadURL(url)
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})
