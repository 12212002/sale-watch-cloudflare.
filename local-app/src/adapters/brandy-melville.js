import {regularPrice} from './regular-price.js';
import {shopifyChoices} from './choices.js';
import {isChallenge} from './challenge.js';
import {productImage} from './images.js';
import {robotsAllow} from './lisa-gozlan.js';
const UA='SaleWatch/0.1 (Canadian price monitor; no checkout)';
export async function retrieve(url){
 const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='ca.brandymelville.com'||u.username||u.password||u.port)throw new Error('Unsafe retailer URL.');
 // Exact code-owned public host; never follow redirects or request user-supplied hosts.
 const res=await fetch(u,{redirect:'manual',headers:{'User-Agent':UA,'Accept':'text/html,application/json','Accept-Language':'en-CA'},signal:AbortSignal.timeout(15000)});
 if(res.status!==200){await res.body?.cancel();throw Object.assign(new Error([403,429].includes(res.status)?'Retailer check blocked.':'Retailer temporarily unavailable.'),{blocked:[403,429].includes(res.status)});}
 let n=0;const chunks=[];for await(const c of res.body){n+=c.length;if(n>2*1024*1024)throw new Error('Retailer response too large.');chunks.push(c);}return Buffer.concat(chunks).toString('utf8');
}
export function parseBrandy(html,json,variantId,handle,now=new Date()){
 let controls={};const uncertain=reason=>({state:'UNCERTAIN',reason,...controls});
 if(!/Shopify\.country\s*=\s*"CA"/.test(html)||!/Shopify\.currency\s*=\s*\{\s*"active"\s*:\s*"CAD"/.test(html))return uncertain('Canadian storefront and CAD currency could not be verified.');
 if(json.handle!==handle||!Number.isSafeInteger(json.id))return uncertain('Product could not be verified.');
 const variants=Array.isArray(json.variants)?json.variants:[];
 controls=shopifyChoices(json,variantId);
 if(!variantId)return uncertain('Choose your exact options before tracking.');
 const v=variants.find(v=>String(v.id)===String(variantId));if(!v)return uncertain('Tracked variant could not be verified.');
 if(!v.sku||v.requires_selling_plan)return uncertain('Exact SKU is missing or this option requires a selling plan.');
 if(v.available!==true)return uncertain('Availability unknown for this option. Public data did not confirm stock; this does not mean it is sold out.');
 const blocks=[...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
 const nodes=blocks.flatMap(m=>{try{const x=JSON.parse(m[1]);return Array.isArray(x)?x:x['@graph']||[x];}catch{return [];}});
 const products=nodes.filter(n=>n['@type']==='Product'&&new URL(n.url,'https://ca.brandymelville.com').pathname.replace(/\/$/,'')==='/products/'+handle);
 if(products.length!==1)return uncertain('Product evidence is missing or ambiguous.');
 const product=products[0],offers=Array.isArray(product.offers)?product.offers:[product.offers];
 const matches=offers.filter(o=>{try{const u=new URL(o.url);return u.hostname==='ca.brandymelville.com'&&u.pathname==='/products/'+handle&&u.searchParams.get('variant')===String(v.id)&&o.sku===v.sku;}catch{return false;}});
 if(matches.length!==1)return uncertain('Tracked variant could not be verified.');
 const o=matches[0];if(o.priceValidUntil&&o.priceValidUntil<now.toISOString().slice(0,10))return uncertain('Price evidence has expired.');
 if(o.priceCurrency!=='CAD'||!/^https?:\/\/schema.org\/InStock$/.test(o.availability))return uncertain('Currency or availability could not be verified.');
 const n=Number(o.price)*100;if(!Number.isFinite(n)||Math.abs(n-Math.round(n))>0.00001||!Number.isSafeInteger(v.price)||Math.round(n)!==v.price||v.price<=0)return uncertain('Price signals conflict.');
 const productId=String(json.id),vid=String(v.id),cents=v.price;
 return {...regularPrice(v.compare_at_price,v.price,{productId,variantId:vid},'shopify-exact-variant-compare-at'),...controls,state:'VERIFIED',retailer:'brandy-melville',productId,variantId:vid,seller:'Brandy Melville Canada',currency:'CAD',cents,available:true,title:String(json.title),variant:String(v.title),imageUrl:productImage(v.featured_image?.src||json.featured_image),method:'Variant-specific JSON-LD + public Shopify product JSON + Canadian market context',signals:['json-ld-offer','shopify-product-json'].map(source=>({source,kind:'selling-price',productId,variantId:vid,currency:'CAD',cents}))};
}
let policy=null;
export async function inspectBrandy(url){
 try{
 const u=new URL(url);const handle=u.pathname.split('/').filter(Boolean).at(-1);const page='/products/'+handle;const variant=u.searchParams.get('variant');
 if(!policy||Date.now()-policy.at>86400000)policy={body:await retrieve('https://ca.brandymelville.com/robots.txt'),at:Date.now()};
 if(!robotsAllow(policy.body,page+u.search)||!robotsAllow(policy.body,page+'.js'))return {state:'BLOCKED',reason:'Retailer robots policy does not permit this check.'};
 const html=await retrieve('https://ca.brandymelville.com'+page+(variant?'?variant='+encodeURIComponent(variant):''));
 if(isChallenge(html))return {state:'BLOCKED',reason:'Retailer check blocked.'};
 const json=JSON.parse(await retrieve('https://ca.brandymelville.com'+page+'.js'));
 return parseBrandy(html,json,variant,handle);
 }catch(e){return {state:e.blocked?'BLOCKED':'FAILED',reason:e.message||'Price could not be verified.'};}
}
