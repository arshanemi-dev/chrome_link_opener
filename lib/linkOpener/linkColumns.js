import { isApp } from './linkRules'

// The links table's columns, tools-5 style: each sorts and has the
// spreadsheet filter (lib/table/useTableView.js). `cellOf(link, key)` gives
// { raw, display } — display is what's shown, filtered and searched on; raw
// is what it sorts by. Type shows only once there are desktop apps; Status
// only for links on an account (browser links never expire).

export function linkColumns({ account, hasApps }) {
  return [
    hasApps && { key: 'type', label: 'Type' },
    { key: 'profile', label: 'Chrome Profile' },
    { key: 'link', label: 'Link' },
    { key: 'group', label: 'Group' },
    { key: 'account', label: 'Account Name' },
    account && { key: 'status', label: 'Status' },
  ].filter(Boolean)
}

export function cellOf(link, key) {
  switch (key) {
    case 'type':
      return isApp(link) ? { raw: 'App', display: 'App' } : { raw: 'Link', display: 'Link' }
    case 'profile':
      return isApp(link) ? { raw: '', display: '' } : { raw: link.chromeProfile ?? '', display: link.chromeProfile ?? '' }
    case 'link': {
      const shown = isApp(link) ? link.targetPath || link.link : link.link
      return { raw: shown, display: shown }
    }
    case 'group':
      return { raw: link.groupName ?? '', display: link.groupName ?? '' }
    case 'account':
      return { raw: link.accountName ?? '', display: link.accountName ?? '' }
    case 'status':
      // Sorted by the date it's paid until — soonest to lapse first on A → Z.
      return { raw: link.paidUntil ? new Date(link.paidUntil).getTime() : 0, display: link.expired ? 'Expired' : 'Active' }
    default:
      return { raw: '', display: '' }
  }
}
