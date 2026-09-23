import {deliverOutbox} from './notifications.js';
import {loadGmail} from './email.js';
import {openDB,record,timestamp,transaction} from './db.js';
import {inspectProduct,supported} from './adapters/index.js';
import {fileURLToPath} from 'node:url';
export async function tick(db,check=inspectProduct,mailer=null){
 const now=timestamp();db.prepare("INSERT INTO runtime VALUES('heartbeat',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(now));
 // Persistent due times and leases make restarts safe and deduplicate shared products.
 const due=transaction(db,()=>{const rows=db.prepare(`SELECT p.* FROM products p WHERE p.next_check<=? AND p.lease_until<? AND EXISTS(SELECT 1 FROM tracks t WHERE t.product_id=p.id AND t.active=1) AND NOT EXISTS(SELECT 1 FROM health h WHERE h.retailer=p.retailer AND h.blocked_until>?) ORDER BY p.next_check LIMIT 20`).all(now,now,now);for(const p of rows)db.prepare('UPDATE products SET lease_until=? WHERE id=?').run(now+900,p.id);return rows;});
 for(const p of due){let o;
 try{o=supported(p.retailer)&&!p.variant_id.startsWith('unverified:')?await check(p.url):{state:'UNAVAILABLE',reason:'Automatic monitoring is not yet available for this retailer or variant.'};}catch{o={state:'FAILED',reason:'Retailer check failed.'};}
 try{record(db,p.id,o);}catch{db.prepare('UPDATE products SET lease_until=0,next_check=? WHERE id=?').run(now+9000,p.id);}
 }
 if(mailer)await deliverOutbox(db,mailer);
 return due.length;
}
export function startWorker(db,mailer=null){
 let active=null,stopping=false;
 const run=()=>{if(active||stopping)return;active=tick(db,inspectProduct,mailer).catch(()=>console.error('Background cycle failed; will retry on next cycle.')).finally(()=>{active=null;});};
 run();const timer=setInterval(run,60000);timer.unref();return async()=>{stopping=true;clearInterval(timer);await active;};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const db=openDB(process.env.SALE_WATCH_DB||'data/sale-watch.sqlite');await tick(db,inspectProduct,loadGmail(db));db.close();}
