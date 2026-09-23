export const retailers = [
 ['hollister','Hollister',['www.hollisterco.com','hollisterco.com'],/^\/shop\/ca\//],
 ['old-navy','Old Navy Canada',['oldnavy.gapcanada.ca'],/^\/browse\/product\.do$/],
 ['gap','Gap Canada',['www.gapcanada.ca','gapcanada.ca'],/^\/browse\/product\.do$/],
 ['aritzia','Aritzia',['www.aritzia.com','aritzia.com'],/^\/(?:en|fr)\/product\//],
 ['sephora','Sephora Canada',['www.sephora.com','sephora.com'],/^\/ca\/(?:en|fr)\/product\//],
 ['lisa-gozlan','Lisa Gozlan',['www.lisagozlan.com','lisagozlan.com'],/^\/(?:en\/|fr\/)?products\/[a-zA-Z0-9-]+\/?$/],
 ['american-eagle','American Eagle Canada',['www.ae.com','ae.com'],/^\/ca\/(?:en|fr)\/p\//],
 ['hm','H&M Canada',['www2.hm.com'],/^\/(?:en_ca|fr_ca)\/productpage\.[0-9]+\.html$/],
 ['garage','Garage',['www.garageclothing.com','garageclothing.com'],/^\/ca\//],
 ['brandy-melville','Brandy Melville',['ca.brandymelville.com'],/^\/products\//],
 ['lululemon','lululemon Canada',['shop.lululemon.com'],/^\/(?:en-ca\/)?p\//],
 ['best-buy','Best Buy Canada',['www.bestbuy.ca','bestbuy.ca'],/^\/(?:en-ca|fr-ca)\/product\//],
 ['amazon','Amazon Canada',['www.amazon.ca','amazon.ca'],/^\/(?:[^/]+\/)?(?:dp|gp\/product)\/[A-Z0-9]{10}(?:\/|$)/],
 ['indigo','Indigo',['www.indigo.ca','indigo.ca'],/^\/(?:(?:en-ca|fr-ca)\/|(?:collections\/[^/]+\/)?products\/[^/]+\/?$)/],
 ['aerie','Aerie Canada',['www.ae.com','ae.com'],/^\/ca\/(?:en|fr)\/p\/aerie\//],
].map(([id,name,hosts,path])=>({id,name,hosts,path,status:'UNAVAILABLE',reason:'Not yet available — retailer adapter has not passed live validation.'}));
retailers.find(r=>r.id==='amazon').reason='Limited — no approved, reliable $0 source has been verified for exact seller, condition and variant.';
retailers.find(r=>r.id==='lisa-gozlan').status='LIMITED';
retailers.find(r=>r.id==='lisa-gozlan').reason='Exact Shopify variant links: live CAD verification tested on the Heart Jewel Bracelet. Broader catalogue, live sales and long-term monitoring remain unvalidated.';
retailers.find(r=>r.id==='brandy-melville').status='LIMITED';
retailers.find(r=>r.id==='brandy-melville').reason='Exact Canadian variants: Bonnie Top and Priscilla Pants checked against CAD product JSON and matching SKU offers. Broader catalogue and live sales remain unvalidated.';
retailers.find(r=>r.id==='garage').status='LIMITED';
retailers.find(r=>r.id==='garage').reason='Selected English Canadian size/colour links: exact SKU checks are implemented. Catalogue coverage, length variants, member pricing and live sales are not certified.';
const coverageReasons={"aritzia": "Automatic requests were blocked. Save the link and check the retailer directly.", "hm": "The retailer requested an access challenge. Automatic monitoring is unavailable.", "best-buy": "Automatic requests were refused. Save the link and check the retailer directly.", "hollister": "Exact size prices are not yet validated. Available price representations conflict.", "old-navy": "Canadian storefront redirects need further validation before exact variants can be monitored.", "gap": "Canadian storefront redirects need further validation before exact variants can be monitored.", "sephora": "Canadian storefront and exact variant checking are not yet validated.", "american-eagle": "Exact Canadian size and colour prices are not yet validated.", "aerie": "Exact Canadian size and colour prices are not yet validated.", "lululemon": "The storefront could not be retrieved reliably. Automatic monitoring is unavailable.", "indigo": "Canadian product redirects and exact editions are not yet validated."};
for(const r of retailers)if(coverageReasons[r.id])r.reason=coverageReasons[r.id];
retailers.find(r=>r.id==='hollister').status='LIMITED';
retailers.find(r=>r.id==='hollister').reason='Exact Canadian SKU, size and length checks compare two full-precision CAD prices. Limited live product validation; retailer pages may require selecting the size again.';
retailers.find(r=>r.id==='indigo').status='LIMITED';
retailers.find(r=>r.id==='indigo').reason='Current product links across categories, including books, merchandise and digital editions when exact SKU, option, CAD price and availability agree. Removed or old redirected links may fail.';
export function identify(input){
 if(typeof input!=='string'||input.length>2048||/[\s\\]/.test(input)) throw new Error('Enter a valid HTTPS product URL.');
 let u;try{u=new URL(input);}catch{throw new Error('Enter a valid HTTPS product URL.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||/%(?:2f|5c|00)/i.test(u.pathname))throw new Error('Enter a valid HTTPS product URL.');
 const r=[...retailers].reverse().find(r=>r.hosts.includes(u.hostname)&&r.path.test(u.pathname));
 if(!r)throw new Error('This retailer is not currently supported by Sale Watch.');
 u.hash='';for(const k of [...u.searchParams.keys()])if(/^(utm_|gclid$|fbclid$|srsltid$)/i.test(k))u.searchParams.delete(k);
 if(r.id==='indigo')u.hostname='www.indigo.ca';
 if(r.id==='hollister')u.hostname='www.hollisterco.com';
 if(r.id==='garage')u.hostname='www.garageclothing.com';
 if(r.id==='lisa-gozlan')u.hostname='www.lisagozlan.com';
 u.searchParams.sort();return {retailer:r,url:u.href};
}
export function publicRetailers(){return retailers.map(({id,name,status,reason})=>({id,name,status,reason}));}
