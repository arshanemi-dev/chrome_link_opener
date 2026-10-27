'use client';

import { useEffect, useState } from 'react';
import { Play, CloudUpload, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Modal from '@/components/admin/Modal';
import BillingGateModal from '@/components/billing/BillingGateModal';
import GuestLimitModal from '@/components/billing/GuestLimitModal';
import { redirectToLogin } from '@/lib/authGate';
import { useLinks } from '@/lib/linkOpener/useLinks';
import { EMPTY_DRAFT, GUEST_LINK_LIMIT, cleanDraft, matchesSearch, coinsLabel, isApp } from '@/lib/linkOpener/linkRules';
import { useDesktop, DESKTOP_APPS_GROUP } from '@/lib/linkOpener/desktop';
import { linkColumns, cellOf } from '@/lib/linkOpener/linkColumns';
import { useTableView } from '@/lib/table/useTableView';
import { openLinks } from '@/lib/linkOpener/openLinks';
import { downloadBackup, readBackupFile } from '@/lib/linkOpener/backup';
import LinkToolbar, { ToolButton } from './LinkToolbar';
import LinksTable from './LinksTable';
import ScanAppsModal from './ScanAppsModal';

const NOTICE_MS = 5000;

// The page: toolbar → info notice → table (tools-5 style: sort + filter in
// every header) → selection footer.
// All data goes through useLinks — browser list signed out, account list
// (charged per link, monthly) signed in. Inside the Windows desktop app
// (`desktop`), links open in their Chrome profile and signed-in users can scan
// their Desktop's application shortcuts into the list.
export default function LinkOpenerWorkspace({ user }) {
  const store = useLinks(user);
  const desktop = useDesktop();
  const { addToast } = useToast();
  const { mode, links, coinsPerLink, coinsPerApp, freeForRole, wallet } = store;
  const isAccount = mode === 'account';
  const unitCost = isAccount && !freeForRole ? coinsPerLink ?? 0 : 0;
  const appCost = isAccount && !freeForRole ? coinsPerApp ?? 0 : 0;
  const costOf = (list) => list.reduce((sum, l) => sum + (isApp(l) ? appCost : unitCost), 0);
  const canScan = !!desktop && isAccount && store.appsAvailable;

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // null | 'new' | link id
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editError, setEditError] = useState('');
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(null); // { reason, data, retry }
  const [guestLimit, setGuestLimit] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null); // { links, skipped }
  const [hideMoveBanner, setHideMoveBanner] = useState(false);
  // The info strip is a passing notice: shown once the list has loaded, gone
  // after NOTICE_MS or on ✕. Keyed by mode, so logging in shows it again.
  const [noticeClosedFor, setNoticeClosedFor] = useState(null);
  const noticeReady = mode !== 'loading' && !store.loading;
  const showNotice = noticeReady && noticeClosedFor !== mode;
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState(null); // { id, found: [{ name, shortcutPath, targetPath, icon, saved }] }
  const [chromeProfiles, setChromeProfiles] = useState([]);

  useEffect(() => {
    if (!showNotice) return;
    const timer = setTimeout(() => setNoticeClosedFor(mode), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [showNotice, mode]);

  // The desktop app knows this computer's Chrome profiles — offered as
  // suggestions in the Chrome Profile field.
  useEffect(() => {
    if (!desktop) return;
    desktop.listChromeProfiles().then((list) => setChromeProfiles(Array.isArray(list) ? list : [])).catch(() => {});
  }, [desktop]);

  // The toolbar search narrows the list first; the table's own header sort
  // and filters (useTableView — same as tools-5) work on what's left, and
  // `table.view` is exactly the rows shown — what All / Backup act on.
  const searched = links.filter((l) => matchesSearch(l, search));
  const columns = linkColumns({ account: isAccount, hasApps: links.some(isApp) });
  const table = useTableView(searched, columns, cellOf);
  const visible = table.view;
  const expiredCount = links.filter((l) => l.expired).length;

  // Selection survives filtering, but only links that still exist count.
  const selectedLinks = links.filter((l) => selected.has(l.id));
  // Expired links don't open; apps only open from the desktop app.
  const openable = selectedLinks.filter((l) => !l.expired && (desktop || !isApp(l)));

  // ── results from useLinks → modals / toasts ────────────────────────────────
  function handleFailure(result, retry) {
    if (result.gate) setGate({ ...result.gate, retry });
    else if (result.limit) setGuestLimit(result.limit);
    else if (result.error) addToast(result.error, 'error');
  }

  const charged = (n) => (n > 0 ? ` — ${coinsLabel(n)} used` : '');

  // ── add / edit ─────────────────────────────────────────────────────────────
  function startAdd() {
    setEditing('new');
    // Filtered to one group → a new link goes into that group.
    const groupFilter = table.filters.group?.values;
    setDraft({ ...EMPTY_DRAFT, groupName: groupFilter?.length === 1 ? groupFilter[0] : '' });
    setEditError('');
  }

  function startEdit(link) {
    setEditing(link.id);
    setDraft({
      kind: link.kind ?? 'url', chromeProfile: link.chromeProfile, link: link.link,
      groupName: link.groupName ?? '', accountName: link.accountName ?? '', targetPath: link.targetPath, icon: link.icon,
    });
    setEditError('');
  }

  function cancelEdit() {
    setEditing(null);
    setEditError('');
  }

  async function saveDraft() {
    const cleaned = cleanDraft(draft);
    if (cleaned.error) return setEditError(cleaned.error);
    setBusy(true);
    try {
      if (editing === 'new') {
        const result = await store.add([cleaned.link]);
        if (!result.ok) return handleFailure(result, saveDraft);
        addToast(`Link added${charged(result.coinsCharged)}`);
      } else {
        const result = await store.update(editing, cleaned.link);
        if (!result.ok) return handleFailure(result, saveDraft);
        addToast('Link updated');
      }
      setEditing(null);
      setEditError('');
    } finally {
      setBusy(false);
    }
  }

  // ── remove ─────────────────────────────────────────────────────────────────
  async function removeSelected() {
    setBusy(true);
    try {
      const ids = selectedLinks.map((l) => l.id);
      const result = await store.remove(ids);
      if (!result.ok) return handleFailure(result);
      setSelected(new Set());
      if (ids.includes(editing)) setEditing(null);
      addToast(`${ids.length} link${ids.length === 1 ? '' : 's'} removed`);
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  }

  // ── renew (account only) ───────────────────────────────────────────────────
  async function renew(ids) {
    setBusy(true);
    try {
      const result = await store.renew(ids);
      if (!result.ok) return handleFailure(result, () => renew(ids));
      addToast(`${result.renewed} link${result.renewed === 1 ? '' : 's'} renewed for a month${charged(result.coinsCharged)}`);
    } finally {
      setBusy(false);
    }
  }

  // ── open ───────────────────────────────────────────────────────────────────
  // In a browser, openLinks opens the tabs synchronously, inside the click,
  // before its first await — so they aren't treated as unrequested pop-ups.
  async function open(list) {
    if (!list.length) return;
    const { blocked, appsSkipped, failed } = await openLinks(list, desktop);
    if (blocked) addToast(`Your browser blocked ${blocked} of ${list.length} tabs — allow pop-ups for this site to open them all at once.`, 'error');
    if (appsSkipped) addToast(`${appsSkipped} desktop app${appsSkipped === 1 ? '' : 's'} skipped — apps open from the Link Opener desktop app.`, 'error');
    for (const message of failed) addToast(message, 'error');
  }

  // ── scan Desktop applications (desktop app, signed in) ─────────────────────
  async function runScan() {
    setScanning(true);
    try {
      const found = await desktop.scanShortcuts();
      // Already saved = same shortcut, or another shortcut to the same program.
      const savedPaths = new Set(
        links.filter(isApp).flatMap((l) => [l.link, l.targetPath]).filter(Boolean).map((p) => p.toLowerCase()),
      );
      setScan({
        id: Date.now(),
        found: (found ?? []).map((s) => ({
          ...s,
          saved: savedPaths.has(s.shortcutPath.toLowerCase()) || (!!s.targetPath && savedPaths.has(s.targetPath.toLowerCase())),
        })),
      });
    } catch {
      addToast('Could not scan the Desktop.', 'error');
    } finally {
      setScanning(false);
    }
  }

  async function addScanned(chosen) {
    setBusy(true);
    try {
      const result = await store.add(chosen.map((s) => ({
        kind: 'app', chromeProfile: '', link: s.shortcutPath, targetPath: s.targetPath || null, icon: s.icon || null,
        groupName: DESKTOP_APPS_GROUP, accountName: s.name,
      })));
      if (!result.ok) return handleFailure(result, () => addScanned(chosen));
      setScan(null);
      table.setFilter('group', { values: [DESKTOP_APPS_GROUP] });
      addToast(`${result.added} app${result.added === 1 ? '' : 's'} added to ${DESKTOP_APPS_GROUP}${charged(result.coinsCharged)}`);
    } finally {
      setBusy(false);
    }
  }

  // ── backup / restore ───────────────────────────────────────────────────────
  async function restoreFile(file) {
    const parsed = await readBackupFile(file).catch(() => null);
    // Desktop apps can only be saved to an account — a guest restore drops them.
    if (parsed && mode === 'guest') {
      const apps = parsed.links.filter(isApp).length;
      parsed.links = parsed.links.filter((l) => !isApp(l));
      parsed.skipped += apps;
    }
    if (!parsed || !parsed.links.length) {
      addToast('No valid links found in that file.', 'error');
      return;
    }
    // Free adds (guest / free role) go straight in; paid ones are confirmed first.
    if (costOf(parsed.links) > 0) setPendingRestore(parsed);
    else runRestore(parsed);
  }

  async function runRestore(parsed) {
    setPendingRestore(null);
    setBusy(true);
    try {
      const result = await store.add(parsed.links);
      if (!result.ok) return handleFailure(result, () => runRestore(parsed));
      addToast(`${result.added} link${result.added === 1 ? '' : 's'} restored${charged(result.coinsCharged)}${parsed.skipped ? ` · ${parsed.skipped} invalid row(s) skipped` : ''}`);
    } finally {
      setBusy(false);
    }
  }

  // ── move browser links to the account ──────────────────────────────────────
  async function moveLocal() {
    setBusy(true);
    try {
      const result = await store.moveLocalToAccount();
      if (!result.ok) return handleFailure(result, moveLocal);
      addToast(`${result.added} link${result.added === 1 ? '' : 's'} moved to your account${charged(result.coinsCharged)}`);
    } finally {
      setBusy(false);
    }
  }

  function toggleMany(ids, on) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pendingLocal = store.pendingLocal;
  const showMoveBanner = isAccount && pendingLocal.length > 0 && !hideMoveBanner && !store.loading;

  return (
    <>
      <LinkToolbar
        search={search}
        onSearch={setSearch}
        onAdd={startAdd}
        onRemove={() => setConfirmRemove(true)}
        onEdit={() => selectedLinks.length === 1 && startEdit(selectedLinks[0])}
        onBackup={() => downloadBackup(visible)}
        onRestoreFile={restoreFile}
        canRemove={selectedLinks.length > 0}
        canEdit={selectedLinks.length === 1}
        canBackup={visible.length > 0}
        busy={busy || mode === 'loading'}
        wallet={wallet}
        onScan={canScan ? runScan : undefined}
        scanning={scanning}
        actions={(
          <>
            {selectedLinks.some((l) => l.expired) && (
              <ToolButton onClick={() => renew(selectedLinks.filter((l) => l.expired).map((l) => l.id))} disabled={busy}>
                Renew expired ({selectedLinks.filter((l) => l.expired).length})
              </ToolButton>
            )}
            <ToolButton icon={Play} tone="primary" onClick={() => open(openable)} disabled={!openable.length} title="Open every selected link">
              Open Selected ({openable.length})
            </ToolButton>
          </>
        )}
      />

      {/* Info notice — where links live and what they cost; hides itself after
          5 s. Floats over the page (zero-height anchor + absolute card, high
          z-index), so showing or hiding it never moves the table. */}
      {showNotice && (
      <div className="relative z-[60] h-0">
      <div
        role="status"
        className="absolute left-1/2 top-2 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-divider-light bg-background py-2.5 pl-4 pr-11 text-[11px] text-muted shadow-xl shadow-black/15 dropdown-panel-in"
      >
        <button
          type="button"
          onClick={() => setNoticeClosedFor(mode)}
          aria-label="Close notice"
          title="Close"
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-subtle transition-colors hover:bg-card-hover hover:text-foreground"
        >
          <X size={13} />
        </button>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        {mode === 'guest' && (
          <>
            <span>Guest — links are saved in this browser only</span>
            <span className="text-subtle">•</span>
            <span><strong className="text-foreground">{links.length}/{GUEST_LINK_LIMIT}</strong> free links used</span>
            <span className="text-subtle">•</span>
            <button type="button" onClick={redirectToLogin} className="font-semibold text-accent hover:underline">Log in to save more</button>
          </>
        )}
        {isAccount && (
          <>
            <span>Saved to your account</span>
            <span className="text-subtle">•</span>
            <span>
              {freeForRole
                ? 'Free for your role'
                : coinsPerLink == null
                  ? 'Loading price…'
                  : coinsPerLink > 0
                    ? <><strong className="text-foreground">{coinsLabel(coinsPerLink)}</strong> per link / month — charged when added, renewed monthly</>
                    : 'Links are free right now'}
              {desktop && store.appsAvailable && !freeForRole && (
                <> · desktop apps {appCost > 0 ? <strong className="text-foreground">{coinsLabel(appCost)} / month</strong> : 'free'}</>
              )}
            </span>
            {expiredCount > 0 && (
              <>
                <span className="text-subtle">•</span>
                <span className="font-semibold text-neg">{expiredCount} expired — renew to open them again</span>
              </>
            )}
          </>
        )}
      </div>
      </div>
      )}

      {showMoveBanner && (
        <div className="flex flex-wrap items-center gap-3 border-b border-divider bg-card px-4 py-2.5 text-xs sm:px-6">
          <CloudUpload size={16} className="shrink-0 text-accent" />
          <span className="text-muted">
            You have <strong className="text-foreground">{pendingLocal.length} link{pendingLocal.length === 1 ? '' : 's'}</strong> saved in this browser from before you logged in.
            {unitCost > 0 && <> Moving {pendingLocal.length === 1 ? 'it' : 'them'} to your account costs <strong className="text-foreground">{coinsLabel(unitCost * pendingLocal.length)}</strong>.</>}
          </span>
          <div className="ml-auto flex gap-2">
            <ToolButton onClick={() => setHideMoveBanner(true)} disabled={busy}>Not now</ToolButton>
            <ToolButton tone="primary" icon={CloudUpload} onClick={moveLocal} disabled={busy}>Move to account</ToolButton>
          </div>
        </div>
      )}

      {store.error && (
        <div className="flex items-center gap-2 border-b border-divider bg-neg/10 px-4 py-2 text-xs text-neg sm:px-6">
          <AlertTriangle size={14} />
          {store.error}
          <button type="button" onClick={store.reload} className="ml-2 font-semibold underline">Retry</button>
        </div>
      )}

      <LinksTable
        columns={columns}
        table={table}
        totalCount={searched.length}
        onToggleMany={toggleMany}
        selected={selected}
        onToggle={toggle}
        onOpen={open}
        onEdit={startEdit}
        onRenew={renew}
        editing={editing}
        draft={draft}
        onDraftChange={setDraft}
        onSave={saveDraft}
        onCancel={cancelEdit}
        saving={busy}
        editError={editError}
        addCost={unitCost}
        loading={store.loading}
        onAdd={startAdd}
        busy={busy}
        desktop={desktop}
        chromeProfiles={chromeProfiles}
      />

      {/* Modals */}
      <ConfirmDialog
        open={confirmRemove}
        title={`Remove ${selectedLinks.length} link${selectedLinks.length === 1 ? '' : 's'}?`}
        description={isAccount && unitCost > 0 ? 'They’re deleted from your account. Coins already paid for this month aren’t refunded.' : 'They’re deleted from this browser.'}
        confirmLabel="Remove"
        loadingLabel="Removing…"
        loading={busy}
        onConfirm={removeSelected}
        onCancel={() => setConfirmRemove(false)}
      />

      <Modal
        open={!!pendingRestore}
        onClose={() => setPendingRestore(null)}
        title="Restore Links"
        maxWidth="max-w-sm"
        footer={
          <>
            <button onClick={() => setPendingRestore(null)} className="h-9 flex-1 rounded-lg border border-divider-light text-xs font-semibold text-muted hover:bg-card-hover">Cancel</button>
            <button onClick={() => runRestore(pendingRestore)} className="h-9 flex-1 rounded-lg bg-accent text-xs font-semibold text-white hover:bg-accent-hover">
              Add · {coinsLabel(costOf(pendingRestore?.links ?? []))}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This adds <strong className="text-foreground">{pendingRestore?.links.length} link{pendingRestore?.links.length === 1 ? '' : 's'}</strong> to your account for{' '}
          {coinsLabel(costOf(pendingRestore?.links ?? []))} a month
          {pendingRestore?.skipped ? ` (${pendingRestore.skipped} invalid row(s) in the file are skipped)` : ''}.
        </p>
      </Modal>

      {scan && (
        <ScanAppsModal
          key={scan.id}
          scan={scan}
          onClose={() => setScan(null)}
          onAdd={addScanned}
          coinsPerApp={appCost}
          saving={busy}
        />
      )}
      <GuestLimitModal limit={guestLimit} onClose={() => setGuestLimit(null)} />
      <BillingGateModal
        gate={gate}
        onClose={() => setGate(null)}
        onRetry={gate?.retry ? () => { const retry = gate.retry; setGate(null); retry(); } : undefined}
      />
    </>
  );
}
