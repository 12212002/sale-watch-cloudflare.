import {regularPrice} from './regular-price.js';
import {isChallenge} from './challenge.js';
import {productImage} from './images.js';
import {robotsAllow} from './lisa-gozlan.js';
const ORIGIN='https://www.garageclothing.com';
// Read a JSON object embedded in script data without evaluating retailer JavaScript.
export function embeddedObject(source,start){let depth=0,quoted=false,escaped=false;for(let i=start;i<source.length;i++){const c=source[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(source.slice(start,i+1));}throw Error('Incomplete product data.');}
export function parseGarage(html,url){
 let controls={};const fail=reason=>({state:'UNCERTAIN',reason,...controls});const u=new URL(url),group=u.pathname.match(/\/([A-Za-z0-9]+)\.html$/)?.[1];
 if(!group||!/<html\b[^>]*lang=["']en-CA["']/i.test(html))return fail('Canadian product page could not be verified.');
 const states=[];for(const m of html.matchAll(/'stores':\s*(?=\{)/g)){try{const p=embeddedObject(html,m.index+m[0].length).pdp;if(p?.productName)states.push(p);}catch{}}
 if(states.length!==1)return fail('Product evidence is missing or ambiguous.');const p=states[0];
 if(p.variationGroupId!==group||p.colors?.selected?.variationGroupId!==group||p.hasLengths)return fail('Tracked colour or configuration could not be verified.');
 const param='dwvar_'+group+'_size',size=u.searchParams.get(param),choices=p.sizes?.values||[];
 const colours=[...(p.colors?.values||[]),p.colors.selected].filter(Boolean).flatMap(v=>{if(!/^[A-Za-z0-9]+$/.test(v.variationGroupId||''))return [];const link=new URL(u);link.pathname=link.pathname.replace('/'+group+'.html','/'+v.variationGroupId+'.html');link.search='';return [{id:v.variationGroupId,name:v.displayValue,url:link.href}];}).filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i);
 controls={title:p.productName,variantParam:param,selectedVariant:size||'',colours,selectedColour:group,colourLinks:true,dimensions:[{name:'Size'}],variants:choices.map(v=>({id:v.displayValue,name:v.displayValue,values:[v.displayValue],available:v.selectable===true,availability:v.selectable===true?'confirmed':'unknown'}))};
 if(!size)return fail('Choose your colour and size. Stock not confirmed is shown as unknown.');
 const selected=p.sizes?.selected;
 if(p.isSkuSelected!==true||!selected||selected.displayValue!==size||selected.selectable!==true||!selected.variantIds?.includes(p.pid)||p.isOutOfStockItem!==false||p.isEarlyAccess||p.showLoyaltyPrice||p.price?.showPromoPrice)return fail('Exact size availability could not be confirmed, or this offer has a membership/promotion restriction. This does not establish that the size is sold out.');
 const nodes=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{const j=JSON.parse(m[1]);return Array.isArray(j)?j:[j];}catch{return [];}});
 const products=nodes.filter(n=>n['@type']==='Product'&&n.sku===p.pid);if(products.length!==1)return fail('Exact SKU evidence is missing or ambiguous.');const product=products[0],o=product.offers;
 let identity;try{identity=new URL(product['@id']);}catch{return fail('Product identity is missing.');}
 if(identity.origin!==ORIGIN||!identity.pathname.endsWith('/'+p.pid+'.html')||product.color!==p.colors.selected.displayValue||!o||Array.isArray(o)||o.priceCurrency!=='CAD'||!/^https?:\/\/schema.org\/InStock$/.test(o.availability)||o.shippingDetails?.shippingDestination?.addressCountry!=='CA')return fail('Exact Canadian offer could not be verified.');
 const amount=Number(o.price)*100,raw=Number(p.price?.finalPriceRaw)*100;const formatted=p.price?.salePrice;
 if(!Number.isFinite(amount)||Math.abs(amount-Math.round(amount))>0.00001||!Number.isFinite(raw)||Math.abs(raw-amount)>0.00001||Math.round(amount)<=0||formatted!=='$'+(amount/100).toFixed(2))return fail('Price signals conflict.');
 const cents=Math.round(amount),productId=String(p.masterProductId),variantId=String(p.pid);
 const list=p.price?.listPrice?.match(/^\$([0-9]+(?:,[0-9]{3})*)(?:\.([0-9]{2}))?$/),regular=list?Number(list[1].replaceAll(',',''))*100+Number(list[2]||0):null;
 return {...regularPrice(regular,cents,{productId,variantId},'selected-exact-sku-list-price'),...controls,state:'VERIFIED',retailer:'garage',productId,variantId,seller:'Garage',currency:'CAD',cents,available:true,title:p.productName,imageUrl:productImage(p.images?.[0]?.src),variant:product.color+' / '+size,method:'Exact SKU JSON-LD + selected size product-page state + Canadian shipping context',signals:['json-ld-sku-offer','selected-sku-page-state'].map(source=>({source,kind:'selling-price',productId,variantId,currency:'CAD',cents}))};
}
let policy;
async function retrieve(path){const u=new URL(path,ORIGIN);if(u.origin!==ORIGIN||u.username||u.password)throw Error('Unsafe retailer URL.');const r=await fetch(u,{redirect:'manual',headers:{'User-Agent':'SaleWatch/0.2 (Canadian price monitor; no checkout)'},signal:AbortSignal.timeout(15000)});if(r.status!==200){await r.body?.cancel();throw Object.assign(Error('Retailer check unavailable.'),{blocked:[403,429].includes(r.status)});}let size=0;const chunks=[];for await(const c of r.body){size+=c.length;if(size>2*1024*1024)throw Error('Retailer response too large.');chunks.push(c);}return Buffer.concat(chunks).toString('utf8');}
export async function inspectGarage(url){try{const u=new URL(url);if(u.origin!==ORIGIN||!/^\/ca\/p\/.+\/[A-Za-z0-9]+\.html$/.test(u.pathname))return {state:'UNAVAILABLE',reason:'Use an English Canadian Garage product link.'};if(!policy||Date.now()-policy.at>86400000)policy={body:await retrieve('/robots.txt'),at:Date.now()};if(!robotsAllow(policy.body,u.pathname+u.search))return {state:'BLOCKED',reason:'Retailer robots policy does not permit this check.'};const html=await retrieve(u.pathname+u.search);if(isChallenge(html))return {state:'BLOCKED',reason:'Retailer check blocked.'};return parseGarage(html,u.href);}catch(e){return {state:e.blocked?'BLOCKED':'FAILED',reason:e.message};}}
