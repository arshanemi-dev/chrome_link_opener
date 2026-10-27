'use client'

import { cleanDraft } from './linkRules'
import { ICON_PRESET_LIST, AUTO_ICON_LABEL, OWN_ICON_LABEL, iconLabel, iconFromLabel } from './iconPresets'

// Backup = an Excel workbook (.xlsx) holding the links shown as a formatted
// Excel table (header row, filter buttons, striped rows, clickable links).
// Restore reads such a sheet back — any .xlsx whose first sheet has these
// column headers (in any order) works, so a list kept or edited in Excel can
// be brought in too. Older .json / .csv backups still restore. Restored
// links go through the same Add path as typed ones, so the same limits and
// charges apply. exceljs is loaded only when Backup / Restore is used.
//
// Type and Icon are dropdowns in Excel (data validation, reaching EXTRA_ROWS
// past the data so rows added in Excel get them too), listing from a hidden
// "Lists" sheet: Type = URL / Application, Icon = Auto + every built-in icon's
// name. A dropdown holds text only, so a scanned app's own picture shows as
// "App’s own icon" and the picture itself rides in the hidden Icon Data column.

const SHEET = 'Links'
const LISTS_SHEET = 'Lists'
const EXTRA_ROWS = 200
const TYPE_CHOICES = ['URL', 'Application']
const ICON_CHOICES = [AUTO_ICON_LABEL, ...ICON_PRESET_LIST.map((p) => p.label), OWN_ICON_LABEL]

// Column → the link field it holds, and the header names Restore accepts for it.
const COLUMNS = [
  { field: 'kind', header: 'Type', width: 13, aliases: ['type', 'kind'] },
  { field: 'chromeProfile', header: 'Profile', width: 16, aliases: ['profile', 'chrome profile', 'chrome'] },
  // A web link or a Windows path — either way, what opens.
  { field: 'link', header: 'Link / Path', width: 50, aliases: ['link / path', 'link', 'url', 'path', 'website', 'shortcut path'] },
  { field: 'groupName', header: 'Group', width: 18, aliases: ['group', 'group name'] },
  { field: 'accountName', header: 'Account Name', width: 24, aliases: ['account name', 'account', 'name'] },
  // The row's icon by name (a dropdown); a scanned app's picture is in Icon Data.
  { field: 'icon', header: 'Icon', width: 18, aliases: ['icon'] },
  { field: 'iconData', header: 'Icon Data', width: 10, hidden: true, aliases: ['icon data'] },
]

const colLetter = (field) => String.fromCharCode(65 + COLUMNS.findIndex((c) => c.field === field))

