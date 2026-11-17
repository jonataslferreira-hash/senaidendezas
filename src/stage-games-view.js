// Telas das etapas interativas (professor no telão e aluno no celular).
// As regras ficam em stage-games.js; aqui é só desenho.
import { gameNames, teamPalette } from './stage-games.js';
import { simulationMarkup } from './simulations.js';
import { character, pickVictory } from './game-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
// Ícones simples, de linha, um por tipo de etapa (sem emoji: fica igual em todo aparelho).
const paths = {
  slides: '<rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M12 16v4M8 20h8"/>',
  poll: '<path d="M6 20v-8M12 20V5M18 20v-5"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9"/><path d="M12 17v.2"/>',
  teams: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M17 14.3c2.5.2 4 2.4 4 5.7"/>',
  flash: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  survival: '<path d="M12 20.5s-7.5-4.6-7.5-10.3a4.2 4.2 0 0 1 7.5-2.6 4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z"/>',
  challenge: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.6 15h8.8"/>',
  raffle: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.8 8.8v.1M15.2 15.2v.1M12 12v.1M15.2 8.8v.1M8.8 15.2v.1"/>',
  tug: '<path d="M2.5 12h19M6 8.5 2.5 12 6 15.5M18 8.5l3.5 3.5-3.5 3.5M12 8v8"/>',
  race: '<path d="M5 21V4M5 4.5h13l-3 4 3 4H5"/>'
};
export const stageIcon = type => `<svg class="stage-svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type] || paths.slides}</svg>`;
export const gameIcon = stageIcon;
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const live = (html, name = '') => `<div class="game-live${name ? ' game-' + name : ''}" data-game-live>${html}</div>`;

// Placar de equipes: usado na etapa "Equipes" e como faixa nas telas de ranking.
export function teamsBoard(state, { compact = false, hostTools = false } = {}) {
  const teams = state.teams || [], best = Math.max(0, ...teams.map(team => team.score));
  return `<div class="team-board${compact ? ' compact' : ''}" style="--teams:${teams.length}">${teams.map(team => `<article class="team-card" style="--team:${esc(team.color)}" data-leading="${best > 0 && team.score === best}" data-mine="${state.me?.team === team.index}">
    <header>${team.photo ? `<img class="team-photo" src="${esc(team.photo)}" alt="">` : ''}<strong>Time ${esc(team.name)}</strong><b>${team.score}<small> pts</small></b>${hostTools && !compact ? `<details class="team-rename"><summary aria-label="Renomear time" title="Renomear time">✎</summary><span><input type="text" maxlength="24" value="${esc(team.name)}" data-team-rename-input aria-label="Novo nome do time"><button type="button" class="btn secondary small" data-game-do="team-rename" data-team="${team.index}">Salvar</button></span></details>` : ''}</header>
    ${compact ? '' : `<ul>${team.members.map(member => hostTools ? `<li data-online="${member.online}" data-leader="${Boolean(member.leader)}"><button type="button" class="team-member-pick" data-game-do="team-leader" data-team="${team.index}" data-player="${esc(member.id)}" title="Tornar líder do time" aria-label="Tornar ${esc(member.name)} líder do time">${member.leader ? '👑 ' : ''}${esc(member.name)}</button></li>` : `<li data-online="${member.online}" data-leader="${Boolean(member.leader)}">${member.leader ? '👑 ' : ''}${esc(member.name)}</li>`).join('') || '<li class="empty">Aguardando participantes…</li>'}</ul>`}
  </article>`).join('')}</div>`;
}
export const teamStrip = state => state.teams?.length ? `<section class="team-strip" aria-label="Placar das equipes"><h2>Placar das equipes</h2>${teamsBoard(state, { compact: true })}</section>` : '';

function hostActions(state, buttons, { showNext = true } = {}) {
  const next = state.activity?.hasNext ? 'Próxima etapa →' : 'Ver placar geral →';
  return `<div class="game-actions">${buttons.filter(Boolean).map(([action, label, kind = 'secondary']) => `<button class="btn ${kind}" data-game-do="${action}">${label}</button>`).join('')}${showNext ? `<button class="btn secondary" data-action="next-stage">${next}</button>` : ''}</div>`;
}

function teamsView(state, g, host, player) {
  const mine = state.teams?.find(team => team.index === state.me?.team), picking = g.pick && g.state === 'open';
  // Escolha livre: cada aluno toca no time que quer (pode trocar até o professor fechar).
  const choose = picking && player ? `<div class="team-pick" style="--teams:${state.teams.length}">${state.teams.map(team => `<button class="team-pick-btn" style="--team:${esc(team.color)}" data-game-send='{"team":${team.index}}' data-mine="${mine?.index === team.index}">${team.photo ? `<img class="team-pick-photo" src="${esc(team.photo)}" alt="">` : ''}<b>Time ${esc(team.name)}</b><small>${plural(team.members.length, 'pessoa', 'pessoas')}</small></button>`).join('')}</div>` : '';
  // O líder do time pode trocar o nome e a foto da equipe pelo próprio celular.
  const leading = player && mine && mine.leader === state.me?.id;
  // Prévia da foto do time (ou a inicial do nome enquanto não tem foto):
  // o líder vê o que vai salvar antes de salvar. Só existe quando há time —
  // antes, quem ainda não tinha time derrubava a etapa inteira aqui.
  const photoPreview = !mine ? '' : `<span class="team-leader-preview" data-team-preview style="--team:${esc(mine.color)}">${mine.photo ? `<img src="${esc(mine.photo)}" alt="Foto do time">` : `<b>${esc((mine.name || '?').trim().slice(0, 1).toUpperCase() || '?')}</b>`}</span>`;
  const leaderTools = leading ? `<div class="team-leader-tools" style="--team:${esc(mine.color)}" data-leader-team="${mine.index}">
    <strong>👑 Você lidera o Time ${esc(mine.name)}</strong>
    <div class="team-leader-edit">${photoPreview}<div class="team-leader-fields">
      <label>Nome do time<input type="text" maxlength="24" value="${esc(mine.name)}" data-team-name></label>
      <div class="team-leader-row"><button type="button" class="btn secondary small" data-team-photo-button>Escolher foto</button>${mine.photo ? '<button type="button" class="btn secondary small" data-team-photo-clear>Remover foto</button>' : ''}<input type="file" accept="image/png,image/jpeg,image/webp" data-team-photo hidden></div>
    </div></div>
    <button type="button" class="btn primary small" data-team-save>Salvar</button>
  </div>` : '';
  const badge = player ? (leading ? '' : mine ? `<p class="team-mine" style="--team:${esc(mine.color)}">Você é do <b>Time ${esc(mine.name)}</b></p>` : picking ? '<p class="game-wait">Toque no time que você quer entrar.</p>' : '') : '';
  const countControl = host ? `<div class="team-count-control"><label for="team-count-live">Quantos times</label><div class="team-count-row"><select id="team-count-live" data-team-count-select aria-label="Quantos times">${Array.from({ length: 9 }, (_, i) => i + 2).map(n => `<option value="${n}" ${state.teams.length === n ? 'selected' : ''}>${n}</option>`).join('')}</select><button type="button" class="btn secondary small" data-game-do="team-count">Aplicar</button></div></div>` : '';
  return live(badge + choose + leaderTools + teamsBoard(state, { hostTools: host })) +
    live(host ? `${countControl}<p class="game-note">${picking ? 'Os alunos estão escolhendo o time no celular. Quem não escolher entra no time com menos gente.' : 'Os pontos do quiz e das dinâmicas de cada aluno somam para o time. Toque no nome de um aluno para torná-lo líder: o líder pode trocar o nome e a foto do time no celular dele.'}</p>${hostActions(state, [picking ? ['end', 'Fechar escolha', 'primary'] : null, ['shuffle', 'Sortear os times']], { showNext: !picking })}` : `<p class="game-note">${picking ? 'Dá para trocar de time até o professor fechar a escolha.' : 'Cada ponto seu soma para o time. Boa sorte!'}</p>`);
}

