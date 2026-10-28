'use client';

import { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useLiveRelease, formatSize } from '@/lib/linkOpener/desktop';

// Desktop app only. When the admin panel's live version (Settings → Desktop
// App Releases) isn't the version this app is running, the whole tool is
// covered by this popup — no close button, no Escape — until the user updates.
// Builds before 1.1.0 don't report a version at all, so they always qualify.
// No live release, or the admin panel unreachable → nothing is blocked.
export default function ForceUpdateModal({ desktop }) {
  const release = useLiveRelease();
  const [state, setState] = useState('idle'); // idle | working | opened
  const [error, setError] = useState('');

  if (!release || release.version === desktop.version) return null;

  async function handleUpdate() {
    setError('');
    setState('working');
    // New builds download and launch the installer themselves (then quit);
    // older ones only have the window-open handler, which hands the link to
    // the default browser to download.
    if (typeof desktop.installUpdate === 'function') {
      const message = await desktop.installUpdate(release.url).catch((e) => e?.message || 'Update failed');
      if (message) {
        setError(message);
        setState('idle');
      }
      return;
    }
    window.open(release.url, '_blank');
    setState('opened');
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="force-update-title">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <RefreshCw size={22} className="text-accent" />
        </div>
        <div>
          <h2 id="force-update-title" className="text-lg font-bold text-foreground">Update required</h2>
          <p className="mt-1 text-sm text-muted">
            A new version of Barmeto Link Opener is available. Please update to keep using the app.
          </p>
        </div>

        <div className="flex justify-center gap-6 rounded-xl bg-surface px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-subtle">Installed</p>
            <p className="font-semibold text-foreground">{desktop.version ? `v${desktop.version}` : 'Older version'}</p>
          </div>
          <div>
            <p className="text-xs text-subtle">Latest</p>
            <p className="font-semibold text-accent">v{release.version}</p>
          </div>
        </div>

        {release.notes && (
          <div className="max-h-32 overflow-y-auto rounded-xl border border-divider px-4 py-3 text-left">
            <p className="text-xs font-semibold text-foreground">What&apos;s new</p>
            <p className="mt-1 whitespace-pre-line text-xs text-muted">{release.notes}</p>
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        <button
          onClick={handleUpdate}
          disabled={state === 'working'}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          <Download size={18} />
          {state === 'working' ? 'Downloading update…' : `Update now${release.size ? ` (${formatSize(release.size)})` : ''}`}
        </button>
        {state === 'opened' && (
          <p className="text-xs text-subtle">
            The installer is downloading in your browser — run it once it finishes. It replaces this version.
          </p>
        )}
      </div>
    </div>
  );
}
