// Telas das etapas interativas (professor no telão e aluno no celular).
// As regras ficam em stage-games.js; aqui é só desenho.
import { gameNames, teamPalette } from './stage-games.js';
import { simulationMarkup } from './simulations.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icons = { teams: '🏆', flash: '⚡', cloud: '☁️', challenge: '🧪', raffle: '🎲', tug: '🪢' };
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

function cloudView(state, g, host, player) {
  const top = Math.max(1, ...g.words.map(word => word.n)), done = g.state === 'done';
  const cloud = g.words.length ? g.words.map((word, i) => `<${host ? 'button type="button" data-game-do="remove" data-id="' + esc(word.id) + '" title="Remover do telão"' : 'span'} class="cloud-word" style="--size:${(1 + (word.n / top) * 2.2).toFixed(2)};--hue:${(i * 47) % 360}">${esc(word.text)}${word.n > 1 ? `<sup>${word.n}</sup>` : ''}</${host ? 'button' : 'span'}>`).join('') : '<p class="game-wait">As respostas aparecem aqui assim que chegarem.</p>';
  const left = 3 - g.mine.length;
  const form = player ? `<form class="cloud-form" data-cloud-form data-left="${left}"><input type="text" maxlength="40" autocomplete="off" enterkeyhint="send" placeholder="Digite uma palavra ou frase curta" aria-label="Sua resposta"><button class="btn primary" type="submit">Enviar</button></form>` : '';
  return live(`<div class="cloud-words">${cloud}</div>`) + (done ? '' : form) +
    live(`<p class="game-note">${plural(g.total, 'resposta', 'respostas')}${player ? (done ? ' · Envios encerrados.' : left > 0 ? ` · Você ainda pode enviar ${left}.` : ' · Você já enviou as suas 3.') : host ? ' · Toque em uma palavra para tirá-la do telão.' : ''}${player && g.mine.length ? `<br>Suas respostas: ${g.mine.map(esc).join(', ')}` : ''}</p>${host ? hostActions(state, [done ? ['restart', '↻ Limpar e recomeçar'] : ['end', 'Encerrar envios', 'primary']]) : ''}`);
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

function tugView(state, g, host, player) {
  const lead = g.taps[0] - g.taps[1], shift = Math.max(-1, Math.min(1, lead / (g.goal || 30))), done = g.state === 'done';
  const colors = [teamPalette[0][1], teamPalette[1][1]];
  const rope = `<div class="tug-rope" style="--shift:${(-shift * 42).toFixed(1)}%"><span class="tug-side" style="--team:${colors[0]}"><b>${esc(g.options[0])}</b><small>${plural(g.sides[0], 'pessoa', 'pessoas')}</small></span><div class="tug-track"><i class="tug-line"></i><i class="tug-center"></i><i class="tug-knot">🪢</i></div><span class="tug-side" style="--team:${colors[1]}"><b>${esc(g.options[1])}</b><small>${plural(g.sides[1], 'pessoa', 'pessoas')}</small></span></div>`;
  const result = done ? `<p class="game-winner"${g.winner >= 0 ? ` style="--team:${colors[g.winner]}"` : ''}>${g.winner >= 0 ? `<span>🏁</span><b>${esc(g.options[g.winner])}</b> venceu!${player && g.side === g.winner ? ` <small>+${g.points} pts</small>` : ''}` : 'Empate!'}</p>` : '';
  const controls = !player || done ? '' : g.side === null || g.side === undefined
    ? `<div class="tug-choose"><p>Escolha o seu lado:</p>${g.options.map((option, i) => `<button class="btn primary" style="--team:${colors[i]}" data-game-send='{"side":${i}}'>${esc(option)}</button>`).join('')}</div>`
    : `<button class="tug-tap" style="--team:${colors[g.side]}" data-tug-tap><b>PUXAR!</b><small>toque sem parar · ${esc(g.options[g.side])}</small></button>`;
  return live(rope + result, 'rope') + live(controls) + (host ? live(hostActions(state, [done ? ['restart', '↻ Revanche'] : ['end', 'Encerrar', 'primary']])) : '');
}

const views = { teams: teamsView, flash: flashView, cloud: cloudView, challenge: challengeView, raffle: raffleView, tug: tugView };

export function gameMarkup(state, { host, demo, header }) {
  const g = state.game, player = !host || demo;
  return `${header()}<main class="game-stage" data-game-key="${esc(g.id)}" data-game-type="${g.type}" data-game-state="${g.state}"><span class="game-eyebrow">${gameIcon(g.type)} ${esc(gameNames[g.type].toUpperCase())}</span><h1>${esc(g.text)}</h1>${views[g.type](state, g, host, player)}</main>`;
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
