const fs = require('node:fs/promises')
const path = require('node:path')
const { app, shell } = require('electron')

// "Scan Applications": every .lnk shortcut on the user's own Desktop and the
// shared Public Desktop, resolved to its target with a 32px PNG icon — the
// list the web app shows for the user to pick from before saving.

function desktopFolders() {
  const folders = [app.getPath('desktop')] // follows OneDrive desktop redirection
  if (process.env.PUBLIC) folders.push(path.join(process.env.PUBLIC, 'Desktop'))
  return [...new Set(folders)]
}

async function iconFor(...candidates) {
  for (const file of candidates) {
    if (!file) continue
    try {
      const image = await app.getFileIcon(file, { size: 'normal' })
      if (!image.isEmpty()) return image.toDataURL()
    } catch {
      // no icon at that path — try the next one
    }
  }
  return null
}

async function readShortcut(file) {
  let details
  try {
    details = shell.readShortcutLink(file)
  } catch {
    return null // broken / unreadable shortcut
  }
  // This app's own desktop shortcut isn't something to add to itself.
  if (details.target && path.resolve(details.target) === path.resolve(process.execPath)) return null
  return {
    name: path.basename(file, path.extname(file)),
    shortcutPath: file,
    targetPath: details.target || '',
    // A custom icon (details.icon) wins; else the target's own; else the shortcut's.
    icon: await iconFor(details.icon, details.target, file),
  }
}

async function scanDesktopShortcuts() {
  const found = []
  const seen = new Set()
  for (const folder of desktopFolders()) {
    let entries = []
    try {
      entries = await fs.readdir(folder, { withFileTypes: true })
    } catch {
      continue // folder missing (no Public desktop, …)
    }
    for (const entry of entries) {
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.lnk') continue
      const shortcut = await readShortcut(path.join(folder, entry.name))
      // The same app on both desktops is listed once.
      const key = (shortcut?.targetPath || shortcut?.shortcutPath || '').toLowerCase()
      if (!shortcut || seen.has(key)) continue
      seen.add(key)
      found.push(shortcut)
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name))
}

// Launch a saved app: its shortcut (keeps the shortcut's arguments, working
// folder and run-as settings), or — if that shortcut was deleted — its target.
// Returns '' on success, else a message for the user.
async function launchApp({ shortcutPath, targetPath }) {
  for (const file of [shortcutPath, targetPath]) {
    if (typeof file !== 'string' || !path.isAbsolute(file)) continue
    if (!['.lnk', '.exe'].includes(path.extname(file).toLowerCase())) continue
    try {
      await fs.access(file)
    } catch {
      continue
    }
    const error = await shell.openPath(file)
    return error || ''
  }
  return 'This app was not found on this computer — its shortcut may have been moved or deleted.'
}

module.exports = { scanDesktopShortcuts, launchApp }
