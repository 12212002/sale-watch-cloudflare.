import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probeNativeLogin} from '../src/native-login.js';
import {createWorker} from '../src/worker.js';
import {DatabaseSync} from 'node:sqlite';
const env = {GMAIL_ADDRESS:'fake.sender@gmail.com', GMAIL_APP_PASSWORD:'abcdefghijklmnop'};
function connection({capabilities='250-smtp\r\n250-AUTH LOGIN PLAIN\r\n250 SIZE 1000\r\n', auth='235 2.7.0 accepted\r\n', greeting='220 hello\r\n', pending=false} = {}) {
 let controller, closes=0; const writes=[];
 const readable = new ReadableStream({start(c) {controller=c;if(!pending)c.enqueue(new TextEncoder().encode(greeting));}});
 const socket = {opened:Promise.resolve(), closed:Promise.resolve(), readable,
  writable:new WritableStream({write(bytes) {
   const command=new TextDecoder().decode(bytes);writes.push(command);
   assert.ok(!/^(MAIL|RCPT|DATA)/.test(command));
   const reply=command.startsWith('EHLO ')?capabilities:auth;
   if(reply!==null) {const at=Math.floor(reply.length/2);for(const part of [reply.slice(0,at),reply.slice(at)])controller.enqueue(new TextEncoder().encode(part));}
  }}),close(){closes++;return Promise.resolve();}};
 return {socket,writes,get closes(){return closes;}};
}
test('native login authenticates only on TLS and never sends a message; replies may be fragmented',async()=>{
 const c=connection();const result=await probeNativeLogin((address,options)=>{
  assert.deepEqual(address,{hostname:'smtp.gmail.com',port:465});assert.deepEqual(options,{secureTransport:'on'});return c.socket;
 },env);
 assert.equal(result.state,'NATIVE_LOGIN_OK');assert.equal(result.emailSent,false);assert.equal(c.closes,1);
 assert.equal(c.writes.length,2);assert.equal(c.writes[1],'AUTH PLAIN '+btoa('\0'+env.GMAIL_ADDRESS+'\0'+env.GMAIL_APP_PASSWORD)+'\r\n');
 assert.ok(!JSON.stringify(result).includes(env.GMAIL_ADDRESS));assert.ok(!JSON.stringify(result).includes(env.GMAIL_APP_PASSWORD));
});
test('Gmail authentication rejection is distinct from connection failure and strips provider text',async()=>{
 const c=connection({auth:'535 private account details\r\n'});
 const result=await probeNativeLogin(()=>c.socket,env);
 assert.equal(result.category,'AUTH_REJECTED');assert.equal(result.smtpStatus,535);assert.equal(result.credentialsSubmitted,true);
 assert.ok(!JSON.stringify(result).includes('private'));assert.equal(c.closes,1);
});
test('native login will not submit credentials unless server advertises PLAIN',async()=>{
 const c=connection({capabilities:'250-AUTH XOAUTH2\r\n250 SIZE 10\r\n'});
 const result=await probeNativeLogin(()=>c.socket,env);
 assert.equal(result.category,'AUTH_PLAIN_UNAVAILABLE');assert.equal(result.credentialsSubmitted,false);assert.equal(c.writes.length,1);
});
test('native login validates configuration before making any connection',async()=>{
 const result=await probeNativeLogin(()=>{throw Error('must not connect');},{...env,GMAIL_ADDRESS:'evil\r\nMAIL FROM:<evil>'});
 assert.equal(result.category,'INVALID_CONFIGURATION');assert.equal(result.credentialsSubmitted,false);
});
test('native login bounds waiting and closes socket without further commands',async()=>{
 const c=connection({pending:true});const result=await probeNativeLogin(()=>c.socket,env,{timeoutMs:10});
 assert.equal(result.category,'TIMEOUT');assert.equal(result.credentialsSubmitted,false);assert.equal(c.closes,1);assert.equal(c.writes.length,0);
});
test('native login rejects malformed multiline responses and oversize replies',async()=>{
 for(const capabilities of ['250-first\r\n550 AUTH PLAIN\r\n','250-'+ 'x'.repeat(17000)]) {
  const c=connection({capabilities});const result=await probeNativeLogin(()=>c.socket,env);
  assert.equal(result.category,'INVALID_REPLY');assert.equal(result.credentialsSubmitted,false);assert.equal(c.writes.length,1);
 }
});
test('native login route retains original email ledger, rejects unauthorized calls and duplicate login tests',async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE attempts(kind TEXT PRIMARY KEY,at INTEGER,result TEXT)');
 sqlite.prepare('INSERT INTO attempts VALUES(?,?,?)').run('email',1,'{"state":"UNCONFIRMED"}');
 const DB={prepare(sql){const s=sqlite.prepare(sql);let args=[];return {bind(...v){args=v;return this;},async run(){return {meta:{changes:s.run(...args).changes}};},async all(){return {results:s.all(...args)};}};}};
 const runtime={...env,DB,TEST_TOKEN:'12345678901234567890123456789012'};let connects=0;
 const worker=createWorker({nativeConnect:async()=>()=>{connects++;return connection().socket;}});
 const req=(key=runtime.TEST_TOKEN)=>new Request('https://example.com/native-login',{method:'POST',headers:{Authorization:'Bearer '+key}});
 try {
  assert.equal((await worker.fetch(req('wrong'),runtime)).status,401);
  assert.equal((await worker.fetch(req(),{...runtime,GMAIL_APP_PASSWORD:''})).status,503);assert.equal(connects,0);
  const responses=await Promise.all([worker.fetch(req(),runtime),worker.fetch(req(),runtime)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(connects,1);
  assert.equal(sqlite.prepare('SELECT result FROM attempts WHERE kind=?').get('email').result,'{"state":"UNCONFIRMED"}');
  assert.equal(JSON.parse(sqlite.prepare('SELECT result FROM attempts WHERE kind=?').get('native-login-v1').result).state,'NATIVE_LOGIN_OK');
 } finally {sqlite.close();}
});
