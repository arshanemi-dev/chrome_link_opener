'use client';

import { authFetch } from '@/lib/tokenStore';

// Desktop app PIN — client side. The PIN itself is stored and checked by the
// admin panel (its lib/linkOpenerPin.js, via app/api/link-opener/desktop-pin/*);
// this file only calls those routes and remembers "unlocked" for the life of
// the app window (sessionStorage — cleared when the desktop app is closed).

export const PIN_LENGTH = 6;
export const OTP_LENGTH = 6;
// Re-lock after this long without mouse / keyboard activity.
export const IDLE_LOCK_MS = 15 * 60 * 1000;

const UNLOCK_KEY = 'clo-pin-unlocked';
// Fired by the topbar's Lock button; <DesktopPinGate/> listens for it.
export const LOCK_EVENT = 'clo-pin-lock';
export const requestLock = () => window.dispatchEvent(new Event(LOCK_EVENT));

async function call(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await authFetch(`/api/link-opener/desktop-pin${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, data: { error: 'No connection. Check your internet and try again.' } };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const pinApi = {
  status: () => call(''),
  sendOtp: (purpose, mobile) => call('/otp', { method: 'POST', body: { purpose, mobile } }),
  verifyOtp: (purpose, otpCode, mobile) => call('/verify-otp', { method: 'POST', body: { purpose, otpCode, mobile } }),
  savePin: (pinToken, pin) => call('', { method: 'PUT', body: { pinToken, pin } }),
  unlock: (pin) => call('/unlock', { method: 'POST', body: { pin } }),
};

export function isUnlocked(userId) {
  try {
    return !!userId && sessionStorage.getItem(UNLOCK_KEY) === String(userId);
  } catch {
    return false;
  }
}

export function markUnlocked(userId) {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(userId));
  } catch {
    // storage blocked — the app just asks again after a reload
  }
}

export function clearUnlocked() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // nothing to clear
  }
}

// Same rules as the server's pinProblem — shown while typing so a weak PIN is
// caught before the request. The server still has the final say.
const COMMON_PINS = new Set(['121212', '112233', '123123', '000111', '111222', '159753', '147258', '102030']);

export function pinProblem(pin) {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return `PIN must be exactly ${PIN_LENGTH} digits`;
  if (/^(\d)\1+$/.test(pin)) return 'Avoid using the same digit repeatedly';
  const d = [...pin].map(Number);
  const step = d[1] - d[0];
  if ((step === 1 || step === -1) && d.every((n, i) => i === 0 || n - d[i - 1] === step)) {
    return 'Avoid sequences like 123456, they are easy to guess';
  }
  if (COMMON_PINS.has(pin)) return 'This PIN is too common, choose another';
  return null;
}

// 0–3 for the strength meter: distinct digits and no repeats push it up.
export function pinStrength(pin) {
  if (pin.length < PIN_LENGTH || pinProblem(pin)) return pin.length ? 1 : 0;
  const distinct = new Set(pin).size;
  return distinct >= 5 ? 3 : 2;
}

export const digitsOnly = (v, max) => String(v ?? '').replace(/\D/g, '').slice(0, max);

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const channelName = (channel) => (channel === 'sms' ? 'SMS' : 'WhatsApp');
