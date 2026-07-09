const { contextBridge, ipcRenderer } = require('electron')

// ─── Expose safe APIs to the renderer ──────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),

  // File system
  writeFile: (opts) => ipcRenderer.invoke('fs:writeFile', opts),
  readFile: (opts) => ipcRenderer.invoke('fs:readFile', opts),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),

  // Print
  printToPDF: () => ipcRenderer.invoke('print:toPDF'),
  printDialog: () => ipcRenderer.invoke('print:dialog'),

  // Menu actions (receives from native menu)
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action)),

  // Platform info
  platform: process.platform,
  isElectron: true,
})
