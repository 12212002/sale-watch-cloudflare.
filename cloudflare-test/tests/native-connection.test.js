import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probeNativeConnection} from '../src/native-connection.js';
import {createWorker} from '../src/worker.js';
import {DatabaseSync} from 'node:sqlite';

function fakeSocket(chunks, {opened = Promise.resolve(), pending = false} = {}) {
 let closes = 0;
 const socket = {opened, closed:Promise.resolve(),
  readable:new ReadableStream({start(c) {for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk)); if (!pending) c.close();}}),
  get writable() {throw Error('Probe must never write commands');},
  close() {closes++; return Promise.resolve();}};
 return {socket, get closes() {return closes;}};
}
test('native probe uses only fixed TLS endpoint, handles fragmented multiline greeting, closes socket', async () => {
 const f = fakeSocket(['220-first line\r\n22','0 smtp ready\r','\n']);
 const result = await probeNativeConnection((address, options) => {
  assert.deepEqual(address, {hostname:'smtp.gmail.com', port:465});
  assert.deepEqual(options, {secureTransport:'on'}); return f.socket;
 });
 assert.equal(result.state, 'SMTP_GREETING_OK');
 assert.equal(result.emailSent, false); assert.equal(result.credentialsSent, false);
 assert.equal(f.closes, 1); assert.ok(!JSON.stringify(result).includes('first line'));
});
test('native probe sanitizes connection failures and closes socket', async () => {
 const f = fakeSocket([], {opened:Promise.reject(Error('private details'))});
 const result = await probeNativeConnection(() => f.socket);
 assert.equal(result.stage, 'CONNECT'); assert.equal(result.state, 'FAILED');
 assert.ok(!JSON.stringify(result).includes('private details')); assert.equal(f.closes, 1);
});
test('native probe bounds total wait even when greeting never arrives', async () => {
 const f = fakeSocket([], {pending:true});
 const result = await probeNativeConnection(() => f.socket, {timeoutMs:10});
 assert.equal(result.category, 'PROBE_TIMEOUT'); assert.equal(f.closes, 1);
});
test('native probe rejects incomplete, oversized and non-220 greetings', async () => {
 for (const [chunks, category] of [[['220 partial'], 'PROBE_EOF'], [['x'.repeat(4097)], 'PROBE_PROTOCOL'], [['554 denied\r\n'], 'PROBE_PROTOCOL']]) {
  const f = fakeSocket(chunks);
  assert.equal((await probeNativeConnection(() => f.socket)).category, category);
  assert.equal(f.closes, 1);
 }
});
test('native route needs a valid test key, but no Gmail secrets; ledger survives retries', async () => {
 const sqlite = new DatabaseSync(':memory:');
 sqlite.exec('CREATE TABLE attempts(kind TEXT PRIMARY KEY,at INTEGER,result TEXT)');
 const DB = {prepare(sql) {const s = sqlite.prepare(sql); let a = []; return {bind(...v) {a=v;return this;},async run() {return {meta:{changes:s.run(...a).changes}};}, async all() {return {results:s.all(...a)};}};}};
 const env = {DB, TEST_TOKEN:'12345678901234567890123456789012'};
 let connections = 0;
 const worker = createWorker({nativeConnect:async () => () => {connections++;return fakeSocket(['220 ready\r\n']).socket;}});
 const request = (token, origin) => new Request('https://example.com/native-connection', {method:'POST', headers:{Authorization:'Bearer '+token, ...(origin ? {Origin:origin} : {})}});
 try {
  assert.equal((await worker.fetch(request('wrong'),env)).status,401);
  assert.equal((await worker.fetch(request(env.TEST_TOKEN,'https://evil.example'),env)).status,403);
  assert.equal(connections,0);
  const responses = await Promise.all([worker.fetch(request(env.TEST_TOKEN),env),worker.fetch(request(env.TEST_TOKEN),env)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  assert.equal(connections,1);
  assert.equal((await worker.fetch(request(env.TEST_TOKEN),env)).status,409);
  const saved = JSON.parse(sqlite.prepare('SELECT result FROM attempts WHERE kind=?').get('native-connection-v1').result);
  assert.equal(saved.state,'SMTP_GREETING_OK'); assert.equal(saved.emailSent,false);
  // New probe does not claim or clear the older email/connection ledger slots.
  assert.equal(sqlite.prepare('SELECT count(*) n FROM attempts').get().n,1);
 } finally {sqlite.close();}
});
