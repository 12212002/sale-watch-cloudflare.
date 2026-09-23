// Only public Shopify image hosts used by the two validated adapters.
export function productImage(value){
 try{const u=new URL(value,'https://cdn.shopify.com');if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname==='dam.dynamiteclothing.com'&&/^\/asset\/[a-f0-9-]+\/[^/]+\.(?:png|jpe?g|webp)$/i.test(u.pathname)){u.searchParams.set('sw','400');u.searchParams.set('sh','600');return u.href;}if(u.protocol!=='https:'||u.username||u.password||u.port||!['cdn.shopify.com','www.lisagozlan.com','ca.brandymelville.com','www.indigo.ca'].includes(u.hostname)||!/^\/(?:s\/files\/|cdn\/shop\/)/.test(u.pathname)||! /\.(?:png|jpe?g|webp)$/i.test(u.pathname))return '';u.searchParams.set('width','400');return u.href;}catch{return '';}
}
