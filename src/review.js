import {studioIcon} from './studio-icons.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function reviewQuestions(lesson){
 const quiz=(lesson.questions||[]).map(q=>({...q,source:'Quiz'}));
 const games=(lesson.slides||[]).flatMap(s=>{
  const game=s.game;if(!game)return [];
  const list=game.type==='tug'?(game.rounds||[]).flat():game.questions||[];
  return list.map(q=>({...q,source:game.type==='tug'?'Cabo de guerra':'Dinâmica'}));
 });
 return [...quiz,...games].filter(q=>q.text?.trim()&&Array.isArray(q.options)&&q.options.length>=2&&q.options.every(o=>o.trim())&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length);
}
function deckCard(lesson,index,cloud=false,busy=false){
 const count=cloud?null:reviewQuestions(lesson).length;
 const attributes=cloud?`data-studio-action="review-cloud-open" data-review-index="${index}" ${busy?'disabled':''}`:`data-studio-action="review-open" data-id="${esc(lesson.id)}"`;
 return `<button type="button" class="review-deck" ${attributes} style="--review-index:${index%4}">
   <span class="review-deck-art" aria-hidden="true"><span class="review-art-shape review-art-shape-one"></span><span class="review-art-shape review-art-shape-two"></span><span class="review-art-card">${studioIcon('fields')}<i>✦</i></span><span class="review-art-number">${String(index+1).padStart(2,'0')}</span></span>
   <span class="review-deck-body"><strong>${esc(lesson.title)}</strong><span class="review-deck-footer"><span>${count===null?'Na conta':`${count} ${count===1?'questão':'questões'}`}</span><span class="review-deck-arrow" aria-hidden="true">${studioIcon('next')}</span></span></span>
 </button>`;
}
export function reviewMarkup(studio){
 const lessons=studio.library.lessons.filter(l=>reviewQuestions(l).length), chosen=studio.reviewCloudLesson || lessons.find(l=>l.id===studio.reviewId);
 if(!chosen){
  const cloud=studio.reviewCloudItems||[],message=studio.reviewMessage==='Selecione uma aula.'?'':studio.reviewMessage||'';
  return `<main class="studio-library review-page review-dashboard">
   <header class="review-heading"><span class="review-heading-icon" aria-hidden="true">${studioIcon('fields')}</span><div><h1>Revisar questões</h1></div></header>
   <section class="review-section" aria-labelledby="review-local-heading"><div class="review-section-head"><div class="review-section-title"><h2 id="review-local-heading">Neste dispositivo</h2><span class="review-section-count">${lessons.length}</span></div></div>
    ${lessons.length?`<div class="review-list review-deck-grid">${lessons.map((l,i)=>deckCard(l,i)).join('')}</div>`:`<div class="review-empty"><span aria-hidden="true">${studioIcon('fields')}</span><strong>Nenhuma questão por aqui</strong><button type="button" class="studio-btn quiet" data-studio-action="new">Criar aula</button></div>`}
   </section>
   <section class="review-section review-cloud-section" aria-labelledby="review-cloud-heading"><div class="review-section-head"><div class="review-section-title"><h2 id="review-cloud-heading">Na conta</h2>${cloud.length?`<span class="review-section-count">${cloud.length}</span>`:''}</div>${studio.account.user?`<button type="button" class="studio-btn quiet review-cloud-action" data-studio-action="review-cloud-list" ${studio.reviewBusy?'disabled':''}>${studioIcon('cloud')}<span>${studio.reviewBusy?'Carregando…':cloud.length?'Atualizar':'Buscar aulas'}</span></button>`:`<button type="button" class="studio-btn quiet review-cloud-action" data-account-action="open">${studioIcon('cloud')}<span>Entrar</span></button>`}</div>
    ${message?`<p class="review-cloud-message" role="status">${esc(message)}</p>`:''}${cloud.length?`<div class="review-list review-deck-grid">${cloud.map((l,i)=>deckCard(l,i,true,studio.reviewBusy)).join('')}</div>`:''}
   </section>
  </main>`;
 }
 const questions=reviewQuestions(chosen),index=Math.min(studio.reviewIndex||0,questions.length-1),q=questions[index],choice=studio.reviewChoice,answered=choice!==null&&choice!==undefined;
 return `<main class="studio-library review-page review-play"><header class="review-play-head"><button class="studio-btn quiet review-back" data-studio-action="review-back">${studioIcon('back')}<span>Todas as aulas</span></button><span class="review-play-source">${esc(q.source)}</span></header>
 <div class="review-play-title"><h1>${esc(chosen.title)}</h1><span>Questão ${index+1} / ${questions.length}</span></div>
 <div class="review-progress" role="progressbar" aria-label="Progresso das questões" aria-valuemin="1" aria-valuemax="${questions.length}" aria-valuenow="${index+1}"><span style="width:${(index+1)/questions.length*100}%"></span></div>
 <section class="review-card"><span class="review-game-label">${String(index+1).padStart(2,'0')} <i>✦</i></span><h2>${esc(q.text)}</h2><div class="review-options">${q.options.map((o,i)=>`<button class="studio-btn quiet ${answered?(i===q.correct?'review-correct':i===choice?'review-incorrect':''):''}" data-studio-action="review-answer" data-choice="${i}" ${answered?'disabled':''}><span class="review-option-letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>${answered&&i===q.correct?'<span class="review-answer-mark" aria-label="Resposta correta">✓</span>':''}</button>`).join('')}</div>${answered?`<div class="review-result" role="status"><strong>${choice===q.correct?'Resposta correta!':'Não foi dessa vez.'}</strong><span>${esc(q.options[q.correct])}</span>${q.explanation?`<p>${esc(q.explanation)}</p>`:''}</div>`:''}</section>
 <div class="review-controls"><button class="studio-btn quiet" data-studio-action="review-prev" ${index===0?'disabled':''}>${studioIcon('back')} Anterior</button><button class="studio-btn quiet" data-studio-action="review-retry">${studioIcon('reload')} Refazer</button><button class="studio-btn accent" data-studio-action="review-next" ${index===questions.length-1?'disabled':''}>Próxima ${studioIcon('next')}</button></div></main>`;
}
