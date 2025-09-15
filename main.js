const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");

let win;
let view;
const TOOLBAR_HEIGHT = 50; // height of your top bar

function createWindow() {
    win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: __dirname + "/preload.js",
            sandbox: true
        }
    });

    // Load your HTML with the top bar
    win.loadFile("index.html");
    win.webContents.openDevTools();

    // Create the BrowserView
    view = new BrowserView();
    win.setBrowserView(view);

    // Set initial bounds
    const bounds = win.getBounds();
    view.setBounds({
        x: 0,
        y: TOOLBAR_HEIGHT,
        width: bounds.width,
        height: bounds.height - TOOLBAR_HEIGHT
    });

    // Make BrowserView resize when the window resizes
    win.on("resize", () => {
        const bounds = win.getBounds();
        view.setBounds({
            x: 0,
            y: TOOLBAR_HEIGHT,
            width: bounds.width,
            height: bounds.height - TOOLBAR_HEIGHT
        });
    });
}

// Listen for search queries from renderer
ipcMain.on("search", (event, query) => {
    if (!query) return;
    const url = "https://www.google.com/search?q=" + encodeURIComponent(query);
    view.webContents.loadURL(url);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
