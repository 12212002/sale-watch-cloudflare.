# Infrastructure notes

Current status and activation requirements: see DEPLOYMENT.md and EMAIL-SETUP.md. The research below describes earlier versions; statements about email being unavailable were superseded by the optional local Gmail integration in 0.3. No host has been selected.

# $0 infrastructure assessment — 2026-09-21

No external hosting, database, authentication or email service has been provisioned. No payment details were entered, no paid tier was enabled, and no paid API is required by this development version.

The application uses the already available Node.js runtime and local SQLite. Building and running it here created no new external service subscription. This does **not** establish an always-on $0 production host.

| Candidate | Findings from current official documentation | Decision |
|---|---|---|
| ChatGPT Sites | Available with Plus, Pro, Business, Enterprise and Edu; plan-specific limits; 10 GB D1 per Site. The sources inspected did not establish all requested pricing/card/charging guarantees or a usable Sites cron deployment API. | Not provisioned. Do not promise independence from a paid ChatGPT plan. |
| Cloudflare Workers Free | 100,000 requests/day, 10 ms CPU/invocation. Official product page explicitly says no credit card is required to start free. Workers support scheduled jobs. | Candidate only, not the selected public host. Node/SQLite code requires a Workers/D1 port. CPU constraints must be measured, particularly password hashing and page parsing. |
| Cloudflare D1 Free | 5 million rows read/day, 100,000 rows written/day, 5 GB total storage. Free-limit exhaustion causes query errors or prevents further storage; paid overages are a separate plan. | Candidate only. Never enable Workers Paid or attach paid R2 as a shortcut. |
| Brevo | Official Free-plan help confirms 300 emails/day and no time limit; excess transactional messages enter a bounded queue. Pricing/sign-up evidence did not establish every card, billing and sender-domain condition required by the user. | Not selected or connected; do not assume email is available for free. |

Official sources:

- https://learn.chatgpt.com/docs/sites
- https://www.cloudflare.com/products/workers/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://www.brevo.com/pricing/
- https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan

## Why no public deployment yet

The user explicitly requested that a final public hosting destination remain undecided unless it is inherently part of a verified $0 building platform. This build has not established such a complete platform. Using an unverified paid dependency or calling a local process an always-on host would violate that instruction.

A practical next architecture candidate is a single Cloudflare Free account for the web API, D1 storage and Cron Triggers, plus a separately verified free transactional-email provider. It is not implemented or activated here. Before selecting it: verify account tier and hard-limit behavior; benchmark the exact workload against free CPU limits; confirm password hashing feasibility; implement the runtime/data-access port; verify email pricing/card/overage rules and sender requirements; obtain user-owned credentials securely; then test closed-browser scheduled checks and email delivery end to end. A domain purchase must not be introduced as a hidden prerequisite.

## Retailer evidence

Lisa Gozlan's robots policy was retrieved through a normal public request. Product paths were allowed for the app's honestly identified user agent; cart paths were disallowed and were not used. The adapter checks the policy and does not follow redirects, solve challenges or use proxies to evade retailer controls.

- https://www.lisagozlan.com/robots.txt
- https://www.lisagozlan.com/products/br046
- https://www.lisagozlan.com/products/br046.js
- https://shopify.dev/docs/api/ajax/reference/product

The product page exposed CAD/CA context and variant-specific JSON-LD offers. Public product JSON supplied exact variant IDs, SKU, size/colour, current price and availability. The app requires both price signals to agree and rejects stale evidence. Shopify documents that monetary amounts can depend on presentment currency; this is why a dollar symbol or a `.com` domain is not treated as CAD proof. No cart or customer endpoint is queried.

A live normal-price check passed for Cloud White / 6 inches and Ballet Pink / 7 inches at CAD $128. Other outcomes were tested with synthetic data. This is limited coverage, not certification of all products, sale cases or future retailer behavior.

## Update 0.2

No external provider was activated. Current official Brevo API documentation describes idempotency keys with a 30-minute lifetime; this is not a substitute for the application’s persistent outbox and refusal to retry ambiguous delivery outcomes. Source: https://developers.brevo.com/docs/heterogenous-versions-batch-emails . Sender requirements and every required zero-cost condition remain unverified, so the app continues to state that email is unavailable.
