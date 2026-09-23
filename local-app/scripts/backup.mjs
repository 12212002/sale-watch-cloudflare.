import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const source=resolve(process.env.SALE_WATCH_DB||'data/sale-watch.sqlite');
try{await stat(source);}catch{console.error('No saved database found. Start Sale Watch and create an account first.');process.exit(1);}
await mkdir('backups',{recursive:true,mode:0o700});
const target=resolve('backups/sale-watch-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,target);console.log('Backup saved: '+target+'\nKeep it private: it contains account data and your saved products.');}finally{db.close();}
