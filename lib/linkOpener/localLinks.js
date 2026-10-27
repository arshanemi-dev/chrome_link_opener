'use client'

import { useSyncExternalStore } from 'react'

// Signed-out store: up to GUEST_LINK_LIMIT links in this browser's
// localStorage, never charged. Signed in, links live on the account instead
// (lib/linkOpener/linksApi.js) and whatever is still here can be moved over.
// An external store (not useState) so every tab follows the same list.

const KEY = 'barmeto-link-opener-links'
const EMPTY = []

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

let cache = { raw: undefined, links: EMPTY }
const listeners = new Set()

function readRaw() {
  try { return localStorage.getItem(KEY) } catch { return null }
}

// Same array back while the stored string is unchanged — useSyncExternalStore needs that.
export function readLocalLinks() {
  const raw = readRaw()
  if (raw !== cache.raw) {
    let links = EMPTY
    try {
      const parsed = JSON.parse(raw ?? '[]')
      if (Array.isArray(parsed)) links = parsed.filter((l) => l && typeof l.link === 'string' && l.id)
    } catch {}
    cache = { raw, links }
  }
  return cache.links
}

function writeLocalLinks(links) {
  try {
    if (links.length) localStorage.setItem(KEY, JSON.stringify(links))
    else localStorage.removeItem(KEY)
  } catch {
    // storage full / blocked — nothing more to do than keep the old list
  }
  listeners.forEach((l) => l())
}

function subscribe(onChange) {
  listeners.add(onChange)
  const onStorage = (e) => { if (e.key === KEY || e.key === null) onChange() }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function useLocalLinks() {
  return useSyncExternalStore(subscribe, readLocalLinks, () => EMPTY)
}

export function addLocalLinks(links) {
  const now = new Date().toISOString()
  writeLocalLinks([...readLocalLinks(), ...links.map((l) => ({ ...l, id: newId(), createdAt: now }))])
}

export function updateLocalLink(id, link) {
  writeLocalLinks(readLocalLinks().map((l) => (l.id === id ? { ...l, ...link } : l)))
}

export function removeLocalLinks(ids) {
  const drop = new Set(ids)
  writeLocalLinks(readLocalLinks().filter((l) => !drop.has(l.id)))
}

export function clearLocalLinks() {
  writeLocalLinks([])
}
