import {validMail} from './core.js';

// Separate entry points keep the existing login-only diagnostic incapable of sending.
export function probeNativeLogin(connect, env, {timeoutMs = 15000} = {}) {
 return runNativeSession(connect, env, {timeoutMs, sendTest:false});
}
export function sendNativeTestEmail(connect, env, {timeoutMs = 25000} = {}) {
 return runNativeSession(connect, env, {timeoutMs, sendTest:true});
}
async function runNativeSession(connect, env, {timeoutMs, sendTest}) {
 const base = {host:'smtp.gmail.com', port:465, emailSent:false};
 if (!validMail(env)) return {...base, state:'FAILED', stage:'CONFIG', category:'INVALID_CONFIGURATION', credentialsSubmitted:false};
 let socket, reader, writer, timer, stopped = false, stage = 'CONNECT', smtpStatus = null, credentialsSubmitted = false;
 let submissionStarted = false;
 const failure = category => Object.assign(new Error('SMTP diagnostic failed'), {category});
 const guard = () => {if (stopped) throw failure('TIMEOUT');};
 const timeout = new Promise((_, reject) => {
  timer = setTimeout(() => {stopped = true; reject(failure('TIMEOUT'));}, timeoutMs);
 });
 try {
  const operation = (async () => {
   socket = connect({hostname:base.host, port:base.port}, {secureTransport:'on'});
   socket.closed.catch(() => {});
   await socket.opened; guard();
   reader = socket.readable.getReader(); writer = socket.writable.getWriter();
   const decoder = new TextDecoder(), encoder = new TextEncoder();
   let buffer = '';
   async function reply() {
    let bytes = 0, code = null, lines = [];
    while (true) {
     guard();
     const end = buffer.indexOf('\r\n');
     if (end < 0) {
      const {done, value} = await reader.read(); guard();
      if (done) throw failure('EARLY_CLOSE');
      bytes += value.byteLength;
      if (bytes > 16384) throw failure('INVALID_REPLY');
      buffer += decoder.decode(value, {stream:true});
      continue;
     }
     const line = buffer.slice(0,end); buffer = buffer.slice(end+2);
     const match = /^([2-5][0-9]{2})([ -])(.*)$/.exec(line);
     if (!match || (code !== null && code !== Number(match[1]))) throw failure('INVALID_REPLY');
     code = Number(match[1]); lines.push(match[3]);
     if (lines.length > 100) throw failure('INVALID_REPLY');
     if (match[2] === ' ') {smtpStatus = code; return {code,lines};}
    }
   }
   async function command(line) {guard(); await writer.write(encoder.encode(line+'\r\n')); guard();}
   stage = 'GREETING';
   if ((await reply()).code !== 220) throw failure('GREETING_REJECTED');
   stage = 'EHLO';
   await command('EHLO sale-watch-free-test.gabriel-sale-watch.workers.dev');
   const capabilities = await reply();
   if (capabilities.code !== 250) throw failure('EHLO_REJECTED');
   if (!capabilities.lines.some(line => /^AUTH(?:\s|=)/i.test(line) && line.replace(/^AUTH[= ]+/i,'').split(/\s+/).some(mechanism => mechanism.toUpperCase() === 'PLAIN'))) throw failure('AUTH_PLAIN_UNAVAILABLE');
   stage = 'AUTH';
   // ASCII-only Gmail address/app password are validated above. Never log this string.
   const encoded = btoa('\0'+env.GMAIL_ADDRESS+'\0'+env.GMAIL_APP_PASSWORD);
   credentialsSubmitted = true;
   await command('AUTH PLAIN '+encoded);
   const auth = await reply();
   if (auth.code !== 235) throw failure(auth.code === 535 ? 'AUTH_REJECTED' : 'AUTH_NOT_CONFIRMED');
   if (sendTest) {
    stage = 'MAIL';
    await command('MAIL FROM:<'+env.GMAIL_ADDRESS+'>');
    if ((await reply()).code !== 250) throw failure('SENDER_REJECTED');
    stage = 'RCPT';
    await command('RCPT TO:<'+env.GMAIL_ADDRESS+'>');
    if (![250,251].includes((await reply()).code)) throw failure('RECIPIENT_REJECTED');
    stage = 'DATA';
    await command('DATA');
    if ((await reply()).code !== 354) throw failure('DATA_REJECTED');
    const messageId = crypto.randomUUID()+'@sale-watch-free-test.gabriel-sale-watch.workers.dev';
    const message = [
     'Date: '+new Date().toUTCString(),
     'From: Sale Watch test <'+env.GMAIL_ADDRESS+'>',
     'To: <'+env.GMAIL_ADDRESS+'>',
     'Message-ID: <'+messageId+'>',
     'Subject: Sale Watch - native Cloudflare email test',
     'MIME-Version: 1.0',
     'Content-Type: text/plain; charset=us-ascii',
     'Content-Transfer-Encoding: 7bit',
     '',
     'This is the ONE new test email you requested using the native TLS button.',
     'It is not a real sale or price-drop alert.',
     'The earlier test records were preserved. No recurring checks are enabled.',
     'Receiving this message confirms delivery for this test only.',
     '',
     'Test reference: '+messageId
    ].map(line=>line.startsWith('.')?'.'+line:line).join('\r\n');
    stage = 'FINAL_REPLY';
    submissionStarted = true;
    await command(message+'\r\n.');
    if ((await reply()).code !== 250) throw failure('MESSAGE_NOT_ACCEPTED');
    return {...base, state:'SMTP_ACCEPTED', stage, smtpStatus:250, credentialsSubmitted,
     emailSent:true, emailAccepted:true, deliveryConfirmed:false, messageId,
     note:'Gmail accepted the new test message. Check your inbox and spam. Acceptance is not proof of inbox delivery. No automatic resend.'};
   }
   return {...base, state:'NATIVE_LOGIN_OK', stage:'AUTH', smtpStatus:235, credentialsSubmitted,
    note:'Gmail accepted login over native TLS. No email was sent; sending and inbox delivery remain untested.'};
  })();
  return await Promise.race([operation, timeout]);
 } catch (error) {
  const categories = new Set(['TIMEOUT','EARLY_CLOSE','INVALID_REPLY','GREETING_REJECTED','EHLO_REJECTED','AUTH_PLAIN_UNAVAILABLE','AUTH_REJECTED','AUTH_NOT_CONFIRMED','SENDER_REJECTED','RECIPIENT_REJECTED','DATA_REJECTED','MESSAGE_NOT_ACCEPTED']);
  const unknownDelivery = submissionStarted && error?.category !== 'MESSAGE_NOT_ACCEPTED';
  return {...base, state:unknownDelivery?'UNCONFIRMED':'FAILED', stage, smtpStatus, credentialsSubmitted,
   emailSent:unknownDelivery?null:false,
   category:categories.has(error?.category) ? error.category : 'CONNECTION_FAILED',
   note:unknownDelivery?'Message submission was interrupted; delivery is unknown. Check inbox and saved results. Do not resend.':'No email was accepted. Raw server responses and credentials are withheld.'};
 } finally {
  stopped = true; clearTimeout(timer);
  try {if (socket) Promise.resolve(socket.close()).catch(() => {});} catch {}
  try {if (reader) Promise.resolve(reader.cancel()).catch(() => {}).finally(() => {try {reader.releaseLock();} catch {}});} catch {}
  try {writer?.releaseLock();} catch {}
 }
}
