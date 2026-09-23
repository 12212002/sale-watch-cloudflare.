export function safeDetails(error) {
 const allowed=new Set(['EAUTH','ETIMEDOUT','ESOCKET','ECONNECTION','EDNS','ECONNREFUSED','ECONNRESET','ENOTFOUND','EAI_AGAIN','ETLS','EPROTOCOL']);
 const stage=String(error?.command||'').split(' ')[0];
 const message=String(error?.message||'');
 return {code:allowed.has(error?.code)?error.code:'OTHER',stage:['CONN','EHLO','HELO','STARTTLS','AUTH'].includes(stage)?stage:'UNKNOWN',smtpStatus:Number.isInteger(error?.responseCode)&&error.responseCode>=400&&error.responseCode<=599?error.responseCode:null,category:/not implemented|not supported|unsupported/i.test(message)?'RUNTIME_UNSUPPORTED':/certificate/i.test(message)?'TLS_CERTIFICATE':/timeout|timed out/i.test(message)?'TIMEOUT':'UNCLASSIFIED'};
}
export async function diagnose(env,createTransport){
 const results=[];
 for(const port of [465,587]){
  let client;
  try{
   client=createTransport({host:'smtp.gmail.com',port,secure:port===465,requireTLS:port===587,auth:{user:env.GMAIL_ADDRESS,pass:env.GMAIL_APP_PASSWORD},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},logger:false,debug:false});
   await client.verify();
   results.push({port,state:'CONNECTION_AND_LOGIN_OK',note:'No email sent. Inbox delivery remains untested on this connection.'});
  }catch(error){results.push({port,state:'FAILED',...safeDetails(error)});}
  finally{client?.close();}
 }
 return {state:'DIAGNOSTIC_COMPLETE',emailSent:false,results};
}
