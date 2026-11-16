// Editor das etapas interativas (equipes, relâmpago, sobrevivência, desafio, sorteio, cabo de guerra, corrida).
import { gameNames, gameHints, defaultGame, isGameType } from './stage-games.js';
import { gameIcon } from './stage-games-view.js';
import { studioIcon } from './studio-icons.js';
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
      else if (key === 'sv-text') this.list(game, field)[Number(field.dataset.q)].text = field.value;
      else if (key === 'sv-option') this.list(game, field)[Number(field.dataset.q)].options[Number(field.dataset.index)] = field.value;
      else if (key === 'tolerance') { game.tolerance = Number(field.value) || 5; const out = field.parentElement.querySelector('output'); if (out) out.textContent = game.tolerance + '%'; }
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
  markup() {
    const s = this.studio, slide = s.draft.slides[s.index];
    if (!slide.game) slide.game = defaultGame(s.currentBlock()?.type);
    const g = slide.game, off = s.groups?.canEdit === false ? 'disabled' : '';
    // Etapas salvas no formato antigo: relâmpago de uma pergunta só e cabo de guerra com lista única.
    if (g.type === 'flash' && !Array.isArray(g.questions)) { g.questions = [{ text: g.text || '', options: Array.isArray(g.options) && g.options.length >= 2 ? g.options : ['', ''], correct: g.correct || 0 }]; g.text = 'Desafio relâmpago'; g.seconds = 10; delete g.options; delete g.correct; }
    if (g.type === 'tug' && !Array.isArray(g.rounds)) { g.rounds = (Array.isArray(g.questions) && g.questions.length ? g.questions : [{ text: '', options: ['', ''], correct: 0 }]).slice(0, 12).map(q => [q]); delete g.questions; }
    const field = (label, html, hint = '') => `<div class="stage-field"><label>${label}</label>${html}${hint ? `<small>${hint}</small>` : ''}</div>`;
    let body = field(g.type === 'teams' ? 'Frase de abertura' : g.type === 'raffle' ? 'Título do sorteio' : g.type === 'tug' || g.type === 'race' || g.type === 'flash' ? 'Título no telão' : g.type === 'challenge' ? 'Meta que os alunos devem atingir' : 'Pergunta', `<input type="text" data-game-field="text" maxlength="300" value="${esc(g.text)}" ${off}>`);
    if (g.type === 'teams') body += field('Quantos times', `<select data-game-field="count" ${off}>${[2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${g.count === n ? 'selected' : ''}>${n} times</option>`).join('')}</select>`, 'Os pontos do quiz e das outras dinâmicas somam para o time, e o placar aparece nos rankings. Coloque esta etapa antes do quiz; se quiser mostrar o placar final, adicione outra etapa "Equipes" no fim. Durante a apresentação, toque no nome de um aluno para torná-lo líder do time: o líder pode trocar o nome e a foto da equipe pelo próprio celular.');
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
      body += field('Tempo por pergunta', `<select data-game-field="seconds" ${off}>${[8, 10, 15, 20, 30, 45].map(n => `<option value="${n}" ${g.seconds === n ? 'selected' : ''}>${n} segundos</option>`).join('')}</select>`);
      body += field('Tolerância para vencer', `<select data-game-field="tug-tolerance" ${off}>${[0, 5, 10, 15, 20, 30].map(n => `<option value="${n}" ${g.tolerance === n ? 'selected' : ''}>${n === 0 ? 'Qualquer diferença vence' : n + ' pontos de diferença'}</option>`).join('')}</select>`, 'A força de cada lado é a porcentagem de acertos (0 a 100). Se a diferença entre os lados não passar da tolerância, dá empate e ninguém puxa a corda.');
      body += roundList('Cada rodada pode ter até 3 perguntas: na hora do jogo uma delas é sorteada, a mesma para todos, então a partida muda a cada vez. Cada acerto vale 100 pontos para o aluno, e o lado que vencer ganha mais 200 por pessoa.');
    }
    if (g.type === 'challenge') {
      const marked = (g.answer || []).filter(item => !item.skip && item.k !== 'text');
      body += field('Experimento', `<select data-game-field="simulation" ${off}>${simulationGroups.map(([subject, items]) => `<optgroup label="${esc(subject)}">${items.map(item => { const id = Array.isArray(item) ? item[0] : item; return `<option value="${esc(id)}" ${g.simulation === id ? 'selected' : ''}>${esc(simulationNames[id] || id)}</option>`; }).join('')}</optgroup>`).join('')}</select>`);
      body += `<div class="stage-field"><label>Resposta certa</label><small>Deixe o experimento abaixo exatamente como a resposta e toque em "Marcar como resposta". Os alunos recebem o experimento no estado inicial.</small><div class="stage-answer-sim" data-game-answer-sim>${simulationMarkup(g.simulation)}</div><button type="button" class="studio-btn accent" data-game-edit="capture" ${off}>Marcar como resposta</button>
        ${g.answer?.length ? `<ul class="stage-answer-list">${g.answer.map((item, i) => item.k === 'text' ? '' : `<li><label><input type="checkbox" data-game-field="skip" data-index="${i}" ${item.skip ? '' : 'checked'} ${off}> <span>${esc(item.label)}</span> <b>${esc(item.v)}</b></label></li>`).join('')}</ul><small>Desmarque os controles que não importam para a resposta.</small>` : '<p class="stage-help warn">Ainda não há resposta marcada.</p>'}
        ${marked.some(item => item.k === 'range') ? `<label class="stage-tolerance">Margem de erro nos controles deslizantes <output>${g.tolerance}%</output><input type="range" min="1" max="25" step="1" value="${g.tolerance}" data-game-field="tolerance" ${off}></label>` : ''}</div>`;
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
