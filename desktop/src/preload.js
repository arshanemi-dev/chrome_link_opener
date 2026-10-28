const { contextBridge, ipcRenderer } = require('electron')

// `window.desktop` — the web app checks for it (lib/linkOpener/desktop.js) to
// switch on the desktop-only features. Only these calls cross over; the main
// process also refuses them from any page but the app's own.
const version = process.argv.find((a) => a.startsWith('--app-version='))?.slice('--app-version='.length) || ''

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  // This build's version — the web app forces an update when it isn't the live one.
  version,
  // → [{ name, shortcutPath, targetPath, icon }]
  scanShortcuts: () => ipcRenderer.invoke('desktop:scan-shortcuts'),
  // → '' when started, else a message
  launchApp: (shortcutPath, targetPath) => ipcRenderer.invoke('desktop:launch-app', { shortcutPath, targetPath }),
  // items: [{ url, profile }] → { opened, skipped, chrome }
  openUrls: (items) => ipcRenderer.invoke('desktop:open-urls', items),
  // → [{ dir, name }]
  listChromeProfiles: () => ipcRenderer.invoke('desktop:chrome-profiles'),
  // Downloads and starts the installer at `url`, then the app quits → '' when started, else a message
  installUpdate: (url) => ipcRenderer.invoke('desktop:install-update', url),
  retry: () => ipcRenderer.send('desktop:retry'),
})
