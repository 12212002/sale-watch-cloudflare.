# Deployment requirements

No public hosting destination has been selected, as requested. This package runs locally and cannot monitor when its server computer is off. A static Firebase/GitHub Pages upload alone cannot run this backend or its worker.

The current runtime requires Node 24+, a persistent writable SQLite volume, outbound HTTPS to permitted retailers and TLS SMTP to Gmail, process supervision, and an HTTPS reverse proxy. It is not a Cloudflare Workers/D1 application; that deployment would require a runtime and database port. No paid host or card-backed free trial is acceptable.

## Configuration for a future compatible host

- `HOST=127.0.0.1` for a same-machine reverse proxy; otherwise bind only within a protected private network.
- `PORT=4173` by default.
- `SALE_WATCH_ORIGIN=https://YOUR-ACTUAL-HOSTNAME` must exactly match the externally visible origin.
- `SALE_WATCH_DB=data/sale-watch.sqlite` defaults to a persistent private data path relative to the working directory.
- Gmail configuration remains `data/email.json` relative to the app working directory. Mount it privately, never bake credentials into an image.

The proxy must preserve the configured public Host and terminate HTTPS. Keep direct backend access private. Start with `node src/server.js` from the app directory. It includes the worker; no browser or public cron endpoint is needed. Do not run separate workers unless resource limits and locking behavior have been assessed. Graceful SIGTERM waits for in-flight work.

## Acceptance before public launch

1. Verify the actual account requires no payment/card and has hard free limits, including persistence, background execution, outbound networking and backups. Do not assume a free static host supplies these features.
2. Validate HTTPS, trusted origin checks, cookies, account isolation and resource/rate limits at the real URL.
3. Configure email privately; verify inbox delivery with an address you own. Test a controlled synthetic drop without fabricating retailer prices.
4. Close all browsers and turn off client computers. Observe at least two scheduled intervals from the independent host and confirm persisted history.
5. Use `npm run backup`; test restoration to a separate database. Secure the credential file separately. Establish retention and storage caps suitable for the verified free tier.
6. Validate phone installation, accessibility, narrow layouts and realistic multi-account capacity. The included desktop/mobile browser evidence is not a real-device or production load test.

This file prepares the deployment requirements; it does not claim a host has been provisioned or that these launch checks passed.
