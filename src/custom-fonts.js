import { createUuid } from './uuid.js';
import {getPageImage} from './assets.js';
const MAX=4*1024*1024,loaded=new Map();
export function validateCustomFonts(input){
 if(input==null)return [];if(!Array.isArray(input)||input.length>12)throw Error('Use até 12 fontes próprias por aula.');const families=new Set();
 return input.map(f=>{if(!f||!/^SLFont-[a-f0-9-]{36}$/i.test(f.family)||families.has(f.family))throw Error('Fonte própria inválida.');families.add(f.family);const data=typeof f.data==='string'?f.data:'',assetId=f.assetId||'';if(data&&(!/^data:font\/(ttf|otf|woff|woff2);base64,[A-Za-z0-9+/=]+$/.test(data)||data.length>Math.ceil(MAX*4/3)+100))throw Error('Use fontes TTF, OTF, WOFF ou WOFF2 de até 4 MB.');if(assetId&&!/^asset-[a-f0-9-]{36}$/i.test(assetId))throw Error('Referência de fonte inválida.');if(!data&&!assetId)throw Error('O arquivo da fonte está ausente.');return {family:f.family,name:String(f.name||'Minha fonte').replace(/["'<>;{}\\]/g,'').slice(0,80),data,...(assetId?{assetId}:{})};});
}
export async function customFontData(font){return font.data||await getPageImage(font.assetId);}
export function loadCustomFont(font){const key=font.family;if(!loaded.has(key)){const promise=(async()=>{const data=await customFontData(font),face=await new FontFace(font.family,`url(${data})`).load();document.fonts.add(face);return face;})();loaded.set(key,promise);promise.catch(()=>loaded.delete(key));}return loaded.get(key);}
export async function readCustomFont(file){
 const extension=file?.name.split('.').pop().toLowerCase();if(!['ttf','otf','woff','woff2'].includes(extension)||!file.size||file.size>MAX)throw Error('Escolha TTF, OTF, WOFF ou WOFF2 de até 4 MB.');const bytes=new Uint8Array(await file.arrayBuffer()),signature=String.fromCharCode(...bytes.slice(0,4));if(!['OTTO','wOFF','wOF2','true'].includes(signature)&&!bytes.slice(0,4).every((v,i)=>v===[0,1,0,0][i]))throw Error('Este arquivo não é uma fonte reconhecida.');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const font={family:'SLFont-'+createUuid(),name:file.name.replace(/\.[^.]+$/,'').replace(/["'<>;{}\\]/g,'').slice(0,80),data:`data:font/${extension};base64,${btoa(binary)}`};await loadCustomFont(font).catch(()=>{throw Error('O navegador não conseguiu abrir essa fonte.');});return font;
}