// Botões de resposta. No celular do aluno (g.bare) vão só as letras: a pergunta fica no telão.
const letters = 'ABCD';
function optionButtons(options, { bare, send, enabled, chosen = null, correct = -1, shown = false, counts = null, extra = '' }) {
  const wide = !bare && options.some(option => String(option || '').trim().length > 42);
  return `<div class="game-options sv-options${bare ? ' bare' : ''}${extra}" data-wide-options="${wide}" style="--count:${options.length}">${options.map((option, i) => `<button class="game-option" data-game-send='${send(i)}' data-right="${shown && correct === i}" data-chosen="${chosen === i}" data-shown="${shown}" aria-label="Alternativa ${letters[i]}" ${enabled ? '' : 'disabled'}><b>${letters[i]}</b>${bare ? '' : `<span>${esc(option)}</span>`}${shown && counts ? `<small>${counts[i]}</small>` : ''}${shown && correct === i ? '<i>✓</i>' : ''}</button>`).join('')}</div>`;
}
const screenHint = '<p class="bare-hint">Leia a pergunta no telão e toque na sua resposta</p>';
const timerBar = (g, now) => g.state === 'open' ? `<div class="sv-timer"><i style="animation-duration:${g.seconds}s;animation-delay:${(Math.max(0, (g.deadline - now) / 1000) - g.seconds).toFixed(2)}s"></i></div>` : '';

