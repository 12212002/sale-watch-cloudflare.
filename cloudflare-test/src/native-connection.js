// Deliberately receives no credentials and never writes SMTP commands.
export async function probeNativeConnection(connect, {timeoutMs = 10000} = {}) {
 let socket, reader, timer, stage = 'CONNECT';
 const base = {host:'smtp.gmail.com', port:465, emailSent:false, credentialsSent:false};
 const timeout = new Promise((_, reject) => {
  timer = setTimeout(() => reject(Object.assign(new Error('timeout'), {code:'PROBE_TIMEOUT'})), timeoutMs);
 });
 try {
  const operation = (async () => {
   socket = connect({hostname:base.host, port:base.port}, {secureTransport:'on'});
   socket.closed.catch(() => {});
   await socket.opened;
   stage = 'GREETING';
   reader = socket.readable.getReader();
   const decoder = new TextDecoder();
   let text = '', bytes = 0;
   while (true) {
    const {done, value} = await reader.read();
    if (done) throw Object.assign(new Error('early close'), {code:'PROBE_EOF'});
    bytes += value.byteLength;
    if (bytes > 4096) throw Object.assign(new Error('oversize'), {code:'PROBE_PROTOCOL'});
    text += decoder.decode(value, {stream:true});
    let end;
    while ((end = text.indexOf('\r\n')) !== -1) {
     const line = text.slice(0, end);
     text = text.slice(end + 2);
     if (!/^220[ -]/.test(line)) throw Object.assign(new Error('unexpected greeting'), {code:'PROBE_PROTOCOL'});
     if (line.startsWith('220 ')) return {...base, state:'SMTP_GREETING_OK', stage, smtpStatus:220,
      note:'Native TLS connection and SMTP greeting succeeded. Login, sending and inbox delivery remain untested.'};
    }
   }
  })();
  return await Promise.race([operation, timeout]);
 } catch (error) {
  const codes = new Set(['PROBE_TIMEOUT','PROBE_EOF','PROBE_PROTOCOL']);
  return {...base, state:'FAILED', stage, category:codes.has(error?.code) ? error.code : 'CONNECTION_FAILED',
   note:'No credentials or email were sent. This result alone does not identify the cause.'};
 } finally {
  clearTimeout(timer);
  try { if (socket) Promise.resolve(socket.close()).catch(() => {}); } catch {}
  try { if (reader) Promise.resolve(reader.cancel()).catch(() => {}).finally(() => {try {reader.releaseLock();} catch {}}); } catch {}
 }
}
