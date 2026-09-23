import {test} from 'node:test';import assert from 'node:assert/strict';import {parseBrandy} from '../src/adapters/brandy-melville.js';
import {robotsAllow} from '../src/adapters/lisa-gozlan.js';
const now=new Date('2026-09-21T12:00:00Z');
function fixture(){const json={id:123,handle:'bracelet',title:'Bracelet',variants:[{id:456,sku:'GOLD-6',title:'Gold / 6 inches',price:12800,available:true},{id:457,sku:'GOLD-7',title:'Gold / 7 inches',price:9900,available:false}]};const product={'@type':'Product',url:'https://ca.brandymelville.com/products/bracelet',offers:json.variants.map(v=>({'@type':'Offer',url:'https://ca.brandymelville.com/products/bracelet?variant='+v.id,sku:v.sku,price:v.price/100,priceCurrency:'CAD',availability:'http://schema.org/'+(v.available?'InStock':'OutOfStock'),priceValidUntil:'2026-09-22'}))};return {json,product};}
function parse(f,variant='456',market='CAD'){const html=`Shopify.country = "CA"; Shopify.currency = {"active":"${market}"}; <script type="application/ld+json">${JSON.stringify(f.product)}</script>`;return parseBrandy(html,f.json,variant,'bracelet',now);}
test('Brandy: exact variant joins by ID and SKU, two price signals agree',()=>{const r=parse(fixture());assert.equal(r.state,'VERIFIED');assert.equal(r.cents,12800);assert.equal(r.variantId,'456');assert.equal(r.signals.length,2);});
test('Brandy: explicit variant selection required',()=>{const r=parse(fixture(),'');assert.equal(r.state,'UNCERTAIN');assert.equal(r.variants.length,2);});
for(const variant of ['457','999'])test('Brandy: sold-out or unavailable variant '+variant,()=>assert.equal(parse(fixture(),variant).state,'UNCERTAIN'));
test('Brandy: CAD mandatory',()=>assert.equal(parse(fixture(),'456','USD').state,'UNCERTAIN'));
test('Brandy: conflicting source does not produce price',()=>{const f=fixture();f.product.offers[0].price=59;assert.equal(parse(f).state,'UNCERTAIN');});
test('Brandy: expired structured offer rejected',()=>{const f=fixture();f.product.offers[0].priceValidUntil='2026-09-20';assert.equal(parse(f).state,'UNCERTAIN');});
test('Brandy: sale and clearance use current price, never compare-at or financing',()=>{const f=fixture();f.json.variants[0].compare_at_price=12800;f.json.variants[0].price=4900;f.product.offers[0].price=49;assert.equal(parse(f).cents,4900);});
test('Brandy: variant specific different sizes and colours preserved',()=>{const f=fixture();f.json.variants[1].available=true;f.json.variants[1].title='Silver / 7 inches';f.product.offers[1].availability='http://schema.org/InStock';assert.equal(parse(f,'457').cents,9900);assert.equal(parse(f,'456').cents,12800);});
test('Brandy: wrong product identity rejected',()=>{const f=fixture();f.json.handle='wrong';assert.equal(parse(f).state,'UNCERTAIN');});
test('Brandy: missing product evidence rejected',()=>{const f=fixture();f.product['@type']='Organization';assert.equal(parse(f).state,'UNCERTAIN');});
test('Brandy: ambiguous offers rejected',()=>{const f=fixture();f.product.offers.push({...f.product.offers[0]});assert.equal(parse(f).state,'UNCERTAIN');});
test('Brandy: wrong SKU rejected',()=>{const f=fixture();f.product.offers[0].sku='another-sku';assert.equal(parse(f).state,'UNCERTAIN');});
test('Brandy: redirected offer rejected',()=>{const f=fixture();f.product.offers[0].url='https://evil.test/?variant=456';assert.equal(parse(f).state,'UNCERTAIN');});
test('Brandy: zero and nonnumeric prices rejected',()=>{for(const price of [0,NaN,-1]){const f=fixture();f.json.variants[0].price=price;f.product.offers[0].price=price/100;assert.equal(parse(f).state,'UNCERTAIN');}});
test('Brandy: robots wildcard and agent-specific restrictions',()=>{assert.equal(robotsAllow('User-agent: *\nDisallow: /cart\nDisallow: /products/*?private=1','/products/a'),true);assert.equal(robotsAllow('User-agent: *\nDisallow: /cart','/cart.js'),false);assert.equal(robotsAllow('User-agent: SaleWatch\nDisallow: /\nUser-agent: *\nAllow: /','/products/a'),false);});

test('Brandy regular price uses the exact variant compare-at amount',()=>{const f=fixture();f.json.variants[0].compare_at_price=14900;const r=parse(f);assert.equal(r.regularCents,14900);assert.equal(r.cents,12800);f.json.variants[0].compare_at_price=12000;assert.equal(parse(f).regularCents,undefined);});