// Relâmpago: perguntas rápidas com placar intermediário estilo Quiz e pódio Top-3 (ou pódio por equipes!) no final.
function flashView(state, g, host, player, now) {
  const q = g.question, done = g.state === 'done', boardPhase = g.state === 'leaderboard', shown = g.state === 'reveal' || boardPhase || done, me = g.me, bolt = stageIcon('flash');
  const hud = done ? '' : `<div class="sv-hud"><span>${bolt} ${g.round >= 0 ? `Pergunta <b>${g.round + 1}</b> de ${g.rounds}` : `${plural(g.rounds, 'pergunta', 'perguntas')} · ${g.seconds}s cada`}</span><span>${g.state === 'open' ? `${g.answered} de ${g.total} responderam` : g.state === 'reveal' ? 'Resposta revelada' : boardPhase ? 'Placar parcial' : 'Pouco tempo: pense rápido!'}</span></div>`;
  const canAnswer = player && me && g.state === 'open' && me.choice === null;
  const question = q && !done && !boardPhase ? `${g.bare ? (canAnswer ? screenHint : '') : `<h2 class="sv-text">${esc(q.text)}</h2>`}${optionButtons(q.options, { bare: g.bare, send: i => `{"choice":${i},"round":${g.round}}`, enabled: canAnswer, chosen: me?.choice, correct: q.correct, shown, counts: q.counts, extra: ' flash-options' })}` : '';
  const first = g.state === 'reveal' ? (g.fastest ? `<p class="flash-first">${bolt}<b>${esc(g.fastest.name)}</b> acertou primeiro! <small>+${g.points[2]} pts</small></p>` : '<p class="game-wait">Ninguém acertou esta pergunta.</p>') : '';
  const hasTeams = Boolean(g.teamBoard?.length);
  const scoredTeams = hasTeams ? g.teamBoard : [];
  const teamPodiumOrder = scoredTeams.length === 1 ? [0] : scoredTeams.length === 2 ? [1, 0] : [1, 0, 2];
  const indivOrder = g.board.length === 1 ? [0] : g.board.length === 2 ? [1, 0] : [1, 0, 2];
  const podium = done && (hasTeams ? scoredTeams.some(t => t.score > 0 || t.members.length) : g.board.length > 0)
    ? (hasTeams
      ? `<div class="flash-podium-wrap">${celebration(28, `${g.id}:${g.resultStartedAt || 0}:flash`)}<div class="flash-podium flash-podium-teams" data-count="${Math.min(3, scoredTeams.length)}">${teamPodiumOrder.filter(i => scoredTeams[i]).map(i => {
          const team = scoredTeams[i];
          const members = team.members || [];
          const shownMembers = members.slice(0, 5);
          const crewScale = shownMembers.length <= 1 ? .74 : shownMembers.length === 2 ? .6 : shownMembers.length === 3 ? .5 : .42;
          const memberChars = shownMembers.map((m, mi) => `<span class="team-podium-member">${character({ ...m, color: team.color }, mi, 'win-' + ((i + mi) % 4))}</span>`).join('');
          const memberNames = members.map(m => esc(m.name)).join(', ');
          return `<article class="flash-podium-slot team-podium-slot place-${i + 1}" style="--player-color:${esc(team.color)};--crew-scale:${crewScale}">${shownMembers.length ? `<div class="team-podium-crew" data-size="${shownMembers.length}">${memberChars}${members.length > 5 ? `<em class="team-crew-more">+${members.length - 5}</em>` : ''}</div>` : ''}<strong title="Time ${esc(team.name)}">Time ${esc(team.name)}</strong><span>${team.score.toLocaleString('pt-BR')} pts</span>${team.wins ? `<small>${bolt}×${team.wins}</small>` : ''}${memberNames ? `<small class="flash-team-members" title="${memberNames}">${memberNames}</small>` : ''}<div class="flash-podium-pedestal"><b>${i === 0 ? '♛' : i + 1 + 'º'}</b></div></article>`;
        }).join('')}</div></div>`
      : `<div class="flash-podium-wrap">${celebration(28, `${g.id}:${g.resultStartedAt || 0}:flash`)}<div class="flash-podium" data-count="${Math.min(3, g.board.length)}">${indivOrder.filter(i => g.board[i]).map(i => {
          const item = g.board[i];
          return `<article class="flash-podium-slot place-${i + 1}" style="--player-color:${esc(item.color || ['#a78bfa', '#38bdf8', '#f59e0b'][i])}">${character(item, i, 'win-' + i)}<strong title="${esc(item.name)}">${esc(item.name)}</strong><span>${item.score.toLocaleString('pt-BR')} pts</span>${item.wins ? `<small>${bolt}×${item.wins}</small>` : ''}<div class="flash-podium-pedestal"><b>${i === 0 ? '♛' : i + 1 + 'º'}</b></div></article>`;
        }).join('')}</div></div>`)
    : '';
  const multiCols = done && g.board.length > 5;
  const board = g.board.length && (done || boardPhase) ? `<section class="flash-ranking-box" data-multi="${multiCols}">${boardPhase ? '<h2>Placar da rodada</h2>' : `<h3>${hasTeams ? 'Classificação individual' : 'Classificação completa'}</h3>`}<ol class="flash-board" data-done="${done}" data-multi="${multiCols}">${g.board.map((item, i) => `<li style="--n:${i}" data-me="${Boolean(player && item.id === state.me?.id)}" data-first="${i === 0 && item.score > 0}" data-streak="${item.streak >= 2 && item.gain > 0 ? 'up' : ''}"><b>${i === 0 ? '♛' : i + 1 + 'º'}</b><div class="flash-board-who">${character(item, i, boardPhase && item.gain > 0 ? 'win-0' : 'idle')}<span>${esc(item.name)}</span></div><small>${item.streak >= 2 ? `<i class="streak-flame" data-n="${item.streak}" style="--n:${Math.min(9, item.streak)}" title="Ofensiva: ${item.streak} acertos seguidos"></i>` : ''}${boardPhase && item.gain > 0 ? ` <em>+${item.gain}</em>` : ''}</small><strong>${item.score.toLocaleString('pt-BR')}<small> pts</small></strong></li>`).join('')}</ol></section>` : '';
  const status = done ? ((hasTeams ? scoredTeams.length : g.board.length) ? '' : '<p class="game-winner none">Ninguém pontuou desta vez.</p>')
    : boardPhase ? ''
    : !player ? (g.state === 'ready' ? `<p class="game-note">Cada pergunta fica ${g.seconds} segundos no ar. Mais rapidez rende mais pontos (${g.points[0]} a ${g.points[1]} pts) e quem acerta primeiro ganha +${g.points[2]} pts.</p>` : '')
    : g.state === 'ready' ? `<p class="game-wait">Fique pronto: são ${plural(g.rounds, 'pergunta', 'perguntas')} de ${g.seconds} segundos. Pense rápido!</p>`
    : g.state === 'open' ? (me.choice === null ? '' : '<p class="game-wait">Resposta enviada! Aguardando a turma responder…</p>')
    : me.choice === null ? '<p class="sv-dead">O tempo acabou!</p>'
    : `<p class="${me.right ? 'sv-safe' : 'sv-dead'}">${me.right ? `Acertou! <b>+${me.gain} pts</b>${me.first ? ' · você foi o mais rápido!' : ''}` : 'Não era essa.'}</p>`;
  const mine = (done || boardPhase) && player && me ? (me.score ? `<p class="sv-safe">Você está com <b>${me.score.toLocaleString('pt-BR')} pontos</b> (${me.rank}º lugar)!</p>` : '<p class="game-wait">Você ainda não pontuou. Vamos para a próxima!</p>') : '';
  const hostButtons = g.state === 'ready'
    ? [['next', '▶ Valendo!', 'primary']]
    : g.state === 'open'
      ? [['next', 'Revelar agora']]
      : g.state === 'reveal'
        ? [['next', g.round + 1 < g.rounds ? 'Ver placar →' : 'Ver pódio final →', 'primary']]
        : boardPhase
          ? [['next', 'Próxima pergunta →', 'primary']]
          : [['restart', '↻ Jogar de novo']];
  return live(hud) + live(timerBar(g, now), 'slim') + live(question, 'ask') + live(first + podium + board, 'flash') + live(status + mine) +
    (host ? live(hostActions(state, hostButtons, { showNext: done })) : '');
}

