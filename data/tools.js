// Local-mode (NEXT_PUBLIC_IS_CONNECT=false) tool list — only feeds
// defaultToolsAccessByRole for users created in this app's own Blob store
// (lib/db.js createUserSettings). In connected mode the admin panel's own
// data/tools.js + `tools` table is what counts.
export const tools = [
  {
    slug: 'chrome-link-opener',
    title: 'Chrome Link Opener',
    icon: 'ExternalLink',
    shortDesc: 'Keep every seller-panel link with its Chrome profile, group and account name — and open any selection in one click.',
    category: 'research',
    badge: 'Free',
    toolUrl: 'https://link-opener.barmeto.com/',
    requiresLogin: false,
  },
];

export const defaultToolsAccessByRole = {
  master_admin: tools.map((t) => t.slug),
  admin: tools.map((t) => t.slug),
  user: tools.map((t) => t.slug),
};
