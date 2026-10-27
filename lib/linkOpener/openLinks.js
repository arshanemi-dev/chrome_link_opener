'use client'

import { isApp } from './linkRules'

// Opens a selection — web links and desktop apps alike.
//
// In the desktop app (`desktop` = window.desktop): each web link opens in
// Chrome under its own profile, and each app is launched from its shortcut.
// In a browser tab: a web page can't pick the Chrome profile or start a
// program, so links open as new tabs and apps are skipped (`appsSkipped`).
// Browsers let one click open one pop-up; the rest go through only once the
// site may open pop-ups — `blocked` says how many didn't.
//
// → { opened, blocked, appsSkipped, failed: [message…] }
export async function openLinks(links, desktop) {
  const urls = links.filter((l) => !isApp(l))
  const apps = links.filter(isApp)

  if (desktop) {
    const failed = []
    let opened = 0
    if (urls.length) {
      const result = await desktop.openUrls(urls.map((l) => ({ url: l.link, profile: l.chromeProfile })))
      opened += result?.opened ?? 0
    }
    for (const app of apps) {
      const error = await desktop.launchApp(app.link, app.targetPath)
      if (error) failed.push(`${app.accountName || 'App'}: ${error}`)
      else opened++
    }
    return { opened, blocked: 0, appsSkipped: 0, failed }
  }

  let blocked = 0
  for (const { link } of urls) {
    const tab = window.open(link, '_blank')
    if (tab) tab.opener = null
    else blocked++
  }
  return { opened: urls.length - blocked, blocked, appsSkipped: apps.length, failed: [] }
}
