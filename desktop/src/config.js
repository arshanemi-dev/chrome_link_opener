const { app } = require('electron')
const pkg = require('../package.json')

// The desktop app is a window onto the hosted web app (tools/chrome_link_opener)
// — it doesn't bundle the Next.js server, so no server secret (JWT, SMTP, …)
// ever ships inside the installer. Pick the URL with:
//   CLO_APP_URL=…           any build (e.g. a staging deploy)
//   packaged installer      package.json "linkOpener.appUrl" (production)
//   `npm start` (unpacked)  http://localhost:3006 — the web app's `npm run dev`
const APP_URL = (process.env.CLO_APP_URL || (app.isPackaged ? pkg.linkOpener.appUrl : 'http://localhost:3006')).replace(/\/$/, '')

module.exports = {
  APP_URL,
  APP_ORIGIN: new URL(APP_URL).origin,
  START_URL: `${APP_URL}/link-opener`,
}
