'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

// The Windows desktop app (desktop/) loads this same site and adds
// `window.desktop` (desktop/src/preload.js). Present → scan Desktop shortcuts,
// launch saved apps, open links in their Chrome profile. Absent (a normal
// browser tab) → the page is only a download page for that app.

export const DESKTOP_APPS_GROUP = 'Desktop Applications'

const noSubscribe = () => () => {}
const read = () => (typeof window !== 'undefined' && window.desktop?.isDesktop ? window.desktop : null)

// null on the server and during hydration, then the bridge (or null).
export function useDesktop() {
  return useSyncExternalStore(noSubscribe, read, () => null)
}

// false on the server and during hydration — tells "not the desktop app" apart
// from "don't know yet", so the browser's download page never flashes inside
// the desktop app.
export function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false)
}

// Shown inside another site's <iframe> (the admin panel's /tools/<slug>/use) —
// that page has its own navigation, so ours stays hidden.
const readEmbedded = () => {
  try {
    return window.self !== window.top
  } catch {
    return true // a cross-origin parent that won't even say — still a frame
  }
}
export function useEmbedded() {
  return useSyncExternalStore(noSubscribe, readEmbedded, () => false)
}

// The live installer from the admin panel (app/api/desktop-release/route.js):
// undefined while loading, then the release or null (none live / unreachable).
export function useLiveRelease() {
  const [release, setRelease] = useState(undefined)
  useEffect(() => {
    let alive = true
    fetch('/api/desktop-release', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setRelease(d?.release ?? null))
      .catch(() => alive && setRelease(null))
    return () => {
      alive = false
    }
  }, [])
  return release
}

export function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
