import {productImage} from './adapters/images.js';
// Provider-neutral delivery contract. Intentionally not wired to any paid or
// unverified service. Activation also requires verified recipient ownership.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n/100);
export function saleMessage({title,retailer,variant,url,old,new:current,image='' }){
 const savings=old-current,percent=(savings/old*100).toFixed(1);
 const text=`Hello,\n\n${title} dropped in price!\n\nRetailer: ${retailer}\nVariant: ${variant}\nPrevious price: ${money(old)} CAD\nNew price: ${money(current)} CAD\nYou save: ${money(savings)} (${percent}%)\n\nCheck it out:\n${url}\n`;
 const attachments=[];let imageHTML='';const inline=image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
 if(inline&&image.length<=200000){attachments.push({filename:'product.'+inline[1],content:Buffer.from(inline[2],'base64'),contentType:'image/'+inline[1],cid:'product-image'});imageHTML='<p><img src="cid:product-image" alt="Product image" width="200"></p>';}
 else if(productImage(image))imageHTML=`<p><img src="${escape(productImage(image))}" alt="Product image" width="200"></p>`;
 return {attachments,subject:`Price drop: ${title}`,text,html:`<p>Hello,</p><h2>${escape(title)} dropped in price!</h2>${imageHTML}<p>Retailer: ${escape(retailer)}<br>Variant: ${escape(variant)}</p><p>Previous price: ${money(old)} CAD<br>New price: <strong>${money(current)} CAD</strong><br>You save: ${money(savings)} (${percent}%)</p><p><a href="${escape(url)}">Open product</a></p>`};
}
export async function deliverOutbox(db,provider){
 if(!provider?.freePlanVerified||!(provider?.supportsIdempotency||provider?.atMostOnce)||!provider?.recipientOwnershipVerified)return {sent:0,status:'NOT_CONFIGURED'};
 let sent=0;
 const jobs=db.prepare(`SELECT o.id,o.attempts,u.id user_id,u.email,t.image,t.title,p.retailer,p.variant,p.url,a.old,a.new,p.current current_price FROM outbox o JOIN users u ON u.id=o.user_id JOIN activity a ON a.id=o.activity_id JOIN tracks t ON t.id=a.track_id JOIN products p ON p.id=t.product_id WHERE o.status IN ('NOT_CONFIGURED','RETRY') AND o.attempts<3 AND u.email_enabled=1 AND t.active=1 AND a.new<a.old LIMIT 25`).all();
 for(const job of jobs){
  if(job.new!==job.current_price){db.prepare("UPDATE outbox SET status='SUPERSEDED' WHERE id=? AND status IN ('NOT_CONFIGURED','RETRY')").run(job.id);continue;}
  if(provider.atMostOnce){const pref=db.prepare('SELECT address,min_percent FROM mail_preferences WHERE user_id=?').get(job.user_id);if(!pref||!db.prepare('SELECT 1 FROM verified_addresses WHERE user_id=? AND address=?').get(job.user_id,pref.address)){db.prepare("UPDATE outbox SET status='UNVERIFIED' WHERE id=?").run(job.id);continue;}if((job.old-job.new)/job.old*100<pref.min_percent){db.prepare("UPDATE outbox SET status='FILTERED' WHERE id=?").run(job.id);continue;}job.email=pref.address;}

  // Claim synchronously before awaiting. Unknown outcome is never blindly retried.
  const claim=db.prepare("UPDATE outbox SET status='SENDING',attempts=attempts+1 WHERE id=? AND status IN ('NOT_CONFIGURED','RETRY')").run(job.id);if(!claim.changes)continue;
  try{const result=await provider.send({to:job.email,idempotencyKey:job.id,...saleMessage(job)});const status=result.accepted?'SENT':result.deferred?'RETRY':result.definitelyNotSent?'RETRY':'DELIVERY_UNKNOWN';if(result.deferred)db.prepare('UPDATE outbox SET attempts=attempts-1 WHERE id=?').run(job.id);db.prepare('UPDATE outbox SET status=? WHERE id=?').run(status,job.id);if(result.accepted)sent++;}
  catch{db.prepare("UPDATE outbox SET status='DELIVERY_UNKNOWN' WHERE id=?").run(job.id);}
 }
 return {sent,status:'COMPLETED'};
}
