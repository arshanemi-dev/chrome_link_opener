// Link rules shared by both stores (browser + account) — the admin panel's
// lib/linkOpener.js applies the same ones server-side, so a link that passes
// here isn't refused there.

export const GUEST_LINK_LIMIT = 10
export const TEXT_CHARS = 255
export const LINK_CHARS = 2048

export const EMPTY_DRAFT = { kind: 'url', chromeProfile: 'Default', link: '', groupName: '', accountName: '' }

const text = (v) => (v == null ? '' : String(v).trim())

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

// A desktop application (kind 'app'): its shortcut path, target and icon come
// from the scan and aren't edited — only the name and group are.
function cleanAppDraft(draft) {
  const fields = { groupName: text(draft.groupName), accountName: text(draft.accountName) }
  if (!text(draft.link)) return { error: 'This app has no shortcut path' }
  if (Object.values(fields).some((v) => v.length > TEXT_CHARS)) {
    return { error: `Name and group must be ${TEXT_CHARS} characters or fewer` }
  }
  return {
    link: { ...fields, kind: 'app', chromeProfile: '', link: text(draft.link), targetPath: draft.targetPath || null, icon: draft.icon || null },
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
    return { error: `Chrome profile, group and account name must be ${TEXT_CHARS} characters or fewer` }
  }
  return { link: { ...fields, kind: 'url', link } }
}

export const isApp = (link) => link?.kind === 'app'

export function matchesSearch(link, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [link.chromeProfile, link.link, link.groupName, link.accountName].some((v) => v?.toLowerCase().includes(q))
}

export const coinsLabel = (n) => `${n} coin${n === 1 ? '' : 's'}`
