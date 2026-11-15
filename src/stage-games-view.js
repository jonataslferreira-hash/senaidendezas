// Telas das etapas interativas (professor no telão e aluno no celular).
// As regras ficam em stage-games.js; aqui é só desenho.
import { gameNames, teamPalette } from './stage-games.js';
import { simulationMarkup } from './simulations.js';
import { character } from './game-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icons = { teams: '🏆', flash: '⚡', survival: '❤️', challenge: '🧪', raffle: '🎲', tug: '🪢' };
export const gameIcon = type => icons[type] || '✨';
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const live = (html, name = '') => `<div class="game-live${name ? ' game-' + name : ''}" data-game-live>${html}</div>`;

// Placar de equipes: usado na etapa "Equipes" e como faixa nas telas de ranking.
export function teamsBoard(state, { compact = false } = {}) {
  const teams = state.teams || [], best = Math.max(0, ...teams.map(team => team.score));
  return `<div class="team-board${compact ? ' compact' : ''}" style="--teams:${teams.length}">${teams.map(team => `<article class="team-card" style="--team:${esc(team.color)}" data-leading="${best > 0 && team.score === best}" data-mine="${state.me?.team === team.index}">
    <header><strong>Time ${esc(team.name)}</strong><b>${team.score}<small> pts</small></b></header>
    ${compact ? '' : `<ul>${team.members.map(member => `<li data-online="${member.online}">${esc(member.name)}</li>`).join('') || '<li class="empty">Aguardando participantes…</li>'}</ul>`}
  </article>`).join('')}</div>`;
}
export const teamStrip = state => state.teams?.length ? `<section class="team-strip" aria-label="Placar das equipes"><h2>Placar das equipes</h2>${teamsBoard(state, { compact: true })}</section>` : '';

function hostActions(state, buttons) {
  const next = state.activity?.hasNext ? 'Próxima etapa →' : 'Concluir';
  return `<div class="game-actions">${buttons.filter(Boolean).map(([action, label, kind = 'secondary']) => `<button class="btn ${kind}" data-game-do="${action}">${label}</button>`).join('')}<button class="btn secondary" data-action="next-stage">${next}</button></div>`;
}

function teamsView(state, g, host, player) {
  const mine = state.teams?.find(team => team.index === state.me?.team);
  return live(`${player && mine ? `<p class="team-mine" style="--team:${esc(mine.color)}">Você é do <b>Time ${esc(mine.name)}</b></p>` : ''}${teamsBoard(state)}`) +
    live(host ? `<p class="game-note">Os pontos do quiz e das dinâmicas de cada aluno somam para o time.</p>${hostActions(state, [['shuffle', '🔀 Embaralhar times']])}` : '<p class="game-note">Cada ponto seu soma para o time. Boa sorte!</p>');
}

function flashView(state, g, host, player) {
  const done = g.state === 'done', answered = g.choice !== null && g.choice !== undefined;
  const options = g.options.map((option, i) => {
    const right = g.correct === i && (done || host && !player);
    return `<button class="game-option" data-game-send='{"choice":${i}}' data-right="${done && g.correct === i}" data-chosen="${g.choice === i}" ${!player || done || answered ? 'disabled' : ''}><b>${'ABCD'[i]}</b><span>${esc(option)}</span>${done && g.counts ? `<small>${g.counts[i]}</small>` : ''}${right && done ? '<i>✓</i>' : ''}</button>`;
  }).join('');
  const result = done ? (g.winner ? `<p class="game-winner"><span>⚡</span><b>${esc(g.winner.name)}</b> acertou primeiro! <small>+${g.points} pts</small></p>` : '<p class="game-winner none">Ninguém acertou desta vez.</p>')
    : player && answered ? '<p class="game-wait">Resposta enviada… não era essa. Aguarde o resultado.</p>' : `<p class="game-wait">${plural(g.answered, 'resposta', 'respostas')} até agora · só vale a primeira tentativa!</p>`;
  return live(`<div class="game-options">${options}</div>${result}`) + (host ? live(hostActions(state, [done ? ['restart', '↻ Jogar de novo'] : ['end', 'Encerrar', 'primary']])) : '');
}

