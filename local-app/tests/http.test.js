import {test} from 'node:test';import assert from 'node:assert/strict';import {openDB} from '../src/db.js';import {createApp} from '../src/server.js';
test('HTTP auth, CSRF, privacy, product CRUD, settings and unsupported email',async t=>{
 const db=openDB(':memory:');let origin;const server=createApp({db,origin:'http://127.0.0.1:4189'});await new Promise(r=>server.listen(4189,'127.0.0.1',r));origin='http://127.0.0.1:4189';t.after(()=>{server.close();db.close();});
 async function call(path,method='GET',body,credentials={},requestOrigin=origin){const r=await fetch(origin+'/api'+path,{method,headers:{'Content-Type':'application/json',Origin:requestOrigin,Cookie:credentials.cookie||'','X-CSRF-Token':credentials.csrf||''},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 assert.equal((await call('/dashboard')).status,401);
 const a=await call('/register','POST',{email:'alice@example.com',password:'a-long-test-password'});assert.equal(a.status,200);const alice={cookie:a.cookie,csrf:a.data.csrf};
 const b=await call('/register','POST',{email:'bob@example.com',password:'another-test-password'});const bob={cookie:b.cookie,csrf:b.data.csrf};
 assert.equal((await call('/session','GET',undefined,alice)).data.user.email,'alice@example.com');
 assert.equal((await call('/products','POST',{url:'https://www.lisagozlan.com/products/x'},alice,'https://evil.test')).status,403);
 assert.equal((await call('/products','POST',{url:'https://www.lisagozlan.com/products/x'},{cookie:a.cookie})).status,403);
 const saved=await call('/products','POST',{url:'https://www.lisagozlan.com/products/x',title:'Private Alice title',notes:'Private note'},alice);assert.equal(saved.status,201);const id=saved.data.id;
 assert.equal((await call('/dashboard','GET',undefined,bob)).data.products.length,0);
 for(const [method,suffix] of [['GET','/history'],['PATCH',''],['DELETE',''],['POST','/check']])assert.equal((await call('/products/'+id+suffix,method,method==='GET'?undefined:{title:'evil'},bob)).status,404);
 const forged=await call('/products','POST',{url:'https://www.lisagozlan.com/products/forged',cents:1,state:'VERIFIED',signals:[{cents:1}]},alice);assert.equal(forged.status,201);assert.ok((await call('/dashboard','GET',undefined,alice)).data.products.every(p=>p.current===null));
 assert.equal((await call('/products/'+id,'PATCH',{title:'Updated',active:false},alice)).status,200);
 assert.equal((await call('/settings','PATCH',{theme:'dark'},alice)).status,200);
 assert.equal((await call('/settings','PATCH',{theme:'dark',emailEnabled:true},alice)).status,409);
 assert.equal((await call('/products/'+id,'DELETE',{},alice)).status,200);
 assert.equal((await call('/logout','POST',{},alice)).status,200);assert.equal((await call('/dashboard','GET',undefined,alice)).status,401);
});
