// Formulários do editor para as perguntas do quiz e para a enquete.
import {esc} from './canvas-view.js';
import {toggleMusicPreview,musicPreviewChanged} from './game-settings-ui.js';
const letters='ABCD',presets=[10,20,30,60,90,120];
export function quizEditorMarkup(q,difficulties,toolbar){
 const n=q.options.length;
 return `${toolbar}<div class="qe">
 <section class="qe-card qe-question"><label class="qe-label" for="question-text">Pergunta</label><textarea id="question-text" data-scope="question" data-field="text" rows="2" maxlength="500" placeholder="Escreva a pergunta…">${esc(q.text)}</textarea></section>
 <section class="qe-card"><div class="qe-row"><div><span class="qe-label">Alternativas</span><small>Clique no ✓ da resposta certa</small></div><div class="qe-seg" role="radiogroup" aria-label="Número de alternativas">${[2,3,4].map(c=>`<label><input type="radio" name="question-option-count" data-scope="question" data-field="optionCount" value="${c}" ${n===c?'checked':''}><span>${c}</span></label>`).join('')}</div></div>
  <div class="qe-options">${q.options.map((option,i)=>`<div class="qe-option" data-letter="${letters[i]}"><b aria-hidden="true">${letters[i]}</b><input id="option-${i}" data-scope="question" data-option="${i}" value="${esc(option)}" aria-label="Alternativa ${letters[i]}" maxlength="500" placeholder="Alternativa ${letters[i]}"><label class="qe-check" title="Marcar ${letters[i]} como correta"><input type="radio" name="correct-answer" id="correct-${i}" data-scope="question" data-field="correct" value="${i}" aria-label="Alternativa correta: ${letters[i]}" ${q.correct===i?'checked':''}><span aria-hidden="true">✓</span></label></div>`).join('')}</div></section>
 <section class="qe-card qe-meta"><div><span class="qe-label">Dificuldade</span><div class="qe-seg wide" role="radiogroup" aria-label="Dificuldade">${Object.keys(difficulties).map(d=>`<label><input type="radio" name="question-difficulty" data-scope="question" data-field="difficulty" value="${esc(d)}" ${q.difficulty===d?'checked':''}><span>${esc(d)}</span></label>`).join('')}</div><small id="difficulty-points">Até ${difficulties[q.difficulty].toLocaleString('pt-BR')} pontos</small></div>
  <div><label class="qe-label" for="question-seconds">Tempo para responder</label><div class="qe-time"><div class="qe-chips">${presets.map(v=>`<button type="button" data-qe-seconds="${v}" aria-pressed="${q.seconds===v}">${v}s</button>`).join('')}</div><span class="qe-number"><input id="question-seconds" data-scope="question" data-field="seconds" type="number" min="5" max="300" step="1" value="${q.seconds}"><i>s</i></span></div><small>De 5 a 300 segundos.</small></div></section>
 <section class="qe-card"><label class="qe-label" for="question-explanation">Explicação da resposta <em>opcional</em></label><textarea id="question-explanation" data-scope="question" data-field="explanation" rows="2" placeholder="Aparece depois que a resposta é revelada.">${esc(q.explanation||'')}</textarea></section></div>`;
}
export function pollEditorMarkup(poll,toolbar){
 const n=poll.options.length;
 return `${toolbar}<div class="qe qe-poll"><header class="qe-head"><span>📊</span><div><h2>Enquete</h2><p>A turma vota pelo celular e o resultado aparece na hora. Não tem resposta certa.</p></div></header>
 <section class="qe-card qe-question"><label class="qe-label" for="poll-text">Pergunta da enquete</label><textarea id="poll-text" data-poll-field="text" rows="2" maxlength="500" placeholder="O que você quer saber da turma?">${esc(poll.text)}</textarea></section>
 <section class="qe-card"><div class="qe-row"><div><span class="qe-label">Opções</span><small>De 2 a 4 opções</small></div></div>
  <div class="qe-options">${poll.options.map((option,i)=>`<div class="qe-option" data-letter="${letters[i]}"><b aria-hidden="true">${letters[i]}</b><input data-poll-option="${i}" value="${esc(option)}" aria-label="Opção ${letters[i]}" maxlength="200" placeholder="Opção ${letters[i]}">${n>2?`<button type="button" class="qe-remove" data-poll-edit="remove" data-index="${i}" aria-label="Remover opção ${letters[i]}" title="Remover">×</button>`:''}</div>`).join('')}</div>
  ${n<4?'<button type="button" class="qe-add" data-poll-edit="add">+ Adicionar opção</button>':''}</section></div>`;
}
export function wireQuizEditor(root,studio,callbacks){
 const poll=()=>studio.draft?.slides[studio.index]?.poll;
 const refresh=()=>{const preview=root.querySelector('#editor-mini-preview');if(preview)preview.innerHTML=studio.previewMarkup();};
 root.addEventListener('click',event=>{
  const music=event.target.closest('[data-music-preview]');if(music){toggleMusicPreview(music,studio,callbacks.toast);return;}
  const chip=event.target.closest('[data-qe-seconds]');
  if(chip){const input=root.querySelector('#question-seconds');if(input&&!input.disabled){input.value=chip.dataset.qeSeconds;input.dispatchEvent(new Event('input',{bubbles:true}));}return;}
  const edit=event.target.closest('[data-poll-edit]'),current=poll();
  if(!edit||!current||!studio.groups.canEdit)return;
  if(edit.dataset.pollEdit==='add'&&current.options.length<4)current.options.push('');
  else if(edit.dataset.pollEdit==='remove'&&current.options.length>2)current.options.splice(Number(edit.dataset.index),1);
  else return;
  studio.markDirty();callbacks.render();
  if(edit.dataset.pollEdit==='add')root.querySelector(`[data-poll-option="${current.options.length-1}"]`)?.focus();
 });
 root.addEventListener('input',event=>{
  const input=event.target;
  if(input.dataset?.gameSetting)musicPreviewChanged(input);
  if(input.id==='question-seconds')for(const chip of root.querySelectorAll('[data-qe-seconds]'))chip.setAttribute('aria-pressed',String(chip.dataset.qeSeconds===input.value));
  if(input.dataset?.pollField==='text')refresh();
  if(input.dataset?.pollOption===undefined)return;
  const current=poll();if(!current||!studio.groups.canEdit)return;
  current.options[Number(input.dataset.pollOption)]=input.value;studio.markDirty();refresh();
 });
}
