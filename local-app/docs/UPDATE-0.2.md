# Sale Watch 0.2 — update notes

## What changed

- Added two separate retailer adapters: Brandy Melville Canada and Garage. Together with Lisa Gozlan, these are **three limited pilots**, not full catalogue certification.
- Fixed overly broad challenge detection: a public Shopify page containing a CAPTCHA library for its contact form is not itself an access challenge. Actual challenge pages and HTTP access blocks still stop checking.
- Saved unverified products now have **Verify price** on supported retailers. Verification keeps your saved card, notes and custom image instead of requiring deletion.
- Selecting a size/colour starts verification automatically. Saving is disabled during verification; the server still controls the price and exact identity.
- Automatic product photos from restricted retailer/CDN image hosts. Custom uploads remain available.
- Password changes require the current password and revoke other sessions. Account deletion also requires the password. Download my data exports only the signed-in account's products, notes, images, history and activity.
- Real PNG app icons, Apple touch icon, and a public-shell-only service-worker cache. Account/API data and product images are never cached by the service worker.
- Improved narrow-screen wrapping, account-control layout and price-chart spacing using actual observation times.
- Graceful server shutdown waits for an in-flight worker cycle before closing the database.
- Database backup command: `npm run backup`. No third-party service is involved.

## Install the update without losing your products

1. Stop the old server: press **Ctrl+C** in its terminal window.
2. Extract the new ZIP into a new folder.
3. Copy the entire **data** folder from your old `sale-watch` folder into the new `sale-watch` folder. Keep the old folder as a backup. Do not copy the new folder over your old data or delete your old data.
4. Open the new `Start-Sale-Watch.cmd` on Windows, or run `node launcher.mjs` on macOS/Linux. Sign in with your existing account.
5. Refresh the browser. The database format is compatible with version 0.1.

Alternatively, replace the source files inside your existing installation while keeping its `data` folder. No real accounts, private data, credentials or database are included in this ZIP.

## Verified results

107 automated tests passed. Tests cover the prior privacy/price protections plus resolution of saved links, duplicate protection, password rotation, account deletion, export privacy, image URL restrictions, challenge classification and Garage's exact-SKU validation.

Live authenticated API flows passed for:

- Lisa Gozlan: Heart Jewel Bracelet, Yellow Gold / Cloud White / 6 inches.
- Brandy Melville: Bonnie Top, Light Charcoal Grey / S.
- Brandy Melville: Priscilla Pants, Navy Blue / XS/S.
- Garage: UltraFleece Hoodie, Green Envy with GARAGE Logo Art / S/M.

A second Garage colour/size attempt returned UNCERTAIN and was not accepted or saved with a fabricated price. Live observations are time-specific; the stored evidence does not promise future availability. The first Brandy attempt exposed the overly broad challenge detector; it passed after that detector was fixed and regression-tested.

Chromium could not be downloaded in this environment (network timeout). Browser visual QA and actual iPhone/Android installation are **not claimed**. HTTP integration tests exercised the backend, not a rendered browser.

## Still needed before this is a finished online service

- Select and configure a verified $0 hosting environment, then validate the worker while all client devices are off. No final public host has been chosen, following your original instruction.
- Establish all email-provider $0/card/billing and sender requirements, securely configure an account, implement recipient ownership verification, and test actual delivery. Email remains explicitly unavailable; no real emails were sent.
- Validate broader catalogue/sale/clearance cases for the three pilots. The other twelve retailers remain unavailable for automated monitoring, with individual reasons displayed.
- Browser/device QA and production deployment validation.

No paid API, paid plan, credit card or new service subscription was introduced by this update.
