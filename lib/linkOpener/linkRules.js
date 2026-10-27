// Link rules shared by both stores (browser + account) — the admin panel's
// lib/linkOpener.js applies the same ones server-side, so a link that passes
// here isn't refused there.

export const GUEST_LINK_LIMIT = 10
export const TEXT_CHARS = 255
export const LINK_CHARS = 2048

export const EMPTY_DRAFT = { kind: 'url', chromeProfile: 'Default', link: '', groupName: '', accountName: '', icon: '' }

const text = (v) => (v == null ? '' : String(v).trim())

// Same rules as the admin panel: an absolute Windows path (C:\… or \\server\share\…),
// and an icon that is a built-in ("preset:…") or a PNG data URL.
const WINDOWS_PATH_RE = /^(?:[a-zA-Z]:\\|\\\\[^\\]+\\[^\\]+)/
const ICON_RE = /^(?:data:image\/png;base64,[A-Za-z0-9+/]+=*|preset:[a-z0-9-]{1,40})$/
const cleanIcon = (raw) => (ICON_RE.test(text(raw)) ? text(raw) : null)

// Switching a draft between URL and Application — the profile only means
// something for a URL, and a scanned app's icon only for that app.
export function withKind(draft, kind) {
  if (draft.kind === kind) return draft
  return {
    ...draft,
    kind,
    chromeProfile: kind === 'app' ? '' : draft.chromeProfile || 'Default',
    icon: draft.icon?.startsWith('data:') ? '' : draft.icon,
  }
}

// Accepts "example.com" too — a bare host is what people usually type.
export function normalizeLink(raw) {
  const value = text(raw)
  if (!value) return null
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withScheme)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

// A desktop application (kind 'app'): `link` is the path the desktop app
// opens — a scanned shortcut, or any program / file / folder typed in. The
// quotes Explorer's "Copy as path" adds are dropped, and C:/a/b becomes C:\a\b.
function cleanAppDraft(draft) {
  let path = text(draft.link).replace(/^"(.*)"$/, '$1').trim()
  if (/^[a-zA-Z]:\//.test(path)) path = path.replace(/\//g, '\\')
  if (!WINDOWS_PATH_RE.test(path)) return { error: 'Enter the full path, e.g. C:\\Program Files\\App\\app.exe' }
  if (path.length > LINK_CHARS) return { error: `Paths must be ${LINK_CHARS} characters or fewer` }
  const fields = { groupName: text(draft.groupName), accountName: text(draft.accountName) }
  if (Object.values(fields).some((v) => v.length > TEXT_CHARS)) {
    return { error: `Name and group must be ${TEXT_CHARS} characters or fewer` }
  }
  return {
    link: { ...fields, kind: 'app', chromeProfile: '', link: path, targetPath: draft.targetPath || null, icon: cleanIcon(draft.icon) },
  }
}

// { link } ready to save, or { error } to show the user.
export function cleanDraft(draft) {
  if (draft?.kind === 'app') return cleanAppDraft(draft)
  const link = normalizeLink(draft?.link)
  if (!link) return { error: 'Enter a valid link, e.g. https://seller.example.com' }
  if (link.length > LINK_CHARS) return { error: `Links must be ${LINK_CHARS} characters or fewer` }
  const fields = {
    chromeProfile: text(draft.chromeProfile) || 'Default',
    groupName: text(draft.groupName),
    accountName: text(draft.accountName),
  }
  if (Object.values(fields).some((v) => v.length > TEXT_CHARS)) {
    return { error: `Profile, group and account name must be ${TEXT_CHARS} characters or fewer` }
  }
  return { link: { ...fields, kind: 'url', link, icon: cleanIcon(draft.icon) } }
}

export const isApp = (link) => link?.kind === 'app'

export function matchesSearch(link, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [link.chromeProfile, link.link, link.groupName, link.accountName].some((v) => v?.toLowerCase().includes(q))
}

export const coinsLabel = (n) => `${n} coin${n === 1 ? '' : 's'}`
