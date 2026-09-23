# Sale Watch 0.5 — audit and validation

## Scope and conclusion

Reviewed first-party backend, retailer adapters, authentication/email flows, database, worker, UI, PWA, launch/setup and backup code. Ran syntax checks, automated tests, browser scenarios, real retailer checks, migration and backup/restore tests. This is a development audit, not an independent penetration test or proof that every possible issue is fixed. Vendored Nodemailer was not independently re-audited line by line. Hosting and actual Gmail inbox delivery were not exercised.

177 automated tests passed. Desktop and mobile general account/browser tests passed. Controlled price-transition browser tests passed; the synthetic 39.95/37/39/35 examples are test data, not claims about current retailer prices. Real retailer evidence is recorded separately.

## Findings fixed

| Finding | Change and validation |
|---|---|
| Items added during an existing sale looked full-price | Five adapters now extract explicit regular/list/compare-at prices for the exact variant. Validated separately from current-price evidence, persisted with accepted observations and shown crossed out with a discount. |
| Initial sale confused with a newly detected drop | Retailer discount, starting price and last movement are separate. Initial saves create neither false drop activity nor email. |
| Price increases were missing from activity | Increases now appear with upward arrows and activity entries. Email remains drop-only. |
| Shared product history could show movement from before a user joined | Current/regular/previous prices derive from that user's linked observations. A new subscriber does not inherit earlier movement; paused tracks stop accumulating prices. |
| Existing sale metadata could become stale | Failed/pending checks retain the last accepted pair. A successful check with no validated regular-price evidence clears that field instead of perpetuating a guessed sale. |
| Confirmation unnecessarily waited a full interval | Pending decreases schedule a separate check after five minutes. Normal checks remain approximately 2.5 hours. |
| Queued emails could describe superseded prices | Queued alerts are skipped when the accepted price changed again. Pausing cancels pending alerts. |
| Late UI responses could update replaced dialogs or another session | Inspection, dashboard, history, activity and settings responses are guarded against changed UI/session state. Selectors are inert during verification; old price previews clear on selection changes. |
| Open watchlist could show old state indefinitely | Visible dashboard refreshes about once per minute and on returning to the tab. |
| Old databases lacked regular-price fields | Transactional additive migration preserves data/history, adds fields and schedules fresh checks. Upgrade and backup/restore tests passed. |
| Recovery text incorrectly said email recovery was always unavailable | Text now explains verification and configured-delivery requirements. |

## Evidence by retailer

| Retailer | Regular-price source | Current live result |
|---|---|---|
| Hollister | Exact SKU Apollo original price agrees with legacy list-price string and numeric cross-check | Submitted black / Medium shorts verified and saved with regular and sale prices displayed. |
| Lisa Gozlan | Exact Shopify variant compare_at_price in the verified CAD context | Heart Jewel Bracelet verified and saved. No regular price was supplied, so the UI correctly avoided inventing a discount. Sale extraction also fixture-tested. |
| Brandy Melville | Exact Shopify variant compare_at_price in the verified CAD context | Bonnie Top verified and saved. The former Priscilla pants URL returned HTTP 404; it is not reported as working. Sale extraction fixture-tested. |
| Indigo | Exact Shopify variant compare_at_price, with exact CAD selling-price verification | Spiral Journal verified and saved with a regular-price discount. |
| Garage | Explicit listPrice in the verified selected-SKU state | Current live request blocked. Extraction is covered by fixture tests and prior captured-page evidence; live reliability is not certified. |

A list/compare-at price is the retailer's reference price, not proof it previously sold at that price. The UI calls it “Retailer regular.” A single explicit regular-price source is accepted for Shopify/Garage; current prices retain their existing independent signal checks. Hollister regular prices require its two matching representations. Missing or conflicting regular evidence never invalidates an otherwise verified selling price; the discount is simply omitted.

## Controlled acceptance scenarios

- Added at 37 with regular 39.95: 7.4% off immediately, baseline 37, no new-drop alert.
- Rises to 39 while regular remains 39.95: upward 2 movement, 2.4% off remains, increase activity and no email.
- Drops to 35: pending until a later matching check; one confirmed drop activity/outbox entry, no duplicates.
- Sale ends or reference price disappears: sale badge clears on the next accepted check.
- Failed check: keeps accepted selling/regular prices and displays the failure.
- New subscriber and paused subscriber: no inherited private movement or new paused observations.
- Existing database upgrade and restored backup: prices and account isolation preserved; no retroactive invented regular prices.

## Remaining limitations

Garage still blocks requests in this environment. Retailer pages, prices, availability, promotions and markup can change; selected live checks do not certify entire catalogues. Checkout-only/member offers, missing evidence and access challenges fail safely. Ten other retailers remain unimplemented. No always-on public host was selected; checks require the Node server to run. Gmail credentials/inbox delivery still need user setup. Production load testing, external security review and real-device PWA installation remain outstanding. No audit can guarantee all future failures are eliminated.

## Files

- test-results.txt: complete 177-test output.
- sale-flow-browser.json: controlled sale/rise/drop browser flow; no real emails sent.
- sale-live-browser.json: live multi-retailer results, including failed/blocked cases.
- sale-brandy-browser.json: successful alternate Brandy live browser check.
- sale-initial-desktop.png and sale-rise-mobile.png: synthetic example UI screenshots.

## Update safely

Stop the old server with Ctrl+C. Extract the full ZIP into a new folder, copy the entire old data folder into its sale-watch folder, and keep the original as a backup. Launch the new Start-Sale-Watch.cmd, refresh, and verify Settings shows 0.5.0. Existing products populate regular prices on fresh checks; no historical prices are invented. Do not use older code with the upgraded database.
