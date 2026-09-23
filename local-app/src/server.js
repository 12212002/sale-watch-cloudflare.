import packageInfo from '../package.json' with {type:'json'};
import {loadGmail,mailSettings,sendVerification,verifyAddress,saveMailSettings,requestEmailReset,finishEmailReset} from './email.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {openDB,tracks,addTrack,addVerifiedTrack,owned,editTrack,deleteTrack,record,rateLimit,timestamp,resolveTrack} from './db.js';
import {register,login,session,authenticate,recover,changePassword} from './auth.js';
import {identify,publicRetailers} from './retailers.js';
import {inspectProduct,supported} from './adapters/index.js';
import {assess,verifiedRegular} from './verify.js';
import {startWorker} from './worker.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
export function createApp({db,origin='http://127.0.0.1:4173',inspector=inspectProduct,mailer=null}={}){
 const previews=new Map();const secure=origin.startsWith('https:');
 const server=http.createServer(async(req,res)=>{
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://cdn.shopify.com https://www.lisagozlan.com https://ca.brandymelville.com https://dam.dynamiteclothing.com https://www.indigo.ca; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
 const send=(status,data,extra={})=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(data));};
 try{
 if(req.headers.host!==new URL(origin).host)return send(421,{error:'Unexpected host.'});
 const url=new URL(req.url,origin),path=url.pathname;
 if(!path.startsWith('/api/')){
  if(req.method!=='GET')return send(405,{error:'Method not allowed.'});
  const assets={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg','/manifest.webmanifest':'manifest.webmanifest','/sw.js':'sw.js','/icon-180.png':'icon-180.png','/icon-192.png':'icon-192.png','/icon-512.png':'icon-512.png'};
  const name=assets[path];if(!name)return send(404,{error:'Not found.'});
  const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png',svg:'image/svg+xml',webmanifest:'application/manifest+json'};
  res.writeHead(200,{...headers,'Content-Type':types[name.split('.').at(-1)]});return res.end(await readFile(resolve(root,name)));
 }
 const mutating=!['GET','HEAD'].includes(req.method);
 if(mutating&&req.headers.origin!==origin)return send(403,{error:'Request origin did not match.'});
 if(mutating&&!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required.'});
 let input={};if(mutating){let data='',size=0;for await(const c of req){size+=c.length;if(size>230000){send(413,{error:'Request is too large.'});req.destroy();return;}data+=c;}try{input=JSON.parse(data||'{}');}catch{return send(400,{error:'Invalid JSON.'});}if(!input||typeof input!=='object'||Array.isArray(input))return send(400,{error:'Invalid request.'});}
 const auth=authenticate(db,req.headers.cookie);
 if(path==='/api/session'&&req.method==='GET')return send(200,{user:auth?{email:auth.email,theme:auth.theme,emailEnabled:Boolean(auth.email_enabled)}:null,csrf:auth?.csrf,mail:auth?mailSettings(db,auth.user_id):null,capabilities:{version:packageInfo.version,email:Boolean(mailer),hosting:'Local development — not hosted',monitoring:'Server process only; independent hosting is not configured',recovery:mailer?'Recovery code or verified login email':'Recovery code; email needs server setup'}});
 if(['/api/register','/api/login','/api/recover'].includes(path)&&req.method==='POST'){
  rateLimit(db,'auth-ip:'+req.socket.remoteAddress,25,900);rateLimit(db,'auth-email:'+String(input.email).trim().toLowerCase().slice(0,254),12,900);
  const result=path==='/api/register'?await register(db,input):path==='/api/recover'?await recover(db,input):{id:await login(db,input)};
  const s=session(db,result.id);return send(200,{csrf:s.csrf,recovery:result.recovery},{'Set-Cookie':`sw_session=${s.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure?'; Secure':''}`});
 }
 if(path==='/api/password/email/request'&&req.method==='POST'){
  if(!mailer)return send(409,{error:'Email is not configured on this server.'});rateLimit(db,'reset-ip:'+req.socket.remoteAddress,5,3600);rateLimit(db,'reset-address:'+String(input.email).trim().toLowerCase().slice(0,254),5,3600);
  try{await requestEmailReset(db,mailer,input.email);}catch{}return send(200,{ok:true,message:'If that account has a verified login email, a reset code has been requested.'});
 }
 if(path==='/api/password/email/finish'&&req.method==='POST'){
  rateLimit(db,'reset-finish:'+req.socket.remoteAddress,10,900);await finishEmailReset(db,input.email,input.code,input.password);return send(200,{ok:true});
 }
 if(!auth)return send(401,{error:'Please sign in.'});
 if(mutating&&req.headers['x-csrf-token']!==auth.csrf)return send(403,{error:'Please refresh the page and try again.'});
 const user=auth.user_id;
 if(path==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE hash=?').run(auth.hash);return send(200,{ok:true},{'Set-Cookie':'sw_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(secure?'; Secure':'')});}
 if(path==='/api/dashboard'&&req.method==='GET')return send(200,{products:tracks(db,user),retailers:publicRetailers(),heartbeat:Number(db.prepare("SELECT value FROM runtime WHERE key='heartbeat'").get()?.value||0),health:db.prepare('SELECT retailer,state,blocked_until FROM health').all()});
 if(path==='/api/inspect'&&req.method==='POST'){
  rateLimit(db,'inspect:'+user,30,3600);let {retailer,url}=identify(input.url);
  if(!supported(retailer.id))return send(200,{state:'UNAVAILABLE',reason:retailer.reason,url,retailer:retailer.name});
  const observation=await inspector(url);observation.regularCents=verifiedRegular(observation,observation);let previewToken;
  if(observation.state==='VERIFIED'&&assess(observation,observation).ok){if(retailer.id==='indigo'){const exact=new URL(url);exact.searchParams.set('variant',observation.variantId);url=exact.href;}previewToken=randomUUID();for(const [k,v]of previews)if(v.expires<Date.now())previews.delete(k);previews.set(previewToken,{user,url,observation,expires:Date.now()+600000});}
  return send(200,{...observation,previewToken,url,retailer:retailer.name});
 }
 if(path==='/api/products'&&req.method==='POST'){
  rateLimit(db,'add:'+user,50,3600);
  if(input.previewToken){const p=previews.get(input.previewToken);if(!p||p.user!==user||p.expires<Date.now())return send(400,{error:'Price preview expired. Please verify again.'});const added=addVerifiedTrack(db,user,{...input,url:p.url},p.observation);record(db,added.productId,p.observation,timestamp(),added.id);previews.delete(input.previewToken);return send(201,{id:added.id});}
  return send(201,{id:addTrack(db,user,input)});
 }
 const match=path.match(/^\/api\/products\/([a-f0-9-]+)(?:\/(history|check|resolve))?$/);
 if(match){const t=owned(db,user,match[1]);
  if(match[2]==='history'&&req.method==='GET')return send(200,{observations:db.prepare('SELECT o.regular,o.cents,o.currency,o.state,o.accepted,o.method,o.reason,o.at FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=? ORDER BY o.at DESC,o.rowid DESC LIMIT 500').all(t.id).reverse()});
  if(match[2]==='resolve'&&req.method==='POST'){
   const p=previews.get(input.previewToken);if(!p||p.user!==user||p.expires<Date.now())return send(400,{error:'Price preview expired. Please verify again.'});
   const pid=resolveTrack(db,user,t.id,p.url,p.observation);record(db,pid,p.observation,timestamp(),t.id);previews.delete(input.previewToken);return send(200,{ok:true});
  }
  if(match[2]==='check'&&req.method==='POST'){
   const p=db.prepare('SELECT * FROM products WHERE id=?').get(t.product_id);if(!t.active)return send(409,{error:'Monitoring is disabled.'});
   if(!supported(p.retailer)||p.variant_id.startsWith('unverified:'))return send(409,{error:'Automatic checking is not yet available for this product.'});
   if(db.prepare('SELECT blocked_until FROM health WHERE retailer=?').get(p.retailer)?.blocked_until>timestamp())return send(409,{error:'Possible retailer adapter problem. Checks are paused.'});
   if(p.last_check&&timestamp()-p.last_check<300)return send(429,{error:'Recently checked. Try again in five minutes.'});
   if(p.lease_until>timestamp())return send(409,{error:'A check is already running.'});
   db.prepare('UPDATE products SET lease_until=? WHERE id=?').run(timestamp()+120,p.id);
   const o=await inspector(p.url);record(db,p.id,o);return send(200,{ok:true});
  }
  if(!match[2]&&req.method==='PATCH'){editTrack(db,user,t.id,input);return send(200,{ok:true});}
  if(!match[2]&&req.method==='DELETE'){deleteTrack(db,user,t.id);return send(200,{ok:true});}
 }
 if(path==='/api/account/password'&&req.method==='POST'){
  rateLimit(db,'account:'+user,6,900);await changePassword(db,user,input);const s=session(db,user);return send(200,{csrf:s.csrf},{'Set-Cookie':`sw_session=${s.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure?'; Secure':''}`});
 }
 if(path==='/api/account/export'&&req.method==='GET'){
  const products=tracks(db,user).map(p=>({...p,observations:db.prepare('SELECT o.regular,o.cents,o.currency,o.state,o.accepted,o.reason,o.at FROM track_observations x JOIN observations o ON o.id=x.observation_id WHERE x.track_id=? ORDER BY o.at').all(p.id)}));
  return send(200,{format:'sale-watch-export-v1',exportedAt:new Date().toISOString(),account:{email:auth.email,theme:auth.theme},activity:db.prepare('SELECT track_id,old,new,at FROM activity WHERE user_id=? ORDER BY at').all(user),products});
 }
 if(path==='/api/account'&&req.method==='DELETE'){
  rateLimit(db,'account:'+user,6,900);await login(db,{email:auth.email,password:input.password});
  db.prepare('DELETE FROM users WHERE id=?').run(user);db.prepare('DELETE FROM products WHERE NOT EXISTS(SELECT 1 FROM tracks WHERE product_id=products.id)').run();
  return send(200,{ok:true},{'Set-Cookie':'sw_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+(secure?'; Secure':'')});
 }
 if(path==='/api/activity'&&req.method==='GET')return send(200,{activity:db.prepare(`SELECT a.id,a.old,a.new,a.at,t.title,p.url,p.variant,p.retailer,COALESCE(o.status,'OFF') email_status FROM activity a JOIN tracks t ON t.id=a.track_id JOIN products p ON p.id=t.product_id LEFT JOIN outbox o ON o.activity_id=a.id WHERE a.user_id=? ORDER BY a.at DESC LIMIT 200`).all(user)});
 if(path==='/api/email'&&req.method==='GET')return send(200,{...mailSettings(db,user),configured:Boolean(mailer)});
 if(path==='/api/email/verify/request'&&req.method==='POST'){await sendVerification(db,mailer,user,input.address);return send(200,{ok:true});}
 if(path==='/api/email/verify/finish'&&req.method==='POST'){return send(200,verifyAddress(db,user,input.code));}
 if(path==='/api/email'&&req.method==='PATCH'){if(input.enabled&&!mailer)return send(409,{error:'Email is not configured on this server.'});saveMailSettings(db,user,input);return send(200,mailSettings(db,user));}
 if(path==='/api/settings' &&req.method==='PATCH'){
  if(input.emailEnabled)return send(409,{error:'Use notification settings to verify your email and enable alerts.'});
  if(!['light','dark','system'].includes(input.theme))return send(400,{error:'Invalid theme.'});db.prepare('UPDATE users SET theme=? WHERE id=?').run(input.theme,user);return send(200,{ok:true});
 }
 return send(404,{error:'Not found.'});
 }catch(e){send(e.status||400,{error:/SQLITE|constraint|syntax|database/i.test(e.message)?'Unable to save this change.':e.message||'Something went wrong.'});}
 });server.requestTimeout=30000;server.headersTimeout=10000;return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1',origin=process.env.SALE_WATCH_ORIGIN||`http://${host}:${port}`;
 if(host!=='127.0.0.1'&&!origin.startsWith('https:'))throw new Error('Public deployment requires an HTTPS origin and a reviewed reverse proxy.');
 const db=openDB(process.env.SALE_WATCH_DB||'data/sale-watch.sqlite');const mailer=loadGmail(db);const stop=startWorker(db,mailer);const server=createApp({db,origin,mailer});server.listen(port,host,()=>console.log('Sale Watch development server: '+origin));
 let closing=false;const close=async()=>{if(closing)return;closing=true;await Promise.all([stop(),new Promise(r=>server.close(r))]);db.close();process.exit(0);};process.on('SIGTERM',close);process.on('SIGINT',close);
}