// Comemoração variada (confete, fogos, balões, estrelas ou fitas), sorteada de forma estável por partida.
const celebration = (n, seed = '') => {
  const mode = pickVictory(seed);
  return `<div class="game-confetti" data-victory="${mode}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="--n:${i};--x:${(i * 37 + 11) % 100};--y:${(i * 53 + 7) % 72};--h:${(i * 47) % 360};--t:${(2.3 + (i % 7) * .3).toFixed(2)}s;--w:${((i * 13) % 18) / 10}s;--r:${i % 2 ? 1 : -1}"></i>`).join('')}</div>`;
};
// Escala maior na Sobrevivência para poucos participantes, reduzindo suavemente para turmas cheias.
const sized = count => count <= 4 ? 1.42 : count <= 8 ? 1.18 : count <= 14 ? .95 : count <= 24 ? .76 : count <= 34 ? .6 : .48;

// Sobrevivência: todo mundo começa de pé no palco; quem erra cai pelo alçapão.
function survivalView(state, g, host, player, now) {
  const q = g.question, done = g.state === 'done', ready = g.state === 'ready', shown = g.state === 'reveal' || done, me = g.me, scale = sized(g.players.length);
  const hearts = Math.min(g.total, 12);
  // No lobby não mostra corações ("2 de pé · 0 fora"); o resumo de perguntas fica ao lado do selo SOBREVIVÊNCIA.
  // O título da etapa já aparece no topo: repetir "Uma vida só. Quem
  // sobrevive?" aqui só apertava a tela do celular.
  const hud = ready ? '' : `<div class="sv-hud"><span class="sv-hearts" aria-label="${g.alive} de pé">${Array.from({ length: hearts }, (_, i) => `<i data-on="${i < Math.round(g.alive / Math.max(1, g.total) * hearts)}">${stageIcon('survival')}</i>`).join('')}<b>${g.alive}</b> de pé${g.total ? ' · ' + (g.total - g.alive) + ' fora' : ''}</span><span>Pergunta <b>${Math.max(1, g.round + 1)}</b> de ${g.rounds}</span></div>`;
  const canAnswer = player && me?.alive && g.state === 'open' && me.choice === null;
  const question = q && !done ? `${g.bare ? (canAnswer ? screenHint : '') : `<h2 class="sv-text">${esc(q.text)}</h2>`}${optionButtons(q.options, { bare: g.bare, send: i => `{"choice":${i},"round":${g.round}}`, enabled: canAnswer, chosen: me?.choice, correct: q.correct, shown, counts: q.counts })}` : '';
  const winners = g.players.filter(item => item.alive);
  const status = done ? (winners.length ? `<p class="game-winner">${winners.length === 1 ? `<b>${esc(winners[0].name)}</b> é o último de pé!` : `<b>${winners.length}</b> sobreviveram até o fim!`} <small>+${g.points} pts</small></p>` : '<p class="game-winner none">Ninguém sobreviveu!</p>')
    : !player ? `<p class="game-wait">${ready ? 'Todo mundo tem uma vida só. Errou ou não respondeu a tempo: caiu.' : g.state === 'open' ? `${g.answered} de ${g.alive} responderam` : 'Quem errou, caiu!'}</p>`
    : !me?.playing ? '<p class="game-wait">Você entrou depois do início. Assista e torça!</p>'
    : !me.alive ? `<p class="sv-dead">Você caiu na pergunta ${me.fell + 1}. Agora é torcer!</p>`
    : ready ? '<p class="game-wait">Você tem <b>1 vida</b>. Prepare-se…</p>'
    : g.state === 'open' ? (me.choice === null ? '<p class="game-wait">Escolha com cuidado: errou, caiu.</p>' : '<p class="game-wait">Resposta travada. Segura a respiração…</p>')
    : '<p class="sv-safe">Você continua de pé!</p>';
  const roamScale = g.players.length <= 6 ? 1 : g.players.length <= 14 ? .65 : .35;
  const showArena = Boolean(host);
  const arena = showArena ? `<div class="sv-arena" style="--scale:${scale}" data-state="${g.state}" data-crowd="${g.players.length}"><i class="sv-light a"></i><i class="sv-light b"></i>${done && winners.length ? celebration(28, `${g.id}:${g.resultStartedAt || 0}:survival`) : ''}<div class="sv-crowd">${g.players.map((item, i) => {
    const fell = item.alive ? '' : item.fell === g.round && shown ? 'now' : 'before';
    const dir = i % 2 === 0 ? 1 : -1;
    const roam = Math.round((24 + ((i * 19) % 32)) * roamScale) * dir;
    const roamT = (4.4 + (i % 5) * .9).toFixed(2);
    const roamD = (-((i * 1.13) % 4)).toFixed(2);
    const svAnim = i % 5;
    return `<figure class="sv-player" data-fell="${fell}" data-sv-anim="${svAnim}" data-locked="${g.state === 'open' && Boolean(item.locked)}" data-me="${player && item.id === state.me?.id}" data-winner="${done && item.alive}" style="--i:${i};--roam:${roam}px;--roam-t:${roamT}s;--roam-d:${roamD}s"><figcaption>${esc(item.name)}</figcaption><div class="sv-actor">${character(item, i, done && item.alive ? 'win-' + i % 4 : '')}<i class="sv-lock" aria-hidden="true">✓</i><i class="sv-ghost" aria-hidden="true">✕</i></div></figure>`;
  }).join('') || '<p class="game-wait">Aguardando participantes…</p>'}</div><i class="sv-floor"></i></div>` : '';
  return live(hud) + live(timerBar(g, now), 'slim') + live(question, 'ask') + live(status) +
    (host ? live(hostActions(state, [ready ? ['next', '▶ Começar', 'primary'] : g.state === 'open' ? ['next', 'Revelar agora'] : g.state === 'reveal' ? ['next', 'Próxima pergunta →', 'primary'] : ['restart', '↻ Jogar de novo']], { showNext: done })) : '') +
    live(arena, 'arena');
}

// Espelhamento do experimento: os cartões do telão mostram o experimento de
// cada pessoa com os controles no estado em que ela deixou. O aluno manda o
// estado a cada ~700 ms (peek) e aqui a gente reaplica nos campos.
function applyChallengeMirror(g) {
  // Experimento grande: no telão segue o líder; para quem só assiste, é o
  // experimento do líder do time se mexendo (controles travados).
  const main = document.querySelector('[data-challenge-sim] [data-simulation]');
  const values = g.mirror || (g.live?.[0]?.values || null);
  // Quem está com o experimento na mão não recebe o próprio eco: isso puxaria
  // o controle de volta enquanto a pessoa arrasta.
  const driving = Boolean(g.me?.leader);
  if (main && values && !driving) applySimValues(main, values, false);
  const cards = document.querySelectorAll('.challenge-live-card');
  const people = g.live || [];
  cards.forEach((card, index) => {
    const person = people[index];
    const sim = card.querySelector('[data-simulation]');
    if (!person || !sim) return;
    applySimValues(sim, person.values, true);
  });
}

// Escreve os valores nos campos do experimento na ordem em que aparecem.
function applySimValues(sim, values, interactive) {
  const fields = [...sim.querySelectorAll(':is([data-param],[data-sim-select],[data-sim-text],[data-sim-toggle])')];
  let changed = false;
    person.values.forEach((value, i) => {
      const field = fields[i];
      if (!field) return;
      const next = String(value);
      if (field.dataset.simToggle !== undefined) {
        if (String(field.dataset.value) !== next) { field.dataset.value = next; changed = true; }
        // Botões de liga/desliga guardam o estado em data-value; refletimos no
        // aria para leitor de tela e no visual.
        const on = next === '1' || next === 'true';
        field.setAttribute('aria-pressed', String(on));
        field.dataset.on = String(on);
      } else if (String(field.value) !== next) {
        field.value = next; changed = true;
      }
    });
    // Repinta a cena da miniatura com os valores novos (o simulador escuta
    // input/change nos campos; o telão é só leitura).
  if (changed) for (const field of fields) field.dispatchEvent(new Event('change', { bubbles: true }));
}

function challengeView(state, g, host, player) {
  const done = g.state === 'done';
  const max = g.maxTries || 3;
  const me = player && g.me;
  const left = me ? Math.max(0, max - me.tries) : max;
  const leader = me?.leader || host;
  const hintLeft = Math.max(0, Math.ceil((g.hintSeconds || 20) - (g.hintAt ? (Date.now() - g.hintAt) / 1000 : 0)));
  // Dica por controle depois de errar: verde = quase lá, âmbar = perto, cinza =
  // longe — com legenda, porque só as barrinhas não diziam nada.
  const hintWords = { hot: 'quase lá', warm: 'perto', cold: 'longe' };
  const closest = me?.hints?.filter(Boolean).sort((a, b) => ['hot', 'warm', 'cold'].indexOf(a) - ['hot', 'warm', 'cold'].indexOf(b))[0];
  const controlHints = me && !me.ok && !done && me.hints?.length && left > 0
    ? `<div class="challenge-hint-box"><p class="challenge-hint" role="img" aria-label="Quão perto cada controle está da meta">${me.hints.map(hint => hint ? `<i class="${hint}"></i>` : '').join('')}</p><small>Dica: ${closest ? hintWords[closest] : 'ajuste de novo'} da meta · cada barra é um controle</small></div>`
    : '';
  // Rodada de dicas: o líder tenta, o time lê a dica e palpita a resposta.
  const teamHint = g.hint
    ? `<div class="challenge-team-hint"><span>Dica ${g.hintIndex + 1} de ${g.hintCount}</span><p>${esc(g.hint)}</p>${leader ? '' : `<small>O líder está ajustando o experimento. Escreva o que você acha que é a resposta certa.</small>`}</div>`
    : `<div class="challenge-team-hint quiet"><p>${leader ? 'Você está no comando: ajuste os controles e toque em tentar.' : 'O líder do time está no comando do experimento. Fique de olho e palpita quando a dica aparecer.'}</p></div>`;
  const guessBox = !leader && me && !me.ok && !done
    ? `<form class="challenge-guess" data-challenge-guess><label for="challenge-guess-field">Seu palpite para a turma</label>
        <div><input id="challenge-guess-field" name="guess" maxlength="80" value="${esc(me.guess || '')}" placeholder="Ex.: 45 graus" autocomplete="off"><button class="btn secondary small" type="submit">Enviar</button></div>
        ${g.guessesCount ? `<small>${g.guessesCount} ${g.guessesCount === 1 ? 'palpite' : 'palpites'} na tela</small>` : '<small>O telão mostra os palpites de todo mundo.</small>'}</form>`
    : '';
  const mine = me ? (me.ok
    ? `<p class="game-winner"><span>🎯</span>Você chegou à meta! <small>${me.place}º lugar · +${me.points} pts</small></p>`
    : done ? '<p class="game-wait">Tempo encerrado.</p>'
    : left <= 0 ? `<p class="sv-dead">As ${max} tentativas acabaram. Acompanhe a turma!</p>`
    : leader ? `${controlHints}<div class="challenge-submit-row"><button class="btn primary game-submit" data-challenge-send>${stageIcon('challenge')} Tentar acertar</button><span class="challenge-tries" data-left="${left}" aria-label="${left} de ${max} tentativas restantes">${Array.from({ length: max }, (_, i) => `<i data-used="${i >= left}"></i>`).join('')}</span></div>`
    : `<p class="game-wait">Você está no time de quem mexe: acompanhe a dica e palpite.</p>`)
    : '';
  const podium = g.solved.length ? `<ol class="challenge-podium">${g.solved.slice(0, 5).map((item, i) => `<li><b>${['🥇', '🥈', '🥉'][i] || i + 1 + 'º'}</b><span>${esc(item.name)}</span><small>${(item.at / 1000).toFixed(1)} s · ${plural(item.tries, 'tentativa', 'tentativas')}</small></li>`).join('')}</ol>` : '';
  const answer = g.answer ? `<p class="challenge-answer"><b>Resposta:</b> ${g.answer.map(item => `${esc(item.label)} = ${esc(item.v)}`).join(' · ')}</p>` : '';
  const goal = g.text ? `<p class="challenge-goal">${esc(g.text)}</p>` : '';
  // Telão: cada time espelhado ao vivo (os controles de quem está mexendo).
  const liveLab = host && !done && g.live?.length
    ? `<div class="challenge-live"><h2>Espelho ao vivo <small>${g.live.length}</small></h2><div class="challenge-live-grid">${g.live.map(item => `<div class="challenge-live-card" data-ok="${item.ok}"><header>${character(item, 0, item.ok ? 'win-0' : 'idle')}<strong>${esc(item.name)}</strong><small>${item.tries}/${max}</small></header><div class="challenge-live-sim">${simulationMarkup(g.simulation)}</div><div class="challenge-live-values">${item.values.map(value => `<i>${esc(String(value ?? '').slice(0, 6))}</i>`).join('')}</div></div>`).join('')}</div></div>`
    : '';
  // O espelho de verdade: aplica no experimento grande (e nas miniaturas do
  // telão) os valores que o líder está usando agora.
  if (typeof document !== 'undefined') queueMicrotask(() => applyChallengeMirror(g));
  // Telão: palpites chegando em tempo real, tipo mural.
  const guessWall = host && g.guesses?.length
    ? `<div class="challenge-guess-wall"><h2>Palpites do time <small>${g.guessesCount}</small></h2><ul>${g.guesses.map(item => `<li><strong>${esc(item.name)}</strong><span>${esc(item.guess || '—')}</span></li>`).join('')}</ul></div>`
    : '';
  const modeSwitch = host && !done ? `<div class="challenge-mode"><button type="button" class="btn secondary small" data-game-do="challenge-mode" data-mode="${g.freeForAll ? 'leader' : 'all'}">${g.freeForAll ? 'Voltar a só o líder mexer' : 'Deixar todos mexerem'}</button><button type="button" class="btn secondary small" data-game-do="next-hint">Próxima dica</button><span class="challenge-mode-state">${g.freeForAll ? 'Todos podem mexer' : 'Só o líder mexe'}</span></div>` : '';
  return `<div class="challenge-layout"><div class="challenge-sim" data-challenge-sim data-locked="${!host && !leader}">${simulationMarkup(g.simulation)}</div><aside>` +
    live(goal + teamHint + mine + guessBox + liveLab + guessWall + `<h2>Quem chegou na meta <small>${g.solvedCount}</small></h2>${podium}${done ? answer : ''}`) +
    (host ? live(modeSwitch + hostActions(state, [done ? ['restart', '↻ Jogar de novo'] : ['end', 'Encerrar jogo', 'primary']], { showNext: done })) : '') + '</aside></div>';
}

function raffleView(state, g, host, player) {
  // Snapshot de jogo recém-criado pode chegar sem a lista: cai no placeholder.
  const names = g.names?.length ? g.names : ['…'];
  const stage = g.current
    ? `<div class="raffle-stage"><i class="raffle-glow" aria-hidden="true"></i><div class="raffle-wheel" data-raffle data-at="${g.drawAt}" data-final="${esc(g.current.name)}" data-names="${esc(JSON.stringify(names))}" data-me="${Boolean(g.me)}"><i class="raffle-ptr left" aria-hidden="true">▸</i><span data-raffle-name>${esc(g.current.name)}</span><i class="raffle-ptr right" aria-hidden="true">◂</i>${celebration(24, `${g.id}:${g.draws || 0}:raffle`)}</div></div>`
    : `<div class="raffle-stage"><i class="raffle-glow" aria-hidden="true"></i><div class="raffle-wheel idle"><i class="raffle-ptr left" aria-hidden="true">▸</i><span>?</span><i class="raffle-ptr right" aria-hidden="true">◂</i></div></div>`;
  return live(stage, 'raffle') + live(host ? hostActions(state, [['draw', g.current ? 'Sortear outro' : 'Sortear', 'primary']]) : '');
}

// Cabo de guerra: rodada por rodada; cada rodada tem até 3 perguntas e cada participante recebe 1 sorteada aleatoriamente.
// Resultados e porcentagens ficam escondidos até a puxada final concluir!
function tugView(state, g, host, player, now) {
  const done = g.state === 'done', pulling = g.state === 'pull', between = g.state === 'between', over = done || pulling, open = g.state === 'open';
  const colors = g.labels.map(label => label.color), names = g.labels.map(label => label.name), crews = g.crews || [[], []];
  // Lado com dois times (4 equipes = 2 duplas) usa gradiente com as duas cores.
  const side = i => g.labels[i]?.gradient ? `linear-gradient(100deg,${g.labels[i].gradient.a} 0 46%,${g.labels[i].gradient.b} 54% 100%)` : colors[i];
  const tints = [0, 1].map(i => g.labels[i]?.gradient ? `--team:${colors[i]};--team2:${g.labels[i].gradient.b}` : '');
  const uneven = g.labels[0]?.count && g.labels[1]?.count && g.labels[0].count !== g.labels[1].count;
  const revealed = Boolean(done && g.revealScores !== false);
  const diff = revealed ? g.score[0] - g.score[1] : 0, lean = Math.max(-1, Math.min(1, diff / 100));
  const end = g.winner === 0 ? -20 : g.winner === 1 ? 20 : 0;
  const roundDots = g.rounds > 1 && g.state !== 'ready'
    ? `<ol class="tug-rounds" data-many="${g.rounds > 6}" aria-label="Progresso das rodadas">${Array.from({ length: g.rounds }, (_, r) => `<li data-on="${done || pulling || r < g.round || (between && r <= g.round)}" data-now="${open && r === g.round}">${r + 1}</li>`).join('')}</ol>`
    : '';
  const hud = !done ? `<div class="sv-hud"><span>${stageIcon('tug')} ${g.round >= 0 ? `Rodada <b>${Math.min(g.round + 1, g.rounds)}</b> de ${g.rounds}` : `${plural(g.rounds, 'rodada', 'rodadas')} · ${g.seconds}s cada`}</span><span>${open ? `${g.answered} de ${g.total} responderam` : between ? `Preparando rodada ${g.round + 2}…` : pulling ? 'Puxando a corda…' : uneven ? `Times ímpares: ${esc(g.labels[g.labels[0].count > g.labels[1].count ? 0 : 1].name)} tem um time a mais` : g.labels.some(label => label.gradient) ? 'Dupla de times de cada lado' : `${g.roundQuestions || 1} ${(g.roundQuestions || 1) === 1 ? 'pergunta' : 'perguntas'} nesta rodada`}</span></div>${roundDots}` : '';
  const team = side => `<div class="tug-team ${side ? 'right' : 'left'}" data-result="${done && g.winner >= 0 ? (g.winner === side ? 'won' : 'lost') : ''}" style="--team:${colors[side]};${tints[side]}">${(crews[side].length ? crews[side] : [{ avatar: '', name: '' }]).map((person, i) => `<span class="tug-puller" style="--i:${i}" data-empty="${!crews[side].length}" data-answered="${Boolean(open && person.answered)}">${character({ ...person, color: colors[side] }, i, done && g.winner >= 0 ? (g.winner === side ? 'win-' + (i + side) % 4 : 'lose') : '')}${open && person.answered ? '<small class="tug-puller-prog" aria-label="Respondeu">✓</small>' : ''}</span>`).join('')}${g.sides[side] > 5 ? `<em>+${g.sides[side] - 5}</em>` : ''}</div>`;
  const sideCard = i => `<span style="--team:${colors[i]};${tints[i]}${g.labels[i]?.gradient ? `;--side-paint:${side(i)}` : ''}" data-mine="${player && g.side === i}"><b>${esc(names[i])}</b><small>${plural(g.sides[i], 'pessoa', 'pessoas')}${revealed ? ` · ${g.hits[i]} ${g.hits[i] === 1 ? 'acerto' : 'acertos'}` : ''}</small>${revealed ? `<strong>${g.score[i]}%</strong>` : `<strong class="tug-hidden-score" aria-label="Respostas da rodada">${g.hits[i]}</strong>`}</span>`;
  const scene = `<div class="tug-scene" data-state="${g.state}" data-winner="${done ? g.winner : ''}" data-revealed="${revealed}" style="--shift:${done ? end : 0}%;--end:${end}%;--pull-delay:${pulling ? (-(Math.max(0, now - g.pullAt) / 1000)).toFixed(2) : 0}s">
    ${done && g.winner >= 0 ? celebration(28, `${g.id}:${g.resultStartedAt || 0}:tug`) : ''}
    <div class="tug-names">${sideCard(0)}<i>VS</i>${sideCard(1)}</div>
    <div class="tug-field"><i class="tug-pit"></i><i class="tug-mark"></i><div class="tug-group">${team(0)}<div class="tug-cord"><i class="tug-flag"></i></div>${team(1)}</div><i class="tug-ground"></i></div>
    <div class="tug-meter" data-hidden="${!revealed}"><i class="a" style="width:${revealed ? (50 + lean * 50).toFixed(1) : '50'}%;--team:${colors[0]};${tints[0]}"></i><i class="b" style="--team:${colors[1]};${tints[1]}"></i><b></b></div>
  </div>`;
  const result = done ? `<p class="game-winner"${g.winner >= 0 ? ` style="--team:${colors[g.winner]}"` : ''}>${g.winner >= 0 ? `<b>${esc(names[g.winner])}</b> puxou a corda!${player && g.side === g.winner ? ` <small>+${g.points} pts</small>` : ''}` : `Empate! A diferença ficou dentro de ${g.tolerance} pontos.`}</p>`
    : pulling ? '<p class="game-wait tug-suspense">Segura firme… quem será que leva?</p>'
    : between ? `<p class="game-wait tug-suspense">Rodada ${g.round + 1} encerrada! Próxima rodada chegando…</p>` : '';

  // Aluno durante a rodada: recebe 1 pergunta sorteada aleatoriamente dentre as opções desta rodada.
  const me = g.me, q = g.question;
  const studentOpen = player && open && me;
  const fbFresh = player && (open || between) && me && me.lastRight !== null && (me.answered || between)
    ? `<p class="tug-feedback ${me.lastRight ? 'ok' : 'miss'}">${me.lastRight ? '✓ Acertou! +100 pts de força para o seu lado!' : '✕ Não era essa — prepare-se para a próxima rodada!'}</p>`
    : '';
  // A rodada tem várias perguntas: o aluno responde uma de cada vez, na ordem.
  const remaining = g.questions || [];
  const nextQ = studentOpen ? remaining.find(item => item.index === (g.answeredInRound || 0)) : null;
  const studentAsk = studentOpen && nextQ
    ? `<p class="tug-question-count">Pergunta ${nextQ.index + 1} de ${remaining.length}</p><h2 class="sv-text">${esc(nextQ.text)}</h2>${optionButtons(nextQ.options, { bare: false, send: i => `{"choice":${i},"round":${g.round},"v":${nextQ.index}}`, enabled: true })}`
    : studentOpen
      ? `${fbFresh}<p class="sv-safe">Respostas enviadas! Aguardando a turma…</p>`
      : between && player ? fbFresh : '';

  const mine = player && g.side !== null && g.side !== undefined ? `<p class="team-mine" style="--team:${colors[g.side]}">Você puxa pelo <b>${esc(names[g.side])}</b></p>` : '';
  const status = over || between ? ''
    : !player ? `<p class="game-wait">${g.state === 'ready' ? `São ${plural(g.rounds, 'rodada', 'rodadas')}: na rodada, todo mundo do time responde as mesmas perguntas. O resultado só aparece na puxada final!` : `${g.answered} de ${g.total} já responderam a rodada ${g.round + 1}`}</p>`
    : g.state === 'ready' ? `<p class="game-wait">Prepare-se: são ${plural(g.rounds, 'rodada', 'rodadas')}. Responda as perguntas da rodada para ajudar seu time a puxar a corda!</p>`
    : '';
  const showScene = !studentOpen || me.answered;
  const hostBtn = g.state === 'ready' ? ['next', '▶ Começar', 'primary']
    : open ? ['next', g.round + 1 < g.rounds ? 'Encerrar rodada agora' : 'Puxar a corda agora', 'primary']
    : between ? ['next', 'Próxima rodada →', 'primary']
    : done ? ['restart', '↻ Revanche'] : null;
  return live(hud) + live(timerBar(g, now), 'slim') + live(studentAsk, 'ask') + live((showScene ? scene : '') + result, 'rope') + live(mine + status) +
    (host ? live(hostActions(state, [hostBtn], { showNext: done })) : '');
}

// Corrida do saber: a pergunta aparece no telão, o aluno responde no celular e cada acerto faz o boneco correr.
// Resposta certa e rápida vai mais longe; quem erra fica parado naquela rodada.
// Tudo em tempo real: o boneco anda assim que a pessoa responde, e as perguntas seguem sozinhas.
function raceView(state, g, host, player, now) {
  const q = g.question, done = g.state === 'done', shown = g.state === 'reveal' || done, me = g.me, count = g.runners.length;
  const hud = `<div class="sv-hud"><span>${stageIcon('race')} ${g.round >= 0 ? `Pergunta <b>${g.round + 1}</b> de ${g.rounds}` : `${plural(g.rounds, 'pergunta', 'perguntas')} · ${g.seconds}s cada`}</span><span>${g.state === 'open' ? `${g.answered} de ${g.total} responderam` : g.state === 'reveal' ? (g.round + 1 < g.rounds ? 'Próxima pergunta já vem…' : 'Resultado já vem…') : (g.state === 'open' ? 'Correndo!' : 'Rodada encerrada')}</span></div>`;
  const canAnswer = player && me && g.state === 'open' && me.choice === null;
  const question = q && !done ? `${g.bare ? (canAnswer ? screenHint : '') : `<h2 class="sv-text">${esc(q.text)}</h2>`}${optionButtons(q.options, { bare: g.bare, send: i => `{"choice":${i},"round":${g.round}}`, enabled: canAnswer, chosen: me?.choice, correct: q.correct, shown, counts: q.counts })}` : '';
  const medal = place => place && place <= 3 ? `<b class="race-place" data-place="${place}">${place}º</b>` : '';
  // Acertou: corre de verdade por alguns segundos e para em idle quando a
  // turma toda responde (aí quem acertou comemora).
  const settled = g.state === 'reveal';
  const mood = (runner, i) => done
    ? (runner.place && runner.place <= 3 ? 'win-' + (runner.place + i) % 4 : runner.dist ? 'idle' : 'lose')
    : runner.right === undefined ? 'idle'
    : runner.right ? (settled ? 'win-' + i % 4 : 'run')
    : 'lose';
  const tag = runner => done ? medal(runner.place) : runner.right === undefined ? '' : runner.right ? `<b class="race-gain">+${runner.gain} m</b>` : '<b class="race-gain miss">✕</b>';
  const lanes = g.runners.map((runner, i) => `<div class="race-lane" data-k="${esc(runner.id)}" data-me="${player && runner.id === state.me?.id}" data-place="${runner.place || ''}" data-right="${!done && runner.right !== undefined ? runner.right : ''}" data-streak="${!done && runner.right ? 'up' : ''}" data-run="${!done && !settled && runner.right ? 'now' : ''}" style="--p:${runner.p.toFixed(3)};--i:${i}"><span class="race-name">${esc(runner.name)}<small>${runner.dist} m</small></span><div class="race-road"><div class="race-runner">${character(runner, i, mood(runner, i))}<span data-t>${tag(runner)}</span></div></div></div>`).join('');
  const track = `<div class="race-track" data-state="${g.state}" style="--lanes:${Math.max(1, count)};--s:${count <= 3 ? .5 : count <= 5 ? .4 : .32}">${done && g.runners.some(runner => runner.place) ? celebration(26, `${g.id}:${g.resultStartedAt || 0}:race`, true) : ''}<i class="race-finish" aria-hidden="true"></i>${lanes || '<p class="game-wait">Aguardando participantes…</p>'}${g.total > count ? `<p class="race-more">+${g.total - count} correndo</p>` : ''}</div>`;
  const first = g.runners.find(runner => runner.place === 1);
  const status = done ? (first ? `<p class="game-winner"><b>${esc(first.name)}</b> venceu com ${first.dist} m!</p>` : '<p class="game-winner none">Ninguém saiu do lugar desta vez.</p>')
    : !player ? (g.state === 'ready' ? `<p class="game-note">Você só dá a largada: as perguntas seguem sozinhas quando todos respondem ou o tempo acaba. Cada acerto vale de 10 a 20 metros · 1º lugar +${g.points[0]} · 2º +${g.points[1]} · 3º +${g.points[2]} pontos</p>` : '')
    : !me ? '<p class="game-wait">Você entrou depois do início. Assista e torça!</p>'
    : g.state === 'ready' ? '<p class="game-wait">Fique pronto: acertou, seu boneco corre. Quanto mais rápido, mais longe!</p>'
    : me.choice === null ? (g.state === 'open' ? '<p class="game-wait">Responda rápido para correr mais!</p>' : '<p class="sv-dead">O tempo acabou: seu boneco ficou parado</p>')
    : `<p class="${me.right ? 'sv-safe' : 'sv-dead'}">${me.right ? `Acertou! Seu boneco correu <b>+${me.gain} m</b>` : 'Não foi dessa vez: seu boneco ficou parado'} · ${me.rank}º lugar${g.state === 'open' ? '<small> · esperando a turma responder…</small>' : ''}</p>`;
  const mine = done && player && me ? (me.place ? `<p class="sv-safe">Você terminou em <b>${me.place}º lugar</b> com ${me.dist} m!</p>` : '<p class="game-wait">Você não saiu do lugar. Na próxima vai!</p>') : '';
  // Uma assinatura por pergunta/estado: dentro dela só a posição e a etiqueta de cada raia mudam.
  const signature = g.state + ':' + g.round + ':' + g.runners.map(runner => runner.id).join(',');
  return live(hud) + live(timerBar(g, now), 'slim') + live(question, 'ask') + `<div class="game-live game-race" data-game-live data-soft="${esc(signature)}">${track}</div>` + live(status + mine) +
    (host ? live(hostActions(state, [g.state === 'ready' ? ['next', '▶ Largada!', 'primary'] : g.state === 'open' ? ['next', 'Pular pergunta'] : g.state === 'reveal' ? ['next', 'Avançar já'] : ['restart', '↻ Correr de novo']], { showNext: done })) : '');
}

const views = { teams: teamsView, flash: flashView, survival: survivalView, challenge: challengeView, raffle: raffleView, tug: tugView, race: raceView };

const normTitle = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

// Título que só repete a regra (ou o nome da dinâmica) não aparece em cena:
// a Sobrevivência já diz "Uma vida só" em todo lugar, não precisa do h1.
function redundantHead(text, type) {
  const norm = normTitle(String(text || ''));
  if (!norm) return true;
  if (norm === normTitle(gameNames[type] || '')) return true;
  if (type === 'survival' && /uma vida so|quem sobrevive/.test(norm)) return true;
  if (type === 'tug' && /cabo de guerra/.test(norm)) return true;
  return false;
}
function stageHead(g) {
  if (g.type === 'flash' && g.state === 'done') {
    return `<div class="flash-done-hero"><span class="flash-hero-bolt" aria-hidden="true">${stageIcon('flash')}</span><h1>Pódio do relâmpago</h1></div>`;
  }
  const meta = g.type === 'survival' && g.state === 'ready'
    ? `<span class="game-eyebrow-meta">${plural(g.rounds, 'pergunta', 'perguntas')} · ${g.seconds}s cada</span>`
    : '';
  const typeName = gameNames[g.type] || '';
  const titleText = String(g.text || '').trim();
  const normType = normTitle(typeName), normText = normTitle(titleText);
  const duplicatesType = !normText || normText === normType || normText.includes(normType) || redundantHead(titleText, g.type);
  if (duplicatesType) {
    return `<div class="game-head-row game-head-single"><h1 class="game-hero-title"><span class="game-hero-icon" aria-hidden="true">${gameIcon(g.type)}</span>${esc(titleText || typeName)}</h1>${meta}</div>`;
  }
  return `<div class="game-head-row"><span class="game-eyebrow">${gameIcon(g.type)} ${esc(typeName.toUpperCase())}</span>${meta}</div><h1>${esc(titleText)}</h1>`;
}

export function gameMarkup(state, { host, demo, header, now = Date.now(), shareDialog = () => '', shareOpen = false }) {
  const g = state.game, player = !host || demo;
  // O convite com QR entra em qualquer etapa: "Ao vivo" abre a mesma coisa aqui
  // e nas telas de aula/lobby.
  return `${header()}<main class="game-stage" data-game-key="${esc(g.id)}" data-game-type="${g.type}" data-game-state="${g.state}">${live(stageHead(g), 'head')}${views[g.type](state, g, host, player, now)}</main>${shareOpen ? shareDialog() : ''}`;
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
  before.forEach((node, index) => {
    const fresh = after[index];
    if (node.innerHTML === fresh.innerHTML) return;
    // Corrida: as raias ficam no lugar e só a posição muda, para o boneco deslizar em vez de pular.
    if (node.dataset.soft && node.dataset.soft === fresh.dataset.soft) {
      const fromList = [...node.querySelectorAll('[data-k]')], toList = [...fresh.querySelectorAll('[data-k]')];
      if (fromList.length === toList.length && fromList.every((item, i) => item.dataset.k === toList[i].dataset.k)) {
        fromList.forEach((item, i) => {
          const next = toList[i];
          for (const name of next.getAttributeNames()) if (item.getAttribute(name) !== next.getAttribute(name)) item.setAttribute(name, next.getAttribute(name));
          const label = item.querySelector('[data-t]'), nextLabel = next.querySelector('[data-t]');
          if (label && nextLabel && label.innerHTML !== nextLabel.innerHTML) label.innerHTML = nextLabel.innerHTML;
        });
        return;
      }
    }
    node.innerHTML = fresh.innerHTML;
    if (fresh.dataset.soft !== undefined) node.dataset.soft = fresh.dataset.soft;
  });
  if (formNow) formNow.dataset.left = formNext.dataset.left;
  current.dataset.gameState = next.dataset.gameState;
  const head = root.querySelector('.header'), nextHead = template.content.querySelector('.header');
  if (head && nextHead && head.innerHTML !== nextHead.innerHTML) head.innerHTML = nextHead.innerHTML;
  return true;
}

// Roleta: troca os nomes rapidamente e desacelera suavemente até travar no sorteado (sincronizado com o tambor de 2.8s).
const raffleTimers = new WeakMap();
export function animateRaffle(root, now = Date.now) {
  const node = root.querySelector('[data-raffle]');
  if (!node || raffleTimers.has(node)) return;
  const end = Number(node.dataset.at) + 2800, label = node.querySelector('[data-raffle-name]');
  let names = []; try { names = JSON.parse(node.dataset.names); } catch { names = []; }
  if (now() >= end || names.length < 2) { node.dataset.done = 'true'; return; }
  node.dataset.done = 'false';
  let index = Math.floor(Math.random() * names.length);
  const spin = () => {
    if (!node.isConnected) return;
    const left = end - now();
    if (left <= 0) { label.textContent = node.dataset.final; node.dataset.done = 'true'; raffleTimers.delete(node); return; }
    index = (index + 1) % names.length;
    label.textContent = names[index];
    label.classList.remove('raffle-tick');
    void label.offsetWidth;
    label.classList.add('raffle-tick');
    const delay = left < 450 ? 230 : left < 1050 ? 155 : left < 1850 ? 95 : 58;
    raffleTimers.set(node, setTimeout(spin, delay));
  };
  spin();
}
