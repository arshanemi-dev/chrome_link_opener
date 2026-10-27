const { contextBridge, ipcRenderer } = require('electron')

// `window.desktop` — the web app checks for it (lib/linkOpener/desktop.js) to
// switch on the desktop-only features. Only these four calls cross over; the
// main process also refuses them from any page but the app's own.
contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  // → [{ name, shortcutPath, targetPath, icon }]
  scanShortcuts: () => ipcRenderer.invoke('desktop:scan-shortcuts'),
  // → '' when started, else a message
  launchApp: (shortcutPath, targetPath) => ipcRenderer.invoke('desktop:launch-app', { shortcutPath, targetPath }),
  // items: [{ url, profile }] → { opened, skipped, chrome }
  openUrls: (items) => ipcRenderer.invoke('desktop:open-urls', items),
  // → [{ dir, name }]
  listChromeProfiles: () => ipcRenderer.invoke('desktop:chrome-profiles'),
  retry: () => ipcRenderer.send('desktop:retry'),
})
