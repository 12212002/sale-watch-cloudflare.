// Explicit opt-in live check. Temporary in-memory accounts only; never sends email.
import {createApp} from '../src/server.js';import {openDB} from '../src/db.js';
const db=openDB(':memory:'),origin='http://127.0.0.1:4188',server=createApp({db,origin});await new Promise(r=>server.listen(4188,'127.0.0.1',r));let cookie,csrf;
const urls=[
'https://www.indigo.ca/products/embossed-bookshop-mug-fall-edition',
'https://www.indigo.ca/products/spiral-journal-lucky-thoughts',
'https://www.indigo.ca/products/lego%C2%AE-rocking-plants-11506',
'https://www.indigo.ca/products/a-potato-on-a-bike?variant=46162752798897',
'https://www.hollisterco.com/shop/ca/p/boxy-hoodie-57373823?categoryId=166245&faceout=life&seq=15&afsource=social+proofing&gridProductPosition=5&sw_sku=673016138',
'https://www.hollisterco.com/shop/ca/p/oversized-long-sleeve-freya-skye-graphic-tee-63678339?seq=01&sw_sku=674065020',
'https://www.indigo.ca/products/a-potato-on-a-bike?variant=46162752766129',
'https://www.lisagozlan.com/products/br046?variant=50370367619378',
'https://ca.brandymelville.com/products/copy-of-bonnie-top-july-2022-ok?variant=46165653160132',
'https://ca.brandymelville.com/products/priscilla-pants-1?variant=46611971113156',
'https://www.garageclothing.com/ca/p/ultrafleece-hoodie/1000922018US.html?dwvar_1000922018US_color=8US&dwvar_1000922018US_size=S%2FM',
'https://www.garageclothing.com/ca/p/ultrafleece-hoodie/1000922018RN.html?dwvar_1000922018RN_size=S%2FM'
];
try{
const api=async(path,body)=>{const response=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie||'','X-CSRF-Token':csrf||''},body:body?JSON.stringify(body):undefined});const data=await response.json();if(path==='/register'){cookie=response.headers.get('set-cookie').split(';')[0];csrf=data.csrf;}if(!response.ok)throw Error(JSON.stringify(data));return data;};
await api('/register',{email:'integration@example.com',password:'temporary-integration-only-password'});const results=[];
for(const url of urls.filter(u=>!process.argv[2]||u.includes(process.argv[2]))){const preview=await api('/inspect',{url});if(preview.state!=='VERIFIED'){results.push({url,state:preview.state,reason:preview.reason});continue;}const added=await api('/products',{previewToken:preview.previewToken,image:preview.imageUrl||''});const data=await api('/dashboard'),history=await api('/products/'+added.id+'/history'),product=data.products.find(p=>p.id===added.id);results.push({url,state:'VERIFIED',verifiedCAD:product.current/100,variant:product.variant,historyEntries:history.observations.length});}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),stages:['register','authenticated inspect','server-owned preview','save baseline','private dashboard','private history'],results},null,2));if(results.some(r=>r.url.includes('1000922018RN')?r.state!=='UNCERTAIN':r.state!=='VERIFIED'))process.exitCode=1;
}finally{server.close();db.close();}
