import {mailSchema} from './email-schema.js';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {identify} from './retailers.js';
import {productImage} from './adapters/images.js';
import {decide,verifiedRegular} from './verify.js';
export const timestamp=()=>Math.floor(Date.now()/1000);
export const LIMIT_MESSAGE='You can track up to 15 products at a time. Remove or disable a product before adding another.';
export function openDB(path){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,recovery TEXT NOT NULL,theme TEXT DEFAULT 'system',email_enabled INTEGER DEFAULT 0,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,retailer TEXT NOT NULL,url TEXT NOT NULL,product_id TEXT NOT NULL,variant_id TEXT NOT NULL,seller TEXT NOT NULL DEFAULT '',title TEXT NOT NULL,variant TEXT NOT NULL DEFAULT '',current INTEGER,previous INTEGER,baseline INTEGER,verified_at INTEGER,last_check INTEGER,status TEXT NOT NULL DEFAULT 'UNAVAILABLE',detail TEXT DEFAULT 'Price could not be verified.',pending INTEGER,pending_at INTEGER,next_check INTEGER DEFAULT 0,lease_until INTEGER DEFAULT 0,created INTEGER NOT NULL,UNIQUE(retailer,product_id,variant_id,seller));
 CREATE TABLE IF NOT EXISTS tracks(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,product_id TEXT NOT NULL REFERENCES products(id),active INTEGER NOT NULL DEFAULT 1,title TEXT NOT NULL,notes TEXT DEFAULT '',image TEXT DEFAULT '',created INTEGER NOT NULL,UNIQUE(user_id,product_id));
 CREATE INDEX IF NOT EXISTS tracks_user ON tracks(user_id,active);
 CREATE INDEX IF NOT EXISTS due_products ON products(next_check,lease_until);
 CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,cents INTEGER,currency TEXT,state TEXT NOT NULL,accepted INTEGER NOT NULL,method TEXT,reason TEXT,at INTEGER NOT NULL,evidence TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS track_observations(track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,observation_id TEXT REFERENCES observations(id) ON DELETE CASCADE,PRIMARY KEY(track_id,observation_id));
 CREATE INDEX IF NOT EXISTS observation_product ON observations(product_id,at);
 CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,observation_id TEXT NOT NULL,old INTEGER NOT NULL,new INTEGER NOT NULL,at INTEGER NOT NULL,UNIQUE(user_id,track_id,observation_id));
 CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,activity_id TEXT UNIQUE REFERENCES activity(id) ON DELETE CASCADE,status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',attempts INTEGER DEFAULT 0,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS health(retailer TEXT PRIMARY KEY,state TEXT DEFAULT 'OK',blocked_until INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS runtime(key TEXT PRIMARY KEY,value TEXT);
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TRIGGER IF NOT EXISTS active_insert BEFORE INSERT ON tracks WHEN NEW.active=1 AND (SELECT COUNT(*) FROM tracks WHERE user_id=NEW.user_id AND active=1)>=15 BEGIN SELECT RAISE(ABORT,'active_limit'); END;
 CREATE TRIGGER IF NOT EXISTS active_update BEFORE UPDATE OF active ON tracks WHEN NEW.active=1 AND OLD.active=0 AND (SELECT COUNT(*) FROM tracks WHERE user_id=NEW.user_id AND active=1)>=15 BEGIN SELECT RAISE(ABORT,'active_limit'); END;
 `);
 transaction(db,()=>{const migrating=!db.prepare('PRAGMA table_info(products)').all().some(c=>c.name==='regular');
 if(migrating)db.exec('ALTER TABLE products ADD COLUMN regular INTEGER');
 if(!db.prepare('PRAGMA table_info(observations)').all().some(c=>c.name==='regular'))db.exec('ALTER TABLE observations ADD COLUMN regular INTEGER');
 if(migrating)db.exec('UPDATE products SET next_check=0');});
 mailSchema(db);return db;
}
export function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}}
function text(v,max=200){if(typeof v!=='string'||v.length>max)throw new Error('Please check the field length.');return v.trim();}
export function imageValue(v){if(!v)return '';if(typeof v!=='string'||v.length>200000)throw new Error('Image too large.');if(v.startsWith('https:')&&productImage(v)===v)return v;if(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v))throw new Error('Use a PNG, JPEG or WebP image, up to 140 KB.');return v;}
export function addTrack(db,user,input){
 const {retailer,url}=identify(input.url);
 const title=text(input.title||'Saved product');const notes=text(input.notes||'',2000),image=imageValue(input.image);
 // Unknown identities are keyed by the exact canonical URL, never a guessed variant.
 const variantId='unverified:'+url;const productId=url;
 return transaction(db,()=>{
  let p=db.prepare('SELECT * FROM products WHERE retailer=? AND product_id=? AND variant_id=? AND seller=?').get(retailer.id,productId,variantId,'');
  if(!p){const id=randomUUID();db.prepare('INSERT INTO products(id,retailer,url,product_id,variant_id,title,variant,created) VALUES(?,?,?,?,?,?,?,?)').run(id,retailer.id,url,productId,variantId,title,text(input.variant||'Not yet verified'),timestamp());p=db.prepare('SELECT * FROM products WHERE id=?').get(id);}
  if(db.prepare('SELECT id FROM tracks WHERE user_id=? AND product_id=?').get(user,p.id))throw new Error('You already saved this exact product URL.');
  const id=randomUUID();try{db.prepare('INSERT INTO tracks(id,user_id,product_id,title,notes,image,created) VALUES(?,?,?,?,?,?,?)').run(id,user,p.id,title,notes,image,timestamp());}catch(e){if(e.message.includes('active_limit'))throw new Error(LIMIT_MESSAGE);throw e;}return id;
 });
}
export function tracks(db,user){
 const latest=field=>`(SELECT o.${field} FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=t.id AND o.accepted=1 ORDER BY o.at DESC,o.rowid DESC LIMIT 1)`;
 return db.prepare(`SELECT t.id,t.title,t.notes,t.image,t.active,t.created,p.retailer,p.url,p.variant,p.variant_id,${latest('cents')} current,${latest('regular')} regular,(SELECT o.cents FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=t.id AND o.accepted=1 AND o.cents<>${latest('cents')} ORDER BY o.at DESC,o.rowid DESC LIMIT 1) previous,(SELECT o.cents FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=t.id AND o.accepted=1 ORDER BY o.at,o.rowid LIMIT 1) baseline,${latest('at')} verified_at,p.last_check,p.status,p.detail,p.next_check,(SELECT min(o.cents) FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=t.id AND o.accepted=1) lowest,(SELECT max(o.cents) FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=t.id AND o.accepted=1) highest FROM tracks t JOIN products p ON p.id=t.product_id WHERE t.user_id=? ORDER BY t.created DESC`).all(user);
}
export function owned(db,user,id){const row=db.prepare('SELECT * FROM tracks WHERE id=? AND user_id=?').get(id,user);if(!row)throw Object.assign(new Error('Product not found.'),{status:404});return row;}
export function editTrack(db,user,id,input){owned(db,user,id);const fields=[],values=[];for(const k of ['title','notes','image','active'])if(k in input){let v=input[k];if(k==='active'){if(typeof v!=='boolean')throw new Error('Invalid monitoring choice.');v=Number(v);}else if(k==='image')v=imageValue(v);else v=text(v,k==='notes'?2000:200);fields.push(k+'=?');values.push(v);}if(!fields.length)return;try{db.prepare('UPDATE tracks SET '+fields.join(',')+' WHERE id=? AND user_id=?').run(...values,id,user);if(input.active===false)db.prepare("UPDATE outbox SET status='CANCELLED' WHERE user_id=? AND activity_id IN (SELECT id FROM activity WHERE track_id=?) AND status IN ('NOT_CONFIGURED','RETRY')").run(user,id);}catch(e){if(e.message.includes('active_limit'))throw new Error(LIMIT_MESSAGE);throw e;}}
export function deleteTrack(db,user,id){owned(db,user,id);db.prepare('DELETE FROM tracks WHERE id=? AND user_id=?').run(id,user);db.prepare('DELETE FROM products WHERE NOT EXISTS(SELECT 1 FROM tracks WHERE product_id=products.id)').run();}
export function record(db,id,o,now=timestamp(),silentTrack=null){
 return transaction(db,()=>{
 const p=db.prepare('SELECT * FROM products WHERE id=?').get(id);if(!p)throw new Error('Product missing.');
 const expected={retailer:p.retailer,productId:p.product_id,variantId:p.variant_id,seller:p.seller};
 const decision=decide(p.current,p.pending===null?null:{cents:p.pending,at:p.pending_at},expected,o,now);
 const health=db.prepare('SELECT * FROM health WHERE retailer=?').get(p.retailer);
 if(health?.blocked_until>now){decision.action='reject';decision.reason='Possible retailer adapter problem.';}
 const accepted=['baseline','same','increase','drop'].includes(decision.action),observationId=randomUUID(),regular=verifiedRegular(expected,o);
 const priorByTrack=new Map(db.prepare('SELECT t.id,(SELECT o.cents FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=t.id AND o.accepted=1 ORDER BY o.at DESC,o.rowid DESC LIMIT 1) cents FROM tracks t WHERE t.product_id=? AND t.active=1').all(id).map(t=>[t.id,t.cents]));
 db.prepare('INSERT INTO observations(id,product_id,cents,currency,state,accepted,method,reason,at,evidence,regular) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(observationId,id,Number.isSafeInteger(o.cents)?o.cents:null,o.currency||null,o.state||'FAILED',Number(accepted),o.method||'none',decision.reason||'',now,JSON.stringify({selling:o.signals||[],regular:o.regularSignals||[]}),accepted?regular:null);
 db.prepare('INSERT INTO track_observations SELECT id,? FROM tracks WHERE product_id=? AND active=1').run(observationId,id);
 if(accepted){db.prepare("UPDATE health SET state='OK',blocked_until=0 WHERE retailer=? AND blocked_until<=?").run(p.retailer,now);db.prepare(`UPDATE products SET regular=?,current=?,previous=CASE WHEN current IS NOT ? THEN current ELSE previous END,baseline=COALESCE(baseline,?),verified_at=?,pending=NULL,pending_at=NULL,status='VERIFIED',detail='',last_check=?,next_check=?,lease_until=0 WHERE id=?`).run(regular,o.cents,o.cents,o.cents,now,now,now+9000,id);
 if(['drop','increase'].includes(decision.action)){
 for(const t of db.prepare('SELECT t.*,u.email_enabled FROM tracks t JOIN users u ON u.id=t.user_id WHERE t.product_id=? AND t.active=1').all(id)){
 const previous=priorByTrack.get(t.id);if(t.id===silentTrack||previous===null||previous===undefined||previous===o.cents)continue;
 const aid=randomUUID();db.prepare('INSERT INTO activity VALUES(?,?,?,?,?,?,?)').run(aid,t.user_id,t.id,observationId,previous,o.cents,now);
 if(decision.action==='drop'&&o.cents<previous&&t.email_enabled)db.prepare('INSERT INTO outbox(id,user_id,activity_id,created) VALUES(?,?,?,?)').run(randomUUID(),t.user_id,aid,now);
 }}
 }else if(decision.action==='pending'){
 const pendingAt=p.pending===o.cents&&now-p.pending_at<=21600?p.pending_at:now;
 db.prepare("UPDATE products SET pending=?,pending_at=?,last_check=?,status='CHECK_PENDING',detail=?,next_check=?,lease_until=0 WHERE id=?").run(o.cents,pendingAt,now,decision.reason,now+300,id);
 }else{
 db.prepare('UPDATE products SET last_check=?,status=?,detail=?,pending=NULL,pending_at=NULL,next_check=?,lease_until=0 WHERE id=?').run(now,['BLOCKED','FAILED','UNCERTAIN','UNAVAILABLE'].includes(o.state)?o.state:'UNCERTAIN',decision.reason,now+(o.state==='BLOCKED'?86400:9000),id);
 }
 // Require failures across distinct products, not repeats of a single product.
 const failures=db.prepare("SELECT count(DISTINCT p.id) n FROM observations o JOIN products p ON p.id=o.product_id WHERE p.retailer=? AND o.at>=? AND o.state IN ('FAILED','BLOCKED','UNCERTAIN')").get(p.retailer,now-3600).n;
 const total=db.prepare('SELECT count(DISTINCT p.id) n FROM observations o JOIN products p ON p.id=o.product_id WHERE p.retailer=? AND o.at>=?').get(p.retailer,now-3600).n;
 if(failures>=3&&failures/total>=0.6)db.prepare("INSERT INTO health VALUES(?,'DEGRADED',?) ON CONFLICT(retailer) DO UPDATE SET state='DEGRADED',blocked_until=excluded.blocked_until").run(p.retailer,now+10800);
 return decision;
 });
}
export function rateLimit(db,key,limit,seconds){const now=timestamp();db.prepare('DELETE FROM rate_limits WHERE expires<?').run(now);db.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+seconds);if(db.prepare('SELECT count FROM rate_limits WHERE key=?').get(key).count>limit)throw Object.assign(new Error('Too many attempts. Please try again later.'),{status:429});}
export function addVerifiedTrack(db,user,input,observation){
 const {retailer,url}=identify(input.url);if(observation.retailer!==retailer.id)throw new Error('Retailer mismatch.');
 return transaction(db,()=>{
 let p=db.prepare('SELECT * FROM products WHERE retailer=? AND product_id=? AND variant_id=? AND seller=?').get(retailer.id,observation.productId,observation.variantId,observation.seller);
 if(!p){const id=randomUUID();db.prepare('INSERT INTO products(id,retailer,url,product_id,variant_id,seller,title,variant,created) VALUES(?,?,?,?,?,?,?,?,?)').run(id,retailer.id,url,observation.productId,observation.variantId,observation.seller,observation.title,observation.variant,timestamp());p=db.prepare('SELECT * FROM products WHERE id=?').get(id);}
 if(db.prepare('SELECT id FROM tracks WHERE user_id=? AND product_id=?').get(user,p.id))throw new Error('You already track this exact variant.');
 const id=randomUUID();try{db.prepare('INSERT INTO tracks(id,user_id,product_id,title,notes,image,created) VALUES(?,?,?,?,?,?,?)').run(id,user,p.id,text(input.title||observation.title),text(input.notes||'',2000),imageValue(input.image),timestamp());}catch(e){if(e.message.includes('active_limit'))throw new Error(LIMIT_MESSAGE);throw e;}
 if(p.current!==null)db.prepare('INSERT INTO track_observations SELECT ?,id FROM observations WHERE product_id=? AND accepted=1 ORDER BY at DESC,rowid DESC LIMIT 1').run(id,p.id);
 return {id,productId:p.id,needsBaseline:p.current===null};
 });
}

// Resolve only a saved, unidentified URL; never silently switch a verified variant.
export function resolveTrack(db,user,id,url,o){
 return transaction(db,()=>{
  const t=owned(db,user,id),old=db.prepare('SELECT * FROM products WHERE id=?').get(t.product_id);
  if(!old.variant_id.startsWith('unverified:'))throw new Error('This product already has a verified identity.');
  const next=identify(url),before=new URL(old.url),after=new URL(next.url);
  if(next.retailer.id!==old.retailer||before.hostname!==after.hostname||before.pathname!==after.pathname||o.retailer!==old.retailer)throw new Error('Verify the same saved product.');
  let p=db.prepare('SELECT * FROM products WHERE retailer=? AND product_id=? AND variant_id=? AND seller=?').get(o.retailer,o.productId,o.variantId,o.seller);
  if(!p){const pid=randomUUID();db.prepare('INSERT INTO products(id,retailer,url,product_id,variant_id,seller,title,variant,created) VALUES(?,?,?,?,?,?,?,?,?)').run(pid,o.retailer,next.url,o.productId,o.variantId,o.seller,o.title,o.variant,timestamp());p={id:pid};}
  if(db.prepare('SELECT id FROM tracks WHERE user_id=? AND product_id=? AND id<>?').get(user,p.id,id))throw new Error('You already track this exact variant.');
  db.prepare('DELETE FROM track_observations WHERE track_id=?').run(id);
  db.prepare("UPDATE tracks SET product_id=?,title=CASE WHEN title='Saved product' THEN ? ELSE title END WHERE id=?").run(p.id,o.title,id);
  db.prepare('INSERT INTO track_observations SELECT ?,id FROM observations WHERE product_id=? AND accepted=1 ORDER BY at DESC,rowid DESC LIMIT 1').run(id,p.id);
  db.prepare('DELETE FROM products WHERE id=? AND NOT EXISTS(SELECT 1 FROM tracks WHERE product_id=?)').run(old.id,old.id);
  return p.id;
 });
}
