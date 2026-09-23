import {regularPrice} from './regular-price.js';
import {shopifyChoices} from './choices.js';
import {isChallenge} from './challenge.js';
import {productImage} from './images.js';
import {robotsAllow} from './lisa-gozlan.js';
const UA='SaleWatch/0.1 (Canadian price monitor; no checkout)';
export async function retrieve(url){
 const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.indigo.ca'||u.username||u.password||u.port)throw new Error('Unsafe retailer URL.');
 // Exact code-owned public host; never follow redirects or request user-supplied hosts.
 const res=await fetch(u,{redirect:'manual',headers:{'User-Agent':UA,'Accept':'text/html,application/json','Accept-Language':'en-CA'},signal:AbortSignal.timeout(15000)});
 if(res.status!==200){await res.body?.cancel();throw Object.assign(new Error([403,429].includes(res.status)?'Retailer check blocked.':'Retailer temporarily unavailable.'),{blocked:[403,429].includes(res.status)});}
 let n=0;const chunks=[];for await(const c of res.body){n+=c.length;if(n>2*1024*1024)throw new Error('Retailer response too large.');chunks.push(c);}return Buffer.concat(chunks).toString('utf8');
}
export function indigoHandle(path){
 const match=path.match(/^\/(?:collections\/[^/]+\/)?products\/([^/]+)\/?$/);if(!match)return null;
 try{const h=decodeURIComponent(match[1]);return h.length<=250&&!/[\/\\?#\x00-\x20]/.test(h)&&h!=='.'&&h!=='..'?h:null;}catch{return null;}
}
function matchesURL(value,handle,variant){try{const u=new URL(value);return u.origin==='https://www.indigo.ca'&&!u.username&&!u.password&&indigoHandle(u.pathname)===handle&&(variant===null?!u.searchParams.has('variant'):u.searchParams.get('variant')===String(variant));}catch{return false;}}
export function parseIndigo(html,json,variantId,handle){
 let controls={};const no=reason=>({state:'UNCERTAIN',reason,...controls});
 if(!/Shopify\.country\s*=\s*"CA"/.test(html)||!/Shopify\.currency\s*=\s*\{\s*"active"\s*:\s*"CAD"/.test(html)||json.handle!==handle||!Number.isSafeInteger(json.id))return no('Canadian product and currency could not be verified.');
 const variants=Array.isArray(json.variants)?json.variants:[];
 if(!variantId&&variants.length===1)variantId=String(variants[0].id);
 controls=shopifyChoices(json,variantId);
 if(!variantId)return no('Choose your exact options before tracking.');
 const candidates=variants.filter(v=>String(v.id)===String(variantId));if(candidates.length!==1)return no('Exact product option is missing or ambiguous.');const v=candidates[0];
 if(typeof v.sku!=='string'||!v.sku.trim()||!Number.isSafeInteger(v.id)||v.requires_selling_plan)return no('Exact SKU is missing or this option requires a subscription.');
 if(v.available!==true)return no('Availability unknown for this option. Public data did not confirm stock; this does not mean it is sold out.');
 const flatten=j=>Array.isArray(j)?j.flatMap(flatten):j&&typeof j==='object'?[j,...(Array.isArray(j['@graph'])?j['@graph'].flatMap(flatten):[])]:[];
 const nodes=[...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{return flatten(JSON.parse(m[1]));}catch{return [];}});
 const groups=nodes.filter(n=>n['@type']==='ProductGroup'&&matchesURL(n.url,handle,null)&&String(n.productGroupID)===String(json.id));
 let matches=[];
 if(groups.length>1)return no('Product group evidence is ambiguous.');
 if(groups.length===1){if(json.type&&groups[0].category&&json.type!==groups[0].category)return no('Product category evidence conflicts.');matches=(groups[0].hasVariant||[]).filter(p=>matchesURL(p.url,handle,v.id)&&p.sku===v.sku);}
 else if(variants.length===1)matches=nodes.filter(n=>n['@type']==='Product'&&matchesURL(n.url,handle,null)&&n.sku===v.sku);
 if(matches.length!==1)return no('Exact product and SKU evidence is missing or ambiguous.');const product=matches[0],o=product.offers;
 // Numeric barcodes/ISBNs must agree when provided; digital SKUs can be UUIDs
 // distinct from the edition ISBN, but must still match the exact variant URL.
 const barcode=/^\d{8,14}$/.test(v.barcode||'')?v.barcode:/^\d{8,14}$/.test(v.sku)?v.sku:null;
 const gtins=['gtin','gtin8','gtin12','gtin13','gtin14'].filter(k=>product[k]!==undefined).map(k=>String(product[k]));
 if(barcode&&gtins.some(gtin=>gtin!==barcode))return no('Product barcode or ISBN signals conflict.');
 if(!o||Array.isArray(o)||!matchesURL(o.url,handle,v.id)||o.priceCurrency!=='CAD'||o.availability!=='https://schema.org/InStock'||o.itemCondition!=='https://schema.org/NewCondition')return no('New, available Canadian offer could not be verified.');
 if(o.seller&& !['Indigo','Indigo Books & Music Inc.'].includes(typeof o.seller==='string'?o.seller:o.seller.name))return no('Indigo seller could not be verified.');
 if(o.priceValidUntil&&o.priceValidUntil<new Date().toISOString().slice(0,10))return no('Price evidence has expired.');
 const cents=Number(o.price)*100;if(!Number.isSafeInteger(v.price)||v.price<=0||!Number.isFinite(cents)||Math.abs(cents-v.price)>0.00001)return no('Exact option price signals conflict.');
 const productId=String(json.id),vid=String(v.id),book=(groups[0]?.category||product.category)==='Book';
 const label=v.title==='Default Title'?'Standard':String(v.title);
 return {...regularPrice(v.compare_at_price,v.price,{productId,variantId:vid},'shopify-exact-variant-compare-at'),...controls,state:'VERIFIED',retailer:'indigo',productId,variantId:vid,seller:'Indigo',title:json.title,variant:label+(book&&/^\d{13}$/.test(v.sku)?' · ISBN '+v.sku:''),imageUrl:productImage(v.featured_image?.src||json.featured_image),cents:v.price,currency:'CAD',available:true,method:'Exact SKU and option URL + Canadian JSON-LD offer + Shopify variant price',signals:['product-jsonld-offer','shopify-variant-json'].map(source=>({source,kind:'selling-price',productId,variantId:vid,currency:'CAD',cents:v.price}))};
}

let policy=null;
export async function inspectIndigo(url){
 try{
 const u=new URL(url),handle=indigoHandle(u.pathname);if(u.origin!=='https://www.indigo.ca'||!handle)return {state:'UNAVAILABLE',reason:'Use a current Indigo product link. Old or removed links are not automatically substituted.'};const page='/products/'+encodeURIComponent(handle);const variant=u.searchParams.get('variant');
 if(!policy||Date.now()-policy.at>86400000)policy={body:await retrieve('https://www.indigo.ca/robots.txt'),at:Date.now()};
 if(!robotsAllow(policy.body,page+u.search)||!robotsAllow(policy.body,page+'.js'))return {state:'BLOCKED',reason:'Retailer robots policy does not permit this check.'};
 const html=await retrieve('https://www.indigo.ca'+page+(variant?'?variant='+encodeURIComponent(variant):''));
 if(isChallenge(html))return {state:'BLOCKED',reason:'Retailer check blocked.'};
 const json=JSON.parse(await retrieve('https://www.indigo.ca'+page+'.js'));
 return parseIndigo(html,json,variant,handle);
 }catch(e){return {state:e.blocked?'BLOCKED':'FAILED',reason:e.message||'Price could not be verified.'};}
}
