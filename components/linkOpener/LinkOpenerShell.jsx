'use client';

import { useEffect, useState } from 'react';
import { clearAuthTokens, isLoggedIn, authFetch } from '@/lib/tokenStore';
import { useStoredUser } from '@/lib/useStoredUser';
import DashboardTopbar from '@/components/dashboard/DashboardTopbar';
import { useDesktop, useEmbedded, useHydrated } from '@/lib/linkOpener/desktop';
import LinkOpenerWorkspace from './LinkOpenerWorkspace';
import DesktopDownloadPage from './DesktopDownloadPage';
import ForceUpdateModal from './ForceUpdateModal';

const HEADER_HIDDEN = process.env.NEXT_PUBLIC_IS_Header_Hide === 'true';

// Client shell: owns the topbar session, then hands off to
// <LinkOpenerWorkspace/>. Works fully signed-out (links in the browser);
// signing in moves them to the account.
//
// The tool itself only runs in the Windows desktop app (window.desktop); a
// browser tab gets <DesktopDownloadPage/> instead. Inside another site's
// iframe the topbar is never shown — that site has its own navigation.
export default function LinkOpenerShell() {
  const hydrated = useHydrated();
  const desktop = useDesktop();
  const embedded = useEmbedded();
  // undefined until hydrated (see useStoredUser), then the stored user or
  // null; /api/auth/me's fresher profile is layered on top once it lands.
  const storedUser = useStoredUser();
  const [profile, setProfile] = useState(null);
  const user = storedUser && profile ? { ...storedUser, ...profile } : storedUser;

  useEffect(() => {
    if (!isLoggedIn()) return;
    authFetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setProfile(p))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuthTokens();
      window.location.href = '/link-opener';
    }
  }

  // Until hydrated there's no telling the desktop app from a browser.
  if (!hydrated) return <div className="h-screen bg-surface" />;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      {!HEADER_HIDDEN && !embedded && <DashboardTopbar user={user} onLogout={handleLogout} />}
      {desktop ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LinkOpenerWorkspace user={storedUser} />
          </div>
          <ForceUpdateModal desktop={desktop} />
        </>
      ) : (
        <DesktopDownloadPage />
      )}
    </div>
  );
}
