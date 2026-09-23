# Hosted migration assessment — September 23, 2026

Continue the existing 0.5.0 implementation. Do not deploy local-app as a Worker unchanged.

| Area | Existing implementation and required hosted work |
|---|---|
| Accounts | scrypt password hashing, hashed sessions, CSRF, verified email and recovery codes exist. Benchmark hashing against Workers Free CPU before selecting an approach; do not weaken password hashing to make it fit. Persist rate limits and enforce account isolation. |
| Database | node:sqlite synchronous calls and BEGIN IMMEDIATE transactions need asynchronous D1 access and atomic operations. Preserve 15-active-product enforcement, observation ownership, leases, migrations and alert deduplication. Test concurrent updates before migration. |
| Price previews | Current preview tokens live in a process Map. Store them durably with owner and expiry; requests can reach different Worker instances. |
| Uploaded images | Existing data-URL images are capped at 200,000 characters. Small D1-backed images are a candidate, not yet selected or capacity-tested. Avoid returning all image bytes repeatedly. No R2 subscription is enabled. |
| Scheduled checks | Existing one-minute process timer selects due products every 9,000 seconds, with five-minute drop confirmation. Replace with scheduled handlers and bounded work batches; verify leases, retry timing and operation with all browsers/computers closed. Cron has the same 10 ms Free CPU limit. |
| Email | Keep owner-configured sending and visitor email verification. Diagnose native TLS first; SMTP acceptance still needs inbox confirmation. Preserve at-most-once attempt records and uncertain outcomes; do not resend interrupted attempts. Current main app caps all mail attempts at 80 per rolling day across users, not 80 per user. |
| Prices | Keep exact colour/size identity and CAD verification, retailer reference prices distinct from tracking baseline, rises in history, and unknown stock as unknown. Do not generate initial-sale drop alerts. |
| Retailers | Existing limited adapters: Hollister, Indigo, Lisa Gozlan, Brandy Melville and Garage. No adapter logic changed in this update. Test real selected product links from the hosted runtime separately from offline fixtures; Garage remains low priority. |
| Resources | Measure parser, authentication and mail CPU with realistic worst-case pages. Index D1 reads, bound history and image storage, and document account capacity. Free quotas do not establish unlimited users. |
| Rollout | Verify HTTPS sessions, CSRF, account export/delete, backup/restore, no cross-account leaks, schema migration and rollback before moving private data. Never publish a local database to GitHub. |

## Cost boundaries

Use Workers Free, D1 Free and Workers Builds Free only. No credit card, paid plan, purchased domain, paid API or automatic upgrade is introduced here. Free allowances are account-wide: Workers 100,000 requests/day and 10 ms CPU per invocation; D1 5 million rows read/day, 100,000 written/day and 5 GB total; Builds 3,000 minutes/month and one concurrent build. A small prototype passing is not proof the complete workload fits. Check the account's actual plan before connection.

## Evidence separation

Offline tests: main 177; probe 15. Build: dry-run only. Fresh live observation this session: existing test landing page responds and lacks native probe. Prior live price and failed email diagnostic are user-reported, not rerun. No new live retailer result, real email send, or deployed native socket result is claimed.

Sources: https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/d1/platform/pricing/ ; https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
