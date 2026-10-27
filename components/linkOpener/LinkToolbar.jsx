'use client';

import { useRef } from 'react';
import { Search, Plus, X, Pencil, Download, Upload, Sun, Moon, Coins, ScanSearch, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || '';

export function ToolButton({ icon: Icon, children, onClick, disabled, tone = 'default', title, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'primary' && 'border-accent bg-accent text-white hover:bg-accent-hover',
        tone === 'danger' && 'border-divider-light text-neg hover:border-neg hover:bg-neg/10',
        tone === 'default' && 'border-divider-light text-muted hover:bg-card-hover hover:text-foreground',
        className,
      )}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-divider-light sm:block" />;

// Search · Add · Remove · Edit · Backup · Restore (· Scan Applications in the
// desktop app, signed in) on the left; `actions` (Open Selected), wallet and
// light/dark on the right.
export default function LinkToolbar({
  search, onSearch, onAdd, onRemove, onEdit, onBackup, onRestoreFile, onScan,
  canRemove, canEdit, canBackup, busy, wallet, scanning, actions,
}) {
  const fileRef = useRef(null);
  const { theme, toggle } = useTheme();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-divider bg-background px-4 py-3 sm:px-6">
      <label className="relative w-full sm:w-64">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search profile, link, group, account…"
          className="h-9 w-full rounded-lg border border-divider-light bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-subtle focus:border-accent focus:outline-none"
        />
      </label>
      <Divider />
      <ToolButton icon={Plus} tone="primary" onClick={onAdd} disabled={busy}>Add</ToolButton>
      <ToolButton icon={X} tone="danger" onClick={onRemove} disabled={!canRemove || busy} title="Remove the selected links">Remove</ToolButton>
      <ToolButton icon={Pencil} onClick={onEdit} disabled={!canEdit || busy} title="Select exactly one link to edit it">Edit</ToolButton>
      <Divider />
      <ToolButton icon={Download} onClick={onBackup} disabled={!canBackup} title="Download the links shown as an Excel sheet (.xlsx)">Backup</ToolButton>
      <ToolButton icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy} title="Add links from an Excel sheet (.xlsx) — a Backup file, or your own sheet with Link / Chrome Profile / Group / Account Name columns">Restore</ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onRestoreFile(file);
        }}
      />
      {onScan && (
        <>
          <Divider />
          <ToolButton
            icon={scanning ? Loader2 : ScanSearch}
            onClick={onScan}
            disabled={busy || scanning}
            title="Find the application shortcuts on your Windows Desktop and save them here"
            className={scanning ? '[&>svg]:animate-spin' : undefined}
          >
            {scanning ? 'Scanning…' : 'Scan Applications'}
          </ToolButton>
        </>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions}
        {wallet != null && (
          <a
            href={`${ADMIN_URL}/plan`}
            target="_blank"
            rel="noopener noreferrer"
            title="Your coin balance — click to add coins"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            <Coins size={14} />
            {wallet.toLocaleString('en-IN')} coins
          </a>
        )}
        <ToolButton icon={theme === 'dark' ? Sun : Moon} onClick={toggle} title="Switch theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </ToolButton>
      </div>
    </div>
  );
}
