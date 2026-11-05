'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import ColumnFilterButton from './ColumnFilterButton';

// One <th> body: label + tri-state sort toggle + a spreadsheet-style menu
// (ColumnFilterButton — the same sort as "Sort A → Z / Z → A", a Min / Max
// range on a number column, then search + tick the values to keep). Same as
// tools/arshanemi-tools-5's dashboard header cell, minus its column-arrange
// control. `col.sortable === false` = a plain label (e.g. Action).
// Sort and filter icons are hidden by default to consume minimum space,
// and show smoothly on hover (active sort/filter icons stay visible).
export default function ColumnHeaderCell({
  col,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  getFilterOptions = () => [],
  getFilterRange = null,
  onFilterOpenChange,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const dir = sort?.key === col.key ? sort.dir : null;

  const cycleSort = () => {
    if (dir === null) onSortChange({ key: col.key, dir: 'asc' });
    else if (dir === 'asc') onSortChange({ key: col.key, dir: 'desc' });
    else onSortChange(null);
  };

  const SortIcon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ChevronsUpDown;

  const handleFilterOpenChange = (open) => {
    setFilterOpen(open);
    onFilterOpenChange?.(open);
  };

  const hasFilter = !!filter;
  const hasActiveIcon = !!dir || hasFilter || filterOpen;

  return (
    <div className={`group/cell relative flex items-center justify-center gap-1 ${col.fit ? 'px-1.5' : 'min-w-36'}`}>
      <span className={col.fit ? 'whitespace-nowrap text-center' : 'min-w-0 flex-1 text-center break-words [contain:inline-size]'}>{col.label}</span>
      {col.sortable !== false && (
        <span className={`items-center gap-0.5 shrink-0 ${hasActiveIcon ? 'inline-flex' : 'hidden group-hover/cell:inline-flex'}`}>
          <button
            type="button"
            onClick={cycleSort}
            className={`shrink-0 rounded p-0.5 transition-colors hover:bg-white/15 ${
              dir ? 'inline-flex text-action' : 'hidden group-hover/cell:inline-flex text-white/60 hover:text-white'
            }`}
            aria-label={`Sort by ${col.label}`}
          >
            <SortIcon size={12} />
          </button>
          <span className={hasFilter || filterOpen ? 'inline-flex' : 'hidden group-hover/cell:inline-flex'}>
            <ColumnFilterButton
              label={col.label}
              filter={filter}
              getOptions={getFilterOptions}
              getRange={getFilterRange}
              onChange={onFilterChange}
              onOpenChange={handleFilterOpenChange}
              sortDir={dir}
              onSort={(d) => onSortChange(d ? { key: col.key, dir: d } : null)}
              onDark
            />
          </span>
        </span>
      )}
    </div>
  );
}
