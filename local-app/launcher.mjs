import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const folder=fileURLToPath(new URL('.',import.meta.url));
if(Number(process.versions.node.split('.')[0])<24){console.error('Sale Watch requires Node.js 24 or later.');process.exit(1);}
const server=spawn(process.execPath,['src/server.js'],{cwd:folder,stdio:['inherit','pipe','inherit']});let opened=false;
server.stdout.on('data',chunk=>{process.stdout.write(chunk);if(!opened&&chunk.toString().includes('Sale Watch development server:')){opened=true;const url='http://127.0.0.1:4173';let browser;if(process.platform==='win32')browser=spawn('cmd',['/c','start','',url],{stdio:'ignore'});else browser=spawn(process.platform==='darwin'?'open':'xdg-open',[url],{stdio:'ignore'});browser.on('error',()=>console.log('Open '+url+' in your browser.'));}});
server.on('exit',code=>process.exit(code||0));process.on('SIGINT',()=>server.kill('SIGINT'));process.on('SIGTERM',()=>server.kill('SIGTERM'));
