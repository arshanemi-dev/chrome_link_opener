const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { shell } = require('electron')

// Opening links in a specific Chrome profile — the one thing the web page
// can't do. Chrome is started with --profile-directory=<folder>; the profile
// column may hold either that folder ("Default", "Profile 2") or the name
// shown in Chrome ("Work"), which is looked up in Chrome's own Local State.

function userDataDir() {
  return process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data') : null
}

function findChrome() {
  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]
  return candidates.find((p) => p && fs.existsSync(p)) ?? null
}

// [{ dir, name }] — every profile Chrome knows on this computer.
function listChromeProfiles() {
  const dir = userDataDir()
  if (!dir) return []
  try {
    const state = JSON.parse(fs.readFileSync(path.join(dir, 'Local State'), 'utf8'))
    const cache = state?.profile?.info_cache ?? {}
    return Object.entries(cache)
      .map(([folder, info]) => ({ dir: folder, name: info?.name || folder }))
      .sort((a, b) => (a.dir === 'Default' ? -1 : b.dir === 'Default' ? 1 : a.name.localeCompare(b.name)))
  } catch {
    return []
  }
}

// The profile folder for what the user typed, or null (Chrome's last-used
// profile) — never an unknown folder, which would make Chrome create a new
// empty profile.
function resolveProfile(value, profiles) {
  const wanted = String(value ?? '').trim().toLowerCase()
  if (!wanted) return null
  const match = profiles.find((p) => p.dir.toLowerCase() === wanted) ?? profiles.find((p) => p.name.toLowerCase() === wanted)
  return match?.dir ?? null
}

const isWebUrl = (value) => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

// items: [{ url, profile }]. One Chrome launch per profile, all its tabs at
// once. No Chrome installed → the default browser. Returns { opened, skipped }.
function openUrls(items) {
  const list = Array.isArray(items) ? items : []
  const valid = list.filter((i) => i && isWebUrl(i.url))
  const skipped = list.length - valid.length
  const chrome = findChrome()
  if (!chrome) {
    for (const { url } of valid) shell.openExternal(url)
    return { opened: valid.length, skipped, chrome: false }
  }
  const profiles = listChromeProfiles()
  const byProfile = new Map()
  for (const { url, profile } of valid) {
    const dir = resolveProfile(profile, profiles)
    if (!byProfile.has(dir)) byProfile.set(dir, [])
    byProfile.get(dir).push(url)
  }
  for (const [dir, urls] of byProfile) {
    const args = dir ? [`--profile-directory=${dir}`, ...urls] : urls
    spawn(chrome, args, { detached: true, stdio: 'ignore' }).unref()
  }
  return { opened: valid.length, skipped, chrome: true }
}

module.exports = { listChromeProfiles, openUrls }
