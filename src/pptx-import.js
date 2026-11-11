import * as pptx from '@office-kit/pptx';
import {renderSlideToSvg} from '@office-kit/pptx-preview';
import {newSlide} from './lessons.js';
import {MAX_CANVAS_ELEMENTS,newElement} from './canvas-data.js';
import {MAX_AUDIO_BYTES} from './audio-data.js';
import {fontAvailable,loadPptxFont} from './fonts.js';
export const pptxEffects=['appear','fadeIn','fadeOut','floatIn','flyIn','flyOut','splitIn','wipeIn','zoomIn'];
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
 // Each extracted object has its own viewBox. Keeping the slide's width and
 // height makes the SVG letterbox that object into the full-slide aspect ratio.
 const source=new DOMParser().parseFromString(svg,'image/svg+xml');
 source.documentElement.setAttribute('width',String(width));
 source.documentElement.setAttribute('height',String(height));
 source.documentElement.setAttribute('preserveAspectRatio','none');
 svg=new XMLSerializer().serializeToString(source);
 const scale=Math.min(1920/width,1920/height,2),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const image=new Image();image.src=url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);for(const quality of [.94,.85,.7,.5]){const data=canvas.toDataURL('image/webp',quality);if(data.length<1900000)return data;}throw Error('Um objeto do PPTX é grande demais para importar.');}finally{URL.revokeObjectURL(url);canvas.width=canvas.height=0;}
}
// Measure the painted pixels, including rotation, masks and effects, in slide coordinates.
async function extractArtwork(root, artwork, width, height) {
 const layer=root.cloneNode(false);
 for(const defs of root.querySelectorAll(':scope > defs'))layer.append(defs.cloneNode(true));
 if(artwork.querySelector('text'))for(const style of root.querySelectorAll(':scope > style'))layer.append(style.cloneNode(true));
 const ancestors=[];
 for(let parent=artwork.parentElement;parent&&parent!==root;parent=parent.parentElement)ancestors.unshift(parent);
 let container=layer;
 for(const ancestor of ancestors){
  const shell=ancestor.cloneNode(false);
  for(const defs of ancestor.querySelectorAll(':scope > defs'))shell.append(defs.cloneNode(true));
  container.append(shell);
  container=shell;
 }
 container.append(artwork.cloneNode(true));
 const scale=Math.min(1280/width,960/height,2);
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(width*scale));
 canvas.height=Math.max(1,Math.round(height*scale));
 layer.setAttribute('width',String(canvas.width));
 layer.setAttribute('height',String(canvas.height));
 layer.setAttribute('preserveAspectRatio','none');
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(layer)],{type:'image/svg+xml'}));
 try{
  const img=new Image();
  img.src=url;
  await img.decode();
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const {width:w,height:h}=canvas;
  ctx.drawImage(img,0,0,w,h);
  const pixels=ctx.getImageData(0,0,w,h).data;
  let left=w,right=-1,top=h,bottom=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   if(!pixels[(y*w+x)*4+3])continue;
   if(x<left)left=x;
   if(x>right)right=x;
   if(y<top)top=y;
   if(y>bottom)bottom=y;
  }
  if(right<left)return null;
  const cropped=document.createElement('canvas');
  cropped.width=right-left+1;
  cropped.height=bottom-top+1;
  cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
  return {x:left/w*100,y:top/h*100,w:cropped.width/w*100,h:cropped.height/h*100,image:cropped.toDataURL('image/webp',.95)};
 }finally{URL.revokeObjectURL(url);}
}
export async function editablePptx(bytes,{signal,progress}){
 const pres=await pptx.loadPresentation(bytes,{limits:{maxEntries:10000,maxTotalUncompressedBytes:150*1024*1024,maxXmlPartBytes:8*1024*1024,maxTotalXmlBytes:40*1024*1024}}),slides=pptx.getSlides(pres),size=pptx.getSlideSize(pres);
 if(!slides.length||slides.length>80)throw Error('Importe um arquivo com 1 a 80 slides.');
 const measure=document.createElement('canvas').getContext('2d'),result=[];
 const fonts=new Map();
 for(const slide of slides)for(const shape of pptx.getSlideShapes(slide)){
  const sample=pptx.getShapeText(shape)?.trim().slice(0,130);
  if(!sample)continue;
  for(const [paragraph,runs] of pptx.getShapeParagraphElements(shape).entries()){
   for(let run=0;run<runs.filter(item=>item.kind!=='break').length;run++){
    const family=pptx.getShapeRunFormatEffective(pres,shape,paragraph,run)?.font;
    if(family&&!fonts.has(family))fonts.set(family,sample);
   }
  }
 }
 const onlineFonts=new Map();
 const missing=[...fonts.keys()].filter(font=>!fontAvailable(font,measure));
 for(let index=0;index<missing.length;index+=4){
  signal?.throwIfAborted();
  await Promise.all(missing.slice(index,index+4).map(async font=>{
   const css=await loadPptxFont(font);
   if(css){onlineFonts.set(font,css);fonts.delete(font);}
  }));
 }
 for(const font of fonts.keys())if(!missing.includes(font))fonts.delete(font);
 const replacements=new Map();
 if(fonts.size){
  const dialog=document.createElement('dialog');dialog.className='pptx-font-dialog';
  const heading=document.createElement('h2');heading.textContent='Escolha as fontes da apresentação';dialog.append(heading);
  for(const [font,sample] of fonts){const row=document.createElement('label');const title=document.createElement('span');title.textContent='“'+font+'” não está disponível. Trocar por:';const select=document.createElement('select');
   for(const name of ['Times New Roman','Arial','Verdana','Trebuchet MS','Georgia']){const option=new Option(name,name);option.style.fontFamily=name;select.add(option);}
   const preview=document.createElement('p');preview.textContent=sample||'Apresentação e informação';preview.style.fontFamily=select.value;select.onchange=()=>preview.style.fontFamily=select.value;
   select.dataset.sourceFont=font;row.append(title,select,preview);dialog.append(row);
  }
  const apply=document.createElement('button');
  apply.textContent='Aplicar em todos os slides';
  const cancel=document.createElement('button');
  cancel.type='button';
  cancel.textContent='Cancelar importação';
  dialog.append(apply,cancel);
  signal?.throwIfAborted();
  document.body.append(dialog);
  try{
   dialog.showModal();
   await new Promise((resolve,reject)=>{
    const abort=()=>reject(signal?.reason||new DOMException('Importação cancelada','AbortError'));
    signal?.addEventListener('abort',abort,{once:true});
    const cancelImport=()=>{
     signal?.removeEventListener('abort',abort);
     abort();
    };
    cancel.onclick=cancelImport;
    dialog.addEventListener('cancel',event=>{event.preventDefault();cancelImport();});
    apply.onclick=()=>{
     signal?.removeEventListener('abort',abort);
     for(const select of dialog.querySelectorAll('select'))replacements.set(select.dataset.sourceFont,select.value);
     resolve();
    };
   });
  }finally{dialog.close();dialog.remove();}
 }

 for(const [index,source] of slides.entries()){
  signal?.throwIfAborted();await wait();progress(index,slides.length);
  const warnings=new Set(),renderOptions={textLayout:'svg',resolveFamily:family=>replacements.get(family)||family||'Arial',measureText:(text,spec)=>{measure.font=`${spec.italic?'italic ':''}${spec.bold?'bold ':''}${spec.sizePx}px "${spec.family.replace(/["\\]/g,'')}"`;const m=measure.measureText(text);return{widthPx:m.width,ascentPx:m.fontBoundingBoxAscent||spec.sizePx*.8,descentPx:m.fontBoundingBoxDescent||spec.sizePx*.2};}};
  const root=cleanPptxSvg(renderSlideToSvg(pres,source,renderOptions)).documentElement;
  const foreground=cleanPptxSvg(renderSlideToSvg(pres,source,{...renderOptions,background:false})).documentElement;
  for(const svg of [root,foreground]){
   const families=new Set([...svg.querySelectorAll('[font-family]')].map(node=>node.getAttribute('font-family').split(',')[0].replace(/["']/g,'').trim()));
   const css=[...families].map(family=>onlineFonts.get(family)).filter(Boolean).join('\n');
   if(css){
    const style=svg.ownerDocument.createElementNS(svg.namespaceURI,'style');
    style.textContent=css;
    svg.prepend(style);
   }
  }
  const view=root.getAttribute('viewBox').split(/\s+/).map(Number),width=view[2],height=view[3],elements=[];
  const preview=await raster(new XMLSerializer().serializeToString(root),320,320*height/width);
  const shapes=pptx.getSlideShapes(source);
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
  const shapeById=new Map(shapes.map(shape=>[pptx.getShapeId(shape),shape]));
  const groups=[...foreground.children].filter(node=>!['defs','style'].includes(node.localName));
  const backgroundArtwork=[...root.children].filter(node=>!['defs','style'].includes(node.localName));
  for(const node of backgroundArtwork.slice(backgroundArtwork.length-groups.length))node.remove();
  const animationTargets=new Map();
  for(const group of groups){
   signal?.throwIfAborted();
   const sourceId=group.getAttribute('data-pptx-shape-id');
   const id=sourceId===null?'art-'+groups.indexOf(group):Number(sourceId);
   const shape=shapeById.get(id);
   if(shape&&pptx.getShapeMedia(shape)?.kind==='audio'){group.remove();continue;}
   const bounds=shape&&pptx.getShapeBoundsResolved(pres,shape);
   const ids=[id,...[...group.querySelectorAll('[data-pptx-shape-id]')].map(node=>Number(node.getAttribute('data-pptx-shape-id')))];
   for(const sourceId of ids)animationTargets.set(sourceId,id);
   if(group.querySelector('image[href^="data:image/gif"]'))warnings.add('Uma imagem GIF entrou como quadro estático.');
   const text=shape?pptx.getShapeText(shape)||'':'';
   const plain=bounds&&text&&pptx.getShapeKind(shape)==='shape'&&ids.length===1;
   const richText=plain&&pptx.getShapeParagraphElements(shape).some(paragraph=>paragraph.length>1);
   if(plain&&!richText){
    const pos={x:bounds.x/size.width*100,y:bounds.y/size.height*100,w:bounds.w/size.width*100,h:bounds.h/size.height*100};
    const xml=pptx.getShapeXmlString(shape);
    const geometry=group.cloneNode(true);
    for(const node of geometry.querySelectorAll('text'))node.remove();
    if(geometry.querySelector('rect,path,ellipse,circle,polygon,line,image')){
     group.after(geometry);
     try{
      const art=await extractArtwork(foreground,geometry,width,height);
      if(art)elements.push(newElement('image',{id:'pptx-shape-bg-'+id,...art,imageAlt:'Forma de '+pptx.getShapeName(shape)}));
     }finally{geometry.remove();}
    }
    const format=pptx.getShapeRunFormatEffective(pres,shape,0,0),shapeDoc=new DOMParser().parseFromString('<root xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'+xml.replace(/<\?xml.*?\?>/,'')+'</root>','text/xml'),body=shapeDoc.getElementsByTagNameNS('*','bodyPr')[0],px=1280/size.width;
    const margin=(name,fallback)=>Number(body?.getAttribute(name)||fallback)*px;
    const renderedText=group.querySelector('text');
    const renderedRun=renderedText?.querySelector('tspan')||renderedText;
    const font=renderedRun?.getAttribute('font-family')?.split(',')[0].replace(/["']/g,'').trim()||format.font||'Arial';
    const resolvedFont=replacements.get(font)||font;
    if(!fontAvailable(resolvedFont,measure))warnings.add(`Fonte indisponível neste dispositivo: ${resolvedFont}.`);
    const anchor=renderedText?.getAttribute('text-anchor');
    const alignment=pptx.getParagraphAlignment(shape,0);
    const align=anchor==='middle'||alignment==='ctr'?'center':anchor==='end'||alignment==='r'?'right':'left';
    const verticalAnchor=pptx.getShapeTextAnchor(shape);
    elements.push(newElement('text',{id:'pptx-'+id,...pos,text,
     fontSize:Number(renderedRun?.getAttribute('font-size')||((format.size||18)*96/72))*1280/width,
     fontFamily:resolvedFont,color:/^#[0-9a-f]{6}$/i.test(format.color||'')?format.color:'#ffffff',
     bold:Boolean(format.bold),italic:Boolean(format.italic),rotation:pptx.getShapeRotation(shape)||0,
     verticalAlign:['ctr','center'].includes(verticalAnchor)?'center':['b','bottom'].includes(verticalAnchor)?'end':'start',
     textPadding:[margin('tIns',45720),margin('rIns',91440),margin('bIns',45720),margin('lIns',91440)],align}));
   }else{
    if(richText)warnings.add('Uma caixa com várias formatações foi preservada como imagem para manter o visual.');
    if(group.querySelector('[data-pptx-fallback]')||group.hasAttribute('data-pptx-fallback'))warnings.add('Há um recurso gráfico não suportado neste slide.');
    const art=await extractArtwork(foreground,group,width,height);
    if(art)elements.push(newElement('image',{id:'pptx-'+id,...art,imageAlt:(shape&&pptx.getShapeName(shape))||'Objeto do PPTX'}));
   }
   group.remove();await wait();
  }
  // Remaining artwork belongs to the master/layout and stays as a background layer.
  if(elements.length>=MAX_CANVAS_ELEMENTS)throw Error(`O slide ${index+1} excede o limite de ${MAX_CANVAS_ELEMENTS} elementos editáveis.`);
  elements.unshift(newElement('image',{x:0,y:0,w:100,h:100,image:await raster(new XMLSerializer().serializeToString(root),width,height),imageAlt:'Fundo e elementos do modelo',locked:true}));
  const animations=[];let start=0,end=0,group=0;
  for(const a of pptx.getSlideAnimations(source)){
   if(!a.effect||!pptxEffects.includes(a.effect)||a.build!=='asOneObject'){warnings.add('Há um efeito de animação ou mídia não suportado pelo player do site.');continue;}
   if(a.start==='click'||a.start==='onClick'){group++;start=0;end=0;}
   start=(a.start==='afterPrevious'?end:start)+(a.delayMs||0);const delay=start,duration=a.durationMs||500;end=delay+duration;
   for(const renderedId of new Set(a.targetShapeIds.map(id=>animationTargets.get(id)))){const targets=elements.filter(e=>e.id==='pptx-'+renderedId||e.id==='pptx-shape-bg-'+renderedId);if(!targets.length)warnings.add('Uma animação aponta para um objeto não importado.');for(const target of targets)animations.push({id:target.id,group,effect:a.effect,duration,delay,direction:a.direction||'',orientation:a.orientation||''});}
  }
  const transition=pptx.getSlideTransition(source);if(transition?.advanceAfterMs)warnings.add('O avanço automático do PowerPoint fica manual nesta aula.');
  result.push({...newSlide(),kind:'canvas',title:pptx.getSlideTitle(source)||'Slide '+(index+1),tag:'PPTX editável',sourceType:'pptx',image:preview,imageAlt:'Prévia do slide '+(index+1),pageWidth:width,pageHeight:height,background:'#ffffff',elements,animations,audio:slideAudio,importWarnings:[...warnings],transition:transition?.effect==='fade'?'fade':'none'});progress(index+1,slides.length);
 }
 return result;
}
