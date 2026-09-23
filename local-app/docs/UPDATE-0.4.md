# Indigo across categories — 0.4

Removed the book-only restriction. Indigo products are verified by exact product ID, SKU, variant URL, CAD price and availability, rather than requiring every item to have an ISBN. Numeric barcode/ISBN evidence must still agree when present.

Supported data formats now include both ProductGroup with exact variants and single-option Product JSON-LD. Digital editions can be verified using their own SKU and variant ID; a digital SKU need not be its ISBN. Product names with encoded Unicode characters and collection-prefixed product URLs are accepted. Single-option items verify automatically, and the server pins their exact variant ID in saved URLs so future checks cannot silently switch to a replacement option.

## Real browser checks

The following live Indigo pages passed identify, select, verify and save through the app at a mobile viewport. Saved URLs were checked for the exact variant ID. Tests used a temporary account and sent no email.

- A Potato on a Bike — Board Book.
- A Potato on a Bike — Kobo eBook.
- Mr./Mrs. Mug — changed from Mr. to Mrs. before saving.
- Embossed Bookshop Mug, Fall Edition — single-option merchandise.
- Spiral Journal, Lucky Thoughts — stationery.
- LEGO Rocking Plants, 11506 — toy with an encoded product name.

Exact URLs and results: indigo-expanded-browser.json. 162 offline automated tests passed, including barcode conflicts, wrong variant URLs, foreign sellers, expired evidence, duplicate IDs, ambiguous single-product evidence and pinned server previews.

## Limits

This implements category-independent verification for products exposing the supported public data. It is not a catalogue-wide or permanent guarantee. Removed URLs (one researched LEGO AT-AT link returned 404), old redirected links, unavailable products, access blocks, missing/conflicting evidence, subscriptions and unverified sellers will still fail safely. Inventory is not a reservation or a guarantee of delivery to a particular postal code. The adapter checks public online availability; it does not claim local-store stock. Prices exclude delivery and checkout-only discounts.

No new hosting or email account was activated. Existing store integrations remain as before. Update by stopping the old app, extracting this full ZIP, copying your private data folder into the new sale-watch folder, and starting the new launcher. Existing data remains compatible.
