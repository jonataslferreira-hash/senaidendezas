import {avatarContent} from './player-avatar.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Bonequinho: cabeça com o ícone do aluno, corpo arredondado, mãos e pés soltos.
// O movimento é todo de "amassa e estica" (CSS), sem juntas duras.
// mood: '' (dancinha), 'idle', 'run', 'lose' ou 'win-0'…'win-3' (quatro comemorações).
export function character(person,index=0,mood=''){return `<div class="game-character dance-${index%6}"${mood?` data-mood="${mood}"`:''} style="--beat-shift:${(index*37)%100}${/^#[0-9a-f]{6}$/i.test(person.color||'')?';--player-color:'+person.color:''}"${person.color?' data-team-color':''}><div class="character-rig buddy"><i class="buddy-shadow"></i><i class="buddy-foot left"></i><i class="buddy-foot right"></i><div class="buddy-top"><i class="buddy-body"></i><i class="buddy-hand left"></i><i class="buddy-hand right"></i><div class="character-head">${avatarContent(person.avatar)}</div></div></div></div>`;}
// Ranking entre as perguntas: as linhas entram na posição antiga, as barras
// crescem com os pontos novos e só então cada um desliza para a posição nova.
const rankColors=['#a78bfa','#34d399','#fbbf24','#60a5fa','#f472b6','#fb923c','#2dd4bf','#c084fc'];
function rankRace(state,elapsed){
 const all=state.quizRanking||state.ranking||[],limit=7,rows=all.slice(0,limit).map((p,i)=>({p,i})),mine=all.findIndex(p=>p.id===state.me?.id);
 if(mine>=limit)rows[limit-1]={p:all[mine],i:mine};
 const max=Math.max(1,...all.map(p=>p.score)),count=rows.length;
 // posição de partida: a ordem anterior entre os que aparecem na tela
 const before=[...rows].sort((a,b)=>(a.p.previousRank||999)-(b.p.previousRank||999)||a.i-b.i);
 return `<ol class="rank-race" style="--rows:${count};--e:${elapsed.toFixed(2)}">${rows.map(({p,i},slot)=>{
  const from=before.findIndex(row=>row.p.id===p.id),gain=p.score-(p.previousScore||0),moved=p.previousRank?p.previousRank-(i+1):0;
  const ratio=p.score/max,prev=(p.previousScore||0)/max;
  return `<li class="rank-row" data-me="${p.id===state.me?.id}" data-first="${i===0&&p.score>0}" data-gain="${gain>0}" data-wide="${ratio>=.5}" data-streak="${p.streak>=2?'up':''}" style="--from:${from};--to:${slot};--ratio:${ratio.toFixed(4)};--prev:${prev.toFixed(4)};--c:${p.color||rankColors[i%rankColors.length]};--k:${slot};--fire:${Math.min(.7,(p.streak||0)/7).toFixed(2)}">
   <b class="rank-pos">${i+1}</b>
   <div class="rank-lane"><i class="rank-fill"></i><strong class="rank-name">${esc(p.name)}${p.streak>=2?` <em class="rank-fire" data-n="${p.streak}" title="Ofensiva: ${p.streak} acertos seguidos"></em>`:''}</strong>
    <div class="rank-runner"><span data-rank-runner data-gain="${gain>0}">${character(p,i,'idle')}</span></div></div>
   <span class="rank-score" data-count data-from="${p.previousScore||0}" data-to="${p.score}">${(p.previousScore||0).toLocaleString('pt-BR')}</span>
   ${gain>0?`<em class="rank-gain">+${gain.toLocaleString('pt-BR')}</em>`:''}${moved?`<small class="rank-move" data-dir="${moved>0?'up':'down'}">${moved>0?'▲':'▼'}${Math.abs(moved)}</small>`:''}</li>`;}).join('')}</ol>`;
}
// Números do ranking contando até o valor novo (acompanha o tempo já passado).
const counted=new WeakSet();
// Também comanda o boneco: corre de lado enquanto a barra cresce (0,6 s → 1,6 s) e volta a ficar de frente.
export const RANK_RUN_FROM=600,RANK_RUN_TO=1650;
export const rankMood=(ms,gained)=>gained&&ms>=RANK_RUN_FROM&&ms<RANK_RUN_TO?'run':gained&&ms>=RANK_RUN_TO&&ms<RANK_RUN_TO+1500?'win-0':'idle';
export function animateRanking(root,elapsed=0){
 const start=performance.now()-elapsed*1000;
 for(const node of root.querySelectorAll('.rank-race [data-count]')){
  if(counted.has(node))continue;counted.add(node);
  const from=Number(node.dataset.from)||0,to=Number(node.dataset.to)||0;
  const step=()=>{if(!node.isConnected)return;const t=Math.max(0,Math.min(1,(performance.now()-start-600)/1000)),eased=1-Math.pow(1-t,3);node.textContent=Math.round(from+(to-from)*eased).toLocaleString('pt-BR');if(t<1)requestAnimationFrame(step);};
  step();
 }
 for(const node of root.querySelectorAll('.rank-race [data-rank-runner]')){
  if(counted.has(node))continue;counted.add(node);
  const body=node.querySelector('.game-character'),gained=node.dataset.gain==='true';
  if(!body)continue;
  const paint=()=>{
   if(!node.isConnected)return;
   const ms=performance.now()-start,mood=rankMood(ms,gained);
   if(body.dataset.mood!==mood)body.dataset.mood=mood;
   const next=ms<RANK_RUN_FROM?RANK_RUN_FROM:ms<RANK_RUN_TO?RANK_RUN_TO:ms<RANK_RUN_TO+1500?RANK_RUN_TO+1500:0;
   if(gained&&next)setTimeout(paint,next-ms+10);
  };
  paint();
 }
}
// Resumo no topo do placar da rodada: quem lidera, quem mais subiu e a posição do aluno.
function roundSummary(state){
 const all=state.quizRanking||state.ranking||[];if(!all.length)return '';
 const gain=p=>p.score-(p.previousScore||0),lead=all[0],jump=[...all].sort((a,b)=>gain(b)-gain(a))[0],me=all.findIndex(p=>p.id===state.me?.id),mine=all[me];
 const card=(kind,label,p,detail)=>`<article class="rs-card ${kind}"${p.color?` style="--c:${p.color}"`:''}><span class="rs-head">${avatarContent(p.avatar)}</span><div><small>${label}</small><strong>${esc(p.name)}</strong><em>${detail}</em></div></article>`;
 const moved=mine?.previousRank?mine.previousRank-(me+1):0;
 return `<div class="round-summary">${card('lead','Na liderança',lead,lead.score.toLocaleString('pt-BR')+' pts')}${gain(jump)>0&&jump.id!==lead.id?card('jump','Maior salto',jump,'+'+gain(jump).toLocaleString('pt-BR')+' pts'):''}${mine?card('me','Sua posição',{...mine,name:(me+1)+'º lugar'},(gain(mine)>0?'+'+gain(mine).toLocaleString('pt-BR')+' pts':'sem pontos nesta rodada')+(moved?(moved>0?' · subiu '+moved:' · caiu '+-moved):'')):''}</div>`;
}
// Pódio final e torres do quiz. Quem manda na revelação é o professor: state.podiumStep (0 a 4) vem da sala,
// então o celular do aluno nunca mostra um lugar antes de ele aparecer no telão.
// 1 = 3º lugar, 2 = 2º lugar, 3 = campeão (+ comemoração), 4 = classificação completa.
const victoryNames=['chuva','fogos','baloes','estrelas','fitas'];
export function pickVictory(seed=''){
 const text=String(seed??'');
 let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return victoryNames[Math.abs(hash)%victoryNames.length];
}
const towerOrder=count=>count===1?[0]:count===2?[1,0]:count===3?[1,0,2]:count===4?[3,1,0,2]:count===5?[3,1,0,2,4]:[5,3,1,0,2,4];
export function leaderboardMarkup(state,{header,host,offset=0,final=false,shareDialog=()=>'',shareOpen=false}){
 const elapsed=Math.max(0,(Date.now()+offset-(state.resultStartedAt||Date.now()))/1000),step=state.podiumRevealed?4:state.podiumStep??4;
 const delay=atTime=>state.podiumRevealed?'-20s':Math.min(0,atTime-elapsed).toFixed(2)+'s';
 const victory=Number.isInteger(state.victory)&&state.victory>=0?victoryNames[state.victory%victoryNames.length]:pickVictory(`${state.code||''}:${state.resultStartedAt||0}`);
 const sortedTeams=(state.teams||[]).length?[...state.teams].sort((a,b)=>b.score-a.score):[];
 const topTeam=sortedTeams[0],teamTie=sortedTeams.length>1&&topTeam&&sortedTeams[1].score===topTeam.score;
 const isQuizStage=state.activity?.type==='quiz'||state.resultScope==='quiz'||!state.activity;
 const isQuizStageEnd=final&&Boolean(state.activity?.hasNext&&isQuizStage);
 const useQuizTowers=final&&(isQuizStageEnd||(!sortedTeams.length&&isQuizStage));
 const useTeamPodium=final&&!useQuizTowers&&sortedTeams.length>0;
 const board=((!final||useQuizTowers)?(state.quizRanking||state.ranking):state.ranking)||[];
 const winners=board.slice(0,3),champion=winners[0],me=board.findIndex(p=>p.id===state.me?.id);
 const podiumCount=useTeamPodium?Math.min(3,sortedTeams.length):Math.min(3,winners.length);
 const need=place=>podiumCount<=2?(place===2?1:3):(place===3?1:place===2?2:3);
 const at=place=>podiumCount<=2?(place===2?2:7):(place===3?2:place===2?4.5:7);
 const grandTitle=isQuizStageEnd?'RESULTADO DO QUIZ':!state.activity?.hasNext?'PLACAR GERAL FINAL':'RESULTADO DA ETAPA';
 const winnerName=useTeamPodium?(teamTie?sortedTeams.filter(t=>t.score===topTeam.score).map(t=>'Time '+t.name).join(' & '):'Time '+topTeam.name):champion?.name;
 const heading=final?(step>=3&&winnerName?`<span>${grandTitle}</span><h1 class="champion-title"><em>${esc(winnerName)}</em> ${useTeamPodium&&teamTie?'empataram':'venceu'}!</h1>`:`<span>${grandTitle}</span><h1>${step===0?'Quem conquistou o topo?':step===1?(podiumCount<=2?'E quem ficou em 1º?':'E em segundo lugar…'):'E quem levou o ouro?'}</h1>`):'<h1>Placar da rodada</h1>';
 const slotOrder=count=>count===1?[0]:count===2?[1,0]:[1,0,2];
 const quizTowersMarkup=()=>{
  const top=board.slice(0,6),max=Math.max(1,...top.map(p=>p.score));
  const order=towerOrder(top.length).filter(i=>top[i]);
  return `<div class="round-towers quiz-end-towers" data-step="${step}" data-count="${order.length}">${order.map(i=>{
   const p=top[i],place=i+1,shown=place<=3?step>=need(place):step>=4;
   const ratio=p.score>0?Math.max(.14,p.score/max):.08;
   const color=p.color||rankColors[i%rankColors.length];
   const mood=place===1?'win-'+((state.victory||0)%4):place<=3?'win-'+((state.victory||0)+i)%4:'idle';
   return `<article class="quiz-tower-slot place-${place}" data-shown="${shown}" data-me="${p.id===state.me?.id}" style="--tower-ratio:${ratio.toFixed(4)};--tower-previous:0.06;--tower-delay:${delay(place<=3?at(place):8.2)};--player-color:${esc(color)}">${shown?`${place===1&&p.score>0?'<span class="quiz-tower-crown" aria-hidden="true">👑</span>':''}${character(p,i,mood)}<strong>${esc(p.name)}</strong><small>${p.score.toLocaleString('pt-BR')} pts</small>`:'<div class="final-mystery" aria-hidden="true">?</div>'}<div class="round-tower"><b>${place===1?'♛':place+'º'}</b><span>${shown?p.score.toLocaleString('pt-BR'):'—'}</span></div></article>`;
  }).join('')}</div>`;
 };
 const teamPodiumMarkup=()=>{
  const topTeams=sortedTeams.slice(0,3);
  return `<div class="final-podium final-podium-teams" data-step="${step}" data-count="${topTeams.length}">${slotOrder(topTeams.length).filter(i=>topTeams[i]).map(i=>{
   const team=topTeams[i],shown=step>=need(i+1);
   const isChamp=i===0&&shown&&team.score>0;
   const members=(team.members||[]);
   const shownMembers=members.slice(0,6);
   const crewScale=shownMembers.length<=1?.82:shownMembers.length===2?.68:shownMembers.length===3?.56:shownMembers.length===4?.48:.4;
   const memberChars=shownMembers.map((m,mi)=>`<span class="team-podium-member">${character({...m,color:team.color},mi,'win-'+((state.victory||0)+i+mi)%4)}</span>`).join('');
   const memberNames=members.map(m=>esc(m.name)).join(', ');
   return `<article class="final-contestant team-podium-slot place-${i+1}${isChamp?' final-team-champion':''}" data-shown="${shown}" style="--reveal-delay:${delay(at(i+1))};--player-color:${esc(team.color)};--team:${esc(team.color)};--crew-scale:${crewScale}">${shown?`${isChamp?'<span class="ftc-crown" aria-hidden="true">👑</span>':''}<div class="team-podium-crew" data-size="${shownMembers.length}">${memberChars}${members.length>6?`<em class="team-crew-more">+${members.length-6}</em>`:''}</div><strong>Time ${esc(team.name)}</strong><span>${team.score.toLocaleString('pt-BR')} pts</span><small class="team-podium-names" title="${memberNames}">${memberNames||'Sem integrantes'}</small>`:'<div class="final-mystery" aria-hidden="true">?</div>'}<div class="final-tower"><b>${i===0?'♛':i+1+'º'}</b></div></article>`;
  }).join('')}</div>`;
 };
 const individualPodiumMarkup=()=>`<div class="final-podium" data-step="${step}" data-count="${Math.min(3,winners.length)}">${slotOrder(Math.min(3,winners.length)).filter(i=>winners[i]).map(i=>{const p=winners[i],shown=step>=need(i+1);return `<article class="final-contestant place-${i+1}" data-shown="${shown}" style="--reveal-delay:${delay(at(i+1))};--player-color:${p.color||['#ac8ae8','#78baac','#e9b97e'][i]}">${shown?`${i===0&&p.score>0?'<span class="ftc-crown" aria-hidden="true">👑</span>':''}${character(p,i,'win-'+((state.victory||0)+i)%4)}<strong>${esc(p.name)}</strong><span>${p.score.toLocaleString('pt-BR')} pts</span>`:'<div class="final-mystery" aria-hidden="true">?</div>'}<div class="final-tower"><b>${i===0?'♛':i+1+'º'}</b></div></article>`;}).join('')}</div>`;
 const podium=final?`<div class="final-spotlights" aria-hidden="true" data-on="${step>=3}"></div>${useQuizTowers?quizTowersMarkup():useTeamPodium?teamPodiumMarkup():individualPodiumMarkup()}${step>=3?`<div class="final-confetti" data-victory="${victory}" aria-hidden="true" style="--reveal-delay:${delay(7.3)}">${Array.from({length:30},(_,i)=>`<i style="--n:${i};--x:${(i*37+11)%100};--y:${(i*53+7)%70};--h:${(i*47)%360};--t:${(2.6+(i%7)*.35).toFixed(2)}s;--w:${((i*13)%20)/10}s;--r:${i%2?1:-1}"></i>`).join('')}</div>`:''}`:roundSummary(state)+rankRace(state,elapsed);
 const mine=final&&!host&&me>=0&&step>=4?`<p class="final-mine"><b>${me+1}º lugar</b> · ${board[me].score.toLocaleString('pt-BR')} pts</p>`:'';
 const actions=host
  ?(final
    ?`${step<4?'<button class="btn secondary" data-action="podium-all">Revelar todos</button>':''}<button class="btn primary" data-action="${state.activity?.hasNext?'next-stage':'back-lesson'}">${state.activity?.hasNext?'Próxima etapa →':'Voltar aos slides'}</button><button class="btn secondary" data-action="leave">Sair</button>${!state.activity?.hasNext&&step>=4?'<button class="text-btn" data-action="export">Baixar resultado (PNG)</button>':''}`
    :'<button class="btn primary" data-action="next-question">Próxima pergunta →</button><button class="btn secondary" data-action="leave">Sair</button>')
  :`${!final?'<p>Aguarde o professor continuar.</p>':''}<button class="btn secondary" data-action="leave">Sair</button>`;
 return `${header()}<main class="game-results ${final?'grand-finale':'round-results'}${useQuizTowers?' is-quiz-towers':''}"${final?` data-victory="${victory}" data-step="${step}"`:''}><div class="results-heading">${heading}</div>${podium}${mine}${actions?`<section class="game-results-actions">${actions}</section>`:''}${!final||step>=4?`<details class="result-standings ${final?'final-standings':''}" style="--reveal-delay:${final?delay(9):'0s'}"><summary>Classificação completa</summary><section class="standings-list">${board.map((p,i)=>`<div${p.color?` style="--c:${p.color}"`:''}><b>${i+1}</b>${avatarContent(p.avatar)}<strong>${esc(p.name)}</strong><span>${p.score.toLocaleString('pt-BR')} pts</span><small>${p.correct?p.correct+' acertos':''}</small></div>`).join('')}</section></details>`:''}</main>${shareOpen?shareDialog():''}`;
}
export function quizMarkup(state,{header,host,demo,status,shareDialog,shareOpen}){
 const q=state.question,revealed=state.phase==='reveal',answer=state.me?.answer,canAnswer=(!host||demo)&&!answer&&!revealed&&status==='online';
 const wideOptions=!q.bare&&q.options.some(option=>String(option||'').trim().length>42);
 return `${header()}<main class="quiz-page game-question ${revealed?'answer-revealed':''}${q.bare?' bare-question':''}"><div class="game-question-top"><span class="quiz-count">PERGUNTA <strong>${state.questionIndex+1}</strong> / ${state.totalQuestions}</span><div class="timer ${revealed?'done':''}"><strong id="time-left">—</strong><span>s</span></div>${state.me?.streak>=2?`<span class="streak-badge" data-n="${state.me.streak}">${state.me.streak} seguidas</span>`:''}</div><div class="question-card"><div class="time-track"><div id="time-bar"></div></div>${q.bare?`<p class="bare-hint">${revealed?'Confira a resposta no telão':'Leia a pergunta no telão e toque na sua resposta'}</p>`:`<h1>${esc(q.text)}</h1>`}<div class="answer-options${q.bare?' bare-answers':''}" data-wide-options="${wideOptions}" style="--count:${q.options.length}">${q.options.map((option,i)=>`<button class="answer-option answer-${i} ${answer?.choice===i?'chosen':''} ${revealed&&i===q.correct?'correct':''} ${revealed&&answer?.choice===i&&i!==q.correct?'incorrect':''}" aria-label="Alternativa ${'ABCD'[i]}" data-answer="${i}" ${canAnswer?'':'disabled'}><span class="answer-letter">${'ABCD'[i]}</span>${q.bare?'':`<span class="option-copy">${esc(option)}</span>`}${revealed&&i===q.correct?'<b class="correct-mark">✓</b>':''}</button>`).join('')}</div>${revealed?`<div class="answer-explanation"><strong>${answer?answer.correct?'Acertou! +'+answer.points+' pontos':'Vamos para a próxima!':'Resposta: '+ 'ABCD'[q.correct]}</strong>${q.bare?'':`<p>${esc(q.explanation)}</p>`}</div>`:''}${answer&&!revealed?'<p class="answer-status" role="status">✓ Resposta registrada.</p>':''}<footer class="question-footer"><span>${state.answeredCount} de ${state.ranking.length} responderam</span>${host?`<button class="btn primary" data-action="${revealed?'show-ranking':'reveal'}">${revealed?state.questionIndex+1===state.totalQuestions?'Grande resultado final':'Mostrar classificação':'Revelar resposta'} →</button>`:''}</footer></div></main>${shareOpen?shareDialog():''}`;
}
