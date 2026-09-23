import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
if(!process.stdin.isTTY){console.error('Open this setup in a terminal on your own computer. Never paste an app password into chat.');process.exit(1);}
let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk);done();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
try{
 console.log('Sale Watch email setup\nUse a free personal @gmail.com account with 2-Step Verification and a Google app password.\nNo Workspace subscription, credit card, purchased domain or paid email plan is required.\nSale Watch caps all email attempts at 80 per rolling 24 hours. Google may block sends sooner.\nThis setup sends no email. Your address will appear as the sender of alerts.');
 const address=(await rl.question('Gmail address: ')).trim().toLowerCase();if(!/^[A-Za-z0-9._%+-]+@gmail\.com$/.test(address))throw Error('Use a personal @gmail.com address.');
 process.stdout.write('Google app password (hidden): ');muted=true;const appPassword=(await rl.question('')).replace(/\s/g,'');muted=false;console.log();if(!/^[a-zA-Z0-9]{16}$/.test(appPassword))throw Error('Expected a 16-character Google app password, not your normal password.');
 await mkdir('data',{recursive:true,mode:0o700});await writeFile('data/email.json',JSON.stringify({enabled:true,address,appPassword})+'\n',{mode:0o600});await chmod('data/email.json',0o600);
 console.log('Saved locally. Restart Sale Watch, open Settings, verify your notification address, then enable alerts. Keep the data folder private.');
}catch(e){muted=false;console.error(e.message);process.exitCode=1;}finally{rl.close();}
