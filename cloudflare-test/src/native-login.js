import {validMail} from './core.js';

// Login diagnostic only. There is deliberately no MAIL FROM, RCPT TO or DATA path.
export async function probeNativeLogin(connect, env, {timeoutMs = 15000} = {}) {
 const base = {host:'smtp.gmail.com', port:465, emailSent:false};
 if (!validMail(env)) return {...base, state:'FAILED', stage:'CONFIG', category:'INVALID_CONFIGURATION', credentialsSubmitted:false};
 let socket, reader, writer, timer, stopped = false, stage = 'CONNECT', smtpStatus = null, credentialsSubmitted = false;
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
   return {...base, state:'NATIVE_LOGIN_OK', stage:'AUTH', smtpStatus:235, credentialsSubmitted,
    note:'Gmail accepted login over native TLS. No email was sent; sending and inbox delivery remain untested.'};
  })();
  return await Promise.race([operation, timeout]);
 } catch (error) {
  const categories = new Set(['TIMEOUT','EARLY_CLOSE','INVALID_REPLY','GREETING_REJECTED','EHLO_REJECTED','AUTH_PLAIN_UNAVAILABLE','AUTH_REJECTED','AUTH_NOT_CONFIRMED']);
  return {...base, state:'FAILED', stage, smtpStatus, credentialsSubmitted,
   category:categories.has(error?.category) ? error.category : 'CONNECTION_FAILED',
   note:'No email was sent. Raw server responses and credentials are withheld.'};
 } finally {
  stopped = true; clearTimeout(timer);
  try {if (socket) Promise.resolve(socket.close()).catch(() => {});} catch {}
  try {if (reader) Promise.resolve(reader.cancel()).catch(() => {}).finally(() => {try {reader.releaseLock();} catch {}});} catch {}
  try {writer?.releaseLock();} catch {}
 }
}
