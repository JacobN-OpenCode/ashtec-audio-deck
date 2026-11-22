// AshTec Audio Deck - Electron main process.
const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isSmoke = process.argv.includes('--smoke')

// Configs + autosaved session live in %APPDATA%/AshTec Audio Deck/
function configsDir() {
  const dir = path.join(app.getPath('userData'), 'configs')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
function sessionFile() {
  return path.join(app.getPath('userData'), 'session.json')
}
function safeName(name) {
  return String(name).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 80) || 'config'
}

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#14120d',
    title: 'AshTec Audio Deck',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  })
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'))

  // Show the real file location on right-click-open of external links.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (isSmoke) console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`did-fail-load: ${code} ${desc}`)
    if (isSmoke) app.exit(1)
  })
}

app.whenReady().then(() => {
  // The deck needs to list microphones-free output devices in the renderer.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(permission === 'media' || permission === 'fullscreen' || permission === 'mediaKeySystem')
  })
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    return permission === 'media' || permission === 'fullscreen' || permission === 'mediaKeySystem'
  })

  createWindow()

  if (isSmoke) {
    let failed = false
    win.webContents.on('console-message', (_e, level, message) => {
      if (level >= 3) {
        console.error(`renderer error: ${message}`)
        failed = true
      }
    })
    setTimeout(() => {
      console.log(failed ? 'SMOKE FAIL' : 'SMOKE OK')
      app.exit(failed ? 1 : 0)
    }, 4000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---- IPC ----

ipcMain.handle('pick-audio-files', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Add audio files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'] },
      { name: 'All files', extensions: ['*'] },
    ],
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('list-configs', () => {
  return fs
    .readdirSync(configsDir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
})

ipcMain.handle('save-config', (_e, name, data) => {
  const file = path.join(configsDir(), `${safeName(name)}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  return safeName(name)
})

ipcMain.handle('load-config', (_e, name) => {
  const file = path.join(configsDir(), `${safeName(name)}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8'))
})

ipcMain.handle('delete-config', (_e, name) => {
  const file = path.join(configsDir(), `${safeName(name)}.json`)
  if (fs.existsSync(file)) fs.unlinkSync(file)
  return true
})

ipcMain.handle('autosave', (_e, data) => {
  try {
    fs.writeFileSync(sessionFile(), JSON.stringify(data), 'utf8')
  } catch (_) {}
  return true
})

ipcMain.handle('autosave-load', () => {
  try {
    if (fs.existsSync(sessionFile())) return JSON.parse(fs.readFileSync(sessionFile(), 'utf8'))
  } catch (_) {}
  return null
})

ipcMain.handle('open-external', (_e, url) => {
  // Only the CrewHub origin is allowed out of the renderer.
  if (typeof url === 'string' && url.startsWith('https://ashtec.dino.icu')) {
    shell.openExternal(url)
    return true
  }
  return false
})
