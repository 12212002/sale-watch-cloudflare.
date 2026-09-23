// Option names and values come from this exact product, never guessed from titles.
export function shopifyChoices(json,selectedVariant,{physicalBooks=false}={}){
 const variants=(Array.isArray(json.variants)?json.variants:[]).map(v=>{const supported=!physicalBooks||(v.requires_shipping===true&&/^\d{13}$/.test(v.sku||''));return {id:String(v.id),name:String(v.title),values:Array.isArray(v.options)?v.options:[v.option1,v.option2,v.option3].filter(x=>typeof x==='string'),available:v.available===true&&!v.requires_selling_plan&&supported,availability:!supported?'unsupported':v.available===true&&!v.requires_selling_plan?'confirmed':'unknown',supported};});
 const dimensions=(json.options||[]).map((o,i)=>({name:(typeof o==='string'?o:o.name)||'Option '+(i+1)})).map(o=>({...o,name:o.name==='Color'?'Colour':o.name==='Format'?'Edition / format':o.name}));
 const valid=dimensions.length>0&&variants.every(v=>v.values.length===dimensions.length);
 return {title:json.title,selectedVariant:String(selectedVariant||''),variantParam:'variant',variants,...(valid?{dimensions}:{} )};
}
