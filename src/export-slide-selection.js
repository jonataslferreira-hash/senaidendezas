import { activityBlocks } from './activity-blocks.js';
// Etapas seguem a ordem do roteiro; dentro de cada etapa o editor e a sala
// usam a ordem de lesson.slides. block.items guarda associação, não ordenação.
export function exportableSlides(lesson){
 const slides=lesson.slides||[];
 if(!lesson.activityBlocks) return slides.filter(slide=>!slide.game&&!slide.poll);
 return activityBlocks(lesson).filter(block=>block.type==='slides').flatMap(block=>{
  const members=new Set(block.items);return slides.filter(slide=>members.has(slide.id));
 });
}
