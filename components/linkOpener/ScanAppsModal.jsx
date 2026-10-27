'use client';

import { useState } from 'react';
import { AppWindow, Loader2 } from 'lucide-react';
import Modal from '@/components/admin/Modal';
import { coinsLabel } from '@/lib/linkOpener/linkRules';
import { DESKTOP_APPS_GROUP } from '@/lib/linkOpener/desktop';

export function AppIcon({ src, size = 20 }) {
  // eslint-disable-next-line @next/next/no-img-element -- a local data: URL; next/image adds nothing here
  if (src) return <img src={src} alt="" width={size} height={size} className="shrink-0" />;
  return <AppWindow size={size} className="shrink-0 text-subtle" />;
}

// The result of "Scan Applications": every Desktop shortcut the desktop app
// found. Ones already saved are shown but not selectable. The picked ones are
// saved to the "Desktop Applications" group (`onAdd(shortcuts)`), charged
// `coinsPerApp` each per month.
export default function ScanAppsModal({ scan, onClose, onAdd, coinsPerApp, saving }) {
  // Everything new starts ticked. The modal mounts once per scan, so this
  // initial value is always for the current list.
  const [picked, setPicked] = useState(() => new Set(scan?.found.filter((s) => !s.saved).map((s) => s.shortcutPath)));
  if (!scan) return null;

  const fresh = scan.found.filter((s) => !s.saved);
  const chosen = fresh.filter((s) => picked.has(s.shortcutPath));
  const cost = coinsPerApp * chosen.length;

  const toggle = (p) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    return next;
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Desktop Applications"
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="h-9 flex-1 rounded-lg border border-divider-light text-xs font-semibold text-muted hover:bg-card-hover">
            Cancel
          </button>
          <button
            onClick={() => onAdd(chosen)}
            disabled={!chosen.length || saving}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Add {chosen.length} app{chosen.length === 1 ? '' : 's'}{cost > 0 ? ` · ${coinsLabel(cost)}` : ''}
          </button>
        </>
      }
    >
      {scan.found.length === 0 ? (
        <p className="text-sm text-muted">No application shortcuts were found on your Desktop.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Found <strong className="text-foreground">{scan.found.length}</strong> on your Desktop
              {scan.found.length > fresh.length && ` · ${scan.found.length - fresh.length} already saved`}
            </span>
            {fresh.length > 0 && (
              <button
                type="button"
                onClick={() => setPicked(chosen.length === fresh.length ? new Set() : new Set(fresh.map((s) => s.shortcutPath)))}
                className="font-semibold text-accent hover:underline"
              >
                {chosen.length === fresh.length ? 'Select none' : 'Select all'}
              </button>
            )}
          </div>
          <ul className="-mx-2 max-h-[50vh] overflow-y-auto">
            {scan.found.map((s) => (
              <li key={s.shortcutPath}>
                <label className={`flex items-center gap-3 rounded-lg px-2 py-2 ${s.saved ? 'opacity-50' : 'cursor-pointer hover:bg-card-hover'}`}>
                  <input
                    type="checkbox"
                    checked={s.saved || picked.has(s.shortcutPath)}
                    disabled={s.saved}
                    onChange={() => toggle(s.shortcutPath)}
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                  />
                  <AppIcon src={s.icon} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
                    <span className="block truncate font-mono text-[10px] text-subtle" title={s.targetPath || s.shortcutPath}>{s.targetPath || s.shortcutPath}</span>
                  </span>
                  {s.saved && <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle">Saved</span>}
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-subtle">
            Saved to the <strong className="text-foreground">{DESKTOP_APPS_GROUP}</strong> group
            {coinsPerApp > 0 ? ` — ${coinsLabel(coinsPerApp)} per app / month.` : ' — free.'}
          </p>
        </>
      )}
    </Modal>
  );
}
