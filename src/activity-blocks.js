export const blockNames={slides:'Slides',poll:'Enquete',quiz:'Quiz'};
export function activityBlocks(lesson){return lesson.activityBlocks||(['quiz','slides'].includes(lesson.activityOrder?.[0])?lesson.activityOrder:['slides','quiz']).map(type=>({id:type,type,items:(type==='quiz'?lesson.questions:lesson.slides).map(i=>i.id)}));}
export function normalizeBlocks(input,lesson){
 if(input==null)return null;if(!Array.isArray(input)||input.length<1||input.length>24)throw Error('Use de 1 a 24 etapas na aula.');
 const used=new Set(),ids=new Set(),blocks=input.map(b=>{if(!b||!blockNames[b.type]||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(b.id)||ids.has(b.id))throw Error('Etapa inválida na sequência da aula.');ids.add(b.id);const allowed=new Set((b.type==='quiz'?lesson.questions:lesson.slides.filter(s=>b.type!=='poll'||s.poll)).map(i=>i.id));return {id:b.id,type:b.type,items:(Array.isArray(b.items)?b.items:[]).filter(id=>{const key=(b.type==='quiz'?'q:':'s:')+id;if(!allowed.has(id)||used.has(key))return false;used.add(key);return true;})};});
 for(const [type,items,prefix]of [['slides',lesson.slides,'s:'],['quiz',lesson.questions,'q:']]){const remaining=items.filter(i=>!used.has(prefix+i.id));if(remaining.length){let block=blocks.find(b=>b.type===type);if(!block){block={id:'recovered-'+type,type,items:[]};while(ids.has(block.id))block.id+='-x';blocks.push(block);}block.items.push(...remaining.map(i=>i.id));}}
 return blocks;
}
export function ensureBlocks(lesson){if(!lesson.activityBlocks)lesson.activityBlocks=activityBlocks(lesson).filter(b=>b.items.length||b.type==='slides');return lesson.activityBlocks;}
