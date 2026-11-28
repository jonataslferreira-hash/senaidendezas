import { activityBlocks } from './activity-blocks.js';
// A sequência das etapas é a mesma apresentada no editor. Dados de uma
// atividade antiga no slide não podem fazer uma página visual desaparecer.
export function exportableSlides(lesson){
 const slides=lesson.slides||[],byId=new Map(slides.map(slide=>[slide.id,slide]));
 if(!lesson.activityBlocks) return slides.filter(slide=>!slide.game&&!slide.poll);
 return activityBlocks(lesson).filter(block=>block.type==='slides').flatMap(block=>block.items.map(id=>byId.get(id)).filter(Boolean));
}
