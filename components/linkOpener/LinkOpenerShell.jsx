'use client';

import { useEffect, useState } from 'react';
import { clearAuthTokens, isLoggedIn, authFetch } from '@/lib/tokenStore';
import { useStoredUser } from '@/lib/useStoredUser';
import DashboardTopbar from '@/components/dashboard/DashboardTopbar';
import LinkOpenerWorkspace from './LinkOpenerWorkspace';

const HEADER_HIDDEN = process.env.NEXT_PUBLIC_IS_Header_Hide === 'true';

// Client shell: owns the topbar session, then hands off to
// <LinkOpenerWorkspace/>. Works fully signed-out (links in the browser);
// signing in moves them to the account.
export default function LinkOpenerShell() {
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      {!HEADER_HIDDEN && <DashboardTopbar user={user} onLogout={handleLogout} />}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <LinkOpenerWorkspace user={storedUser} />
      </div>
    </div>
  );
}
