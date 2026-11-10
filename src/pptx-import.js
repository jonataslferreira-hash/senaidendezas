import * as pptx from '@office-kit/pptx';
import {renderSlideToSvg} from '@office-kit/pptx-preview';
import {newSlide} from './lessons.js';
import {newElement} from './canvas-data.js';
import {MAX_AUDIO_BYTES} from './audio-data.js';
export const pptxEffects=['appear','fadeIn','fadeOut','floatIn','flyIn','flyOut','splitIn','wipeIn','zoomIn'];
function fontAvailable(family,ctx){
 const safe=family.replace(/["\\]/g,''),sample='mmmmmmmmWWlli0123';if(!document.fonts.check(`12px "${safe}"`))return false;
 return ['monospace','serif','sans-serif'].some(base=>{ctx.font='72px '+base;const fallback=ctx.measureText(sample).width;ctx.font=`72px "${safe}",${base}`;return Math.abs(ctx.measureText(sample).width-fallback)>.1;});
}
const wait=()=>new Promise(r=>setTimeout(r,0));
function audioDataUrl(media){
 const mime=({ 'audio/mpeg':'mpeg','audio/mp3':'mp3','audio/wav':'wav','audio/x-wav':'x-wav','audio/ogg':'ogg','audio/mp4':'mp4','audio/x-m4a':'mp4','audio/aac':'aac','audio/webm':'webm' })[media.contentType?.toLowerCase()];
 if(!mime)throw Error('Formato de áudio incorporado não suportado: '+(media.contentType||'desconhecido'));
 let binary='';for(let i=0;i<media.bytes.length;i+=8192)binary+=String.fromCharCode(...media.bytes.subarray(i,i+8192));
 return `data:audio/${mime};base64,${btoa(binary)}`;
}
async function mediaDuration(media){
 const url=URL.createObjectURL(new Blob([media.bytes],{type:media.contentType})),audio=new Audio();
 try{return await new Promise(resolve=>{const timer=setTimeout(()=>resolve(0),3000);audio.onloadedmetadata=()=>{clearTimeout(timer);resolve(Number.isFinite(audio.duration)?audio.duration:0)};audio.onerror=()=>{clearTimeout(timer);resolve(0)};audio.preload='metadata';audio.src=url;});}
 finally{audio.src='';URL.revokeObjectURL(url);}
}
// Hyperlinks are not external pictures. Rasterized SVG never needs live links.
export function cleanPptxSvg(svg){
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Não foi possível ler o desenho de um slide.');
 for(const node of doc.querySelectorAll('script,foreignObject,iframe,object,embed'))node.remove();
 for(const node of doc.querySelectorAll('*'))for(const attr of [...node.attributes]){
  if(/^on/i.test(attr.name))node.removeAttribute(attr.name);
  if(attr.localName==='href'){
   if(node.localName==='a')node.removeAttributeNode(attr);
   else if(!attr.value.startsWith('#')&&!/^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/i.test(attr.value))throw Error('Este slide contém uma imagem vinculada fora do PPTX. Incorpore essa imagem no PowerPoint e importe novamente.');
  }
 }
 return doc;
}
async function raster(svg,width,height){
 const scale=Math.min(1920/width,1920/height,2),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const image=new Image();image.src=url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);for(const quality of [.94,.85,.7,.5]){const data=canvas.toDataURL('image/webp',quality);if(data.length<1900000)return data;}throw Error('Um objeto do PPTX é grande demais para importar.');}finally{URL.revokeObjectURL(url);canvas.width=canvas.height=0;}
}
export async function editablePptx(bytes,{signal,progress}){
 const pres=await pptx.loadPresentation(bytes,{limits:{maxEntries:10000,maxTotalUncompressedBytes:150*1024*1024,maxXmlPartBytes:8*1024*1024,maxTotalXmlBytes:40*1024*1024}}),slides=pptx.getSlides(pres),size=pptx.getSlideSize(pres);
 if(!slides.length||slides.length>80)throw Error('Importe um arquivo com 1 a 80 slides.');
 const measure=document.createElement('canvas').getContext('2d'),result=[];
 for(const [index,source] of slides.entries()){
  signal?.throwIfAborted();await wait();progress(index,slides.length);
  const warnings=new Set(),svg=renderSlideToSvg(pres,source,{textLayout:'svg',resolveFamily:family=>family||'Arial',measureText:(text,spec)=>{measure.font=`${spec.italic?'italic ':''}${spec.bold?'bold ':''}${spec.sizePx}px "${spec.family.replace(/["\\]/g,'')}"`;const m=measure.measureText(text);return{widthPx:m.width,ascentPx:m.fontBoundingBoxAscent||spec.sizePx*.8,descentPx:m.fontBoundingBoxDescent||spec.sizePx*.2};}}),doc=cleanPptxSvg(svg),root=doc.documentElement;
  const view=root.getAttribute('viewBox').split(/\s+/).map(Number),width=view[2],height=view[3],elements=[];
  const preview=await raster(new XMLSerializer().serializeToString(root),320,180);
  const shapes=pptx.getSlideShapes(source);if(shapes.length>39)throw Error(`O slide ${index+1} tem mais de 39 objetos. Divida-o antes de importar para o editor.`);
  const mediaShapes=shapes.map(shape=>({shape,media:pptx.getShapeMedia(shape)})).filter(entry=>entry.media?.kind==='audio');
  let slideAudio=null;
  if(mediaShapes.length){
   const {shape,media}=mediaShapes[0];
   if(media.bytes.length>MAX_AUDIO_BYTES)warnings.add('O áudio incorporado excede 8 MB e não foi importado. Reduza o arquivo e importe novamente.');
   else try{
    const playback=pptx.getShapeMediaPlayback(shape),name=media.partName.split('/').pop().replace(/\.[^.]+$/,'')||`Áudio do slide ${index+1}`;
    slideAudio={name,data:audioDataUrl(media),duration:await mediaDuration(media),volume:playback?.volume??.45,loop:Boolean(playback?.loop),rate:1,...(playback?.slideCount>1?{continueAcrossSlides:true,continueSlides:playback.slideCount}:{})};
   }catch{warnings.add('O formato de áudio incorporado não é compatível com o player.');}
   if(mediaShapes.length>1)warnings.add('Este slide contém vários áudios; foi importado apenas o primeiro.');
  }
  const groups=new Map([...root.querySelectorAll('[data-pptx-shape-id]')].map(g=>[Number(g.getAttribute('data-pptx-shape-id')),g]));
  const serialize=node=>new XMLSerializer().serializeToString(node);
  for(const shape of shapes){
   signal?.throwIfAborted();const id=pptx.getShapeId(shape),group=groups.get(id),bounds=pptx.getShapeBoundsResolved(pres,shape);if(pptx.getShapeMedia(shape)?.kind==='audio'){group?.remove();continue;}if(!group||!bounds){warnings.add('Há objetos que o renderizador não conseguiu posicionar.');continue;}
   const pos={x:bounds.x/size.width*100,y:bounds.y/size.height*100,w:bounds.w/size.width*100,h:bounds.h/size.height*100};
   if(group.querySelector('image[href^="data:image/gif"]'))warnings.add('Uma imagem GIF entrou como quadro estático.');
   const text=pptx.getShapeText(shape)||'',kind=pptx.getShapeKind(shape),xml=pptx.getShapeXmlString(shape),plain=kind==='shape'&&text;
   if(plain){
    const geometry=group.cloneNode(true);for(const textNode of geometry.querySelectorAll('text'))textNode.remove();if([...geometry.querySelectorAll('rect,path,ellipse,circle,polygon,line')].some(n=>['fill','stroke'].some(k=>n.hasAttribute(k)&&n.getAttribute(k)!=='none'))){const layer=root.cloneNode(false);for(const defs of root.querySelectorAll(':scope>defs'))layer.append(defs.cloneNode(true));layer.append(geometry);const px=width/size.width,py=height/size.height;layer.setAttribute('viewBox',`${bounds.x*px} ${bounds.y*py} ${bounds.w*px} ${bounds.h*py}`);elements.push(newElement('image',{id:'pptx-shape-bg-'+id,...pos,image:await raster(serialize(layer),bounds.w*px,bounds.h*py),imageAlt:'Forma de '+pptx.getShapeName(shape)}));}
    const format=pptx.getShapeRunFormatEffective(pres,shape,0,0),shapeDoc=new DOMParser().parseFromString('<root xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'+xml.replace(/<\?xml.*?\?>/,'')+'</root>','text/xml'),body=shapeDoc.getElementsByTagNameNS('*','bodyPr')[0],px=1280/size.width;
    const margin=(name,fallback)=>Number(body?.getAttribute(name)||fallback)*px;
    const font=String(format.font||'Arial');if(!fontAvailable(font,measure))warnings.add(`Fonte indisponível neste dispositivo: ${font}.`);
    elements.push(newElement('text',{id:'pptx-'+id,...pos,text,fontSize:(format.size||18)*96/72*1280/width,fontFamily:font,color:/^#[0-9a-f]{6}$/i.test(format.color||'')?format.color:'#ffffff',bold:Boolean(format.bold),italic:Boolean(format.italic),rotation:pptx.getShapeRotation(shape)||0,verticalAlign:['ctr','center'].includes(pptx.getShapeTextAnchor(shape))?'center':['b','bottom'].includes(pptx.getShapeTextAnchor(shape))?'end':'start',textPadding:[margin('tIns',45720),margin('rIns',91440),margin('bIns',45720),margin('lIns',91440)],align:shapeDoc.getElementsByTagNameNS('*','pPr')[0]?.getAttribute('algn')==='ctr'?'center':shapeDoc.getElementsByTagNameNS('*','pPr')[0]?.getAttribute('algn')==='r'?'right':'left'}));
    if(pptx.getShapeParagraphElements(shape).some(p=>p.length>1))warnings.add('Textos com várias formatações usam o formato inicial no editor.');
   }else{
    const layer=root.cloneNode(false);for(const defs of root.querySelectorAll(':scope>defs'))layer.append(defs.cloneNode(true));layer.append(group.cloneNode(true));
    const pad=8,x=pos.x/100*width-pad,y=pos.y/100*height-pad,w=pos.w/100*width+pad*2,h=pos.h/100*height+pad*2;layer.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);
    if(group.querySelector('[data-pptx-fallback]')||group.hasAttribute('data-pptx-fallback'))warnings.add('Há um recurso gráfico não suportado neste slide.');
    elements.push(newElement('image',{id:'pptx-'+id,x:x/width*100,y:y/height*100,w:w/width*100,h:h/height*100,image:await raster(serialize(layer),w,h),imageAlt:pptx.getShapeName(shape)||'Objeto do PPTX'}));
   }
   group.remove();await wait();
  }
  // Remaining artwork belongs to the master/layout and stays as a background layer.
  if(elements.length>39)throw Error(`O slide ${index+1} precisa de mais de 40 camadas no editor. Divida o slide antes de importar.`);
  elements.unshift(newElement('image',{x:0,y:0,w:100,h:100,image:await raster(serialize(root),width,height),imageAlt:'Fundo e elementos do modelo',locked:true}));
  const animations=[];let start=0,end=0,group=0;
  for(const a of pptx.getSlideAnimations(source)){
   if(!a.effect||!pptxEffects.includes(a.effect)||a.build!=='asOneObject'){warnings.add('Há um efeito de animação ou mídia não suportado pelo player do site.');continue;}
   if(a.start==='click'||a.start==='onClick'){group++;start=0;end=0;}
   start=(a.start==='afterPrevious'?end:start)+(a.delayMs||0);const delay=start,duration=a.durationMs||500;end=delay+duration;
   for(const id of a.targetShapeIds){const targets=elements.filter(e=>e.id==='pptx-'+id||e.id==='pptx-shape-bg-'+id);if(!targets.length)warnings.add('Uma animação aponta para um objeto não importado.');for(const target of targets)animations.push({id:target.id,group,effect:a.effect,duration,delay,direction:a.direction||'',orientation:a.orientation||''});}
  }
  const transition=pptx.getSlideTransition(source);if(transition?.advanceAfterMs)warnings.add('O avanço automático do PowerPoint fica manual nesta aula.');
  result.push({...newSlide(),kind:'canvas',title:pptx.getSlideTitle(source)||'Slide '+(index+1),tag:'PPTX editável',sourceType:'pptx',image:preview,imageAlt:'Prévia do slide '+(index+1),pageWidth:width,pageHeight:height,background:'#ffffff',elements,animations,audio:slideAudio,importWarnings:[...warnings],transition:transition?.effect==='fade'?'fade':'none'});progress(index+1,slides.length);
 }
 return result;
}
