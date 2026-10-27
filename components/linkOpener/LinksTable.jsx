'use client';

import { useState } from 'react';
import { ExternalLink, Pencil, RefreshCw, Link2, Plus, Loader2, Play } from 'lucide-react';
import ColumnHeaderCell from '@/components/table/ColumnHeaderCell';
import TablePager, { DEFAULT_PAGE_SIZE } from '@/components/table/TablePager';
import styles from '@/components/table/DataTable.module.css';
import { coinsLabel, isApp } from '@/lib/linkOpener/linkRules';
import { AppIcon } from './ScanAppsModal';

const PROFILE_LIST_ID = 'clo-chrome-profiles';
// tools-5's header band.
const HEAD = 'bg-[#1565C0] px-1 py-1 text-center font-medium text-white';
const input =
  'h-8 w-full min-w-[7rem] rounded-md border border-accent/60 bg-surface px-2.5 text-xs text-foreground placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// The inline Add / Edit row — one cell per column, in the table's own order.
// `cost` = coins this save charges (0 = free). A desktop app's shortcut path
// isn't editable — only its name and group.
function EditRow({ columns, draft, onChange, onSave, onCancel, saving, error, cost }) {
  const app = isApp(draft);
  const field = (key, placeholder, autoFocus, list) => (
    <input
      autoFocus={autoFocus}
      list={list}
      value={draft[key] ?? ''}
      onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave();
        if (e.key === 'Escape') onCancel();
      }}
      placeholder={placeholder}
      className={input}
    />
  );
  const cellFor = (key) => {
    switch (key) {
      case 'type': return <span className="text-xs text-subtle">{app ? 'App' : 'Link'}</span>;
      case 'profile': return app ? <span className="text-xs text-subtle">—</span> : field('chromeProfile', 'Default', false, PROFILE_LIST_ID);
      case 'link':
        return app ? (
          <span className="inline-flex max-w-[26rem] items-center gap-2 text-xs">
            <AppIcon src={draft.icon} size={16} />
            <span className="truncate font-mono text-subtle" title={draft.targetPath || draft.link}>{draft.targetPath || draft.link}</span>
          </span>
        ) : <div className="min-w-[16rem]">{field('link', 'https://…', true)}</div>;
      case 'group': return field('groupName', 'Group');
      case 'account': return field('accountName', app ? 'App name' : 'Account name', app);
      default: return null;
    }
  };
  return (
    <>
      <tr data-active="true">
        <td className="px-3 py-2" />
        {columns.map((c) => <td key={c.key} className="px-2 py-2">{cellFor(c.key)}</td>)}
        <td className="px-2 py-2">
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md bg-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {cost > 0 ? `Save · ${coinsLabel(cost)}` : 'Save'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="h-8 rounded-md border border-divider-light px-2.5 text-xs text-muted transition-colors hover:bg-card-hover"
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
      {error && (
        <tr data-active="true">
          <td colSpan={columns.length + 2} className="px-4 pb-2 text-xs text-neg">{error}</td>
        </tr>
      )}
    </>
  );
}

