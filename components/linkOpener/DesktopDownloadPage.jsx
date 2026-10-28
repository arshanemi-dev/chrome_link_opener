'use client';

import { Download, MonitorDown, Globe, FolderTree, MousePointerClick, AppWindow, ShieldCheck } from 'lucide-react';
import { useLiveRelease, formatSize } from '@/lib/linkOpener/desktop';

const FEATURES = [
  { icon: Globe, title: 'Right Chrome profile, every time', text: 'Each link opens in the Chrome profile it belongs to — no more logging in and out of seller accounts.' },
  { icon: FolderTree, title: 'Groups and account names', text: 'Keep every seller-panel link organised by group and account, searchable and filterable.' },
  { icon: MousePointerClick, title: 'Open a selection in one click', text: 'Tick the links you need and open all of them together.' },
  { icon: AppWindow, title: 'Launch desktop applications', text: 'Scan your Desktop shortcuts and start saved apps right from the same list.' },
];

// What a normal browser tab shows at /link-opener: the tool only runs inside
// the Windows desktop app (it needs to reach Chrome profiles and installed
// apps), so the page describes it and offers the live installer — the one
// the admin panel marked live in Settings → Desktop App Releases.
export default function DesktopDownloadPage() {
  const release = useLiveRelease();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-8 sm:py-14">
        <section className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <MonitorDown size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Barmeto Chrome Link Opener for Windows</h1>
          <p className="max-w-2xl text-sm text-muted sm:text-base">
            Keep every seller-panel link with its Chrome profile, group and account name — and open any selection in one click.
            The Link Opener runs as a desktop app so it can open links in the right Chrome profile and launch your saved applications.
          </p>

          {release === undefined ? (
            <div className="mt-2 h-11 w-56 animate-pulse rounded-xl bg-card" />
          ) : release ? (
            <div className="mt-2 flex flex-col items-center gap-2">
              <a
                href={release.url}
                download={release.fileName}
                className="flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                <Download size={18} /> Download for Windows
              </a>
              <p className="text-xs text-subtle">
                Version {release.version}
                {release.size ? ` · ${formatSize(release.size)}` : ''}
                {release.releasedAt ? ` · ${new Date(release.releasedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : ''}
              </p>
            </div>
          ) : (
            <p className="mt-2 rounded-xl border border-divider bg-card px-4 py-3 text-sm text-muted">
              The download will be available here soon.
            </p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-2xl border border-divider bg-card p-5">
              <Icon size={20} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </section>

        {release?.notes && (
          <section className="rounded-2xl border border-divider bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">What&apos;s new in {release.version}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{release.notes}</p>
          </section>
        )}

        <section className="rounded-2xl border border-divider bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">How to install</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Download the installer and run it.</li>
            <li>If Windows SmartScreen appears, choose <span className="font-medium text-foreground">More info → Run anyway</span>.</li>
            <li>Open <span className="font-medium text-foreground">Barmeto Link Opener</span> from your Desktop and log in with your Barmeto account.</li>
          </ol>
          <p className="mt-3 flex items-center gap-2 text-xs text-subtle">
            <ShieldCheck size={14} /> Windows 10 or later · Google Chrome required
          </p>
        </section>
      </div>
    </div>
  );
}
