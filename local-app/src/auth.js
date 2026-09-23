import {scrypt as scryptCallback,randomBytes,createHash,timingSafeEqual,randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {timestamp,transaction} from './db.js';
const scrypt=promisify(scryptCallback);
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function email(value){if(typeof value!=='string')throw new Error('Enter a valid email address.');const address=value.trim().toLowerCase();if(address.length>254||! /^[a-z0-9._%+-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(address))throw new Error('Enter a valid email address.');return address;}

export async function passwordHash(password){if(typeof password!=='string'||password.length<12||password.length>128)throw new Error('Use a password between 12 and 128 characters.');const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return salt+':'+key.toString('hex');}
async function verify(password,encoded){if(typeof password!=='string'||password.length>128)return false;const [salt,key]=encoded.split(':');const supplied=await scrypt(password,salt,64);return timingSafeEqual(supplied,Buffer.from(key,'hex'));}
export async function register(db,input){const address=email(input.email),encoded=await passwordHash(input.password),recovery=randomBytes(24).toString('base64url'),id=randomUUID();try{db.prepare('INSERT INTO users(id,email,password,recovery,created) VALUES(?,?,?,?,?)').run(id,address,encoded,hash(recovery),timestamp());}catch{throw new Error('Unable to create this account. Try signing in or use account recovery.');}return {id,recovery};}
export async function login(db,input){const u=db.prepare('SELECT * FROM users WHERE email=?').get(email(input.email));const fallback='00000000000000000000000000000000:'+('00'.repeat(64));const valid=await verify(input.password,u?.password||fallback);if(!u||!valid)throw Object.assign(new Error('Email or password is incorrect.'),{status:401});return u.id;}
export function session(db,id){const token=randomBytes(32).toString('base64url'),csrf=randomBytes(24).toString('base64url');db.prepare('DELETE FROM sessions WHERE expires<?').run(timestamp());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),id,csrf,timestamp()+30*86400);return {token,csrf};}
export function authenticate(db,cookie=''){const match=cookie.match(/(?:^|;\s*)sw_session=([A-Za-z0-9_-]+)/);if(!match)return null;return db.prepare('SELECT s.*,u.email,u.theme,u.email_enabled FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').get(hash(match[1]),timestamp())||null;}
export async function recover(db,input){const address=email(input.email),encoded=await passwordHash(input.password);if(typeof input.recovery!=='string'||input.recovery.length>100)throw new Error('Invalid recovery code.');const code=hash(input.recovery.trim()),newCode=randomBytes(24).toString('base64url');return transaction(db,()=>{const u=db.prepare('SELECT id,recovery FROM users WHERE email=?').get(address);if(!u||!timingSafeEqual(Buffer.from(u.recovery),Buffer.from(code)))throw new Error('Email or recovery code is incorrect.');db.prepare('UPDATE users SET password=?,recovery=? WHERE id=?').run(encoded,hash(newCode),u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);return {id:u.id,recovery:newCode};});}

export async function changePassword(db,user,input){
 const previous=db.prepare('SELECT password FROM users WHERE id=?').get(user)?.password;
 if(!previous||!await verify(input.currentPassword,previous))throw new Error('Current password is incorrect.');
 const encoded=await passwordHash(input.newPassword);
 return transaction(db,()=>{const changed=db.prepare('UPDATE users SET password=? WHERE id=? AND password=?').run(encoded,user,previous);if(!changed.changes)throw new Error('Account changed. Please sign in again.');db.prepare('DELETE FROM sessions WHERE user_id=?').run(user);});
}
