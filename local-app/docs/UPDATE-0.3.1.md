# Hollister fix — 0.3.1

Fixed the submitted Boxy Hoodie link (57373823, seq=15). The catalogue URL identifies a group, but Hollister uses product ID 63241356 for the navy colour. The previous adapter incorrectly required these identifiers to be identical and reported missing secondary evidence.

The adapter now joins the selected colour back to the exact Canadian product-page path and colour sequence, then validates its SKU against both full-precision CAD price sources. Different pages, colours, foreign origins and missing identity evidence still fail verification. The original tested Freya Skye tee also passes its captured-page regression check.

The submitted link now offers exact size/length choices. A fresh live check of navy / S X Tall returned CAD 54.95. This is a point-in-time test, not a promise of future price or stock. Most sizes in the captured response were unavailable; unavailable sizes cannot be tracked as verified in-stock products.

143 automated tests passed. This update addresses Hollister only; reported Garage and Indigo failures still need the exact failing URLs to reproduce.

Install the complete ZIP using the README update steps; keep your existing data folder. On the saved hoodie, choose Verify price and then select your desired available size. Selecting a size for testing did not add it to your real account.
