// Editor das etapas interativas (equipes, relâmpago, sobrevivência, desafio, sorteio, cabo de guerra, corrida).
import { gameNames, gameHints, isGameType } from './stage-games.js';
import { gameIcon } from './stage-games-view.js';
import { studioIcon } from './studio-icons.js';
import {flashcardRequest,cardsFromQuestions} from './flashcards.js';
import { Simulations, simulationMarkup, simulationGroups, simulationNames } from './simulations.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const FIELDS = '[data-param],[data-sim-select],[data-sim-text],[data-sim-toggle]';
const readField = field => field.dataset.simToggle !== undefined ? field.dataset.value || '0' : String(field.value);
const labelOf = field => String(field.getAttribute('aria-label') || field.closest('label')?.textContent || field.textContent || 'Controle').replace(/\s+/g, ' ').trim().slice(0, 60);
const kindOf = field => field.dataset.simToggle !== undefined ? 'toggle' : field.tagName === 'SELECT' ? 'select' : field.type === 'range' ? 'range' : 'text';

// Lê os controles do experimento como estão agora: vira a "resposta certa".
export function captureAnswer(root, previous = []) {
  return [...(root?.querySelectorAll(FIELDS) || [])].slice(0, 16).filter(field => field.type !== 'hidden').map((field, index) => {
    const k = kindOf(field);
    return { k, label: labelOf(field), v: readField(field).slice(0, 80), ...(k === 'range' ? { min: Number(field.min) || 0, max: Number(field.max) || 100 } : {}), ...(previous[index]?.skip ? { skip: true } : {}) };
  });
}

export function stageMiniMarkup(slide) {
  const g = slide.game;
  return `<div class="mini-slide mini-game"><span>${gameIcon(g.type)} ${esc(gameNames[g.type].toUpperCase())}</span><h3>${esc(g.text)}</h3></div>`;
}

