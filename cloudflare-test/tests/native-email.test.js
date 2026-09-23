import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendNativeTestEmail,probeNativeLogin} from '../src/native-login.js';
import {createWorker} from '../src/worker.js';
import {DatabaseSync} from 'node:sqlite';
const credentials={GMAIL_ADDRESS:'test.sender@gmail.com',GMAIL_APP_PASSWORD:'abcdefghijklmnop'};
function smtp({auth='235 accepted\r\n',recipient='250 recipient ok\r\n',final='250 queued\r\n'}={}) {
 let controller,closed=0;const writes=[];
 const emit=text=>{if(text!==null)controller.enqueue(new TextEncoder().encode(text));};
 const socket={opened:Promise.resolve(),closed:Promise.resolve(),
  readable:new ReadableStream({start(c){controller=c;emit('220 ready\r\n');}}),
  writable:new WritableStream({write(bytes){
   const value=new TextDecoder().decode(bytes);writes.push(value);
   if(value.startsWith('EHLO '))emit('250-smtp\r\n250 AUTH PLAIN LOGIN\r\n');
   else if(value.startsWith('AUTH PLAIN '))emit(auth);
   else if(value.startsWith('MAIL FROM:'))emit('250 sender ok\r\n');
   else if(value.startsWith('RCPT TO:'))emit(recipient);
   else if(value==='DATA\r\n')emit('354 continue\r\n');
   else if(value.startsWith('Date: '))emit(final);
   else throw Error('Unexpected command');
  }}),close(){closed++;return Promise.resolve();}};
 return {socket,writes,get closed(){return closed;}};
}
test('native test sends exactly one correctly terminated message only to configured owner after TLS login',async()=>{
 const s=smtp();const result=await sendNativeTestEmail((address,options)=>{
  assert.deepEqual(address,{hostname:'smtp.gmail.com',port:465});assert.equal(options.secureTransport,'on');return s.socket;
 },credentials);
 assert.equal(result.state,'SMTP_ACCEPTED');assert.equal(result.emailSent,true);assert.equal(result.deliveryConfirmed,false);
 assert.equal(s.writes.length,6);assert.equal(s.writes[2],'MAIL FROM:<test.sender@gmail.com>\r\n');assert.equal(s.writes[3],'RCPT TO:<test.sender@gmail.com>\r\n');
 const body=s.writes[5];assert.ok(body.endsWith('\r\n.\r\n'));assert.match(body,/Subject: Sale Watch - native Cloudflare email test\r\n/);
 assert.ok(body.includes('Message-ID: <'+result.messageId+'>'));assert.ok(!body.includes(credentials.GMAIL_APP_PASSWORD));
 assert.ok(!JSON.stringify(result).includes(credentials.GMAIL_ADDRESS));assert.equal(s.closed,1);
});
test('existing login-only entry point cannot be switched into email mode by options',async()=>{
 const s=smtp();const result=await probeNativeLogin(()=>s.socket,credentials,{sendTest:true});
 assert.equal(result.state,'NATIVE_LOGIN_OK');assert.equal(result.emailSent,false);assert.equal(s.writes.length,2);
});
test('rejected authentication or recipient never transmits message content',async()=>{
 for(const opts of [{auth:'535 login denied\r\n'},{recipient:'550 rejected\r\n'}]) {
  const s=smtp(opts);const result=await sendNativeTestEmail(()=>s.socket,credentials);
  assert.equal(result.emailSent,false);assert.equal(result.state,'FAILED');assert.ok(!s.writes.some(w=>w.startsWith('Date: ')));assert.equal(s.closed,1);
 }
});
test('timeout after message submission remains unknown and performs no retry',async()=>{
 const s=smtp({final:null});const result=await sendNativeTestEmail(()=>s.socket,credentials,{timeoutMs:20});
 assert.equal(result.state,'UNCONFIRMED');assert.equal(result.emailSent,null);assert.equal(result.category,'TIMEOUT');
 assert.equal(s.writes.filter(w=>w.startsWith('Date: ')).length,1);assert.equal(s.closed,1);
});
test('explicit final SMTP rejection is not reported as accepted',async()=>{
 const s=smtp({final:'550 private rejection details\r\n'});const result=await sendNativeTestEmail(()=>s.socket,credentials);
 assert.equal(result.state,'FAILED');assert.equal(result.emailSent,false);assert.equal(result.smtpStatus,550);assert.equal(result.category,'MESSAGE_NOT_ACCEPTED');assert.ok(!JSON.stringify(result).includes('private rejection'));
});
function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE attempts(kind TEXT PRIMARY KEY,at INTEGER,result TEXT)');
 const DB={prepare(text){const query=sql.prepare(text);let args=[];return {bind(...a){args=a;return this;},async run(){return {meta:{changes:query.run(...args).changes}};},async all(){return {results:query.all(...args)};}};}};
 return {sql,DB};
}
test('native send requires confirmation and successful saved login, rejects unauthorized calls',async()=>{
 const {sql,DB}=database();let connects=0;
 const runtime={...credentials,DB,TEST_TOKEN:'12345678901234567890123456789012'};
 const worker=createWorker({nativeConnect:async()=>()=>{connects++;return smtp().socket;}});
 const req=(extra={},token=runtime.TEST_TOKEN)=>new Request('https://example.com/native-email',{method:'POST',headers:{Authorization:'Bearer '+token,...extra}});
 try {
  assert.equal((await worker.fetch(req({},'wrong'),runtime)).status,401);
  assert.equal((await worker.fetch(req(),runtime)).status,400);
  assert.equal((await worker.fetch(req({'X-Confirm-Test-Email':'send-one-new-test',Origin:'https://evil.example'}),runtime)).status,403);
  assert.equal((await worker.fetch(req({'X-Confirm-Test-Email':'send-one-new-test'}),runtime)).status,409);
  assert.equal(connects,0);assert.equal(sql.prepare('SELECT count(*) n FROM attempts').get().n,0);
 }finally{sql.close();}
});
test('native email ledger prevents duplicate sends and preserves every earlier record',async()=>{
 const {sql,DB}=database();let connects=0;const sessions=[];
 sql.prepare('INSERT INTO attempts VALUES(?,?,?)').run('native-login-v1',1,JSON.stringify({state:'NATIVE_LOGIN_OK'}));
 sql.prepare('INSERT INTO attempts VALUES(?,?,?)').run('email',1,JSON.stringify({state:'UNCONFIRMED'}));
 const runtime={...credentials,DB,TEST_TOKEN:'12345678901234567890123456789012'};
 const worker=createWorker({nativeConnect:async()=>()=>{connects++;const s=smtp();sessions.push(s);return s.socket;}});
 const request=()=>new Request('https://example.com/native-email',{method:'POST',headers:{Authorization:'Bearer '+runtime.TEST_TOKEN,'X-Confirm-Test-Email':'send-one-new-test'},body:JSON.stringify({to:'unwanted@example.com'})});
 try{
  const responses=await Promise.all([worker.fetch(request(),runtime),worker.fetch(request(),runtime)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(connects,1);
  assert.equal((await worker.fetch(request(),runtime)).status,409);assert.equal(connects,1);
  assert.equal(JSON.parse(sql.prepare('SELECT result FROM attempts WHERE kind=?').get('email').result).state,'UNCONFIRMED');
  assert.equal(JSON.parse(sql.prepare('SELECT result FROM attempts WHERE kind=?').get('native-login-v1').result).state,'NATIVE_LOGIN_OK');
  assert.equal(JSON.parse(sql.prepare('SELECT result FROM attempts WHERE kind=?').get('native-email-v1').result).state,'SMTP_ACCEPTED');
  assert.equal(sessions[0].writes[3],'RCPT TO:<test.sender@gmail.com>\r\n');
 }finally{sql.close();}
});
test('an interrupted native attempt stays blocked even if no final result was saved',async()=>{
 const {sql,DB}=database();
 for(const [kind,state] of [['native-login-v1','NATIVE_LOGIN_OK'],['native-email-v1','STARTED']])sql.prepare('INSERT INTO attempts VALUES(?,?,?)').run(kind,1,JSON.stringify({state}));
 const runtime={...credentials,DB,TEST_TOKEN:'12345678901234567890123456789012'};
 const worker=createWorker({nativeConnect:async()=>{throw Error('must not connect');}});
 try {
  const request=new Request('https://example.com/native-email',{method:'POST',headers:{Authorization:'Bearer '+runtime.TEST_TOKEN,'X-Confirm-Test-Email':'send-one-new-test'}});
  assert.equal((await worker.fetch(request,runtime)).status,409);
 }finally{sql.close();}
});
