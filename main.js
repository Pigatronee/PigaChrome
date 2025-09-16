const { app, BrowserWindow, BrowserView, ipcMain } = require("electron");

let win;
let tabs = [];
let currentTab = null;

// Heights
const TABBAR_HEIGHT = 40;
const TOOLBAR_HEIGHT = 50;
const HEADER_HEIGHT = TABBAR_HEIGHT + TOOLBAR_HEIGHT;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    titleBarStyle: "hidden",
    title: "PigaChrome",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + "/preload.js",
      sandbox: true
    }
  });

  win.loadFile("index.html");

  // First tab
createTab("https://duckduckgo.com/lite");

  // Resize handler
  win.on("resize", () => {
    if (currentTab) {
      const bounds = win.getBounds();
      currentTab.view.setBounds({
        x: 0,
        y: HEADER_HEIGHT,
        width: bounds.width,
        height: bounds.height - HEADER_HEIGHT
      });
    }
  });
}

function applyCustomStyle(view) {
  if (!view) return;

  const css = `
    body {
      background-color: #121212 !important;
      color: #e0e0e0 !important;
    }
    a { color: #bb86fc !important; }
    input, textarea {
      background-color: #1e1e1e !important;
      color: #e0e0e0 !important;
      border: 1px solid #555 !important;
    }
    table { border-color: #444 !important; }
  `;

  view.webContents.insertCSS(css)
    .then(() => console.log("Custom style applied"))
    .catch(err => console.error("Failed to inject CSS:", err));
}


// ---------- Tabs ----------
function createTab(url = "https://duckduckgo.com/lite") {
    const newView = new BrowserView();
    win.setBrowserView(newView);

    const bounds = win.getBounds();
    newView.setBounds({
        x: 0,
        y: TOOLBAR_HEIGHT,
        width: bounds.width,
        height: bounds.height - TOOLBAR_HEIGHT
    });

    newView.webContents.loadURL(url);

    newView.webContents.loadURL(url);

    // Inject your theme when the page finishes loading
    newView.webContents.on('did-finish-load', () => {
    applyCustomStyle(newView);
    });


    const tab = { id: Date.now(), view: newView, url, title: "New Tab"};
    tabs.push(tab);
    switchTab(tab.id);
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
    y: HEADER_HEIGHT,
    width: bounds.width,
    height: bounds.height - HEADER_HEIGHT
  });

  currentTab = tab;
  sendTabsUpdate();
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;

  const tab = tabs[idx];
  win.removeBrowserView(tab.view);

  // Proper cleanup
  if (!tab.view.webContents.isDestroyed()) {
    tab.view.webContents.destroy();
  }

  tabs.splice(idx, 1);

  if (tabs.length === 0) {
    // No tabs left → quit app
    app.quit();
    return;
  }

  // If we closed the current tab, switch to the first remaining tab
  if (currentTab.id === id) {
    switchTab(tabs[0].id);
  }

  sendTabsUpdate();
}



function sendTabsUpdate() {
  if (!win) return;
  win.webContents.send("update-tabs", tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url,
    isActive: t.id === currentTab?.id
  })));
}

// darkmiode


// ---------- IPC ----------
ipcMain.on("search", (event, query) => {
    if (!currentTab) return;

    const url = query.startsWith("http")
        ? query
        : "https://duckduckgo.com/?q=" + encodeURIComponent(query);

    currentTab.view.webContents.loadURL(url);
    currentTab.url = url;
});




ipcMain.on("new-tab", () => {
  createTab("https://duckduckgo.com/lite");
});

ipcMain.on("switch-tab", (event, id) => {
  switchTab(id);
});

ipcMain.on("close-tab", (event, id) => {
  closeTab(id);
});

// ---------- App lifecycle ----------
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
