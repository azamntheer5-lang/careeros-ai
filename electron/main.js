const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null

// ─── Local settings store ──────────────────────────────────────────
const settingsPath = path.join(app?.getPath('userData') || '', 'careeros-settings.json')

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
  } catch {}
  return { theme: 'dark', language: 'en', lastModule: 'dashboard' }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch {}
}

// ─── Window creation ───────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CareerOS AI',
    backgroundColor: '#0a0f1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load the Next.js dev server or production build
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'out', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── Native menu ───────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Resume',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new-resume'),
        },
        {
          label: 'Import Document...',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('menu-action', 'import-document'),
        },
        { type: 'separator' },
        {
          label: 'Export PDF',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('menu-action', 'export-pdf'),
        },
        {
          label: 'Export DOCX',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow?.webContents.send('menu-action', 'export-docx'),
        },
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.print(),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' },
        { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('menu-action', 'nav-dashboard') },
        { label: 'Resume Engine', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('menu-action', 'nav-resume') },
        { label: 'ATS Intelligence', accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.webContents.send('menu-action', 'nav-ats') },
        { label: 'Interview Simulator', accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.webContents.send('menu-action', 'nav-interview') },
        { label: 'AI Career Coach', accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.webContents.send('menu-action', 'nav-coach') },
        { label: 'Job Tracker', accelerator: 'CmdOrCtrl+6', click: () => mainWindow?.webContents.send('menu-action', 'nav-jobs') },
        { type: 'separator' },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+K', click: () => mainWindow?.webContents.send('menu-action', 'command-palette') },
      ],
    },
    {
      label: 'Theme',
      submenu: [
        { label: 'Dark', click: () => mainWindow?.webContents.send('menu-action', 'theme-dark') },
        { label: 'Light', click: () => mainWindow?.webContents.send('menu-action', 'theme-light') },
        { label: 'Arabic (RTL)', click: () => mainWindow?.webContents.send('menu-action', 'lang-ar') },
        { label: 'English (LTR)', click: () => mainWindow?.webContents.send('menu-action', 'lang-en') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About CareerOS AI', click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'About CareerOS AI',
            message: 'CareerOS AI — The AI Career Operating System',
            detail: 'Version 1.0.0\nDesktop Edition\n\nThe world's most advanced AI-powered career platform.\n\n© 2026 CareerOS AI',
          })
        }},
        { label: 'GitHub Repository', click: () => shell.openExternal('https://github.com/azamntheer5-lang/careeros-ai') },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── IPC handlers ──────────────────────────────────────────────────

// File save dialog
ipcMain.handle('dialog:saveFile', async (event, { defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'export',
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  })
  return result.canceled ? null : result.filePath
})

// File open dialog
ipcMain.handle('dialog:openFile', async (event, { filters }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})

// Write file
ipcMain.handle('fs:writeFile', async (event, { path: filePath, data }) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// Read file
ipcMain.handle('fs:readFile', async (event, { path: filePath }) => {
  try {
    return { ok: true, data: Array.from(fs.readFileSync(filePath)) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// Settings
ipcMain.handle('settings:get', async () => loadSettings())
ipcMain.handle('settings:set', async (event, settings) => { saveSettings(settings); return { ok: true } })

// Print to PDF
ipcMain.handle('print:toPDF', async () => {
  try {
    const pdfData = await mainWindow.webContents.printToPDF({
      format: 'A4',
      printBackground: true,
      marginType: 0,
    })
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'careeros-resume.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (!result.canceled) {
      fs.writeFileSync(result.filePath, pdfData)
      return { ok: true, path: result.filePath }
    }
    return { ok: false, canceled: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// Print
ipcMain.handle('print:dialog', async () => {
  mainWindow.webContents.print()
  return { ok: true }
})

// ─── App lifecycle ─────────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
