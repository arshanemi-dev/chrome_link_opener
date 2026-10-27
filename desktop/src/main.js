const path = require('node:path')
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron')
const { APP_ORIGIN, START_URL } = require('./config')
const { scanDesktopShortcuts, launchApp } = require('./shortcuts')
const { listChromeProfiles, openUrls } = require('./chrome')

// Barmeto Link Opener — Windows desktop app. One window showing the hosted
// web app; the preload (src/preload.js) adds `window.desktop`, which the web
// app uses for what a browser tab can't do: scan Desktop shortcuts, launch
// saved apps, and open links in their own Chrome profile.

let win = null

const isAppOrigin = (url) => {
  try {
    return new URL(url).origin === APP_ORIGIN
  } catch {
    return false
  }
}

const isWebUrl = (url) => /^https?:\/\//i.test(url)

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 560,
    title: 'Barmeto Link Opener',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  // Pop-ups (an "Add coins" link, a link the user clicks) open in the
  // default browser — never in a second app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  // Leaving the app's own site (e.g. a link without target=_blank) does the same.
  win.webContents.on('will-navigate', (event, url) => {
    if (isAppOrigin(url)) return
    event.preventDefault()
    if (isWebUrl(url)) shell.openExternal(url)
  })

  // Offline / server down → a local page with a Retry button.
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return // -3 = aborted by a newer navigation
    win.loadFile(path.join(__dirname, 'offline.html'), { query: { url: url || START_URL } })
  })

  win.loadURL(START_URL)
}

// The bridge only answers the app's own pages — not the offline page, not any
// other site that might end up in the window.
function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isAppOrigin(event.senderFrame?.url ?? '')) throw new Error('Not allowed')
    return fn(...args)
  })
}

handle('desktop:scan-shortcuts', () => scanDesktopShortcuts())
handle('desktop:launch-app', (target) => launchApp(target ?? {}))
handle('desktop:open-urls', (items) => openUrls(items))
handle('desktop:chrome-profiles', () => listChromeProfiles())
// offline.html's Retry — reloads the app, nothing else.
ipcMain.on('desktop:retry', () => win?.loadURL(START_URL))

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    createWindow()
  })
  app.on('window-all-closed', () => app.quit())
}
