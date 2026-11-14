import { canvasMarkup } from './canvas-view.js';
import { presentationSlide } from './slide-display.js';
import { hydrateLesson } from './assets.js';
import { encodeCover } from './lesson-cover.js';
import { Simulations } from './simulations.js';

export async function thumbnailFor(lesson) {
  if(lesson.thumbnail)return lesson.thumbnail;
  const source=lesson.slides[0];
  if(!source)return '';
  const slide={...source,audio:null,elements:source.elements?.map(e=>({...e,audio:null,customModel:null}))};
  const [hydrated]=(await hydrateLesson({slides:[{...slide,customModel:null}]})).slides;
  const stage=document.createElement('div');
  stage.style.cssText='position:fixed;left:-2000px;top:0;width:480px;height:270px;overflow:hidden;background:#161321';
  stage.innerHTML=hydrated.kind==='document'?'':canvasMarkup(presentationSlide(hydrated),{interactive:false});
  const simulations=new Simulations();
  simulations.mountStatic(stage);
  if(hydrated.kind==='document'){
    const image=new Image();
    image.src=hydrated.image;
    image.style.cssText='width:100%;height:100%;object-fit:contain';
    stage.append(image);
  }
  document.body.append(stage);
  try{
    await Promise.all([...stage.querySelectorAll('img')].map(img=>img.decode().catch(()=>img.remove())));
    const {toCanvas}=await import('html-to-image');
    return encodeCover(await toCanvas(stage,{width:480,height:270,pixelRatio:1,fontEmbedCSS:''}));
  }finally{simulations.dispose();stage.remove();}
}
