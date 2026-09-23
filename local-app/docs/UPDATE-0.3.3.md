# Product selections — 0.3.3

Applied the Hollister selection improvements to the other four implemented adapters.

- Lisa Gozlan: separate retailer-supplied material, colour and size controls when those options exist.
- Brandy Melville Canada: separate colour and size controls, showing only actual combinations.
- Indigo: edition/format selector; unsupported eBooks are disabled and explicitly labelled, separate from uncertain physical-book stock.
- Garage: colour links from the retailer's product data and exact size selection. Length-based Garage products remain unsupported; no length choices are fabricated.
- All four retain controls after successful or uncertain verification. Changing options invalidates the previous preview. Unknown stock no longer implies confirmed sellout; price, identity and availability checks still must pass before verified tracking.

Real Chromium mobile-width browser tests passed for the Lisa Gozlan Heart Jewel Bracelet, Brandy Bonnie Top and Indigo A Potato on a Bike: identify, change options, verify and save. Garage blocked the real request. Its captured-page browser test passed with 26 colour choices and 3 sizes, but this is historical fixture evidence, not current live success. This release cannot guarantee Garage works on your network.

149 offline tests passed. Existing general browser checks also passed. Broader catalogue coverage remains limited, especially redirected Indigo links and Garage products with lengths. This update does not add unimplemented stores or aggregate any-size tracking.

Install the whole ZIP using the README steps, retaining your data folder. Existing verified tracks keep their exact identities; add a new track for a different colour/size. When resolving an unverified saved Garage link, keep its original colour; changing to a colour with a different product-page path requires adding a new track.
