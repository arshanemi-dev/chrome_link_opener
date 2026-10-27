import { isApp } from './linkRules'

// The links table's columns, tools-5 style: each sorts and has the
// spreadsheet filter (lib/table/useTableView.js). `cellOf(link, key)` gives
// { raw, display } — display is what's shown, filtered and searched on; raw
// is what it sorts by. A row is a URL or an Application; either way Link /
// Path is just what opens. No Status column — an expired link shows by its
// Renew button (Action column) instead of Open.

export const TYPE_LABEL = { url: 'URL', app: 'Application' }

export function linkColumns() {
  return [
    { key: 'profile', label: 'Profile' },
    { key: 'link', label: 'Link / Path' },
    { key: 'group', label: 'Group' },
    { key: 'account', label: 'Account Name' },
    { key: 'type', label: 'Type' },
  ]
}

export function cellOf(link, key) {
  switch (key) {
    case 'type': {
      const label = TYPE_LABEL[isApp(link) ? 'app' : 'url']
      return { raw: label, display: label }
    }
    case 'profile':
      return isApp(link) ? { raw: '', display: '' } : { raw: link.chromeProfile ?? '', display: link.chromeProfile ?? '' }
    case 'link':
      return { raw: link.link ?? '', display: link.link ?? '' }
    case 'group':
      return { raw: link.groupName ?? '', display: link.groupName ?? '' }
    case 'account':
      return { raw: link.accountName ?? '', display: link.accountName ?? '' }
    default:
      return { raw: '', display: '' }
  }
}
