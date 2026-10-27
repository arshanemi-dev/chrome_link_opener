'use client'

import { useSyncExternalStore } from 'react'

// The Windows desktop app (desktop/) loads this same site and adds
// `window.desktop` (desktop/src/preload.js). Present → scan Desktop shortcuts,
// launch saved apps, open links in their Chrome profile. Absent (a normal
// browser tab) → none of that; links open in new tabs as before.

export const DESKTOP_APPS_GROUP = 'Desktop Applications'

const noSubscribe = () => () => {}
const read = () => (typeof window !== 'undefined' && window.desktop?.isDesktop ? window.desktop : null)

// null on the server and during hydration, then the bridge (or null).
export function useDesktop() {
  return useSyncExternalStore(noSubscribe, read, () => null)
}
