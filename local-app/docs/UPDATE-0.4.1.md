# Hollister whole-dollar sale fix — 0.4.1

Reproduced the submitted At-the-Knee Baggy Fleece Shorts link, product group 62601323, colour sequence 10 (black). The exact Medium SKU was in stock, and both price sources said $25 CAD. The adapter incorrectly required two decimal places and rejected this legitimate whole-dollar price.

CAD amounts now accept either whole dollars or exactly two decimal places. Both exact-SKU price sources must still agree, and the numeric price cross-check remains. Wrong currencies, missing currency, zero/negative amounts, malformed decimals and actual conflicting prices are rejected.

164 automated tests passed. See hollister-shorts-browser.json for the real-link browser test and its timestamp. This fix applies to the same whole-dollar formatting on other Hollister products; it does not certify the entire catalogue. All earlier Indigo expansion and option-selection changes are included.

Install the complete ZIP using the README update steps and keep your existing data folder. On the shorts, choose black, your desired size, then Standard length. The recorded browser check uses Medium; your preferred size still needs its own availability check.
