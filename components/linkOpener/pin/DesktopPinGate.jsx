'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import {
  pinApi, isUnlocked, markUnlocked, clearUnlocked, IDLE_LOCK_MS, LOCK_EVENT,
} from '@/lib/linkOpener/desktopPin';
import PinLayout, { PrimaryButton } from './PinLayout';
import { PinFlow, UnlockScreen } from './PinFlows';

// Desktop app + signed in → the workspace sits behind a 6-digit PIN.
//   no PIN on the account yet (first sign-in) → verify mobile by OTP, create PIN
//   PIN exists → unlock screen ("Forgot PIN?" → WhatsApp OTP → new PIN)
// Unlocking lasts for this app window (sessionStorage); the app locks again
// on restart, after IDLE_LOCK_MS idle, on Ctrl+L, or from the topbar's Lock.
//
// The workspace isn't mounted until the first unlock — so nothing (e.g. the
// after-login Desktop scan) runs behind the lock screen. After that, a re-lock
// only covers it, so open dialogs and scroll position survive.
export default function DesktopPinGate({ user, onLogout, children }) {
  const userId = user?.id;
  const [unlocked, setUnlocked] = useState(() => isUnlocked(userId));
  const [opened, setOpened] = useState(unlocked);
  const [view, setView] = useState({ name: 'loading' }); // loading | error | setup | unlock | reset

  const applyStatus = useCallback(({ ok, data }) => {
    if (!ok) return setView({ name: 'error', message: data?.error || 'Could not check your PIN settings.' });
    setView({ name: data.hasPin ? 'unlock' : 'setup', status: data });
  }, []);

  const reload = useCallback(() => {
    setView({ name: 'loading' });
    pinApi.status().then(applyStatus);
  }, [applyStatus]);

  // Locked on mount → find out which screen to show.
  useEffect(() => {
    if (unlocked) return;
    let alive = true;
    pinApi.status().then((res) => alive && applyStatus(res));
    return () => {
      alive = false;
    };
  }, [unlocked, applyStatus]);

  const unlock = useCallback(() => {
    markUnlocked(userId);
    setUnlocked(true);
    setOpened(true);
  }, [userId]);

  const lock = useCallback(() => {
    clearUnlocked();
    setView({ name: 'loading' });
    setUnlocked(false);
  }, []);

  const logout = useCallback(() => {
    clearUnlocked();
    onLogout?.();
  }, [onLogout]);

  // While unlocked: idle timer, Ctrl+L and the topbar's Lock button.
  useEffect(() => {
    if (!unlocked) return undefined;
    let timer = setTimeout(lock, IDLE_LOCK_MS);
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, IDLE_LOCK_MS);
    };
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lock();
        return;
      }
      arm();
    };
    const activity = ['mousedown', 'mousemove', 'wheel', 'touchstart'];
    activity.forEach((ev) => window.addEventListener(ev, arm, { passive: true }));
    window.addEventListener('keydown', onKey);
    window.addEventListener(LOCK_EVENT, lock);
    return () => {
      clearTimeout(timer);
      activity.forEach((ev) => window.removeEventListener(ev, arm));
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(LOCK_EVENT, lock);
    };
  }, [unlocked, lock]);

  return (
    <>
      {opened && (
        <div className="contents" inert={!unlocked} aria-hidden={!unlocked || undefined}>
          {children}
        </div>
      )}
      {!unlocked && <LockScreen view={view} user={user} onLogout={logout} onUnlocked={unlock} setView={setView} reload={reload} />}
    </>
  );
}

function LockScreen({ view, user, onLogout, onUnlocked, setView, reload }) {
  if (view.name === 'loading') {
    return (
      <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-surface" role="status" aria-live="polite">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent/20 border-t-accent" />
        <p className="text-sm text-muted">Securing your workspace…</p>
      </div>
    );
  }

  if (view.name === 'error') {
    return (
      <PinLayout user={user} onLogout={onLogout} icon={WifiOff} tone="danger" title="Can't reach Barmeto" subtitle={view.message}>
        <PrimaryButton type="button" onClick={reload}>
          <RefreshCw size={16} /> Try again
        </PrimaryButton>
      </PinLayout>
    );
  }

  if (view.name === 'setup') {
    return <PinFlow key="setup" mode="setup" status={view.status} user={user} onLogout={onLogout} onDone={onUnlocked} />;
  }

  if (view.name === 'reset') {
    return (
      <PinFlow
        key="reset"
        mode="reset"
        status={view.status}
        user={user}
        onLogout={onLogout}
        onDone={onUnlocked}
        onCancel={() => setView({ name: 'unlock', status: view.status })}
      />
    );
  }

  return (
    <UnlockScreen
      status={view.status}
      user={user}
      onLogout={onLogout}
      onUnlocked={onUnlocked}
      onForgot={() => setView({ name: 'reset', status: view.status })}
      onMissing={reload}
    />
  );
}
