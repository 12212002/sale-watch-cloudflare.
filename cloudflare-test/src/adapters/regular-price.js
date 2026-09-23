// A retailer's explicit list/compare-at price is not a historical observation.
export function regularPrice(cents,current,{productId,variantId},source){
 if(!Number.isSafeInteger(cents)||cents<current||cents<=0||cents>100000000)return {};
 return {regularCents:cents,regularSignals:[{source,kind:'regular-price',productId:String(productId),variantId:String(variantId),currency:'CAD',cents}]};
}
