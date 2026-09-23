# Sale Watch 0.5.0

A working local price tracker with private accounts and a real Node/SQLite backend. **Not yet an always-on hosted service; not all stores are supported.**

## Start or update

Requires Node.js 24 or later. No npm install is needed; the email library is included with its license.

1. If updating, stop the old server with Ctrl+C. Extract this complete ZIP into a new folder.
2. Copy the entire old `sale-watch/data` folder into the new `sale-watch` folder. Keep the old copy as a backup. New installations skip this step.
3. Windows: double-click `Start-Sale-Watch.cmd`. macOS/Linux: run `node launcher.mjs` from the extracted folder.
4. Sign in, or create an account and save your recovery code. Refresh the browser after an update.

The database upgrades automatically. Your accounts and products stay in the private `data` folder, which is never included in this download.

## Features

- Private accounts, sign-in, recovery codes, password changes, data export and account deletion.
- Up to 15 active products per account; custom titles, notes and uploaded photos.
- Add, edit, delete, pause, verify and view price history and charts.
- Exact-variant CAD verification for **five limited integrations: Lisa Gozlan, Brandy Melville Canada, Garage, Hollister and Indigo products across categories**.
- Other recognised stores can be saved as links, but do not have automatic price checks. See [coverage](docs/STATUS.md).
- Confirmed price-drop alerts with the product, image when available, original link, and minimum percentage preference. No scheduled reminder emails.
- Gmail connection, recipient verification and verified-login-email password reset. **Setup is required; no credentials are included.** See [email setup](docs/EMAIL-SETUP.md).
- Light, dark and system themes, responsive mobile layout and installable public PWA shell. Private data is not cached for offline use.
- Background checks approximately every 2½ hours while the server is running. Closing the browser is fine; turning off the server computer stops checks.

Prices are accepted only when matching evidence passes validation. Failed checks preserve the last verified price. Price drops need a separate confirmation observation. Limited integration means selected products passed, not that every product or future page change will work.

## Commands

- `npm start`: start the server, default http://127.0.0.1:4173.
- `npm test`: offline automated tests; no real emails.
- `npm run setup-email`: configure Gmail locally without sending a message.
- `npm run backup`: consistent SQLite backup in the private `backups` folder.
- `npm run worker`: one cycle of due checks and configured email delivery.
- `node tests/live.mjs`: optional live retailer checks using an isolated temporary account; no emails. Do not run repeatedly in a tight loop.

## Remaining activation work

Real email delivery needs your local Gmail app password and an inbox test. Always-on monitoring needs a separately selected, verified-$0 host and deployment testing. No hosting account, paid plan, purchased domain or credit card has been activated. Ten retailer integrations are still unavailable. Real-device PWA installation and production capacity/security checks remain.

See [update notes](docs/UPDATE-0.3.md), [status](docs/STATUS.md), and [deployment requirements](docs/DEPLOYMENT.md).

Indigo update 0.4: physical and digital books, merchandise, single-option products and multi-option products share exact SKU/variant verification. Six real browser cases passed, including mugs, stationery and LEGO. This is broad category support, not a guarantee for every listing. See docs/UPDATE-0.4.md.

## Sale display and movement — 0.5

Cards now show the retailer's verified regular price crossed out and its discount, including when you add a product that is already on sale. A separate arrow shows the last verified increase or decrease in your own tracking history. Price when added remains a separate baseline. If the retailer does not expose a valid regular price, no discount is invented.

Increases appear in activity and history but never send email. A later decrease requires a confirmation check after about five minutes before alerting. Adding an existing sale does not manufacture a new price-drop event. Pausing cancels unsent alerts; queued drops are not sent if the accepted price changed again.

The database upgrades automatically and queues existing products for fresh checks to collect regular prices. Old history is preserved without inventing earlier regular prices. Keep the old installation/data copy as your backup, and do not run the old code against the upgraded database. Check Settings → Using Sale Watch for version 0.5.0.

Audit results and limitations: docs/AUDIT-0.5.md. 177 automated tests passed; real browser checks passed for Hollister, Lisa Gozlan, Brandy Bonnie Top and Indigo. Garage blocked live access. Always-on hosting and your real Gmail activation remain outstanding.