// A dropdown over one column, from a range of the hidden Lists sheet.
function addDropdown(sheet, field, lastRow, listCol, count, title) {
  const col = colLetter(field)
  sheet.dataValidations.add(`${col}2:${col}${lastRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: [`${LISTS_SHEET}!$${listCol}$1:$${listCol}$${count}`],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: title,
    error: `Pick a ${title.toLowerCase()} from the dropdown.`,
  })
}

const loadExcel = () => import('exceljs').then((m) => m.default ?? m)

function saveFile(buffer, name, type) {
  const url = URL.createObjectURL(new Blob([buffer], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadBackup(links) {
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Barmeto Link Opener'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(SHEET, { views: [{ state: 'frozen', ySplit: 1 }] })

  const rows = links.map((l) => COLUMNS.map(({ field }) => {
    if (field === 'kind') return l.kind === 'app' ? TYPE_CHOICES[1] : TYPE_CHOICES[0]
    if (field === 'icon') return iconLabel(l.icon)
    if (field === 'iconData') return l.icon?.startsWith('data:') ? l.icon : ''
    return l[field] ?? ''
  }))
  sheet.addTable({
    name: 'LinkOpenerLinks',
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: COLUMNS.map((c) => ({ name: c.header, filterButton: true })),
    // An Excel table needs at least one row.
    rows: rows.length ? rows : [COLUMNS.map(() => '')],
  })
  COLUMNS.forEach((c, i) => {
    const column = sheet.getColumn(i + 1)
    column.width = c.width
    if (c.hidden) column.hidden = true
  })

  // The dropdowns' choices, on a sheet the user never sees.
  const lists = workbook.addWorksheet(LISTS_SHEET)
  lists.state = 'veryHidden'
  TYPE_CHOICES.forEach((v, i) => { lists.getCell(i + 1, 1).value = v })
  ICON_CHOICES.forEach((v, i) => { lists.getCell(i + 1, 2).value = v })
  const lastRow = Math.max(rows.length, 1) + 1 + EXTRA_ROWS
  addDropdown(sheet, 'kind', lastRow, 'A', TYPE_CHOICES.length, 'Type')
  addDropdown(sheet, 'icon', lastRow, 'B', ICON_CHOICES.length, 'Icon')

  // Web links clickable in Excel.
  const linkCol = COLUMNS.findIndex((c) => c.field === 'link') + 1
  links.forEach((l, i) => {
    if (l.kind !== 'app' && /^https?:\/\//i.test(l.link)) {
      sheet.getCell(i + 2, linkCol).value = { text: l.link, hyperlink: l.link }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveFile(buffer, `link-opener-backup-${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

// An exceljs cell value → plain text (hyperlinks, rich text and formulas included).
function cellText(value) {
  if (value == null) return ''
  if (typeof value !== 'object') return String(value).trim()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join('').trim()
  if (value.text != null) return cellText(value.text)
  if (value.hyperlink != null) return String(value.hyperlink).trim()
  if (value.result != null) return cellText(value.result)
  return ''
}

const norm = (s) => String(s ?? '').trim().toLowerCase()

async function rowsFromExcel(file) {
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet = workbook.getWorksheet(SHEET) ?? workbook.worksheets[0]
  if (!sheet) return []

  const grid = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = []
    row.eachCell({ includeEmpty: true }, (cell, col) => { cells[col - 1] = cellText(cell.value) })
    grid.push(cells)
  })
  if (!grid.length) return []

  // Columns found by their header names; a sheet without recognisable
  // headers is read as Profile, Link / Path, Group, Account Name.
  const header = grid[0].map(norm)
  const at = {}
  for (const c of COLUMNS) {
    const i = header.findIndex((h) => c.aliases.includes(h))
    if (i !== -1) at[c.field] = i
  }
  const hasHeader = at.link != null
  if (!hasHeader) Object.assign(at, { chromeProfile: 0, link: 1, groupName: 2, accountName: 3 })

  return grid.slice(hasHeader ? 1 : 0).map((cells) => {
    const row = Object.fromEntries(Object.entries(at).map(([field, i]) => [field, cells[i] ?? '']))
    // "Application" / "App" — or no Type column and a path where the link goes.
    const kind = norm(row.kind)
    row.kind = kind === 'application' || kind === 'app' || (!kind && /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(row.link ?? '')) ? 'app' : 'url'
    // An icon by name (the dropdown) — or a stored value from an older backup.
    row.icon = iconFromLabel(row.icon, row.iconData)
    delete row.iconData
    return row
  })
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

// Older backups: { links: [...] } JSON, or a CSV of profile, link, group, account.
async function rowsFromText(file) {
  const text = await file.text()
  try {
    const parsed = JSON.parse(text)
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.links) ? parsed.links : null
    if (rows) return rows
  } catch {
    // not JSON — CSV below
  }
  const rows = text.split(/\r?\n/).filter((l) => l.trim()).map(splitCsvLine)
  // A header row is skipped when its second cell isn't a link.
  if (rows.length && !/[./]/.test(rows[0][1] ?? '')) rows.shift()
  return rows.map(([chromeProfile, link, groupName, accountName]) => ({ chromeProfile, link, groupName, accountName }))
}

const isExcel = (file) => /\.xlsx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// → { links, skipped } — `skipped` counts rows that weren't valid links.
export async function readBackupFile(file) {
  const rows = isExcel(file) ? await rowsFromExcel(file) : await rowsFromText(file)
  const links = []
  let skipped = 0
  for (const row of rows) {
    // Wholly empty rows (Excel's blank table row) aren't counted as skipped.
    if (!row || !Object.values(row).some((v) => v && v !== 'url')) continue
    const cleaned = cleanDraft(row)
    if (cleaned.link) links.push(cleaned.link)
    else skipped++
  }
  return { links, skipped }
}
