'use client'

import { useMemo, useState } from 'react'
import { activeFilters, cellNumber, cellPasses, cellText, columnOptions, columnRange } from './columnFilter'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

// Sort + spreadsheet-style column filters over a list — the logic of
// tools/arshanemi-tools-5's DetailsTable, lifted out so the page around the
// table (select all, backup, open selected) acts on exactly the rows shown.
// `columns` = [{ key, numeric? }]; `cellOf(item, key)` → { raw, display }.
// A column's checklist offers what the OTHER columns' filters leave, the
// way a sheet does.
export function useTableView(items, columns, cellOf) {
  const [sort, setSort] = useState(null) // { key, dir }
  const [filters, setFilters] = useState({}) // { [columnKey]: { values, min, max } | null }

  const colKeys = columns.map((c) => c.key).join('\u0000')
  const applied = useMemo(() => activeFilters(filters, colKeys.split('\u0000')), [filters, colKeys])
  const passes = (item, except = null) => applied.every(([key, f]) => key === except || cellPasses(f, cellOf(item, key)))

  const view = useMemo(() => {
    let out = applied.length ? items.filter((it) => applied.every(([key, f]) => cellPasses(f, cellOf(it, key)))) : items
    if (sort?.key) {
      const dir = sort.dir === 'asc' ? 1 : -1
      out = [...out].sort((a, b) => {
        const av = cellOf(a, sort.key)?.raw
        const bv = cellOf(b, sort.key)?.raw
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
        return collator.compare(String(av ?? ''), String(bv ?? '')) * dir
      })
    }
    return out
    // cellOf is a pure reader of `items`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, applied, sort])

  return {
    sort,
    setSort,
    filters,
    setFilter: (key, f) => setFilters((prev) => ({ ...prev, [key]: f })),
    clearFilters: () => setFilters({}),
    filterCount: applied.length,
    view,
    optionsFor: (key) => columnOptions(items.filter((it) => passes(it, key)), (it) => cellText(cellOf(it, key)), (it) => cellOf(it, key)?.raw),
    rangeFor: (key) => columnRange(items.filter((it) => passes(it, key)), (it) => cellNumber(cellOf(it, key))),
  }
}
