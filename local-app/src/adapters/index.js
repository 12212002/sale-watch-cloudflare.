import {inspectIndigo} from './indigo.js';
import {inspectHollister} from './hollister.js';
import {inspectGarage} from './garage.js';
import {identify} from '../retailers.js';
import {inspectLisa} from './lisa-gozlan.js';
import {inspectBrandy} from './brandy-melville.js';
export const supported = id => ['lisa-gozlan','brandy-melville','garage','hollister','indigo'].includes(id);
export async function inspectProduct(url) { const {retailer,url:canonical}=identify(url); if(retailer.id==='lisa-gozlan')return inspectLisa(canonical); if(retailer.id==='brandy-melville')return inspectBrandy(canonical); if(retailer.id==='garage')return inspectGarage(canonical); if(retailer.id==='hollister')return inspectHollister(canonical); if(retailer.id==='indigo')return inspectIndigo(canonical); return {state:'UNAVAILABLE',reason:retailer.reason}; }
