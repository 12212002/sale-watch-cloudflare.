# Sale Watch 0.5.0 status

**Working local application; incomplete for the full 15-store, always-on hosted goal.**

| Area | Result |
|---|---|
| Accounts and private watchlists | Implemented and tested, including 15-active limit, export, deletion and password changes |
| Prices, history and sale confirmation | Implemented; uncertainty preserves accepted prices |
| Background worker | Runs every minute to find due work, with observations about 2½ hours apart; server must stay on |
| Email | Gmail transport, ownership verification, preferences, image templates and reset implemented; real account setup/delivery still required |
| Desktop and mobile interface | Chromium browser flows passed at 1440×1000 and 390×844; real-device installation still pending |
| Automated validation | 177 offline tests passed; simulated email only |
| Hosting | Not selected or deployed |

## Retailers

| Retailer | Automatic checks |
|---|---|
| Lisa Gozlan | Limited: exact CAD variants |
| Brandy Melville Canada | Limited: exact CAD variants |
| Garage | Limited: exact colour/size SKU |
| Hollister | Limited: colour → size → length selection; exact SKU CAD prices; unclear public stock labelled unknown |
| Indigo | Broad category support with strict evidence checks: books, digital editions and merchandise; six real browser cases passed |
| Old Navy Canada | Unavailable; redirect/product research did not establish a validated adapter |
| Gap Canada | Unavailable; public product data found, exact identity and availability validation unfinished |
| Aritzia | Unavailable; robots request blocked |
| Sephora Canada | Unavailable; no validated adapter |
| American Eagle Canada | Unavailable; no validated adapter |
| H&M Canada | Unavailable; access challenge |
| lululemon Canada | Unavailable; no validated adapter |
| Best Buy Canada | Unavailable; request blocked |
| Amazon Canada | Unavailable; no reliable free exact-seller/condition/variant source established |
| Aerie Canada | Unavailable; no validated adapter |

Recognising a link does not mean automatic tracking works. Unimplemented retailers make no checking requests. Selected live successes are point-in-time checks, not full-catalogue certification. Sale and failure cases have synthetic tests; broad live sale/out-of-stock validation remains.

Hollister uses a Sale Watch SKU parameter to retain your exact size. The retailer page may still require you to select that size again when shopping. Indigo's old /en-ca links must be replaced with a current /products link. Collection-prefixed product links and encoded product names are accepted.

## Evidence

- `test-results.txt`: complete current offline test output.
- `browser-qa.json`: tested interface flows, with simulated email.
- `live-hollister-0.3.json` and `live-indigo-0.3.json`: authenticated live inspect/save/history checks.
- Previous live reports retain their original timestamps and are historical evidence only.

Remaining work: ten retailer integrations; real Gmail activation/inbox test; verified-$0 independent hosting and closed-client scheduling test; production capacity/security/backup verification and real-device PWA validation.

Latest live browser validation: `hollister-real-browser.json`. The submitted hoodie exposed 26 colours; selecting a different colour, verifying its size, saving and opening history passed. User-reported Garage and Indigo failures remain unresolved without their exact links.

Update 0.3.3: option selectors added to Lisa Gozlan, Brandy Melville, Indigo and Garage. Three real browser flows passed; Garage blocked the current live check. See other-retailer-browser-0.3.3.json and UPDATE-0.3.3.md.

Update 0.4 supersedes the earlier Indigo physical-book-only limitation. See UPDATE-0.4.md and indigo-expanded-browser.json.

Update 0.5 adds verified retailer regular-price display, on-sale badges for initial saves, separate upward/downward movement, increase activity and safer alert queues. See AUDIT-0.5.md for the current audit scope, evidence and remaining limitations.
