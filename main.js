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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + "/preload.js",
      sandbox: true
    }
  });

  win.loadFile("index.html");
  win.webContents.openDevTools();

  // First tab
  createTab("https://www.google.com");

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

// ---------- Tabs ----------
function createTab(url = "https://google.com") {
  const newView = new BrowserView();
  win.setBrowserView(newView);

  const bounds = win.getBounds();
  newView.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width: bounds.width,
    height: bounds.height - HEADER_HEIGHT
  });

  newView.webContents.loadURL(url);

  const tab = { id: Date.now(), view: newView, url, title: "New Tab" };
  tabs.push(tab);

  // update title dynamically
  newView.webContents.on("page-title-updated", (event, title) => {
    tab.title = title;
    sendTabsUpdate();
  });

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

  // ✅ Proper cleanup
  if (!tab.view.webContents.isDestroyed()) {
    tab.view.webContents.destroy();
  }

  tabs.splice(idx, 1);

  if (tabs.length > 0) {
    switchTab(tabs[0].id);
  } else {
    currentTab = null;
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

// ---------- IPC ----------
ipcMain.on("search", (event, query) => {
  if (!query || !currentTab) return;
  const url = query.startsWith("http") ? query : 
    "https://www.google.com/search?q=" + encodeURIComponent(query);
  currentTab.view.webContents.loadURL(url);
  currentTab.url = url;
});

ipcMain.on("new-tab", () => {
  createTab("https://www.google.com");
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
