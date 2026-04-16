const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Decide which screen to show based on if they have connected a DB
  if (!store.has('db-config')) {
    win.loadFile('setup.html'); 
  } else {
    win.loadFile('dashboard.html');
  }
}

app.whenReady().then(createWindow);
