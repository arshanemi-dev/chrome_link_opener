// The built-in row icons — key (stored as "preset:<key>") and the name shown
// for it: in the icon dropdown's tooltips and as the Icon column's choices in
// the Excel backup. components/linkOpener/LinkIcon.jsx gives each its picture.

export const ICON_PRESET_LIST = [
  { key: 'globe', label: 'Website' },
  { key: 'cart', label: 'Marketplace' },
  { key: 'bag', label: 'Shop' },
  { key: 'store', label: 'Store' },
  { key: 'package', label: 'Orders' },
  { key: 'truck', label: 'Shipping' },
  { key: 'tag', label: 'Listings' },
  { key: 'receipt', label: 'Payments' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'card', label: 'Bank' },
  { key: 'chart', label: 'Reports' },
  { key: 'mail', label: 'Email' },
  { key: 'chat', label: 'Chat' },
  { key: 'phone', label: 'Phone' },
  { key: 'users', label: 'Team' },
  { key: 'briefcase', label: 'Client' },
  { key: 'building', label: 'Company' },
  { key: 'folder', label: 'Folder' },
  { key: 'doc', label: 'Document' },
  { key: 'sheet', label: 'Sheet' },
  { key: 'monitor', label: 'Computer' },
  { key: 'app', label: 'App' },
  { key: 'settings', label: 'Settings' },
  { key: 'star', label: 'Favourite' },
]

// Names for the two icons that aren't presets.
export const AUTO_ICON_LABEL = 'Auto'
export const OWN_ICON_LABEL = 'App’s own icon'

const LABEL_BY_KEY = Object.fromEntries(ICON_PRESET_LIST.map((p) => [p.key, p.label]))
const KEY_BY_LABEL = Object.fromEntries(ICON_PRESET_LIST.map((p) => [p.label.toLowerCase(), p.key]))

// A stored icon → its name ("Marketplace", "Auto", "App’s own icon").
export function iconLabel(icon) {
  if (!icon) return AUTO_ICON_LABEL
  if (icon.startsWith('data:')) return OWN_ICON_LABEL
  return LABEL_BY_KEY[icon.replace(/^preset:/, '')] ?? AUTO_ICON_LABEL
}

// A name (or an already-stored value) → the icon to store; `ownIcon` = the
// app's own picture, used for "App’s own icon". Unknown names → '' (Auto).
export function iconFromLabel(value, ownIcon = '') {
  const text = String(value ?? '').trim()
  if (text.startsWith('preset:') || text.startsWith('data:image/')) return text
  const name = text.toLowerCase()
  if (name === OWN_ICON_LABEL.toLowerCase() || name === "app's own icon") return ownIcon?.startsWith('data:image/') ? ownIcon : ''
  return KEY_BY_LABEL[name] ? `preset:${KEY_BY_LABEL[name]}` : ''
}
