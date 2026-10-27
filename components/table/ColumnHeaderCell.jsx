'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import ColumnFilterButton from './ColumnFilterButton';

// One <th> body: label + tri-state sort toggle + a spreadsheet-style menu
// (ColumnFilterButton — the same sort as "Sort A → Z / Z → A", a Min / Max
// range on a number column, then search + tick the values to keep). Same as
// tools/arshanemi-tools-5's dashboard header cell, minus its column-arrange
// control. `col.sortable === false` = a plain label (e.g. Action).
// The <th> it sits in is the dark navy band (bg-footer, white text), so the
// sort / filter icons use white tones rather than the page's grey ones.
// filter shape: { values: [text, ...], min, max } | null — any of the three
// (lib/table/columnFilter.js)
// `getFilterOptions()` → the column's distinct values, read when the menu
// opens; `getFilterRange()` → { min, max } its numbers span, or null — pass
// it only for a number column (`col.numeric`).
// `onFilterOpenChange(open)` lets the table make room for the menu.
export default function ColumnHeaderCell({ col, sort, onSortChange, filter, onFilterChange, getFilterOptions = () => [], getFilterRange = null, onFilterOpenChange }) {
  const dir = sort?.key === col.key ? sort.dir : null;

  const cycleSort = () => {
    if (dir === null) onSortChange({ key: col.key, dir: 'asc' });
    else if (dir === 'asc') onSortChange({ key: col.key, dir: 'desc' });
    else onSortChange(null);
  };

  const SortIcon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ChevronsUpDown;

  // min-w-36 is the column's minimum width. The label never widens the
  // column ([contain:inline-size] gives it no intrinsic width) — it takes
  // whatever width the column ends up with (min-w, its values, or the
  // table stretched to full width) and wraps between words to fit, breaking
  // inside a word only when that one word is wider than the column.
  // `col.fit`: no minimum — the column is as narrow as its label and controls.
  return (
    <div className={`flex items-center justify-center gap-1 ${col.fit ? 'px-1.5' : 'min-w-36'}`}>
      <span className={col.fit ? 'whitespace-nowrap text-center' : 'min-w-0 flex-1 text-center break-words [contain:inline-size]'}>{col.label}</span>
      {col.sortable !== false && (
        <>
          <button
            type="button"
            onClick={cycleSort}
            className={`shrink-0 rounded p-0.5 transition-colors hover:bg-white/15 ${dir ? 'text-action' : 'text-white/60 hover:text-white'}`}
            aria-label={`Sort by ${col.label}`}
          >
            <SortIcon size={12} />
          </button>
          <ColumnFilterButton
            label={col.label}
            filter={filter}
            getOptions={getFilterOptions}
            getRange={getFilterRange}
            onChange={onFilterChange}
            onOpenChange={onFilterOpenChange}
            sortDir={dir}
            onSort={(d) => onSortChange(d ? { key: col.key, dir: d } : null)}
            onDark
          />
        </>
      )}
    </div>
  );
}
