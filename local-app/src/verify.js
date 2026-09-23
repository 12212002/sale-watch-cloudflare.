// Money is always integer cents. Evidence is supplied only by server-owned adapters.
export function assess(expected, observation){
 const bad=reason=>({ok:false,reason});
 if(!observation || !['VERIFIED','HIGH_CONFIDENCE'].includes(observation.state))return bad(observation?.reason||'Price could not be verified.');
 if(observation.retailer!==expected.retailer||observation.productId!==expected.productId)return bad('Product could not be verified.');
 if(!expected.variantId||observation.variantId!==expected.variantId||observation.seller!==expected.seller)return bad('Tracked variant could not be verified.');
 if(observation.currency!=='CAD')return bad('Price could not be verified: currency is not CAD.');
 if(observation.available!==true)return bad('Tracked variant is unavailable.');
 if(!Number.isSafeInteger(observation.cents)||observation.cents<=0||observation.cents>100000000)return bad('Price could not be verified.');
 const signals=observation.signals;
 if(!Array.isArray(signals)||signals.length<1)return bad('Price evidence is missing.');
 if(signals.some(s=>s.cents!==observation.cents||s.currency!=='CAD'||s.productId!==expected.productId||s.variantId!==expected.variantId||s.kind!=='selling-price'))return bad('Price signals conflict.');
 return {ok:true,sources:new Set(signals.map(s=>s.source)).size};
}
export function decide(current,pending,expected,observation,now){
 const check=assess(expected,observation);
 if(!check.ok)return {action:'reject',reason:check.reason};
 if(current===null)return {action:'baseline'};
 if(observation.cents>=current)return {action:observation.cents===current?'same':'increase'};
 const extreme=observation.cents<=current/2;
 const confirmed=pending&&pending.cents===observation.cents&&now-pending.at>=300&&now-pending.at<=21600;
 if(!confirmed||(extreme&&check.sources<2))return {action:'pending',reason:extreme?'Large decrease needs a later check and two agreeing price signals.':'Price decrease awaiting a separate confirmation check.'};
 return {action:'drop'};
}

export function verifiedRegular(expected,o){
 const cents=o?.regularCents,signals=o?.regularSignals;
 if(!assess(expected,o).ok||!Number.isSafeInteger(cents)||cents<o.cents||cents>100000000||!Array.isArray(signals)||signals.length<1)return null;
 if(signals.some(s=>s.kind!=='regular-price'||s.cents!==cents||s.currency!=='CAD'||s.productId!==expected.productId||s.variantId!==expected.variantId||typeof s.source!=='string'||!s.source))return null;
 return cents;
}
