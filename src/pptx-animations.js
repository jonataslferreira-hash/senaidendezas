import {prefersReducedMotion} from './motion-preference.js';
export class PptxAnimations{
 mount(root,slide,key,step=0){
  key+=':'+step;
  if(key!==this.key){this.key=key;this.started=performance.now();}
  if(!slide?.animations?.length||prefersReducedMotion())return;
  const elapsed=performance.now()-this.started;
  for(const effect of slide.animations){const target=[...root.querySelectorAll('.canvas-presenting [data-object-id]')].find(n=>n.dataset.objectId===effect.id);if(!target)continue;
   if((effect.group||0)>step){if(!effect.effect.endsWith('Out')&&!slide.animations.some(a=>a.id===effect.id&&(a.group||0)<=step))target.style.opacity='0';continue;}
   let from={opacity:0},to={opacity:1};
   if(effect.effect==='fadeOut'){from={opacity:1};to={opacity:0};}
   if(['floatIn','flyIn','flyOut'].includes(effect.effect)){const offsets={left:'-100% 0',right:'100% 0',up:'0 -100%',down:'0 100%',top:'0 -100%',bottom:'0 100%'};from={opacity:0,translate:effect.effect==='floatIn'?'0 25%':offsets[effect.direction]||'0 100%'};to={opacity:1,translate:'0 0'};if(effect.effect==='flyOut')[from,to]=[to,from];}
   if(effect.effect==='splitIn'){from={clipPath:effect.orientation==='horizontal'?'inset(50% 0)':'inset(0 50%)'};to={clipPath:'inset(0 0)'};}
   if(effect.effect==='wipeIn'){from={clipPath:'inset(0 100% 0 0)'};to={clipPath:'inset(0 0)'};}
   if(effect.effect==='zoomIn'){from={opacity:0,scale:.2};to={opacity:1,scale:1};}
   const animation=target.animate([from,to],{duration:effect.effect==='appear'?1:effect.duration,delay:effect.delay,fill:'both',easing:effect.effect==='floatIn'?'cubic-bezier(.2,.8,.2,1)':'ease-out'});animation.currentTime=(effect.group||0)<step?effect.delay+effect.duration+1:elapsed;
  }
 }
}
