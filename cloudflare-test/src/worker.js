import {diagnose} from './diagnostics.js';
import {probeNativeLogin} from './native-login.js';
import {probeNativeConnection} from './native-connection.js';
import nodemailer from '../vendor/nodemailer/dist/esm/nodemailer.js';
import {inspectHollister} from './adapters/hollister.js';
import {PRODUCT_URL,safeMailError,validMail,claim,finish} from './core.js';
import {PAGE} from './page.js';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
export function createWorker({nativeConnect = async () => (await import('cloudflare:sockets')).connect} = {}) {return {
 async fetch(request,env){
  const u=new URL(request.url);
  if(request.method==='GET'&&u.pathname==='/')return new Response(PAGE,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}});
  if(!env.TEST_TOKEN||env.TEST_TOKEN.length<32)return json({error:'Test locked. Configure a private TEST_TOKEN of at least 32 characters.'},503);
  if(request.headers.get('Authorization')!==`Bearer ${env.TEST_TOKEN}`)return json({error:'Incorrect test key.'},401);
  if(request.headers.has('Origin')&&request.headers.get('Origin')!==u.origin)return json({error:'Wrong origin.'},403);
  if(!env.DB)return json({error:'Test database not connected.'},503);
  try{
   if(request.method==='GET'&&u.pathname==='/results')return json({attempts:(await env.DB.prepare('SELECT kind,at,result FROM attempts ORDER BY at').all()).results});
   if(request.method!=='POST')return json({error:'Not found'},404);
   if(u.pathname==='/native-connection'){
    if(!await claim(env.DB,'native-connection-v1'))return json({error:'The native connection probe was already attempted. Use Show saved results.'},409);
    const connect=await nativeConnect();
    return json(await finish(env.DB,'native-connection-v1',await probeNativeConnection(connect)));
   }
   if(u.pathname==='/native-login'){
    if(!validMail(env))return json({error:'Existing Gmail secrets are missing or invalid. Do not paste them into chat.'},503);
    if(!await claim(env.DB,'native-login-v1'))return json({error:'Native login test was already attempted. Use Show saved results.'},409);
    const connect=await nativeConnect();
    return json(await finish(env.DB,'native-login-v1',await probeNativeLogin(connect,env)));
   }
   if(u.pathname==='/price'){
    if(!await claim(env.DB,'price'))return json({error:'This one-time price test already ran. Use Show results.'},409);
    const result=await inspectHollister(PRODUCT_URL);
    return json(await finish(env.DB,'price',{...result,checkedAt:new Date().toISOString(),url:PRODUCT_URL,note:'Only VERIFIED with exact SKU and CAD prices passes. Check the retailer manually too.'}));
   }
   if(u.pathname==='/connection'){
    if(!validMail(env))return json({error:'Configure GMAIL_ADDRESS and GMAIL_APP_PASSWORD as secrets first.'},503);
    if(!await claim(env.DB,'connection-v1'))return json({error:'Connection diagnostic already ran. Use Show saved results.'},409);
    return json(await finish(env.DB,'connection-v1',await diagnose(env,options=>nodemailer.createTransport(options))));
   }
   if(u.pathname==='/email'){
    if(!validMail(env))return json({error:'Configure GMAIL_ADDRESS and GMAIL_APP_PASSWORD as secrets first.'},503);
    if(!await claim(env.DB,'email'))return json({error:'The one-time email test was already attempted. Check your inbox and saved results.'},409);
    const client=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:env.GMAIL_ADDRESS,pass:env.GMAIL_APP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
    let result;
    try{const r=await client.sendMail({from:{name:'Sale Watch test',address:env.GMAIL_ADDRESS},to:env.GMAIL_ADDRESS,subject:'Sale Watch — Cloudflare email test',text:'This is the single test email you requested from the Sale Watch Cloudflare test page. It is not a real price-drop alert. Receiving it confirms inbox delivery for this test only.'});result={state:r.accepted?.length?'ACCEPTED':'UNCONFIRMED',note:'Check your inbox and spam. SMTP acceptance alone is not proof of inbox delivery.'};}
    catch(error){result={state:'UNCONFIRMED',note:safeMailError(error)};}finally{client.close();}
    return json(await finish(env.DB,'email',result));
   }
   return json({error:'Not found'},404);
  }catch{return json({error:'Test could not finish. Check saved results. No automatic email retry.'},500);}
 }
};}
export default createWorker();
