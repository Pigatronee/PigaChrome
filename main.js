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
    title: "SearchAtronee",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + "/preload.js",
      sandbox: true
    }
  });

  win.loadFile("index.html");

  // Open DevTools in a separate window
  win.webContents.openDevTools({ mode: 'detach' });

  // First tab
  createTab();

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
function createTab(url) {
  const newView = new BrowserView({
    webPreferences: {
      preload: __dirname + "/preload.js",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.setBrowserView(newView);

  const bounds = win.getBounds();
  newView.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width: bounds.width,
    height: bounds.height - TOOLBAR_HEIGHT
  });

  if (url) {
    newView.webContents.loadURL(url);
  } else {
    newView.webContents.loadFile("start.html");
  }

  const tab = { id: Date.now(), view: newView, url: url || "about:blank", title: "New Tab", favicon: "Icons/pig-icon.png" };
  tabs.push(tab);
  switchTab(tab.id);

  // --- Listen for title updates ---
  newView.webContents.on("page-title-updated", (event, title) => {
    tab.title = title;
    updateRendererTabs(); // send updated tabs to your renderer
  });

  // --- Listen for favicon updates ---
  newView.webContents.on("page-favicon-updated", (event, favicons) => {
    if (favicons && favicons.length > 0) {
      tab.favicon = favicons[0];
      updateRendererTabs(); // send updated tabs to your renderer
    }
  });
}

function updateRendererTabs() {
  if (!win) return;
  win.webContents.send("update-tabs", tabs.map(t => ({
    id: t.id,
    url: t.url,
    title: t.title,
    favicon: t.favicon,
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
    y: HEADER_HEIGHT,
    width: bounds.width,
    height: bounds.height - HEADER_HEIGHT
  });

  currentTab = tab;
  updateRendererTabs()
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

  updateRendererTabs();
}

// ---------- IPC ----------
ipcMain.on("search", (event, query) => {
   console.log("Got search:", query); // <-- is this printed?
    if (!currentTab) return;

    const url = query.startsWith("http")
        ? query
        : "https://duckduckgo.com/?q=" + encodeURIComponent(query);

    currentTab.view.webContents.loadURL(url);
    currentTab.url = url;
});




ipcMain.on("new-tab", () => {
  createTab();
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

ipcMain.on("window-minimize", () => {
  if (win) win.minimize();
});

ipcMain.on("window-maximize", () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (win) win.close();
});
