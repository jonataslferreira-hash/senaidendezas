import {loadCustomFont,readCustomFont,customFontData} from './custom-fonts.js';
import {storePages} from './assets.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const system=['Arial','Verdana','Georgia','Times New Roman','Courier New','Trebuchet MS','Tahoma'];
const loaded=new Map();let catalog;
export const fontCatalog=()=>catalog||=fetch(new URL('./font-catalog.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Não foi possível abrir o catálogo de fontes.');return r.json();});
export function loadFont(family){
 if(system.includes(family)||!family||loaded.has(family))return loaded.get(family)||Promise.resolve();
 const promise=fontCatalog().then(async list=>{if(!list.some(f=>f.family===family))return;await new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(family)+'&display=swap';link.onload=resolve;link.onerror=()=>reject(Error('A fonte não carregou. Confira a conexão.'));document.head.append(link);});await document.fonts.load(`24px "${family.replace(/["\\]/g,'')}"`);});
 loaded.set(family,promise);promise.catch(()=>loaded.delete(family));return promise;
}
const importedWebFonts=new Map();
export function fontAvailable(family,context){
 const safe=family.replace(/["\\]/g,''),sample='mmmmmmmmWWlli0123';
 if(!document.fonts.check(`12px "${safe}"`))return false;
 return ['monospace','serif','sans-serif'].some(base=>{
  context.font='72px '+base;
  const fallback=context.measureText(sample).width;
  context.font=`72px "${safe}",${base}`;
  return Math.abs(context.measureText(sample).width-fallback)>.1;
 });
}
export function loadPptxFont(family){
 if(!/^[\p{L}\p{N} ._-]{1,100}$/u.test(family)||navigator.onLine===false)return Promise.resolve('');
 if(importedWebFonts.has(family))return importedWebFonts.get(family);
 const task=(async()=>{
  const signal=AbortSignal.timeout(6000);
  for(const variants of [':ital,wght@0,400;0,700;1,400;1,700',':wght@400;700','']){
   const url=new URL('https://fonts.googleapis.com/css2');
   url.searchParams.set('family',family+variants);
   const response=await fetch(url,{signal});
   if(!response.ok)continue;
   const css=await response.text();
   const blocks=[...css.matchAll(/@font-face\s*\{([^{}]+)\}/g)].map(match=>match[1]).filter(block=>{
    const name=/font-family:\s*['"]([^'"]+)['"]/.exec(block)?.[1];
    return name?.toLowerCase()===family.toLowerCase();
   });
   if(!blocks.length)continue;
   const files=new Map();
   const rules=await Promise.all(blocks.map(async block=>{
    const source=/url\(\s*['"]?(https:\/\/fonts\.gstatic\.com\/[\w./%-]+)['"]?\s*\)/.exec(block)?.[1];
    if(!source)return '';
    if(!files.has(source))files.set(source,(async()=>{
     const response=await fetch(source,{signal});
     if(!response.ok)throw Error('Fonte indisponível');
     const blob=await response.blob();
     if(blob.size>1_000_000)throw Error('Fonte muito grande');
     return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=reject;
      reader.readAsDataURL(blob);
     });
    })());
    return '@font-face{'+block.replace(source,await files.get(source))+'}';
   }));
   const inline=rules.filter(Boolean).join('\n');
   if(!inline)continue;
   const style=document.createElement('style');
   style.textContent=inline;
   document.head.append(style);
   try{
    if((await document.fonts.load(`24px "${family}"`)).length)return inline;
   }catch{}
   style.remove();
  }
  return '';
 })().catch(()=>'');
 importedWebFonts.set(family,task);
 task.then(css=>{if(!css)importedWebFonts.delete(family);});
 return task;
}
export function loadSlideFonts(slide,customFonts=[]){
 const families=new Set((slide?.elements||[]).filter(element=>element.type==='text').map(element=>element.fontFamily));
 const pptx=slide?.sourceType==='pptx';
 const measure=pptx?document.createElement('canvas').getContext('2d'):null;
 return Promise.allSettled([...families].map(family=>{
  const custom=customFonts.find(font=>font.family===family);
  if(custom)return loadCustomFont(custom);
  if(pptx)return family&&!fontAvailable(family,measure)?loadPptxFont(family):Promise.resolve();
  return loadFont(family);
 }));
}
const embeddedFonts=new Map();
async function pptxFontCSS(slide,customFonts){
 const families=new Set(slide.elements.filter(element=>element.type==='text').map(element=>element.fontFamily));
 const rules=await Promise.all([...families].map(async family=>{
  const font=customFonts.find(font=>font.family===family);
  if(font)return `@font-face{font-family:"${font.family}";src:url(${await customFontData(font)});}`;
  return importedWebFonts.get(family)||'';
 }));
 return rules.filter(Boolean).join('\n');
}
export async function slideFontCSS(slide,customFonts=[]){if(slide.sourceType==='pptx')return pptxFontCSS(slide,customFonts);const fonts=[...new Set((slide.elements||[]).filter(e=>e.type==='text').map(e=>e.fontFamily))].filter(f=>f&&!system.includes(f)),catalog=fonts.length?await fontCatalog():[];const customCSS=await Promise.all(customFonts.filter(f=>fonts.includes(f.family)).map(async f=>`@font-face{font-family:"${f.family}";src:url(${await customFontData(f)});}`));return customCSS.join('\n')+(await Promise.all(fonts.filter(f=>catalog.some(c=>c.family===f)).map(f=>{if(!embeddedFonts.has(f))embeddedFonts.set(f,(async()=>{const response=await fetch('https://fonts.googleapis.com/css2?family='+encodeURIComponent(f)+'&display=swap',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Não foi possível incorporar a fonte '+f);let css=await response.text();for(const url of [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))]){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('A fonte '+f+' não pôde ser incorporada.');const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));css=css.split(url).join('data:font/woff2;base64,'+btoa(binary));}return css;})());return embeddedFonts.get(f);}))).join('\n');}
export function fontButton(element,customFonts=[]){return `<button type="button" class="font-choose" data-font-action="open" style="font-family:'${esc(element.fontFamily||'Arial')}',sans-serif">${esc(customFonts.find(f=>f.family===element.fontFamily)?.name||element.fontFamily||'Arial')} ▾</button>`;}
export function recommendFonts(slide,element){const text=(slide.title+' '+(slide.elements||[]).map(e=>e.text||'').join(' ')).toLowerCase();if(/hdd|ssd|tecnolog|comput|armazen|circuit|program/.test(text))return ['Inter','Space Grotesk','IBM Plex Sans','Manrope','Roboto'];if(/história|literatura|poema|conto|filosof/.test(text))return ['Lora','Merriweather','Libre Baskerville','Source Serif 4','Literata'];if(/criança|infantil|brinc|jogo/.test(text))return ['Nunito','Quicksand','Baloo 2','Fredoka','Rubik'];return element?.role==='title'?['Outfit','Montserrat','DM Sans','Poppins','Sora']:['Atkinson Hyperlegible','Source Sans 3','Noto Sans','Open Sans','Roboto'];}
export class FontPicker{
 constructor(studio){this.studio=studio;studio.root.addEventListener('click',e=>{if(e.target.closest('[data-font-action]'))this.open().catch(err=>studio.callbacks.toast(err.message));});}
 async open(){
  if(this.studio.groups?.live&&!this.studio.groups.canEdit)throw Error('Você não tem permissão para editar esta aula.');if(this.dialog?.open)return;const studio=this.studio,source=studio.designer.original,lessonId=studio.draft.id,id=studio.designer.selected,ids=new Set(studio.designer.selectionIds()),fonts=await fontCatalog(),dialog=document.createElement('dialog');this.dialog=dialog;dialog.className='font-dialog';let query='';const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  dialog.innerHTML='<header><h2>Escolher fonte</h2><button type="button" data-close aria-label="Fechar fontes">×</button></header><div class="font-search-row"><input id="font-search" aria-label="Buscar fonte" type="search" placeholder="Buscar fonte"><button type="button" data-upload-font>＋ Adicionar sua fonte</button><input type="file" accept=".ttf,.otf,.woff,.woff2" hidden data-font-file></div><div class="font-scroll"><section class="font-recommendations"><h3>Recomendadas para este slide</h3><div class="font-results font-recommended"></div></section><section class="font-own" hidden><h3>Suas fontes</h3><div class="font-results font-custom"></div></section><section><h3>Todas as fontes</h3><div class="font-results font-all"></div></section></div><p role="status" class="font-error" hidden></p>';
  const scroll=dialog.querySelector('.font-scroll'),observe=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const family=entry.target.dataset.family,custom=studio.draft.customFonts?.find(f=>f.family===family);(custom?loadCustomFont(custom):loadFont(family)).catch(()=>{});observe.unobserve(entry.target);}},{root:scroll,rootMargin:'150px'});
  const cards=list=>list.map(f=>`<button type="button" data-family="${esc(f.family)}" style="font-family:'${esc(f.family)}',sans-serif"><strong>${esc(f.name||f.family)}</strong><span>Ação, ciência e coração.<br>À É Í Ó Ú · ç ã õ</span></button>`).join('');
  const paint=()=>{observe.disconnect();const list=[...system.map(family=>({family})),...fonts].filter(f=>f.family.toLocaleLowerCase().includes(query.toLocaleLowerCase())),own=(studio.draft.customFonts||[]).filter(f=>f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())),recommended=recommendFonts(studio.designer.display(),studio.designer.display().elements.find(e=>e.id===id)).map(family=>({family}));dialog.querySelector('.font-all').innerHTML=cards(list);dialog.querySelector('.font-custom').innerHTML=cards(own);dialog.querySelector('.font-own').hidden=!own.length;dialog.querySelector('.font-recommendations').hidden=Boolean(query);dialog.querySelector('.font-recommended').innerHTML=query?'':cards(recommended);scroll.scrollTop=0;for(const node of dialog.querySelectorAll('[data-family]'))observe.observe(node);};
  dialog.querySelector('#font-search').oninput=e=>{query=e.target.value;paint();};dialog.querySelector('[data-font-file]').onchange=async e=>{const input=e.target;try{if(studio.draft.customFonts?.length>=12)throw Error('Use até 12 fontes próprias por aula.');const font=await readCustomFont(input.files[0]);if(studio.draft?.id!==lessonId||studio.designer.original.id!==source.id||!dialog.open)return;const [assetId]=await storePages([font.data]);studio.draft.customFonts||=[];studio.draft.customFonts.push({...font,data:'',assetId});studio.markDirty();query='';dialog.querySelector('#font-search').value='';paint();dialog.querySelector('.font-own').scrollIntoView({block:'nearest'});}catch(error){const status=dialog.querySelector('[role=status]');status.hidden=false;status.textContent=error.message;}finally{input.value='';}};
  dialog.addEventListener('click',e=>{if(e.target.closest('[data-close]'))dialog.close();if(e.target.closest('[data-upload-font]'))dialog.querySelector('[data-font-file]').click();const family=e.target.closest('[data-family]')?.dataset.family;if(family){if(studio.draft?.id===lessonId&&studio.designer.original.id===source.id)studio.designer.mutate(s=>{for(const element of s.elements)if(ids.has(element.id)&&element.type==='text'&&!element.locked)element.fontFamily=family;});dialog.close();}});
  dialog.addEventListener('close',()=>{observe.disconnect();document.body.style.overflow=previousOverflow;dialog.remove();this.dialog=null;},{once:true});document.body.append(dialog);dialog.showModal();paint();
 }
}
