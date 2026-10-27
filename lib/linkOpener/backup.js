'use client'

import { cleanDraft } from './linkRules'

// Backup = a JSON file of the visible list; Restore reads that file back (or
// a CSV with the columns profile, link, group, account). Desktop apps travel
// in the JSON too (kind 'app' — path, target, icon). Restored links go
// through the same Add path as typed ones, so the same limits and charges
// apply.

const FIELDS = ['kind', 'chromeProfile', 'link', 'groupName', 'accountName', 'targetPath', 'icon']

export function downloadBackup(links) {
  const data = links.map((l) => Object.fromEntries(FIELDS.map((f) => [f, l[f] ?? (f === 'kind' ? 'url' : '')])))
  const blob = new Blob([JSON.stringify({ app: 'chrome-link-opener', version: 1, links: data }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `link-opener-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

function fromCsv(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim()).map(splitCsvLine)
  // A header row is skipped when its second cell isn't a link.
  if (rows.length && !/[./]/.test(rows[0][1] ?? '')) rows.shift()
  return rows.map(([chromeProfile, link, groupName, accountName]) => ({ chromeProfile, link, groupName, accountName }))
}

// → { links, skipped } — `skipped` counts rows that weren't valid links.
export async function readBackupFile(file) {
  const text = await file.text()
  let rows
  try {
    const parsed = JSON.parse(text)
    rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.links) ? parsed.links : null
  } catch {
    rows = null
  }
  if (!rows) rows = fromCsv(text)

  const links = []
  let skipped = 0
  for (const row of rows) {
    const cleaned = cleanDraft(row)
    if (cleaned.link) links.push(cleaned.link)
    else skipped++
  }
  return { links, skipped }
}