function ViewRow({ columns, link, selected, onToggle, onOpen, onEdit, onRenew, busy, desktop }) {
  const app = isApp(link);
  // A browser tab can't start a program — apps open from the desktop app only.
  const canOpen = !app || !!desktop;
  const cellFor = (key) => {
    switch (key) {
      case 'type':
        return app
          ? <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">App</span>
          : <span className="text-xs text-subtle">Link</span>;
      case 'profile': return app ? <span className="text-subtle">—</span> : <span className="font-mono">{link.chromeProfile}</span>;
      case 'link':
        return app ? (
          <span className="inline-flex max-w-[26rem] items-center gap-2">
            <AppIcon src={link.icon} size={18} />
            <span className="truncate font-mono text-muted" title={link.targetPath || link.link}>{link.targetPath || link.link}</span>
          </span>
        ) : (
          <a href={link.link} target="_blank" rel="noopener noreferrer" className="inline-block max-w-[26rem] truncate align-middle font-mono text-link hover:underline" title={link.link}>
            {link.link}
          </a>
        );
      case 'group': return link.groupName || <span className="text-subtle">—</span>;
      case 'account': return link.accountName || <span className="text-subtle">—</span>;
      case 'status':
        return link.expired ? (
          <span className="rounded bg-neg/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neg">Expired</span>
        ) : (
          <span className="text-xs">
            <span className="font-semibold text-pos">Active</span>
            {link.paidUntil && <span className="block text-[10px] text-subtle">{link.autoRenew ? 'Renews' : 'Ends'} {shortDate(link.paidUntil)}</span>}
          </span>
        );
      default: return null;
    }
  };
  return (
    <tr data-selected={selected} className="transition-colors">
      <td className="px-3 py-2.5">
        <input type="checkbox" checked={selected} onChange={onToggle} className="accent-[var(--color-action)]" aria-label={`Select ${link.accountName || link.link}`} />
      </td>
      {columns.map((c) => (
        <td key={c.key} className={`px-3 py-2.5 text-xs text-foreground ${link.expired ? 'opacity-70' : ''}`}>{cellFor(c.key)}</td>
      ))}
      <td className="px-2 py-2">
        <div className="flex items-center justify-center gap-1.5">
          {link.expired ? (
            <button
              type="button"
              onClick={onRenew}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-accent px-2.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
            >
              <RefreshCw size={12} /> Renew
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              disabled={!canOpen}
              title={canOpen ? undefined : 'Open the Link Opener desktop app to launch applications'}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-accent px-2.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {app ? <><Play size={12} /> Launch</> : <><ExternalLink size={12} /> Open</>}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            aria-label="Edit"
            title="Edit"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-divider-light text-muted transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
          >
            <Pencil size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// The links table — tools/arshanemi-tools-5's DetailsTable look and header
// controls: the blue header band, every column with a sort toggle and a
// spreadsheet filter (sort A → Z / Z → A, search + tick values), a "filters
// on" bar with Clear all, striped rows and the pager. `table` =
// useTableView()'s state (sort, filters and the resulting `view`) — held by
// the page so its own buttons act on the same rows.
export default function LinksTable({
  columns, table, totalCount, selected, onToggle, onToggleMany, onOpen, onEdit, onRenew,
  editing, draft, onDraftChange, onSave, onCancel, saving, editError, addCost,
  loading, onAdd, busy, desktop, chromeProfiles = [],
}) {
  const [filterOpen, setFilterOpen] = useState(false); // a filter menu is open — make room for it
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // The page resets whenever the sort, a filter or the page size changes —
  // remembered together with what it was set under, so no effect is needed.
  const resetKey = JSON.stringify([table.sort, table.filters, pageSize]);
  const [paging, setPaging] = useState({ key: resetKey, page: 1 });
  const page = paging.key === resetKey ? paging.page : 1;
  const setPage = (p) => setPaging({ key: resetKey, page: p });

  const view = table.view;
  const pageCount = Math.max(1, Math.ceil(view.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = view.slice(pageStart, pageStart + pageSize);

  // Header "select all" = this page, like tools-5 (the footer's All takes every filtered row).
  const allChecked = pageRows.length > 0 && pageRows.every((l) => selected.has(l.id));
  const colSpan = columns.length + 2;
  const empty = !loading && totalCount === 0 && editing !== 'new';

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-clip rounded-xl border border-divider bg-background">
        {/* Filters on: say so on the table itself, with a one-click way out. */}
        {table.filterCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider bg-action-soft px-3 py-1.5 text-xs text-foreground">
            <span>
              {table.filterCount} filter{table.filterCount === 1 ? '' : 's'} on — showing <span className="font-semibold">{view.length}</span> of {totalCount} row{totalCount === 1 ? '' : 's'}
            </span>
            <button type="button" onClick={table.clearFilters} className="font-semibold text-link hover:underline">
              Clear all filters
            </button>
          </div>
        )}

        <div data-table-scroll className={`h-0 grow overflow-auto ${filterOpen ? 'min-h-[30rem]' : ''}`}>
          {/* Chrome profiles on this computer (desktop app only) — suggestions for the profile input */}
          <datalist id={PROFILE_LIST_ID}>
            {chromeProfiles.map((p) => <option key={p.dir} value={p.dir}>{p.name}</option>)}
          </datalist>

          <table className={`${styles.table} text-sm`}>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-divider">
                <th className={`w-10 ${HEAD}`}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => onToggleMany(pageRows.map((l) => l.id), !allChecked)}
                    className="accent-[var(--color-action)]"
                    aria-label="Select all rows on this page"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key} className={HEAD}>
                    <ColumnHeaderCell
                      col={col}
                      sort={table.sort}
                      onSortChange={table.setSort}
                      filter={table.filters[col.key]}
                      onFilterChange={(f) => table.setFilter(col.key, f)}
                      getFilterOptions={() => table.optionsFor(col.key)}
                      onFilterOpenChange={setFilterOpen}
                    />
                  </th>
                ))}
                <th className={HEAD}>
                  <ColumnHeaderCell col={{ key: 'action', label: 'Action', sortable: false }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {editing === 'new' && (
                <EditRow columns={columns} draft={draft} onChange={onDraftChange} onSave={onSave} onCancel={onCancel} saving={saving} error={editError} cost={addCost} />
              )}

              {pageRows.map((link) =>
                editing === link.id ? (
                  <EditRow key={link.id} columns={columns} draft={draft} onChange={onDraftChange} onSave={onSave} onCancel={onCancel} saving={saving} error={editError} cost={0} />
                ) : (
                  <ViewRow
                    key={link.id}
                    columns={columns}
                    link={link}
                    selected={selected.has(link.id)}
                    onToggle={() => onToggle(link.id)}
                    onOpen={() => onOpen([link])}
                    onEdit={() => onEdit(link)}
                    onRenew={() => onRenew([link.id])}
                    busy={busy}
                    desktop={desktop}
                  />
                ),
              )}

              {loading && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-16 text-center text-xs text-subtle">
                    <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading your links…</span>
                  </td>
                </tr>
              )}

              {!loading && totalCount > 0 && view.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted">No links match your search or filters.</td>
                </tr>
              )}

              {empty && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-20">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                        <Link2 size={20} className="text-accent" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No links yet</p>
                      <p className="max-w-sm text-xs text-subtle">Add each account&apos;s link with its Chrome profile, group and name — then open any selection in one click.</p>
                      <button
                        type="button"
                        onClick={onAdd}
                        className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-hover"
                      >
                        <Plus size={14} /> Add your first link
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePager
          summary={(
            <>
              {view.length === 0 ? '0 rows' : `${pageStart + 1}–${Math.min(pageStart + pageSize, view.length)} of ${view.length} row${view.length === 1 ? '' : 's'}`}
              {selected.size > 0 && ` · ${selected.size} selected`}
            </>
          )}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
