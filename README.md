# sale-watch-cloudflare.

Continuation of the two supplied Sale Watch projects. No application restart or full hosted migration has been performed.

| Folder | Purpose |
|---|---|
| [cloudflare-test](cloudflare-test/README.md) | Version 0.1.2 feasibility test; only this folder deploys to the existing test Worker |
| [local-app](local-app/README.md) | Original 0.5.0 Node/SQLite app, preserved with its source, tests, assets and vendored dependencies |

## Next step

Connect the existing `sale-watch-free-test` Worker to this repository using [these settings](cloudflare-test/README.md#update-the-existing-worker-through-github). Then obtain the native connection result before choosing an email fix. Nothing sends an email on build or deployment. No cron is enabled.

## Verified locally

- Main app: 177/177 offline tests passed.
- Updated Cloudflare test: 15/15 offline tests passed; Wrangler dry-run build passed.
- Live email delivery, native probe execution, and the full hosted application are not yet verified.

The public repository excludes local databases, backups, credentials and archived browser captures. Historical documentation in local-app refers to some captures retained in the original supplied ZIP; it is not fresh live evidence. Application code and assets remain intact.

See [migration assessment](MIGRATION.md) for remaining work and cost constraints.
