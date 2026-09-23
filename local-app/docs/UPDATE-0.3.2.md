# Hollister selection update — 0.3.2

Hollister now exposes all colour links that can be safely bound to the same product page. Choose colour, size, then length. Changing colour reloads that colour's actual SKU data and discards the previous selection. The controls remain visible after both successful and uncertain checks. Changing size invalidates the old verified preview before saving.

The app no longer labels a size unavailable merely because public stock data does not confirm it. Such choices say “availability unknown” and explain that this is not proof of a sellout. Price-evidence failures and app/preorder restrictions have distinct messages. Unknown stock is still not eligible for a verified in-stock sale alert; this release does not invent stock or bypass the retailer's controls.

Tracking remains tied to the exact colour, size and length you choose. Any-colour/any-size aggregate monitoring is not implemented. This avoids comparing different variants as though the same item dropped in price.

146 offline tests passed, including colour-page binding, unknown-stock controls and price-versus-stock error handling. See the real-link browser test report for live validation of the submitted hoodie URL. No real account, credential or email is included.

Update: stop the old server, extract the complete ZIP, copy your old data folder into the new sale-watch folder, then launch Start-Sale-Watch.cmd and refresh the browser. On a previously unverified saved link, choose Verify price. Existing verified products retain their exact identity; add a separate product to track a different verified colour/size.