export class StageEditor {
  constructor(studio) {
    this.studio = studio; this.simulations = new Simulations();
    const root = studio.root;
    root.addEventListener('input', event => {
      const field = event.target.closest('[data-game-field]');
      if (!field) return;
      const game = this.game(); if (!game) return;
      const key = field.dataset.gameField;
      if (key === 'text') { game.text = field.value; this.studio.draft.slides[this.studio.index].title = field.value.slice(0, 160) || gameNames[game.type]; }
      else if (key === 'options') game.options = field.value.split('\n').slice(0, game.type === 'tug' ? 2 : 4);
      else if (key === 'option') game.options[Number(field.dataset.index)] = field.value;
      else if (key === 'fc-front' || key === 'fc-back') { const card=game.cards?.[Number(field.dataset.index)];if(!card)return;card[key==='fc-front'?'front':'back']=field.value; }
      else if (key === 'sv-text') this.list(game, field)[Number(field.dataset.q)].text = field.value;
      else if (key === 'sv-option') this.list(game, field)[Number(field.dataset.q)].options[Number(field.dataset.index)] = field.value;
      else if (key === 'tolerance') { game.tolerance = Number(field.value) || 5; const out = field.parentElement.querySelector('output'); if (out) out.textContent = game.tolerance + '%'; }
      else if (key === 'hints') game.hints = field.value.split('\n').map(line => line.slice(0, 160));
      else return;
      this.changed();
    });
    root.addEventListener('change', event => {
      const field = event.target.closest('[data-game-field]');
      if (!field) return;
      const game = this.game(); if (!game) return;
      const key = field.dataset.gameField;
      if (key === 'count') game.count = Number(field.value) || 2;
      else if (key === 'pick') game.pick = field.value === '1';
      else if (key === 'goal') game.goal = Number(field.value) || 100;
      else if (key === 'tug-tolerance') game.tolerance = Math.max(0, Number(field.value) || 0);
      else if (key === 'correct') game.correct = Number(field.value) || 0;
      else if (key === 'seconds') game.seconds = Number(field.value) || 15;
      else if (key === 'sv-correct') this.list(game, field)[Number(field.dataset.q)].correct = Number(field.value) || 0;
      else if (key === 'simulation') { game.simulation = field.value; game.answer = []; }
      else if (key === 'hintSeconds') game.hintSeconds = Number(field.value) || 20;
      else if (key === 'leaderMode') game.leaderMode = field.value !== '0';
      else if (key === 'skip') { const item = game.answer?.[Number(field.dataset.index)]; if (item) { if (field.checked) delete item.skip; else item.skip = true; } }
      else if (key === 'options') { /* já tratado em input */ }
      else return;
      this.changed(true);
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-game-edit]');
      if (!button) return;
      const game = this.game(); if (!game) return;
      const action = button.dataset.gameEdit;
      if (action === 'capture') {
        game.answer = captureAnswer(root.querySelector('[data-game-answer-sim]'), game.answer);
        this.studio.callbacks.toast('Resposta marcada com os valores atuais do experimento.');
      } else if (action === 'fc-add' && game.type==='flashcards') {
        if(game.cards.length>=100)return;game.cards.push({front:'',back:''});
      } else if (action === 'fc-remove' && game.type==='flashcards') {
        if(game.cards.length<=1)return;game.cards.splice(Number(button.dataset.index),1);
      } else if (action === 'fc-import' && game.type==='flashcards') {
        if(!this.studio.groups.canEdit)return;
        const id=root.querySelector('[data-fc-import-select]')?.value,deck=this.studio.flashcards.decks.find(d=>d.id===id);
        if(!deck?.cards.length){this.studio.callbacks.toast('Escolha um conjunto com cartões.');return;}
        if(game.cards.some(c=>c.front.trim()||c.back.trim())&&!confirm('Substituir os cartões desta etapa pelo conjunto escolhido?'))return;
        game.cards=deck.cards.slice(0,100).map(c=>({front:c.front.slice(0,700),back:c.back.slice(0,1500)}));
      } else if (action === 'fc-ai' && game.type==='flashcards') { this.aiFlashcards(); return;
      } else if (action.startsWith('sv-')) {
        // No cabo de guerra as perguntas ficam dentro de rodadas (data-r); nas outras etapas, numa lista só.
        const inRound = button.dataset.r !== undefined, list = this.list(game, button), index = Number(button.dataset.q), q = list?.[index];
        if (action === 'sv-add-round') { if (game.rounds.length >= 12) return; game.rounds.push([{ text: '', options: ['', ''], correct: 0 }]); }
        else if (action === 'sv-remove-round') { if (game.rounds.length <= 1) return; game.rounds.splice(Number(button.dataset.r), 1); }
        else if (action === 'sv-add-q' && list.length < (inRound ? 3 : 25)) list.push({ text: '', options: ['', ''], correct: 0 });
        else if (action === 'sv-remove-q' && list.length > 1) list.splice(index, 1);
        else if (action === 'sv-add-option' && q?.options.length < 4) q.options.push('');
        else if (action === 'sv-remove-option' && q?.options.length > 2) { q.options.splice(Number(button.dataset.index), 1); q.correct = Math.min(q.correct, q.options.length - 1); }
        else return;
      } else if (action === 'add-option' && game.options.length < 4) game.options.push('');
      else if (action === 'remove-option' && game.options.length > 2) { game.options.splice(Number(button.dataset.index), 1); game.correct = Math.min(game.correct, game.options.length - 1); }
      else if (action === 'ai-questions') { this.aiQuestions(); return; }
      else return;
      this.changed(true);
  });
  }
  list(game, node) { return node.dataset.r !== undefined ? game.rounds[Number(node.dataset.r)] : game.questions; }
  game() { const s = this.studio; return s.view === 'editor' && s.tab === 'slides' ? s.draft?.slides?.[s.index]?.game : null; }
  changed(repaint = false) { this.studio.markDirty(); if (repaint) this.studio.callbacks.render(); }
  // Botão da barra nas etapas: nas dinâmicas de pergunta, gera as perguntas;
  // nas demais (equipes, sorteio, desafio, enquete), abre o chat do Storage AI.
  aiAssist() {
    const s = this.studio, slide = s.draft?.slides?.[s.index], g = slide?.game;
    if (!s.groups.canEdit) return;
    if (g?.type==='flashcards') return this.aiFlashcards();
    if (g && ['flash', 'survival', 'race', 'tug'].includes(g.type)) return this.aiQuestions();
    if (g || slide?.poll) { s.action('storage-ai'); return; }
  }
  // Storage AI nas etapas: escreve perguntas para relâmpago, sobrevivência,
  // corrida e cabo de guerra com base no conteúdo real dos slides da aula.
  async aiQuestions() {
    const s = this.studio, slide = s.draft?.slides?.[s.index], g = slide?.game;
    if (!g || !['flash', 'survival', 'race', 'tug'].includes(g.type)) return;
    const button = s.root.querySelector('[data-game-edit="ai-questions"]');
    const note = s.root.querySelector('[data-ai-note]');
    if (button) { button.disabled = true; button.classList.add('is-loading'); }
    if (note) note.textContent = 'O Storage AI está escrevendo as perguntas…';
    try {
      const skip = [...(g.questions || []), ...(g.rounds || []).flat()].map(q => q?.text).filter(Boolean);
      const questions = await s.ai.stageQuestions({ count: g.type === 'tug' ? 8 : 10, skip });
      if (!questions.length) throw Error('A IA não retornou perguntas. Tente novamente.');
      if (g.type === 'tug') {
        g.rounds = [];
        for (let i = 0; i < questions.length; i += 2) g.rounds.push(questions.slice(i, i + 2));
      } else {
        g.questions = questions;
      }
      s.markDirty();
      s.callbacks.toast(`${questions.length} perguntas geradas pelo Storage AI.`);
    } catch (error) {
      s.callbacks.toast(error?.message || 'Não foi possível gerar as perguntas.');
      if (note) note.textContent = error?.message || 'Não foi possível gerar as perguntas.';
      if (button) { button.disabled = false; button.classList.remove('is-loading'); }
      return;
    }
    s.callbacks.render();
  }
  async aiFlashcards() {
    const s=this.studio,lesson=s.draft,slide=lesson?.slides?.[s.index],g=slide?.game;
    if(!g||g.type!=='flashcards'||!s.groups.canEdit||this.flashcardBusy)return;
    if(!s.account.user){s.account.show('login');s.callbacks.toast('Entre na conta para gerar flashcards com o Storage AI.');return;}
    if(g.cards.some(c=>c.front.trim()||c.back.trim())&&!confirm('O Storage AI vai substituir os cartões desta etapa. Continuar?'))return;
    const uid=s.account.user.id,original=JSON.stringify(g.cards),button=s.root.querySelector('[data-game-edit="fc-ai"]'),note=s.root.querySelector('[data-fc-ai-note]');
    this.flashcardBusy=true;if(button)button.disabled=true;if(note)note.textContent='O Storage AI está preparando os cartões…';
    try {
      const result=await s.ai.ask(flashcardRequest(g.text==='Flashcards'?'':g.text,lesson,6),AbortSignal.timeout(90000));
      if(s.account.user?.id!==uid||s.draft!==lesson||!s.groups.canEdit||!lesson.slides.includes(slide)||slide.game!==g)throw Error('A aula ou a conta mudou. Os cartões não foram aplicados.');
      if(JSON.stringify(g.cards)!==original)throw Error('Os cartões foram alterados durante a geração. O resultado não foi aplicado.');
      const cards=cardsFromQuestions(result?.questions,6).map(({front,back})=>({front,back}));
      if(!cards.length)throw Error('A IA não retornou cartões válidos. Tente novamente.');
      g.cards=cards;s.markDirty();s.callbacks.toast(`${cards.length} cartões gerados. Revise as respostas antes de apresentar.`);s.callbacks.render();
    }catch(error){const message=error?.name==='TimeoutError'?'A geração demorou demais. Tente novamente.':error?.message||'Não foi possível gerar os cartões.';s.callbacks.toast(message);if(note?.isConnected)note.textContent=message;}
    finally{this.flashcardBusy=false;if(button?.isConnected)button.disabled=false;}
  }
  markup() {
    const s = this.studio, slide = s.draft.slides[s.index];
    // Uma etapa vazia nunca deve criar um jogo no slide selecionado de outra etapa.
    if (s.currentBlock && !s.currentBlock()?.items.includes(slide?.id)) return '<div class="editor-empty"><h2>Etapa vazia</h2><p>Use as opções da etapa para removê-la ou adicione uma nova atividade.</p></div>';
    // Renderizar não deve criar uma atividade nem alterar o conteúdo da aula.
    if (!slide?.game || (isGameType(s.currentBlock?.()?.type) && slide.game.type !== s.currentBlock().type)) return '<div class="editor-empty"><h2>Atividade indisponível</h2><p>Esta etapa não contém uma atividade compatível. Nenhum conteúdo foi alterado.</p></div>';
    const g = slide.game, off = s.groups?.canEdit === false ? 'disabled' : '';
    // Etapas salvas no formato antigo: relâmpago de uma pergunta só e cabo de guerra com lista única.
    if (g.type === 'flash' && !Array.isArray(g.questions)) { g.questions = [{ text: g.text || '', options: Array.isArray(g.options) && g.options.length >= 2 ? g.options : ['', ''], correct: g.correct || 0 }]; g.text = 'Desafio relâmpago'; g.seconds = 10; delete g.options; delete g.correct; }
    if (g.type === 'tug' && !Array.isArray(g.rounds)) { g.rounds = (Array.isArray(g.questions) && g.questions.length ? g.questions : [{ text: '', options: ['', ''], correct: 0 }]).slice(0, 12).map(q => [q]); delete g.questions; }
    const field = (label, html, hint = '') => `<div class="stage-field"><label>${label}</label>${html}${hint ? `<small>${hint}</small>` : ''}</div>`;
    let body = field(g.type === 'teams' ? 'Frase de abertura' : g.type === 'raffle' ? 'Título do sorteio' : g.type === 'tug' || g.type === 'race' || g.type === 'flash' || g.type === 'flashcards' ? 'Título no telão' : g.type === 'challenge' ? 'Meta que os alunos devem atingir' : 'Pergunta', `<input type="text" data-game-field="text" maxlength="300" value="${esc(g.text)}" ${off}>`);
    if (g.type === 'flashcards') {
      const decks=s.flashcards.decks.filter(d=>d.cards.length);
      body+=`<div class="stage-field fc-stage-editor"><label>Cartões (${g.cards.length} de 100)</label><small>Durante a apresentação, você vira os cartões para toda a turma. Esta etapa não altera o placar.</small>${g.cards.map((card,i)=>`<fieldset class="stage-question fc-stage-fields"><legend>Cartão ${i+1}</legend><label>Frente<textarea data-game-field="fc-front" data-index="${i}" maxlength="700" rows="2" placeholder="Pergunta ou conceito" ${off}>${esc(card.front)}</textarea></label><label>Verso<textarea data-game-field="fc-back" data-index="${i}" maxlength="1500" rows="3" placeholder="Resposta ou explicação" ${off}>${esc(card.back)}</textarea></label>${g.cards.length>1?`<button type="button" class="studio-btn quiet" data-game-edit="fc-remove" data-index="${i}" ${off}>Excluir cartão</button>`:''}</fieldset>`).join('')}${g.cards.length<100?`<button type="button" class="studio-btn accent" data-game-edit="fc-add" ${off}>+ Adicionar cartão</button>`:''}</div>`;
      if(!off)body+=`<div class="stage-field fc-stage-tools"><label>Usar um conjunto de Flashcards</label>${decks.length?`<select data-fc-import-select aria-label="Escolher conjunto de flashcards">${decks.map(d=>`<option value="${esc(d.id)}">${esc(d.title)} · ${d.cards.length} cartões</option>`).join('')}</select><button type="button" class="studio-btn quiet" data-game-edit="fc-import">Copiar para esta etapa</button><small>A cópia fica salva na apresentação e é independente do conjunto original.</small>`:'<small>Crie um conjunto em Flashcards no menu para poder copiá-lo aqui.</small>'}</div><div class="stage-field stage-ai-field"><button type="button" class="studio-btn quiet" data-game-edit="fc-ai">${studioIcon('sparkle')} Gerar cartões com Storage AI</button><small data-fc-ai-note>A IA usa o título da aula e o texto visível dos slides; imagens e notas não são lidas. Substitui os cartões atuais. Confira as respostas.</small></div>`;
    }
    if (g.type === 'teams') body += field('Quantos times', `<select data-game-field="count" ${off}>${Array.from({ length: 9 }, (_, i) => i + 2).map(n => `<option value="${n}" ${g.count === n ? 'selected' : ''}>${n} times</option>`).join('')}</select>`, 'Os pontos do quiz e das outras dinâmicas somam para o time, e o placar aparece nos rankings. Coloque esta etapa antes do quiz; se quiser mostrar o placar final, adicione outra etapa "Equipes" no fim. Na apresentação dá para mudar a quantidade na hora, sem perder nome, foto e líder dos times. Toque no nome de um aluno para torná-lo líder: o líder pode trocar o nome e a foto da equipe pelo próprio celular.');
    if (g.type === 'teams') body += field('Como formar os times', `<select data-game-field="pick" ${off}><option value="0" ${g.pick ? '' : 'selected'}>Sorteio automático</option><option value="1" ${g.pick ? 'selected' : ''}>Cada aluno escolhe o seu time</option></select>`, g.pick ? 'Os alunos tocam no time que querem no celular. Quando você fechar a escolha (ou passar de etapa), quem não escolheu entra no time com menos gente.' : 'Os alunos são distribuídos automaticamente, sempre equilibrando os times.');
    // Um cartão por pergunta. `r` é a rodada (só no cabo de guerra).
    const cards = (list, r, legend, removable) => list.map((q, n) => { const at = `data-q="${n}"${r === undefined ? '' : ` data-r="${r}"`}`; return `<fieldset class="stage-question"><legend>${legend(n)}</legend><input type="text" data-game-field="sv-text" ${at} maxlength="300" value="${esc(q.text)}" placeholder="Escreva a pergunta" ${off}>
        <div class="stage-options">${q.options.map((option, i) => `<div><input type="radio" name="sv-correct-${r ?? 'q'}-${n}" data-game-field="sv-correct" ${at} value="${i}" ${q.correct === i ? 'checked' : ''} aria-label="Opção ${'ABCD'[i]} é a correta" ${off}><input type="text" data-game-field="sv-option" ${at} data-index="${i}" maxlength="200" value="${esc(option)}" placeholder="Opção ${'ABCD'[i]}" ${off}>${q.options.length > 2 ? `<button type="button" class="studio-btn quiet" data-game-edit="sv-remove-option" ${at} data-index="${i}" aria-label="Remover opção" ${off}>×</button>` : ''}</div>`).join('')}</div>
        <div class="stage-question-tools">${q.options.length < 4 ? `<button type="button" class="studio-btn quiet" data-game-edit="sv-add-option" ${at} ${off}>＋ Opção</button>` : ''}${removable ? `<button type="button" class="studio-btn quiet" data-game-edit="sv-remove-q" ${at} ${off}>Excluir pergunta</button>` : ''}</div></fieldset>`; }).join('');
    const questionList = hint => `<div class="stage-field"><label>Perguntas (marque a opção certa de cada uma)</label>${cards(g.questions, undefined, n => 'Pergunta ' + (n + 1), g.questions.length > 1)}
        ${g.questions.length < 25 ? `<button type="button" class="studio-btn accent" data-game-edit="sv-add-q" ${off}>＋ Adicionar pergunta</button>` : ''}<small>${hint}</small></div>`;
    const roundList = hint => `<div class="stage-field"><label>Rodadas (${g.rounds.length} de 12)</label>${g.rounds.map((round, r) => `<fieldset class="stage-round"><legend>Rodada ${r + 1}${round.length > 1 ? ` · sorteia 1 de ${round.length}` : ''}</legend>
        ${cards(round, r, n => round.length > 1 ? 'Opção ' + (n + 1) + ' de pergunta' : 'Pergunta', round.length > 1)}
        <div class="stage-round-tools">${round.length < 3 ? `<button type="button" class="studio-btn quiet" data-game-edit="sv-add-q" data-r="${r}" ${off}>＋ Outra pergunta para sortear</button>` : ''}${g.rounds.length > 1 ? `<button type="button" class="studio-btn quiet" data-game-edit="sv-remove-round" data-r="${r}" ${off}>Excluir rodada</button>` : ''}</div></fieldset>`).join('')}
        ${g.rounds.length < 12 ? `<button type="button" class="studio-btn accent" data-game-edit="sv-add-round" ${off}>＋ Adicionar rodada</button>` : ''}<small>${hint}</small></div>`;
    if (g.type === 'flash') {
      body += field('Tempo por pergunta', `<select data-game-field="seconds" ${off}>${[5, 10, 15, 20].map(n => `<option value="${n}" ${g.seconds === n ? 'selected' : ''}>${n} segundos</option>`).join('')}</select>`, 'Tempo curto é a graça do relâmpago: 5 ou 10 segundos por pergunta. Quando o tempo acaba ou todos respondem, a resposta e os pontos aparecem e você avança para a próxima.');
      body += questionList('Acerto vale de 100 a 200 pontos (quanto mais rápido, mais pontos) e quem acerta primeiro em cada pergunta leva +100. Use perguntas curtas, de resposta direta.');
    }
    if (g.type === 'survival') {
      body += field('Tempo por pergunta', `<select data-game-field="seconds" ${off}>${[8, 10, 15, 20, 30, 45].map(n => `<option value="${n}" ${g.seconds === n ? 'selected' : ''}>${n} segundos</option>`).join('')}</select>`, 'Cada aluno tem 1 vida: quem errar ou não responder a tempo cai e só assiste. Quem ficar de pé até o fim ganha 500 pontos.');
      body += questionList('Dica: comece fácil e vá dificultando. A partida termina quando sobrar uma pessoa ou acabarem as perguntas.');
    }
    if (g.type === 'race') {
      body += field('Tempo por pergunta', `<select data-game-field="seconds" ${off}>${[8, 10, 15, 20, 30, 45].map(n => `<option value="${n}" ${g.seconds === n ? 'selected' : ''}>${n} segundos</option>`).join('')}</select>`, 'Você só dá a largada: quando todos respondem (ou o tempo acaba) a próxima pergunta vem sozinha. Quem acerta vê o boneco correr na hora, de 10 a 20 metros: quanto mais rápida a resposta, mais longe. Quem erra fica parado naquela rodada.');
      body += questionList('Quem for mais longe ao fim das perguntas vence: 1º lugar ganha 500 pontos, 2º 300, 3º 200 e os demais que acertaram alguma, 100.');
    }
    if (g.type === 'raffle') body += '<p class="stage-help">Uma roleta com o nome de quem está na sala. Ninguém é sorteado duas vezes até todos terem saído.</p>';
    if (g.type === 'tug') {
      body += field('Os dois lados', `<div class="stage-options two">${[0, 1].map(i => `<input type="text" data-game-field="option" data-index="${i}" maxlength="60" value="${esc(g.options[i] || '')}" placeholder="Lado ${'AB'[i]}" ${off}>`).join('')}</div>`, 'Se a aula tiver uma etapa "Equipes" antes, os lados viram os próprios times (com o nome e a cor deles). Sem equipes, a turma é dividida ao meio com estes nomes.');
      body += field('Tempo por pergunta', `<select data-game-field="seconds" ${off}>${[8, 10, 15, 20, 30, 45].map(n => `<option value="${n}" ${g.seconds === n ? 'selected' : ''}>${n} segundos</option>`).join('')}</select>`, 'A rodada termina quando todos responderem, quando o tempo acabar ou pelo comando do apresentador.');
      body += field('Tolerância para vencer', `<select data-game-field="tug-tolerance" ${off}>${[0, 5, 10, 15, 20, 30].map(n => `<option value="${n}" ${g.tolerance === n ? 'selected' : ''}>${n === 0 ? 'Qualquer diferença vence' : n + ' pontos de diferença'}</option>`).join('')}</select>`, 'A força de cada lado é a porcentagem de acertos (0 a 100). Se a diferença entre os lados não passar da tolerância, dá empate e ninguém puxa a corda.');
      body += roundList('Cada rodada pode ter até 3 perguntas: uma delas é sorteada para todos os participantes. Cada acerto vale 100 pontos para o aluno, e o lado que vencer ganha mais 200 por pessoa.');
    }
    if (g.type === 'challenge') {
      const marked = (g.answer || []).filter(item => !item.skip && item.k !== 'text');
      body += field('Experimento', `<select data-game-field="simulation" ${off}>${simulationGroups.map(([subject, items]) => `<optgroup label="${esc(subject)}">${items.map(item => { const id = Array.isArray(item) ? item[0] : item; return `<option value="${esc(id)}" ${g.simulation === id ? 'selected' : ''}>${esc(simulationNames[id] || id)}</option>`; }).join('')}</optgroup>`).join('')}</select>`);
      body += `<div class="stage-field"><label>Resposta certa</label><small>Deixe o experimento abaixo exatamente como a resposta e toque em "Marcar como resposta". Os alunos recebem o experimento no estado inicial.</small><div class="stage-answer-sim" data-game-answer-sim>${simulationMarkup(g.simulation)}</div><button type="button" class="studio-btn accent" data-game-edit="capture" ${off}>Marcar como resposta</button>
        ${g.answer?.length ? `<ul class="stage-answer-list">${g.answer.map((item, i) => item.k === 'text' ? '' : `<li><label><input type="checkbox" data-game-field="skip" data-index="${i}" ${item.skip ? '' : 'checked'} ${off}> <span>${esc(item.label)}</span> <b>${esc(item.v)}</b></label></li>`).join('')}</ul><small>Desmarque os controles que não importam para a resposta.</small>` : '<p class="stage-help warn">Ainda não há resposta marcada.</p>'}
        ${marked.some(item => item.k === 'range') ? `<label class="stage-tolerance">Margem de erro nos controles deslizantes <output>${g.tolerance}%</output><input type="range" min="1" max="25" step="1" value="${g.tolerance}" data-game-field="tolerance" ${off}></label>` : ''}</div>`;
      // Dicas do time: o líder mexe no experimento e cada tentativa dele libera
      // a próxima dica para o resto do time palpitar.
      const hints = (g.hints || []).join('\n');
      body += field('Dicas para o time (uma por linha)', `<textarea rows="4" maxlength="900" data-game-field="hints" ${off} placeholder="Observe como o experimento muda ao ajustar o controle.">${esc(hints)}</textarea>`,
        'Cada tentativa do líder libera a próxima dica. O resto do time lê e escreve o palpite — tudo aparece no telão. Deixe em branco para desligar.');
      body += field('Tempo de cada dica', `<select data-game-field="hintSeconds" ${off}>${[10, 15, 20, 30, 45, 60].map(n => `<option value="${n}" ${(g.hintSeconds || 20) === n ? 'selected' : ''}>${n} segundos</option>`).join('')}</select>`);
      body += field('Quem mexe no experimento', `<select data-game-field="leaderMode" ${off}><option value="1" ${g.leaderMode !== false ? 'selected' : ''}>Só o líder do time</option><option value="0" ${g.leaderMode === false ? 'selected' : ''}>Todos podem mexer</option></select>`, 'Você pode trocar isso ao vivo pelo telão, sem sair da apresentação.');
    }
    if (['flash', 'survival', 'race', 'tug'].includes(g.type) && !off) body += `<div class="stage-field stage-ai-field"><button type="button" class="studio-btn quiet" data-game-edit="ai-questions">${studioIcon('sparkle')} Gerar perguntas com o Storage AI</button><small data-ai-note>Escreve perguntas sobre o conteúdo dos slides desta aula e substitui as atuais.</small></div>`;
    return `${s.itemToolbar('slide', s.index, s.draft.slides.length)}<div class="poll-block-editor stage-editor" data-stage-type="${g.type}"><h2>${gameIcon(g.type)} ${esc(gameNames[g.type])}</h2><p class="stage-help">${esc(gameHints[g.type])}</p>${body}</div>`;
  }
  // Monta o experimento do desafio e devolve os controles à resposta já marcada.
  afterRender() {
    const node = this.studio.root.querySelector('[data-game-answer-sim]');
    this.simulations.mount(node || null);
    const answer = this.game()?.answer;
    if (!node || !answer?.length) return;
    let changed = false;
    [...node.querySelectorAll(FIELDS)].slice(0, 16).filter(field => field.type !== 'hidden').forEach((field, index) => {
      const item = answer[index];
      if (!item || readField(field) === item.v) return;
      if (field.dataset.simToggle !== undefined) { field.click(); return; }
      field.value = item.v; changed = true;
    });
    if (changed) node.querySelector('[data-simulation]')?.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
export { isGameType };
