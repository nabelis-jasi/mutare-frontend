const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveCredentials: (creds) => ipcRenderer.invoke('db:save-credentials', creds),
  getCredentials: () => ipcRenderer.invoke('db:get-credentials'),
  query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
  queueLog: (operation, tableName, data) => ipcRenderer.invoke('db:queue-log', operation, tableName, data),
  syncNow: () => ipcRenderer.invoke('db:sync-now'),
  getAssetProfile: (assetId) => ipcRenderer.invoke('asset:profile', assetId),
});
