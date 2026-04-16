const { app, BrowserWindow, ipcMain } = require('electron');
const { Pool } = require('pg');
const { exec } = require('child_process'); // To run Python scripts
const Store = require('electron-store');
const store = new Store();

let win;

// Database Connection Bridge
ipcMain.handle('query-db', async (event, sql, params) => {
    const config = store.get('db-config');
    const pool = new Pool(config);
    try {
        const res = await pool.query(sql, params);
        return res.rows;
    } finally {
        await pool.end();
    }
});

// The Python Analysis Bridge (The "Tableau" Logic)
ipcMain.handle('run-python-analytics', async () => {
    return new Promise((resolve, reject) => {
        exec('python analytics.py', (error, stdout, stderr) => {
            if (error) reject(stderr);
            resolve(JSON.parse(stdout));
        });
    });
});

function createWindow() {
    win = new BrowserWindow({
        width: 1400, height: 900,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    store.has('db-config') ? win.loadFile('index.html') : win.loadFile('setup.html');
}

app.whenReady().then(createWindow);
