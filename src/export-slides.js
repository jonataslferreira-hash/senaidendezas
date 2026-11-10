import {toPng} from 'html-to-image';
import {hydrateLesson} from './assets.js';
import {presentationSlide} from './slide-display.js';
import {canvasMarkup,CanvasModels} from './canvas-view.js';
import {loadSlideFonts,slideFontCSS} from './fonts.js';
import {Simulations} from './simulations.js';
const bytes=url=>Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));
function save(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function modelGif(viewer) {
 const module = await import('gifenc');
 const { GIFEncoder, quantize, applyPalette } = module.GIFEncoder ? module : module.default;
 const { renderer, scene, camera, group } = viewer;
 const source = renderer.domElement, frame = document.createElement('canvas');
 const scale = Math.min(1, 320 / Math.max(source.width, source.height));
 frame.width = Math.max(1, Math.round(source.width * scale));
 frame.height = Math.max(1, Math.round(source.height * scale));
 const ctx = frame.getContext('2d', { willReadFrequently: true });
 const gif = GIFEncoder(), initial = group.rotation.y, frames = 24;
 try {
  for (let index = 0; index < frames; index++) {
   group.rotation.y = initial + index * Math.PI * 2 / frames;
   renderer.render(scene, camera);
   ctx.clearRect(0, 0, frame.width, frame.height);
   ctx.drawImage(source, 0, 0, frame.width, frame.height);
   const pixels = ctx.getImageData(0, 0, frame.width, frame.height).data;
   const format = 'rgba4444';
   const palette = quantize(pixels, 96, { format, oneBitAlpha: true });
   const transparentIndex = palette.findIndex(color => color[3] === 0);
   gif.writeFrame(applyPalette(pixels, palette, format), frame.width, frame.height, {
    palette, delay: 120, repeat: 0, dispose: 2, transparent: transparentIndex >= 0,
    transparentIndex: Math.max(0, transparentIndex)
   });
   if (index % 4 === 3) await new Promise(resolve => setTimeout(resolve, 0));
  }
  gif.finish();
  return gif.bytes();
 } finally { group.rotation.y = initial; }
}
export async function exportSlides(input,format,onProgress=()=>{}){
 const lesson=await hydrateLesson(input,true),host=document.createElement('div'),models=new CanvasModels(),simulations=new Simulations();host.className='export-canvas-host';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;left:-20000px;top:0;pointer-events:none;z-index:-1;';document.body.append(host);
 const pdf=format==='pdf'?await import('pdf-lib'):null,pptx=format==='pptx'?await import('@office-kit/pptx'):null,deck=pdf?await pdf.PDFDocument.create():pptx.createPresentation(),first=presentationSlide(lesson.slides[0]),ratio=first.pageWidth/first.pageHeight||16/9,deckW=pptx?.inches(13.333333),deckH=deckW/ratio;
 if(pptx)pptx.setSlideSize(deck,{width:deckW,height:Math.round(deckH)});
 try{for(const [index,original]of lesson.slides.entries()){
  onProgress(index,lesson.slides.length);const slide=presentationSlide(original),aspect=slide.pageWidth/slide.pageHeight||16/9,w=Math.min(1280,1280*aspect),h=w/aspect;host.style.width=w+'px';host.style.height=h+'px';
  await loadSlideFonts(slide,lesson.customFonts);host.innerHTML=slide.kind==='document'?`<img src="${slide.image}" style="width:100%;height:100%;object-fit:contain">`:canvasMarkup(slide);await models.mount(slide.kind==='canvas'?host:null,slide);simulations.mount(host);
  await Promise.all([...host.querySelectorAll('img')].map(img=>img.decode().catch(()=>{throw Error('Uma imagem não abriu para exportar. Envie a imagem como arquivo no editor.');})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const gifs = new Map();
  for (const [id, viewer] of models.viewers) {
   if (!viewer.renderer || viewer.el.dataset.customLoaded === 'error') throw Error('Não foi possível renderizar um modelo 3D para exportação. Confira se ele abre no slide.');
   viewer.resize();
   viewer.detail.remove();
   viewer.el.closest('.canvas-object')?.querySelector('.canvas-explode')?.remove();
   if (pptx) gifs.set(id, await modelGif(viewer));
   else {
    viewer.renderer.render(viewer.scene, viewer.camera);
    const image = new Image();
    image.src = viewer.renderer.domElement.toDataURL('image/png');
    image.style.cssText = viewer.renderer.domElement.style.cssText;
    await image.decode();
    viewer.renderer.domElement.replaceWith(image);
   }
  }
  const fontEmbedCSS=await slideFontCSS(slide,lesson.customFonts),target=host.querySelector('.slide-canvas')||host,options={fontEmbedCSS,pixelRatio:1,width:w,height:h,preferredFontFormat:'woff2',style:{width:w+'px',height:h+'px',transform:'none'}};
  if(pdf){const png=await toPng(target,options),embedded=await deck.embedPng(png),page=deck.addPage([w*.75,h*.75]);page.drawImage(embedded,{x:0,y:0,width:w*.75,height:h*.75});}
  else{
   const out=pptx.addBlankSlide(deck);pptx.setSlideBackground(out,slide.background||'#ffffff');const scale=Math.min(deckW/w,deckH/h),dx=(deckW-w*scale)/2,dy=(deckH-h*scale)/2,map=new Map();
   if(slide.kind==='canvas'&&(slide.visualTheme||slide.backgroundFill?.mode==='gradient')){
    const background=await toPng(target,{...options,filter:node=>!node.classList?.contains('canvas-object')});
    pptx.addSlideImage(out,bytes(background),{x:Math.round(dx),y:Math.round(dy),w:Math.round(w*scale),h:Math.round(h*scale),format:'png',name:'Fundo do slide'});
   }
   if(slide.kind==='document'){const png=await toPng(target,options);pptx.addSlideImage(out,bytes(png),{x:Math.round(dx),y:Math.round(dy),w:Math.round(w*scale),h:Math.round(h*scale),format:'png'});}
   else for(const e of slide.elements){const rect={x:Math.round(dx+e.x/100*w*scale),y:Math.round(dy+e.y/100*h*scale),w:Math.max(1,Math.round(e.w/100*w*scale)),h:Math.max(1,Math.round(e.h/100*h*scale))};let shape;
    if(e.type==='text'){shape=pptx.addSlideTextBox(out,{...rect,text:e.text,name:e.role==='title'?'Título':'Texto'});pptx.setShapeTextFormat(shape,{font:lesson.customFonts?.find(f=>f.family===e.fontFamily)?.name||e.fontFamily||'Arial',size:e.fontSize*(w/1280)*scale/914400*72,color:e.color,bold:e.bold,italic:e.italic});pptx.setShapeTextMargins(shape,{top:Math.round((e.textPadding?.[0]||0)*w/1280*scale),right:Math.round((e.textPadding?.[1]||0)*w/1280*scale),bottom:Math.round((e.textPadding?.[2]||0)*w/1280*scale),left:Math.round((e.textPadding?.[3]||0)*w/1280*scale)});pptx.setShapeTextAnchor(shape,e.verticalAlign==='center'?'center':e.verticalAlign==='end'?'bottom':'top');for(let i=0;i<pptx.getShapeParagraphElements(shape).length;i++)pptx.setParagraphAlignment(shape,i,e.align||'left');}
    else if(gifs.has(e.id)) shape=pptx.addSlideImage(out,gifs.get(e.id),{...rect,format:'gif',name:'Modelo 3D'});
    else{const node=[...host.querySelectorAll('[data-object-id]')].find(n=>n.dataset.objectId===e.id),width=Math.max(1,e.w/100*w),height=Math.max(1,e.h/100*h),png=await toPng(node,{fontEmbedCSS,pixelRatio:1,width,height,preferredFontFormat:'woff2',style:{position:'relative',left:'0',top:'0',width:width+'px',height:height+'px',transform:'none'}});shape=pptx.addSlideImage(out,bytes(png),{...rect,format:'png',name:e.imageAlt||e.type});}
    if(e.rotation)pptx.setShapeRotation(shape,e.rotation);map.set(e.id,shape);
   }
   let group=-1;for(const animation of slide.animations||[]){const shape=map.get(animation.id);if(!shape)continue;try{pptx.setShapeAnimation(shape,{effect:animation.effect,start:animation.group>0&&animation.group>group?'click':'withPrevious',durationMs:animation.duration,delayMs:animation.delay});group=animation.group;}catch{/* The visual and editable text still export if an effect is unavailable. */}}
  }
  models.mount(null,null);onProgress(index+1,lesson.slides.length);
 }
 const name=(lesson.title||'Aula').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,80);save(pdf?await deck.save():await pptx.savePresentation(deck),name+'.'+format,pdf?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation');
 }finally{models.mount(null,null);simulations.mount(null);host.remove();}
}
