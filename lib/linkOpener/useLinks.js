'use client'

import { useCallback, useEffect, useState } from 'react'
import { GUEST_LINK_LIMIT, isApp } from './linkRules'
import { useLocalLinks, addLocalLinks, updateLocalLink, removeLocalLinks, clearLocalLinks } from './localLinks'
import { fetchLinks, createLinks, patchLink, deleteLinks, renewLinks, fetchWalletCoins } from './linksApi'

const IS_CONNECT = process.env.NEXT_PUBLIC_IS_CONNECT === 'true'

const loadAccount = () => Promise.all([fetchLinks(), fetchWalletCoins()])

// One list, two stores. Signed out (or local mode, which has no hub to save
// to) → the browser, 10 links max, free. Signed in → the account: every add
// is charged by the hub (coinsPerLink each, monthly), and a refusal comes
// back as `gate` for BillingGateModal. Desktop apps (kind 'app', from the
// desktop app's Scan Applications) are account-only and priced on their own
// (coinsPerApp). Every action resolves to
// { ok: true, ... } or { ok: false, gate | limit | error }.
//
// `user` is useStoredUser()'s value: undefined until hydrated.
export function useLinks(user) {
  const mode = user === undefined ? 'loading' : user && IS_CONNECT ? 'account' : 'guest'
  const localLinks = useLocalLinks()
  const [account, setAccount] = useState({
    links: [], loaded: false, error: '', coinsPerLink: null, coinsPerApp: null, appsAvailable: false, freeForRole: false,
  })
  const [wallet, setWallet] = useState(null)

  const apply = useCallback(([{ ok, data }, coins]) => {
    if (coins != null) setWallet(coins)
    setAccount((prev) => (ok
      ? {
        links: data.links ?? [], loaded: true, error: '',
        coinsPerLink: data.coinsPerLink ?? 0, coinsPerApp: data.coinsPerApp ?? 0,
        appsAvailable: !!data.appsAvailable, freeForRole: !!data.freeForRole,
      }
      : { ...prev, loaded: true, error: data.error || 'Could not load your links.' }))
  }, [])

  const reload = useCallback(() => loadAccount().then(apply), [apply])

  useEffect(() => {
    if (mode !== 'account') return
    let live = true
    loadAccount().then((result) => { if (live) apply(result) })
    return () => { live = false }
  }, [mode, apply])

  // A hub response carrying a fresh balance — keep the wallet chip in step.
  const noteWallet = (data) => {
    if (Number.isFinite(data?.remainingCoins)) setWallet(data.remainingCoins)
  }

  const refused = (status, data) => (data?.status === 'blocked'
    ? { ok: false, gate: { reason: data.reason, data: data.data } }
    : { ok: false, error: data?.error || `Request failed (${status})` })

  async function add(links) {
    if (!links.length) return { ok: true, added: 0 }
    if (mode === 'guest') {
      if (links.some(isApp)) return { ok: false, error: 'Log in to save desktop applications.' }
      const room = GUEST_LINK_LIMIT - localLinks.length
      if (links.length > room) return { ok: false, limit: { room: Math.max(0, room), wanted: links.length } }
      addLocalLinks(links)
      return { ok: true, added: links.length, coinsCharged: 0 }
    }
    // The hub takes one kind per request (one price each): links, then apps.
    let added = 0
    let coinsCharged = 0
    for (const batch of [links.filter((l) => !isApp(l)), links.filter(isApp)]) {
      if (!batch.length) continue
      const { ok, status, data } = await createLinks(batch)
      if (!ok) return { ...refused(status, data), added }
      noteWallet(data)
      setAccount((prev) => ({ ...prev, links: [...prev.links, ...(data.links ?? [])] }))
      added += data.links?.length ?? 0
      coinsCharged += data.coinsCharged ?? 0
    }
    return { ok: true, added, coinsCharged }
  }

  async function update(id, link) {
    if (mode === 'guest') {
      updateLocalLink(id, link)
      return { ok: true }
    }
    const { ok, status, data } = await patchLink(id, link)
    if (!ok) return refused(status, data)
    setAccount((prev) => ({ ...prev, links: prev.links.map((l) => (l.id === id ? data.link : l)) }))
    return { ok: true }
  }

  async function remove(ids) {
    if (mode === 'guest') {
      removeLocalLinks(ids)
      return { ok: true }
    }
    const { ok, status, data } = await deleteLinks(ids)
    if (!ok) return refused(status, data)
    const gone = new Set(data.deleted ?? ids)
    setAccount((prev) => ({ ...prev, links: prev.links.filter((l) => !gone.has(l.id)) }))
    return { ok: true }
  }

  async function renew(ids) {
    const { ok, status, data } = await renewLinks(ids)
    if (!ok) return refused(status, data)
    noteWallet(data)
    const fresh = new Map((data.links ?? []).map((l) => [l.id, l]))
    setAccount((prev) => ({ ...prev, links: prev.links.map((l) => fresh.get(l.id) ?? l) }))
    return { ok: true, renewed: fresh.size, coinsCharged: data.coinsCharged ?? 0 }
  }

  // Signed in with links still in this browser: save them all to the account
  // (charged like any add), then clear the browser copy.
  async function moveLocalToAccount() {
    const result = await add(localLinks.map(({ chromeProfile, link, groupName, accountName }) => ({ chromeProfile, link, groupName, accountName })))
    if (result.ok) clearLocalLinks()
    return result
  }

  const links = mode === 'account' ? account.links : mode === 'guest' ? localLinks : []
  return {
    mode,
    links,
    loading: mode === 'loading' || (mode === 'account' && !account.loaded),
    error: mode === 'account' ? account.error : '',
    coinsPerLink: mode === 'account' ? account.coinsPerLink : 0,
    coinsPerApp: mode === 'account' ? account.coinsPerApp : 0,
    appsAvailable: mode === 'account' && account.appsAvailable,
    freeForRole: account.freeForRole,
    wallet: mode === 'account' ? wallet : null,
    // Browser links waiting to be moved over — only meaningful signed in.
    pendingLocal: mode === 'account' ? localLinks : [],
    add, update, remove, renew, reload, moveLocalToAccount,
  }
}