const confetti = n => `<div class="game-confetti" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--n:${i};--x:${(i * 37) % 100};--h:${(i * 53) % 360};--t:${(2.2 + (i % 7) * .28).toFixed(2)}s;--w:${(i % 5) * .22}s"></i>`).join('')}</div>`;
const sized = count => count <= 6 ? .7 : count <= 12 ? .56 : count <= 24 ? .44 : .35;

// Sobrevivência: todo mundo começa de pé na arena; quem erra cai.
function survivalView(state, g, host, player, now) {
  const q = g.question, done = g.state === 'done', shown = g.state === 'reveal' || done, me = g.me, scale = sized(g.players.length);
  const hud = `<div class="sv-hud"><span class="sv-hearts"><b>❤️ ${g.alive}</b> de pé${g.total ? ' · ' + (g.total - g.alive) + ' fora' : ''}</span>${g.round >= 0 ? `<span>Pergunta <b>${g.round + 1}</b> de ${g.rounds}</span>` : `<span>${plural(g.rounds, 'pergunta', 'perguntas')} · ${g.seconds}s cada</span>`}</div>`;
  const left = Math.max(0, (g.deadline - now) / 1000);
  const timer = g.state === 'open' ? `<div class="sv-timer"><i style="animation-duration:${g.seconds}s;animation-delay:${(left - g.seconds).toFixed(2)}s"></i></div>` : '';
  const canAnswer = player && me?.alive && g.state === 'open' && me.choice === null;
  const question = q && !done ? `<h2 class="sv-text">${esc(q.text)}</h2><div class="game-options sv-options">${q.options.map((option, i) => `<button class="game-option" data-game-send='{"choice":${i},"round":${g.round}}' data-right="${shown && q.correct === i}" data-chosen="${me?.choice === i}" data-shown="${shown}" ${canAnswer ? '' : 'disabled'}><b>${'ABCD'[i]}</b><span>${esc(option)}</span>${shown && q.counts ? `<small>${q.counts[i]}</small>` : ''}${shown && q.correct === i ? '<i>✓</i>' : ''}</button>`).join('')}</div>` : '';
  const winners = g.players.filter(item => item.alive);
  const status = done ? (winners.length ? `<p class="game-winner"><span>👑</span>${winners.length === 1 ? `<b>${esc(winners[0].name)}</b> é o último de pé!` : `<b>${winners.length}</b> sobreviveram até o fim!`} <small>+${g.points} pts</small></p>` : '<p class="game-winner none"><span>💀</span>Ninguém sobreviveu!</p>')
    : !player ? `<p class="game-wait">${g.state === 'ready' ? 'Todo mundo tem uma vida só. Errou ou não respondeu a tempo: caiu.' : g.state === 'open' ? `${g.answered} de ${g.alive} responderam` : 'Quem errou, caiu!'}</p>`
    : !me?.playing ? '<p class="game-wait">Você entrou depois do início. Assista e torça!</p>'
    : !me.alive ? `<p class="sv-dead"><span>💀</span>Você caiu na pergunta ${me.fell + 1}. Agora é torcer!</p>`
    : g.state === 'ready' ? '<p class="game-wait">Você tem <b>1 vida</b>. Prepare-se…</p>'
    : g.state === 'open' ? (me.choice === null ? '<p class="game-wait">Escolha com cuidado: errou, caiu.</p>' : '<p class="game-wait">Resposta travada. Segura a respiração…</p>')
    : '<p class="sv-safe"><span>❤️</span>Você continua de pé!</p>';
  const arena = `<div class="sv-arena" style="--scale:${scale}" data-state="${g.state}">${done && winners.length ? confetti(28) : ''}<div class="sv-crowd">${g.players.map((item, i) => {
    const fell = item.alive ? '' : item.fell === g.round && shown ? 'now' : 'before';
    return `<figure class="sv-player" data-fell="${fell}" data-me="${player && item.id === state.me?.id}" data-winner="${done && item.alive}" style="--i:${i}">${character(item, i)}<i class="sv-ghost" aria-hidden="true">💀</i><figcaption>${esc(item.name)}</figcaption></figure>`;
  }).join('') || '<p class="game-wait">Aguardando participantes…</p>'}</div><i class="sv-floor"></i></div>`;
  return live(hud) + live(timer, 'slim') + live(question) + live(arena, 'arena') + live(status) +
    (host ? live(hostActions(state, [g.state === 'ready' ? ['next', '▶ Começar', 'primary'] : g.state === 'open' ? ['next', 'Revelar agora'] : g.state === 'reveal' ? ['next', 'Próxima pergunta →', 'primary'] : ['restart', '↻ Jogar de novo']])) : '');
}

function challengeView(state, g, host, player) {
  const done = g.state === 'done';
  const podium = g.solved.length ? `<ol class="challenge-podium">${g.solved.slice(0, 5).map((item, i) => `<li><b>${['🥇', '🥈', '🥉'][i] || i + 1 + 'º'}</b><span>${esc(item.name)}</span><small>${(item.at / 1000).toFixed(1)} s · ${plural(item.tries, 'tentativa', 'tentativas')}</small></li>`).join('')}</ol>` : '<p class="game-wait">Ninguém chegou à meta ainda…</p>';
  const answer = g.answer ? `<p class="challenge-answer"><b>Resposta:</b> ${g.answer.map(item => `${esc(item.label)} = ${esc(item.v)}`).join(' · ')}</p>` : '';
  const mine = player && g.me ? (g.me.ok ? `<p class="game-winner"><span>🎯</span>Você chegou à meta! <small>${g.me.place}º lugar · +${g.me.points} pts</small></p>` : done ? '<p class="game-wait">Tempo encerrado.</p>' : `<button class="btn primary game-submit" data-challenge-send>🎯 Conferir minha resposta</button>${g.me.tries ? `<p class="game-wait">Ainda não é isso. Tentativas: ${g.me.tries}</p>` : ''}`) : '';
  return `<div class="challenge-layout"><div class="challenge-sim" data-challenge-sim>${simulationMarkup(g.simulation)}</div><aside>` +
    live(mine + `<h2>Quem já conseguiu <small>${g.solvedCount}</small></h2>${podium}${done || host && !player ? answer : ''}`) +
    (host ? live(hostActions(state, [done ? ['restart', '↻ Jogar de novo'] : ['end', 'Encerrar e mostrar resposta', 'primary']])) : '') + '</aside></div>';
}

function raffleView(state, g, host, player) {
  const names = g.names.length ? g.names : ['…'];
  const stage = g.current ? `<div class="raffle-wheel" data-raffle data-at="${g.drawAt}" data-final="${esc(g.current.name)}" data-names="${esc(JSON.stringify(names))}" data-me="${Boolean(g.me)}"><span data-raffle-name>${esc(g.current.name)}</span></div>` : `<div class="raffle-wheel idle"><span>?</span></div>`;
  return live(stage) + live(`<p class="game-note">${g.current ? (g.left ? plural(g.left, 'pessoa ainda não foi sorteada', 'pessoas ainda não foram sorteadas') : 'Todo mundo já foi sorteado. O próximo sorteio recomeça a lista.') : plural(g.names.length, 'participante na roleta', 'participantes na roleta')}</p>${host ? hostActions(state, [['draw', g.current ? '🎲 Sortear outro' : '🎲 Sortear', 'primary']]) : ''}`);
}

// Cabo de guerra: os personagens de cada lado puxam a corda de verdade.
function tugView(state, g, host, player) {
  const lead = g.taps[0] - g.taps[1], shift = Math.max(-1, Math.min(1, lead / (g.goal || 30))), done = g.state === 'done';
  const colors = [teamPalette[0][1], teamPalette[1][1]], crews = g.crews || [[], []];
  const team = side => `<div class="tug-team ${side ? 'right' : 'left'}" data-result="${done && g.winner >= 0 ? (g.winner === side ? 'won' : 'lost') : ''}" style="--team:${colors[side]}">${(crews[side].length ? crews[side] : [{ avatar: side ? '🤖' : '🚀', name: '' }]).map((person, i) => `<span class="tug-puller" style="--i:${i}" data-empty="${!crews[side].length}">${character(person, i)}</span>`).join('')}${g.sides[side] > 5 ? `<em>+${g.sides[side] - 5}</em>` : ''}</div>`;
  const scene = `<div class="tug-scene" data-state="${g.state}" data-leading="${lead > 0 ? 0 : lead < 0 ? 1 : -1}" style="--shift:${(-shift * 16).toFixed(2)}%;--power:${Math.abs(shift).toFixed(2)}">
    ${done && g.winner >= 0 ? confetti(26) : ''}
    <div class="tug-names"><span style="--team:${colors[0]}"><b>${esc(g.options[0])}</b><small>${plural(g.sides[0], 'pessoa', 'pessoas')} · ${g.taps[0]} puxões</small></span><i>VS</i><span style="--team:${colors[1]}"><b>${esc(g.options[1])}</b><small>${plural(g.sides[1], 'pessoa', 'pessoas')} · ${g.taps[1]} puxões</small></span></div>
    <div class="tug-field"><i class="tug-pit"></i><i class="tug-mark"></i><div class="tug-group">${team(0)}<div class="tug-cord"><i class="tug-flag"></i></div>${team(1)}</div><i class="tug-ground"></i></div>
    <div class="tug-meter"><i class="a" style="width:${(50 + shift * 50).toFixed(1)}%;--team:${colors[0]}"></i><i class="b" style="--team:${colors[1]}"></i><b></b></div></div>`;
  const result = done ? `<p class="game-winner"${g.winner >= 0 ? ` style="--team:${colors[g.winner]}"` : ''}>${g.winner >= 0 ? `<span>🏁</span><b>${esc(g.options[g.winner])}</b> venceu!${player && g.side === g.winner ? ` <small>+${g.points} pts</small>` : ''}` : 'Empate!'}</p>` : '';
  const controls = !player || done ? '' : g.side === null || g.side === undefined
    ? `<div class="tug-choose"><p>Escolha o seu lado:</p>${g.options.map((option, i) => `<button class="btn primary" style="--team:${colors[i]}" data-game-send='{"side":${i}}'>${esc(option)}</button>`).join('')}</div>`
    : `<button class="tug-tap" style="--team:${colors[g.side]}" data-tug-tap><b>PUXAR!</b><small>toque sem parar · ${esc(g.options[g.side])}</small></button>`;
  return live(scene + result, 'rope') + live(controls) + (host ? live(hostActions(state, [done ? ['restart', '↻ Revanche'] : ['end', 'Encerrar', 'primary']])) : '');
}

const views = { teams: teamsView, flash: flashView, survival: survivalView, challenge: challengeView, raffle: raffleView, tug: tugView };

export function gameMarkup(state, { host, demo, header, now = Date.now() }) {
  const g = state.game, player = !host || demo;
  return `${header()}<main class="game-stage" data-game-key="${esc(g.id)}" data-game-type="${g.type}" data-game-state="${g.state}"><span class="game-eyebrow">${gameIcon(g.type)} ${esc(gameNames[g.type].toUpperCase())}</span><h1>${esc(g.text)}</h1>${views[g.type](state, g, host, player, now)}</main>`;
}

// Atualiza só os trechos que mudam, para não reiniciar o experimento do desafio,
// apagar o que o aluno está digitando nem "roubar" o toque no cabo de guerra.
export function keepGame(root, markup, state) {
  const current = root.querySelector('.game-stage');
  if (!state?.game || !current || current.dataset.gameKey !== state.game.id) return false;
  const template = document.createElement('template');
  template.innerHTML = markup;
  const next = template.content.querySelector('.game-stage');
  if (!next) return false;
  const before = [...current.querySelectorAll('[data-game-live]')], after = [...next.querySelectorAll('[data-game-live]')];
  const formNow = current.querySelector('[data-cloud-form]'), formNext = next.querySelector('[data-cloud-form]');
  if (before.length !== after.length || Boolean(formNow) !== Boolean(formNext)) return false;
  before.forEach((node, index) => { if (node.innerHTML !== after[index].innerHTML) node.innerHTML = after[index].innerHTML; });
  if (formNow) formNow.dataset.left = formNext.dataset.left;
  current.dataset.gameState = next.dataset.gameState;
  const head = root.querySelector('.header'), nextHead = template.content.querySelector('.header');
  if (head && nextHead && head.innerHTML !== nextHead.innerHTML) head.innerHTML = nextHead.innerHTML;
  return true;
}

// Roleta: troca os nomes rapidamente até o momento de revelar o sorteado.
const raffleTimers = new WeakMap();
export function animateRaffle(root, now = Date.now) {
  const node = root.querySelector('[data-raffle]');
  if (!node || raffleTimers.has(node)) return;
  const end = Number(node.dataset.at) + 2600, label = node.querySelector('[data-raffle-name]');
  let names = []; try { names = JSON.parse(node.dataset.names); } catch { names = []; }
  if (now() >= end || names.length < 2) { node.dataset.done = 'true'; return; }
  node.dataset.done = 'false';
  let index = Math.floor(Math.random() * names.length);
  const spin = () => {
    if (!node.isConnected) return;
    const left = end - now();
    if (left <= 0) { label.textContent = node.dataset.final; node.dataset.done = 'true'; raffleTimers.delete(node); return; }
    index = (index + 1) % names.length; label.textContent = names[index];
    raffleTimers.set(node, setTimeout(spin, left < 900 ? 190 : left < 1600 ? 120 : 70));
  };
  spin();
}
