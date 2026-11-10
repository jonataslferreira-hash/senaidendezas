import {simulationMarkup,simulationNames} from './simulations.js';
import {canvasFromSlide} from './canvas-data.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Older lessons use structured fields. Present them through the same canvas as
// visual slides, without rewriting the saved lesson or changing object IDs.
export function presentationSlide(slide){
 if(['canvas','document'].includes(slide.kind))return slide;
 const result=canvasFromSlide(slide);
 return {...result,elements:result.elements.map((e,i)=>({...e,id:'legacy-'+i,...(e.type==='text'&&e.role!=='title'?{fontSize:22,y:37,h:57}:{}),...(e.role==='title'?{fontSize:48,y:9,h:25}:{})}))};
}
export function mobileResources(slide){
 if(slide.kind==='document')return [{...slide,id:'page',type:'image'}];
 return (presentationSlide(slide).elements||[]).filter(e=>['image','model','simulation'].includes(e.type));
}
export function mobileResource(slide){
 const items=mobileResources(slide),focus=slide.mobileFocus||'auto';
 if(focus==='text')return null;
 if(focus.startsWith('element:')){const chosen=items.find(e=>e.id===focus.slice(8));if(chosen)return chosen;}
 return items.find(e=>['model','simulation'].includes(e.type))||items.filter(e=>!e.locked).sort((a,b)=>b.w*b.h-a.w*a.h)[0]||items[0]||null;
}
export function mobileChoice(slide,{live=false}={}){
 const options=[['auto','Automático: priorizar modelo ou imagem'],['text','Somente texto'],...mobileResources(slide).map((e,i)=>['element:'+e.id,e.type==='simulation'?'Simulação · '+simulationNames[e.simulation]:e.type==='model'?'Modelo 3D · '+(e.model==='custom'?'Meu modelo':e.model.toUpperCase()):'Imagem '+(i+1)+' · '+(e.imageAlt||'Sem descrição').slice(0,65)])];
 return `<div class="editor-field mobile-choice"><label for="${live?'live-':''}mobile-focus">Conteúdo no celular</label><select id="${live?'live-':''}mobile-focus" ${live?'data-live-field="mobileFocus"':'data-scope="slide" data-field="mobileFocus"'}>${options.map(([value,label])=>`<option value="${esc(value)}" ${(slide.mobileFocus||'auto')===value?'selected':''}>${esc(label)}</option>`).join('')}</select><small>No computador, o slide completo continua aparecendo. No celular, este conteúdo ganha espaço para leitura e interação.</small></div>`;
}
export function mobileMarkup(slide){
 const resource=mobileResource(slide),texts=slide.kind==='canvas'?(slide.elements||[]).filter(e=>e.type==='text'&&e.role!=='title'&&e.text!==slide.title).map(e=>e.text):[slide.intro,...(slide.points||[]),slide.callout].filter(Boolean);
 return `<section class="mobile-lesson-content"><div class="mobile-topic"><span class="eyebrow">${esc(slide.tag)}</span><h1>${esc(slide.title)}</h1></div>${resource?resource.type==='simulation'?simulationMarkup(resource.simulation):resource.type==='model'?`<section class="mobile-model" aria-label="Modelo 3D deste slide"><div class="mobile-model-slot" data-canvas-model="${esc(resource.id)}"></div>${resource.model!=='custom'?`<button class="btn secondary" data-canvas-explode="${esc(resource.id)}">Abrir ou fechar camadas</button>`:''}<p>Arraste para girar · toque nas peças para explorar</p></section>`:`<figure class="mobile-slide-image"><img ${resource.image?'src="'+esc(resource.image)+'"':resource.assetId?'data-asset-id="'+esc(resource.assetId)+'"':''} alt="${esc(resource.imageAlt||slide.title)}">${resource.imageAlt?`<figcaption>${esc(resource.imageAlt)}</figcaption>`:''}</figure>`:''}<div class="mobile-reading">${texts.map(t=>`<p>${esc(t)}</p>`).join('')}</div></section>`;
}
