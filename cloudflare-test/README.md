# Sale Watch Cloudflare feasibility test 0.1.2

This is a diagnostic prototype, not the complete hosted Sale Watch application.
No scheduled checks are enabled. Keep the main local application separately.

## What changed

Added **Test direct Cloudflare connection (no password or email)**. This opens a native Cloudflare TLS socket to smtp.gmail.com:465 and reads a bounded SMTP greeting. It never writes commands, receives Gmail credentials, logs raw provider messages, or sends email. A new `native-connection-v1` ledger entry prevents repeat attempts; the existing price, email and connection-v1 entries are unchanged.

Successful greeting means only that the native TLS path works. It does not prove SMTP login or delivery. A failure does not prove that a password is wrong. Do not change the email transport until the deployed native probe result is reviewed.

## Update the existing Worker through GitHub

Connect the existing `sale-watch-free-test` Worker to the confirmed repository `12212002/sale-watch-cloudflare.` in Cloudflare Settings > Build.

| Setting | Value |
|---|---|
| Branch | main |
| Root directory | cloudflare-test |
| Build command | npm run check |
| Deploy command | npm run deploy |
| Node version | 24 (set NODE_VERSION=24 if needed) |

The lockfile pins Wrangler; dependencies are installed by Workers Builds. Disable builds for non-production branches for this test, so previews do not share its test ledger. After connection, successful builds deploy new commits automatically. No GitHub Actions secrets, manual ZIP download, or local terminal is needed for routine updates.

**Use the existing Worker and database. Do not create a new Worker, recreate the database, import schema.sql again, clear the attempts table, or re-enter existing secrets.** The existing DB binding and database ID are already in wrangler.jsonc. Runtime secrets remain in Cloudflare; they are not build variables.

Stay on Free; do not enter a credit card or enable a paid service. If the account requests payment, stop and review the screen.

## Obtain the result

1. Open the existing test website and check that it shows Version 0.1.2.
2. Enter the existing private test key only on that website.
3. Click **Test direct Cloudflare connection (no password or email)** once.
4. Share only the displayed result, without the key.

If interrupted, use **Show saved results**. A STARTED record is not success and is not automatically reset. The separate **Send one test email** button sends a real email and retains its original one-attempt ledger. This update does not authorize or trigger a retry.

## Evidence as of September 23, 2026

- Rebuilt from the supplied 0.1.1 archive; this is the newly implemented 0.1.2 diagnostic.
- 15 offline Node tests pass, including simulated fragmented greetings, timeout, safe failures, authorization, and duplicate prevention. Tests send no real email.
- Wrangler dry-run bundles successfully. This is not production runtime or CPU validation.
- The previously deployed public page was reachable and lacked the native probe.
- User-reported prior live Hollister check: black/M SKU 666191202, CAD 25.00, regular CAD 39.95. Not rerun here; not a current price claim.
- User-reported SMTP diagnostics: ESOCKET at CONN on 465 and 587. Actual delivery remains unconfirmed.
- New native probe: live deployment/result still required.

## Free limits and remaining gates

Workers Free: 100,000 requests/day, 10 ms CPU/invocation (including cron); network waiting is not CPU time. D1 Free: 5 million rows read/day, 100,000 rows written/day, 5 GB total storage. Workers Builds Free: 3,000 minutes/month, one concurrent build, 20-minute build timeout. Quotas are shared with other projects in the same account. No plan upgrades are configured by this repository.

This test does not prove the full application fits those limits. Measure parser and mail CPU, verify actual inbox delivery, then assess authentication, D1 transactions, bounded image storage, background checks, rate limits, backups, and safe notification retries. Gmail is a shared owner-configured sender; visitors should only enter and verify their own recipient email.

Official sources checked September 23, 2026:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/

## Local developer commands

Requires Node 24+. `npm ci`, `npm test`, `npm run build` (dry run), `npm run dev` (local preview). `npm run deploy` changes the existing remote Worker but sends no email itself. `schema.sql` is retained for isolated local testing, not as an update instruction for the existing remote database.
