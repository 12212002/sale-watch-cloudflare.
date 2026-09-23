import {test} from 'node:test';import assert from 'node:assert/strict';import {openDB} from '../src/db.js';import {createApp} from '../src/server.js';
const observation={state:'VERIFIED',retailer:'lisa-gozlan',productId:'123',variantId:'456',seller:'Lisa Gozlan',currency:'CAD',cents:12000,available:true,title:'Bracelet',variant:'Gold / Small',signals:[{source:'json',kind:'selling-price',productId:'123',variantId:'456',currency:'CAD',cents:12000}]};
test('HTTP resolution, export privacy, password rotation and account deletion',async t=>{
 const db=openDB(':memory:'),origin='http://127.0.0.1:4191';const server=createApp({db,origin,inspector:async()=>observation});await new Promise(r=>server.listen(4191,'127.0.0.1',r));t.after(()=>{server.close();db.close();});
 async function call(path,method='GET',body,c={}){const r=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:c.cookie||'','X-CSRF-Token':c.csrf||''},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const a=await call('/register','POST',{email:'a@example.com',password:'correct-horse-password'}),alice={cookie:a.cookie,csrf:a.data.csrf};const b=await call('/register','POST',{email:'b@example.com',password:'correct-horse-password'}),bob={cookie:b.cookie,csrf:b.data.csrf};
 const saved=await call('/products','POST',{url:'https://www.lisagozlan.com/products/bracelet',notes:'Alice private'},alice),id=saved.data.id;
 const preview=await call('/inspect','POST',{url:'https://www.lisagozlan.com/products/bracelet?variant=456'},alice);
 assert.equal((await call('/products/'+id+'/resolve','POST',{previewToken:preview.data.previewToken},bob)).status,404);
 assert.equal((await call('/products/'+id+'/resolve','POST',{previewToken:preview.data.previewToken},alice)).status,200);
 assert.equal((await call('/account/export','GET',undefined,alice)).data.products[0].current,12000);
 const exportBob=await call('/account/export','GET',undefined,bob);assert.equal(exportBob.data.products.length,0);assert.ok(!JSON.stringify(exportBob).includes('Alice private'));
 const changed=await call('/account/password','POST',{currentPassword:'correct-horse-password',newPassword:'new-correct-horse-password'},alice);assert.equal(changed.status,200);assert.equal((await call('/dashboard','GET',undefined,alice)).status,401);const next={cookie:changed.cookie,csrf:changed.data.csrf};
 assert.equal((await call('/account','DELETE',{password:'wrong'},next)).status,401);assert.equal((await call('/dashboard','GET',undefined,next)).status,200);
 assert.equal((await call('/account','DELETE',{password:'new-correct-horse-password'},next)).status,200);assert.equal((await call('/dashboard','GET',undefined,next)).status,401);assert.equal(db.prepare('SELECT count(*) n FROM tracks').get().n,0);assert.equal((await call('/dashboard','GET',undefined,bob)).status,200);
 for(const path of ['/icon-180.png','/icon-192.png','/icon-512.png']){const r=await fetch(origin+path);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');}
});
