const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");

let win;
let view;
const TABBAR_HEIGHT = 40;
const TOOLBAR_HEIGHT = 50;
const HEADER_HEIGHT = TABBAR_HEIGHT + TOOLBAR_HEIGHT;


// track tabs
let tabs = [];
let currentTab = null;

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

    win.loadFile("index.html");
    win.webContents.openDevTools();

    // create the first tab
    createTab("https://www.google.com");

    win.on("resize", () => {
        if (currentTab) {
            const bounds = win.getBounds();
            currentTab.view.setBounds({
                x: 0,
                y: TOOLBAR_HEIGHT,
                width: bounds.width,
                height: bounds.height - TOOLBAR_HEIGHT
            });
        }
    });
}


// Listen for search queries from renderer
ipcMain.on("search", (event, query) => {
    if (!query || !currentTab) return;
    const url = "https://www.google.com/search?q=" + encodeURIComponent(query);
    currentTab.view.webContents.loadURL(url);
    currentTab.url = url;
});


app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});


// manage tabs

ipcMain.on("new-tab", () => {
    createTab("https://www.google.com");
});

function createTab(url = "https://google.com") {
    const newView = new BrowserView();
    win.setBrowserView(newView);

    const bounds = win.getBounds()
    newView.setBounds({
        x: 0,
        y: TOOLBAR_HEIGHT,
        width: bounds.width,
        height: bounds.height - TOOLBAR_HEIGHT
    });

    newView.webContents.loadURL(url);

    const tab = { id: Date.now(), view: newView, url, title: "New Tab"};
    tabs.push(tab);
    switchTab(tab.id);

    win.webContents.send("update-tabs", tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url,
    isActive: t.id === currentTab?.id
})));

}

function switchTab(id) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;

    if (currentTab) {
        win.removeBrowserView(currentTab.view);
    }

    win.setBrowserView(tab.view);
    const bounds = win.getBounds();
    tab.view.setBounds({
        x: 0,
        y: TOOLBAR_HEIGHT,
        width: bounds.width,
        height: bounds.height - TOOLBAR_HEIGHT
    });

    currentTab = tab;

    win.webContents.send("update-tabs", tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url,
    isActive: t.id === currentTab?.id
})));

}

function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    const tab = tabs[idx];
    win.removeBrowserView(tab.view);
    tab.view.destroy();
    tabs.splice(idx, 1);

    if (tabs.length > 0) {
        switchTab(tabs[0].id);
    } else {
        currentTab = null;
    }

    win.webContents.send("update-tabs", tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url,
    isActive: t.id === currentTab?.id
})));

}