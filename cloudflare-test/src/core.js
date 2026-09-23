export const PRODUCT_URL='https://www.hollisterco.com/shop/ca/p/at-the-knee-baggy-fleece-shorts-62601323?seq=10&sw_sku=666191202';
export function safeMailError(error) {
 if(error?.code==='EAUTH') return 'Gmail rejected the login. Check the Gmail address and app password.';
 if(['ETIMEDOUT','ESOCKET','ECONNECTION','EDNS'].includes(error?.code)) return 'The email connection failed. Cloudflare network/runtime compatibility still needs verification.';
 return 'Email delivery was not confirmed. No automatic retry will be made.';
}
export function validMail(env) {return /^[A-Za-z0-9._%+-]+@gmail\.com$/.test(env.GMAIL_ADDRESS||'')&&/^[A-Za-z0-9]{16}$/.test(env.GMAIL_APP_PASSWORD||'');}
export async function claim(db,kind){const r=await db.prepare("INSERT OR IGNORE INTO attempts(kind,at,result) VALUES(?,?,?)").bind(kind,Date.now(),JSON.stringify({state:'STARTED',note:'An interrupted attempt may remain STARTED; do not assume success.'})).run();return r.meta.changes===1;}
export async function finish(db,kind,result){await db.prepare('UPDATE attempts SET result=? WHERE kind=?').bind(JSON.stringify(result),kind).run();return result;}
