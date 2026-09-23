import {regularPrice} from './regular-price.js';
import {embeddedObject} from './garage.js';
import {robotsAllow} from './lisa-gozlan.js';import {isChallenge} from './challenge.js';
const origin='https://www.hollisterco.com';
export function cadAmount(value){if(typeof value!=='string')return null;const m=value.replace(/&nbsp;/g,' ').match(/^\$([0-9]+(?:,[0-9]{3})*)(?:\.([0-9]{2}))?(?:\s|\\xa0)+CAD$/);if(!m)return null;const n=Number(m[1].replaceAll(',',''))*100+Number(m[2]||0);return Number.isSafeInteger(n)&&n>0?n:null;}
export function parseHollister(html,url){
 const no=reason=>({state:'UNCERTAIN',reason});const u=new URL(url),urlId=u.pathname.match(/-([0-9]+)\/?$/)?.[1];if(!urlId)return no('Use a Canadian Hollister product link.');
 const marker=html.match(/window\[['"]APOLLO_STATE__product-mfe-web-service-ProductPageFrontend-config['"]\]\s*=\s*/);if(!marker)return no('Exact product data was not available.');let data,legacy,pid;try{data=embeddedObject(html,marker.index+marker[0].length);pid=data.productId;if(typeof pid!=='string'||!/^\d+$/.test(pid))return no('Canadian product identity could not be verified.');const m=html.match(new RegExp('productPrices\\['+pid+'\\]\\s*=\\s*'));if(!m)return no('Secondary price evidence is missing.');legacy=embeddedObject(html,m.index+m[0].length);}catch{return no('Product data could not be read.');}
 if(data.country!=='CA'||data.currency!=='CAD'||data.store!=='h-ca'||data.productId!==pid||legacy.productId!==pid)return no('Canadian product identity could not be verified.');
 const collections=Object.values(data.CACHE?.ROOT_QUERY||{}).filter(v=>v?.collectionApiSuccess===true&&v.collection?.products?.some(p=>p.productId===pid));if(collections.length!==1)return no('Product evidence is ambiguous.');const c=collections[0].collection,products=c.products.filter(p=>p.productId===pid);if(products.length!==1||c.siteRegion!=='CA')return no('Canadian colour could not be verified.');const p=products[0];
 // A catalogue URL can name a product group, while Apollo names its colour.
 // Bind that colour back to this exact page and sequence before using its SKU.
 if(pid!==urlId||u.searchParams.has('seq')){
  let linked;try{linked=new URL(p.productPageUrl,origin);}catch{return no('Selected colour link could not be verified.');}
  const requested=u.searchParams.get('seq'),linkedSeq=linked.searchParams.get('seq');
  if(linked.origin!==origin||linked.pathname!==u.pathname||!linkedSeq||String(p.defaultSwatchSequence)!==linkedSeq||(requested!==null&&requested!==linkedSeq))return no('Selected colour does not match the product link.');
 }
 const skus=(c.skus||[]).filter(s=>s.productId===pid),sku=u.searchParams.get('sw_sku');
 const colours=c.products.flatMap(product=>{try{const link=new URL(product.productPageUrl,origin),seq=link.searchParams.get('seq');if(link.origin!==origin||link.pathname!==u.pathname||!seq||seq!==String(product.defaultSwatchSequence))return [];return [{id:seq,name:product.swatchName+' — '+product.productName,productId:product.productId}];}catch{return [];}}).filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i);
 const choices={title:p.productName,variantParam:'sw_sku',colours,selectedColour:String(p.defaultSwatchSequence||''),selectedVariant:sku||'',variants:skus.map(s=>({id:s.shortSku,name:p.swatchName+' / '+s.fullSizeLabel,size:s.sizePrimary?.replace(/_p$/,'')||s.fullSizeLabel?.split(' X ')[0],length:s.sizeSecondary?.replace(/_s$/,'')||s.fullSizeLabel?.split(' X ')[1]||'Standard',available:s.inventoryStatus==='Available'&&s.inventory>0&&!s.preOrderEligible&&!p.isAppExclusive,availability:s.inventoryStatus==='Available'&&s.inventory>0&&!s.preOrderEligible&&!p.isAppExclusive?'confirmed':'unknown'}))};
 const uncertain=reason=>({...no(reason),...choices});
 if(!sku)return uncertain('Choose your colour, size and length. Stock marked unknown is not confirmed sold out.');
 const matches=skus.filter(s=>s.shortSku===sku);if(matches.length!==1)return uncertain('That size does not belong to this colour. Please choose again.');const s=matches[0],price=legacy.items?.[sku];
 if(s.preOrderEligible||p.isAppExclusive)return uncertain('This option is preorder or app-exclusive; ordinary online availability cannot be confirmed.');
 if(s.inventoryStatus!=='Available'||!(s.inventory>0))return uncertain('Availability unknown for this exact size. Hollister’s public data did not confirm stock; this does not mean it is sold out. Check the retailer or choose another option.');
 if(!price)return uncertain('Price evidence is missing for this size. Its availability is not the cause.');
 const a=cadAmount(s.prices?.list?.discountPrice||s.prices?.list?.originalPrice),b=cadAmount(price.offerPriceFmt);
 // Legacy numeric fields omit cents. Require both full-precision CAD strings
 // to agree, and the legacy integer to match their whole-dollar component.
 if(a===null||a!==b||!Number.isInteger(price.offerPrice)||price.offerPrice!==Math.floor(a/100))return uncertain('Full-precision CAD price signals conflict.');
 const regular=cadAmount(s.prices?.list?.originalPrice),legacyRegular=cadAmount(price.listPriceFmt);
 const regularEvidence=regular!==null&&regular===legacyRegular&&Number.isInteger(price.listPrice)&&price.listPrice===Math.floor(regular/100)?regularPrice(regular,a,{productId:pid,variantId:sku},'exact-sku-apollo-and-legacy-list-price'):{};
 return {...regularEvidence,...choices,state:'VERIFIED',retailer:'hollister',productId:pid,variantId:sku,seller:'Hollister',title:p.productName,variant:p.swatchName+' / '+s.fullSizeLabel,currency:'CAD',cents:a,available:true,method:'Exact short-SKU CAD price strings in selected SKU state and product-price table',signals:['sku-cad-price','legacy-sku-formatted-cad'].map(source=>({source,kind:'selling-price',productId:pid,variantId:sku,currency:'CAD',cents:a}))};
}
let policy;
async function get(path){const r=await fetch(origin+path,{redirect:'manual',headers:{'User-Agent':'SaleWatch/0.3 (Canadian price monitor; no checkout)'},signal:AbortSignal.timeout(15000)});if(r.status!==200){await r.body?.cancel();throw Object.assign(Error('Retailer request unavailable.'),{blocked:[403,429].includes(r.status)});}let size=0;const chunks=[];for await(const c of r.body){size+=c.length;if(size>2*1024*1024)throw Error('Retailer response too large.');chunks.push(c);}return Buffer.concat(chunks).toString('utf8');}
export async function inspectHollister(url){try{const u=new URL(url);if(u.origin!==origin||!/^\/shop\/ca\/p\/.+-[0-9]+\/?$/.test(u.pathname))return {state:'UNAVAILABLE',reason:'Use a Canadian Hollister product link.'};const fetchURL=new URL(u);fetchURL.searchParams.delete('sw_sku');if(!policy||Date.now()-policy.at>86400000)policy={body:await get('/robots.txt'),at:Date.now()};if(!robotsAllow(policy.body,fetchURL.pathname+fetchURL.search))return {state:'BLOCKED',reason:'Retailer robots policy does not permit this check.'};const html=await get(fetchURL.pathname+fetchURL.search);if(isChallenge(html))return {state:'BLOCKED',reason:'Retailer check blocked.'};return parseHollister(html,u.href);}catch(e){return {state:e.blocked?'BLOCKED':'FAILED',reason:e.message};}}
