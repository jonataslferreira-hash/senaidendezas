import {avatarContent} from './player-avatar.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Bonequinho: cabeça com o ícone do aluno, corpo arredondado, mãos e pés soltos.
// O movimento é todo de "amassa e estica" (CSS), sem juntas duras.
export function character(person,index=0){return `<div class="game-character dance-${index%4}" style="--beat-shift:${(index*37)%100}${/^#[0-9a-f]{6}$/i.test(person.color||'')?';--player-color:'+person.color:''}"${person.color?' data-team-color':''}><div class="character-rig buddy"><i class="buddy-shadow"></i><i class="buddy-foot left"></i><i class="buddy-foot right"></i><div class="buddy-top"><i class="buddy-body"></i><i class="buddy-hand left"></i><i class="buddy-hand right"></i><div class="character-head">${avatarContent(person.avatar)}</div></div></div></div>`;}
// Ranking entre as perguntas: as linhas entram na posição antiga, as barras
// crescem com os pontos novos e só então cada um desliza para a posição nova.
const rankColors=['#a78bfa','#34d399','#fbbf24','#60a5fa','#f472b6','#fb923c','#2dd4bf','#c084fc'];
function rankRace(state,elapsed){
 const all=state.ranking,limit=7,rows=all.slice(0,limit).map((p,i)=>({p,i})),mine=all.findIndex(p=>p.id===state.me?.id);
 if(mine>=limit)rows[limit-1]={p:all[mine],i:mine};
 const max=Math.max(1,...all.map(p=>p.score)),count=rows.length;
 // posição de partida: a ordem anterior entre os que aparecem na tela
 const before=[...rows].sort((a,b)=>(a.p.previousRank||999)-(b.p.previousRank||999)||a.i-b.i);
 return `<ol class="rank-race" style="--rows:${count};--e:${elapsed.toFixed(2)}">${rows.map(({p,i},slot)=>{
  const from=before.findIndex(row=>row.p.id===p.id),gain=p.score-(p.previousScore||0),moved=p.previousRank?p.previousRank-(i+1):0;
  return `<li class="rank-row" data-me="${p.id===state.me?.id}" data-first="${i===0&&p.score>0}" style="--from:${from};--to:${slot};--ratio:${(p.score/max).toFixed(4)};--prev:${((p.previousScore||0)/max).toFixed(4)};--c:${p.color||rankColors[i%rankColors.length]};--k:${slot}">
   <b class="rank-pos">${i+1}</b><span class="rank-head">${avatarContent(p.avatar)}</span>
   <div class="rank-main"><strong>${esc(p.name)}${p.streak>=2?` <em class="rank-fire">🔥${p.streak}</em>`:''}</strong><div class="rank-bar"><i></i></div></div>
   <span class="rank-score" data-count data-from="${p.previousScore||0}" data-to="${p.score}">${(p.previousScore||0).toLocaleString('pt-BR')}</span>
   ${gain>0?`<em class="rank-gain">+${gain.toLocaleString('pt-BR')}</em>`:''}${moved?`<small class="rank-move" data-dir="${moved>0?'up':'down'}">${moved>0?'▲':'▼'}${Math.abs(moved)}</small>`:''}</li>`;}).join('')}</ol>`;
}
// Números do ranking contando até o valor novo (acompanha o tempo já passado).
const counted=new WeakSet();
export function animateRanking(root,elapsed=0){
 const start=performance.now()-elapsed*1000;
 for(const node of root.querySelectorAll('.rank-race [data-count]')){
  if(counted.has(node))continue;counted.add(node);
  const from=Number(node.dataset.from)||0,to=Number(node.dataset.to)||0;
  const step=()=>{if(!node.isConnected)return;const t=Math.max(0,Math.min(1,(performance.now()-start-600)/1000)),eased=1-Math.pow(1-t,3);node.textContent=Math.round(from+(to-from)*eased).toLocaleString('pt-BR');if(t<1)requestAnimationFrame(step);};
  step();
 }
}
// Resumo no topo do placar da rodada: quem lidera, quem mais subiu e a posição do aluno.
function roundSummary(state){
 const all=state.ranking;if(!all.length)return '';
 const gain=p=>p.score-(p.previousScore||0),lead=all[0],jump=[...all].sort((a,b)=>gain(b)-gain(a))[0],me=all.findIndex(p=>p.id===state.me?.id),mine=all[me];
 const card=(kind,label,p,detail)=>`<article class="rs-card ${kind}"${p.color?` style="--c:${p.color}"`:''}><span class="rs-head">${avatarContent(p.avatar)}</span><div><small>${label}</small><strong>${esc(p.name)}</strong><em>${detail}</em></div></article>`;
 const moved=mine?.previousRank?mine.previousRank-(me+1):0;
 return `<div class="round-summary">${card('lead','Na liderança',lead,lead.score.toLocaleString('pt-BR')+' pts')}${gain(jump)>0&&jump.id!==lead.id?card('jump','Maior salto',jump,'+'+gain(jump).toLocaleString('pt-BR')+' pts'):''}${mine?card('me','Sua posição',{...mine,name:(me+1)+'º lugar'},(gain(mine)>0?'+'+gain(mine).toLocaleString('pt-BR')+' pts':'sem pontos nesta rodada')+(moved?(moved>0?' · subiu '+moved:' · caiu '+-moved):'')):''}</div>`;
}
// Pódio final. Quem manda na revelação é o professor: state.podiumStep (0 a 4) vem da sala,
// então o celular do aluno nunca mostra um lugar antes de ele aparecer no telão.
// 1 = 3º lugar, 2 = 2º lugar, 3 = campeão (+ comemoração), 4 = classificação completa.
const victoryNames=['chuva','fogos','baloes','estrelas'];
export function leaderboardMarkup(state,{header,host,offset=0,final=false}){
 const winners=state.ranking.slice(0,3),elapsed=Math.max(0,(Date.now()+offset-(state.resultStartedAt||Date.now()))/1000),step=state.podiumRevealed?4:state.podiumStep??4;
 const delay=at=>state.podiumRevealed?'-20s':Math.min(0,at-elapsed).toFixed(2)+'s',need=rank=>4-rank,at=rank=>rank===3?2:rank===2?4.5:7;
 const champion=winners[0],victory=victoryNames[(state.victory||0)%4],me=state.ranking.findIndex(p=>p.id===state.me?.id);
 const heading=final?(step>=3&&champion?`<span>RESULTADO FINAL</span><h1 class="champion-title"><em>${esc(champion.name)}</em> venceu!</h1>`:`<span>RESULTADO FINAL</span><h1>${step===0?'Quem conquistou o pódio?':step===1?'E em segundo lugar…':'E quem levou o ouro?'}</h1>`):'<h1>Placar da rodada</h1>';
 const podium=final?`<div class="final-spotlights" aria-hidden="true" data-on="${step>=3}"></div><div class="final-podium" data-step="${step}">${[1,0,2].filter(i=>winners[i]).map(i=>{const p=winners[i],shown=step>=need(i+1);return `<article class="final-contestant place-${i+1}" data-shown="${shown}" style="--reveal-delay:${delay(at(i+1))};--player-color:${p.color||['#ac8ae8','#78baac','#e9b97e'][i]}">${shown?`${character(p,i)}<strong>${esc(p.name)}</strong><span>${p.score.toLocaleString('pt-BR')} pontos</span><small>${p.correct} acertos${p.streak>=2?' · 🔥 '+p.streak+' seguidas':''}</small>`:'<div class="final-mystery" aria-hidden="true">?</div>'}<div class="final-tower"><b>${i===0?'♛':i+1}</b></div></article>`;}).join('')}</div>${step>=3?`<div class="final-confetti" data-victory="${victory}" aria-hidden="true" style="--reveal-delay:${delay(7.3)}">${Array.from({length:30},(_,i)=>`<i style="--n:${i};--x:${(i*37+11)%100};--y:${(i*53+7)%70};--h:${(i*47)%360};--t:${(2.6+(i%7)*.35).toFixed(2)}s;--w:${((i*13)%20)/10}s;--r:${i%2?1:-1}"></i>`).join('')}</div>`:''}`:roundSummary(state)+rankRace(state,elapsed);
 const mine=final&&!host&&me>=0&&step>=4?`<p class="final-mine">Você ficou em <b>${me+1}º lugar</b> com ${state.ranking[me].score.toLocaleString('pt-BR')} pontos</p>`:'';
 return `${header()}<main class="game-results ${final?'grand-finale':'round-results'}"${final?` data-victory="${victory}" data-step="${step}"`:''}><div class="results-heading">${heading}</div>${podium}${mine}<section class="game-results-actions">${host?final?`${step<4?'<button class="btn secondary" data-action="podium-all">Revelar todos</button>':''}<button class="btn primary" data-action="${state.activity?.hasNext?'next-stage':'back-lesson'}">${state.activity?.hasNext?'Próxima etapa →':'Voltar aos slides'}</button>`:'<button class="btn primary" data-action="next-question">Próxima pergunta →</button>':'<p>Aguarde o professor continuar.</p>'}<button class="btn secondary" data-action="leave">Sair</button>${final?'<button class="text-btn" data-action="export">Baixar resultado</button>':''}</section>${!final||step>=4?`<details class="result-standings ${final?'final-standings':''}" style="--reveal-delay:${final?delay(9):'0s'}"><summary>Classificação completa</summary><section class="standings-list">${state.ranking.map((p,i)=>`<div${p.color?` style="--c:${p.color}"`:''}><b>${i+1}</b>${avatarContent(p.avatar)}<strong>${esc(p.name)}</strong><span>${p.score.toLocaleString('pt-BR')} pts</span><small>${p.correct} acertos</small></div>`).join('')}</section></details>`:''}</main>`;
}
export function quizMarkup(state,{header,host,demo,status,shareDialog,shareOpen}){
 const q=state.question,revealed=state.phase==='reveal',answer=state.me?.answer,canAnswer=(!host||demo)&&!answer&&!revealed&&status==='online';
 return `${header()}<main class="quiz-page game-question ${revealed?'answer-revealed':''}${q.bare?' bare-question':''}"><div class="game-question-top"><span class="quiz-count">PERGUNTA <strong>${state.questionIndex+1}</strong> / ${state.totalQuestions}</span><div class="timer ${revealed?'done':''}"><strong id="time-left">—</strong><span>s</span></div>${state.me?.streak>=2?`<span class="streak-badge">🔥 ${state.me.streak} seguidas</span>`:''}</div><div class="question-card"><div class="time-track"><div id="time-bar"></div></div>${q.bare?`<p class="bare-hint">${revealed?'Confira a resposta no telão':'Leia a pergunta no telão e toque na sua resposta'}</p>`:`<h1>${esc(q.text)}</h1>`}<div class="answer-options${q.bare?' bare-answers':''}" style="--count:${q.options.length}">${q.options.map((option,i)=>`<button class="answer-option answer-${i} ${answer?.choice===i?'chosen':''} ${revealed&&i===q.correct?'correct':''} ${revealed&&answer?.choice===i&&i!==q.correct?'incorrect':''}" aria-label="Alternativa ${'ABCD'[i]}" data-answer="${i}" ${canAnswer?'':'disabled'}><span class="answer-letter">${'ABCD'[i]}</span>${q.bare?'':`<span class="option-copy">${esc(option)}</span>`}${revealed&&i===q.correct?'<b class="correct-mark">✓</b>':''}</button>`).join('')}</div>${revealed?`<div class="answer-explanation"><strong>${answer?answer.correct?'Acertou! +'+answer.points+' pontos':'Vamos para a próxima!':'Resposta: '+ 'ABCD'[q.correct]}</strong>${q.bare?'':`<p>${esc(q.explanation)}</p>`}</div>`:''}${answer&&!revealed?'<p class="answer-status" role="status">✓ Resposta registrada.</p>':''}<footer class="question-footer"><span>${state.answeredCount} de ${state.ranking.length} responderam</span>${host?`<button class="btn primary" data-action="${revealed?'show-ranking':'reveal'}">${revealed?state.questionIndex+1===state.totalQuestions?'Grande resultado final':'Mostrar classificação':'Revelar resposta'} →</button>`:''}</footer></div></main>${shareOpen?shareDialog():''}`;
}
