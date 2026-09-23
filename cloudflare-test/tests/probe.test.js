import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
import {claim,validMail,safeMailError} from '../src/core.js';
function db(){const d=new DatabaseSync(':memory:');d.exec('CREATE TABLE attempts(kind TEXT PRIMARY KEY,at INTEGER,result TEXT)');return {prepare(sql){const s=d.prepare(sql);let a=[];return {bind(...v){a=v;return this;},async run(){const r=s.run(...a);return {meta:{changes:r.changes}};},async all(){return {results:s.all(...a)};}};}};}
const token='test-key-123456789012345678901234567890';
test('unset token locks all test routes',async()=>{assert.equal((await worker.fetch(new Request('https://example.com/price',{method:'POST'}),{})).status,503);});
test('incorrect token cannot trigger a request',async()=>{assert.equal((await worker.fetch(new Request('https://example.com/email',{method:'POST'}),{TEST_TOKEN:token})).status,401);});
test('foreign origin cannot trigger a request',async()=>{assert.equal((await worker.fetch(new Request('https://example.com/email',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'https://evil.example'}}),{TEST_TOKEN:token})).status,403);});
test('email remains off without configured credentials',async()=>{assert.equal((await worker.fetch(new Request('https://example.com/email',{method:'POST',headers:{Authorization:'Bearer '+token}}),{TEST_TOKEN:token,DB:db()})).status,503);});
test('durable claim prevents concurrent and later retries',async()=>{const d=db();assert.deepEqual(await Promise.all([claim(d,'email'),claim(d,'email')]),[true,false]);assert.equal(await claim(d,'email'),false);});
test('Gmail validation excludes headers and invalid passwords',()=>{assert.ok(validMail({GMAIL_ADDRESS:'person@gmail.com',GMAIL_APP_PASSWORD:'abcdefghijklmnop'}));assert.ok(!validMail({GMAIL_ADDRESS:'person@gmail.com\r\nBcc: other@example.com',GMAIL_APP_PASSWORD:'abcdefghijklmnop'}));});
test('safe errors never expose SMTP details or secrets',()=>{assert.ok(!safeMailError({code:'EAUTH',message:'secret'}).includes('secret'));assert.ok(!safeMailError({message:'secret'}).includes('secret'));});
test('results require authentication and read persisted data',async()=>{const d=db();await claim(d,'price');const r=await worker.fetch(new Request('https://example.com/results',{headers:{Authorization:'Bearer '+token}}),{TEST_TOKEN:token,DB:d});assert.equal((await r.json()).attempts[0].kind,'price');});

import {diagnose,safeDetails} from '../src/diagnostics.js';
test('diagnostic uses verify only, both encrypted ports, closes clients',async()=>{let closed=0;const ports=[];const r=await diagnose({GMAIL_ADDRESS:'me@gmail.com',GMAIL_APP_PASSWORD:'abcdefghijklmnop'},opts=>{ports.push(opts.port);assert.equal(opts.tls.rejectUnauthorized,true);assert.ok(opts.secure||opts.requireTLS);return {async verify(){if(opts.port===465)throw Object.assign(Error('private credential text'),{code:'ESOCKET',command:'CONN'});},close(){closed++;},sendMail(){throw Error('Must never send');}};});assert.equal(r.emailSent,false);assert.deepEqual(ports,[465,587]);assert.equal(closed,2);assert.equal(r.results[1].state,'CONNECTION_AND_LOGIN_OK');assert.ok(!JSON.stringify(r).includes('private credential'));});
test('diagnostic strips provider text and unrecognized fields',()=>{const r=safeDetails({code:'secret',command:'AUTH secret',message:'password secret',responseCode:535});assert.deepEqual(r,{code:'OTHER',stage:'AUTH',smtpStatus:535,category:'UNCLASSIFIED'});});
