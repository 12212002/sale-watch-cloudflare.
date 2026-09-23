# Retailer investigation — 2026-09-21

Normal public requests used an honest SaleWatch user agent, manual redirects, timeouts and robots checks. No CAPTCHA was solved and no authentication, proxy rotation or fingerprint evasion was used. Readable public pages are evidence of technical accessibility; they do not imply retailer endorsement. This report describes the limited requests made, not a full retailer certification.

| Retailer | Observation | Current decision |
|---|---|---|
| Lisa Gozlan | Allowed public product pages and product JSON expose CA/CAD context and exact variant/SKU offers. Live save/history passed. | Limited adapter |
| Brandy Melville Canada | Allowed product pages and product JSON expose matching CAD prices for Bonnie Top and Priscilla Pants. An ordinary contact-form CAPTCHA library caused an initial false blocked classification; detection was corrected and live checks then passed. | Limited adapter |
| Garage | Public Canadian page state identifies the selected colour, size and exact SKU; JSON-LD matches that SKU and CAD selling price. Green Envy / S/M passed. Another colour/size did not establish unconditional availability. | Limited adapter; no guessed substitute |
| Hollister | Canadian product page retrieved. Structured list price was 44.95 CAD; an embedded numeric field was 44 while its formatted field was 44.95 CAD. Exact-size selling-price interpretation remains unresolved. | Unavailable |
| Old Navy Canada | Robots available; homepage redirected to a cookie-initialization URL. Product/size data not validated. | Unavailable |
| Gap Canada | Robots available; homepage redirected to a cookie-initialization URL. Product/size data not validated. | Unavailable |
| Aritzia | Robots request returned 403. | Stopped; unavailable |
| Sephora Canada | Robots URL redirected to a Canadian locale URL; source permissions and exact variants not completed. | Unavailable |
| American Eagle | Canadian homepage retrieved; no validated exact-variant source established. | Unavailable |
| Aerie | Canadian homepage retrieved; no validated exact-variant source established. | Unavailable |
| H&M Canada | Homepage had product links, but a product URL returned an Akamai challenge page despite HTTP 200. | Stopped; unavailable |
| lululemon | Robots available; selected Canadian homepage request returned 400. | Unavailable |
| Best Buy Canada | Robots available; homepage request returned 403. | Stopped; unavailable |
| Amazon.ca | Homepage/robots retrieved; no approved and reliable $0 exact seller/condition/variant source validated. | Unavailable, explicitly limited |
| Indigo | Robots available; Canadian homepage path redirected to root. Exact product/edition extraction not validated. | Unavailable |

The application only calls the three implemented retailer adapters. Others can be saved as links. Three passing pilots do not mean every product at those stores works. Live sale, clearance and long-term monitoring coverage remain limited; synthetic adversarial fixtures validate rejection and sale-confirmation behavior without claiming live catalogue coverage.

Source samples used during development were retrieved from each retailer’s own robots.txt, homepage and public product pages. Specific live product URLs, timestamps and outcomes are in `live-check-0.2.json`. Full retailer pages, reviews and customer information are not bundled in the application.
