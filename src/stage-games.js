// Etapas interativas da aula (além de Slides, Enquete e Quiz):
//   teams     – Competição em equipes: divide a turma em times e mostra o placar
//   flash     – Desafio relâmpago: várias perguntas com tempo curto (5 ou 10 s); acerto rápido vale mais
//   survival  – Sobrevivência: cada aluno tem 1 vida; errou, caiu e não responde mais
//   challenge – Desafio no experimento: acertar uma meta mexendo no experimento
//   raffle    – Sorteio de aluno
//   tug       – Cabo de guerra: até 12 rodadas, cada uma sorteia 1 de até 3 perguntas; quem acerta mais puxa a corda
//   race      – Corrida do saber: cada acerto faz o boneco avançar na hora; as perguntas seguem sozinhas
// Cada etapa é um slide com o campo `game`. Aqui ficam as regras (sem tela), para
// a sala do professor aplicar e os testes conferirem.
import { createUuid } from './uuid.js';

export const gameTypes = ['teams', 'flash', 'survival', 'challenge', 'raffle', 'tug', 'race'];
export const isGameType = type => gameTypes.includes(type);
export const gameNames = { teams: 'Equipes', flash: 'Relâmpago', survival: 'Sobrevivência', challenge: 'Desafio no experimento', raffle: 'Sorteio', tug: 'Cabo de guerra', race: 'Corrida' };
export const gameHints = {
  teams: 'Divide a turma em times e mostra o placar',
  flash: 'Perguntas com tempo curto: acerto rápido vale mais',
  survival: 'Uma vida só: errou, caiu. Quem fica de pé?',
  challenge: 'Quem atinge a meta no experimento?',
  raffle: 'Roleta com os nomes de quem está na sala',
  tug: 'Dois lados respondem por rodadas; quem acerta mais puxa a corda',
  race: 'Cada acerto faz o boneco correr. Resposta rápida vai mais longe'
};
export const teamPalette = [['Azul', '#3b82f6'], ['Laranja', '#f97316'], ['Verde', '#22c55e'], ['Rosa', '#ec4899'], ['Roxo', '#a855f7'], ['Ciano', '#06b6d4'], ['Amarelo', '#eab308'], ['Vermelho', '#ef4444'], ['Lima', '#84cc16'], ['Magenta', '#d946ef']];
export const SURVIVAL_POINTS = 500;
export const FLASH_POINTS = 500, CHALLENGE_FIRST = 500, CHALLENGE_POINTS = 300, TUG_POINTS = 200;
export const TUG_ROUNDS = 12, TUG_VARIANTS = 3, TUG_QUESTIONS_PER_PLAYER = 3, TUG_HIT = 100, TUG_PULL_MS = 5800, TUG_BETWEEN_MS = 2200;
// Relâmpago: acerto vale FLASH_HIT + até FLASH_SPEED pela rapidez; o primeiro a acertar leva mais FLASH_FIRST.
export const FLASH_HIT = 100, FLASH_SPEED = 100, FLASH_FIRST = 100, FLASH_PAUSE = 2500, FLASH_QUESTIONS = 25;
export const RACE_POINTS = [500, 300, 200], RACE_FINISH = 100, RACE_STEP = 10, RACE_SPEED = 10, RACE_PAUSE = 3500;

const text = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max);
const line = (value, max) => text(value, max).replace(/\s+/g, ' ').trim();

export function defaultGame(type) {
  if (type === 'teams') return { type, text: 'Que comecem os jogos!', count: 2, pick: false };
  if (type === 'race') return { type, text: 'Corrida do saber', seconds: 15, questions: [1, 2, 3].map(n => ({ text: 'Pergunta ' + n, options: ['Opção A', 'Opção B'], correct: 0 })) };
  if (type === 'flash') return { type, text: 'Desafio relâmpago', seconds: 10, questions: [1, 2, 3].map(n => ({ text: 'Pergunta ' + n, options: ['Opção A', 'Opção B'], correct: 0 })) };
  if (type === 'survival') return { type, text: 'Uma vida só. Quem sobrevive?', seconds: 15, questions: [{ text: 'Primeira pergunta', options: ['Opção A', 'Opção B'], correct: 0 }] };
  if (type === 'challenge') return { type, text: 'Ajuste o experimento até chegar à meta.', simulation: 'projectile', answer: [], tolerance: 5 };
  if (type === 'raffle') return { type, text: 'Quem vai responder?' };
  return { type: 'tug', text: 'Cabo de guerra!', options: ['Lado A', 'Lado B'], seconds: 15, tolerance: 10, rounds: [1, 2, 3].map(n => [{ text: 'Pergunta ' + n, options: ['Opção A', 'Opção B'], correct: 0 }]) };
}

// Limpa o que veio do editor. Em rascunho aceita campos incompletos.
export function validateGame(game, draft = false, simulationIds = null) {
  if (game == null || typeof game !== 'object' || !isGameType(game.type)) return null;
  const result = { type: game.type, text: text(game.text, 300) };
  if (!draft && !result.text.trim()) throw Error('Escreva o enunciado da etapa "' + gameNames[game.type] + '".');
  if (game.type === 'teams') { result.count = Math.max(2, Math.min(10, Math.floor(Number(game.count) || 2))); result.pick = Boolean(game.pick); }
  const questionList = (label, source = game.questions, max = 25) => {
    const list = (Array.isArray(source) ? source : []).slice(0, max).filter(q => q && typeof q === 'object').map((q, index) => {
      const options = (Array.isArray(q.options) ? q.options : []).slice(0, 4).map(o => text(o, 200));
      while (options.length < 2) options.push('');
      if (!draft && (!text(q.text, 300).trim() || options.some(o => !o.trim()))) throw Error(label + ': preencha a pergunta ' + (index + 1) + ' e todas as opções dela.');
      return { text: text(q.text, 300), options, correct: Math.max(0, Math.min(options.length - 1, Math.floor(Number(q.correct) || 0))) };
    });
    if (!list.length) { if (!draft) throw Error(label + ': adicione pelo menos uma pergunta.'); return [{ text: '', options: ['', ''], correct: 0 }]; }
    return list;
  };
  if (game.type === 'flash') {
    result.seconds = Math.max(3, Math.min(30, Math.round(Number(game.seconds) || 10)));
    // Relâmpago antigo era uma pergunta só, com o enunciado no título: vira a primeira pergunta da lista.
    const legacy = !Array.isArray(game.questions) && Array.isArray(game.options);
    if (legacy) result.text = 'Desafio relâmpago';
    result.questions = questionList('Relâmpago', legacy ? [{ text: game.text, options: game.options, correct: game.correct }] : game.questions, FLASH_QUESTIONS);
  }
  if (game.type === 'race') {
    result.seconds = Math.max(5, Math.min(60, Math.round(Number(game.seconds) || 15)));
    // Corridas antigas (de toques) não tinham perguntas: entram com as perguntas-modelo para o professor trocar.
    result.questions = Array.isArray(game.questions) && game.questions.length ? questionList('Corrida') : defaultGame('race').questions;
  }
  if (game.type === 'survival') {
    result.seconds = Math.max(5, Math.min(60, Math.round(Number(game.seconds) || 15)));
    result.questions = questionList('Sobrevivência');
  }
  if (game.type === 'tug') {
    const options = (Array.isArray(game.options) ? game.options : []).slice(0, 2).map(o => text(o, 60));
    while (options.length < 2) options.push('');
    if (!draft && options.some(o => !o.trim())) throw Error('O cabo de guerra precisa do nome dos dois lados.');
    result.options = options;
    result.seconds = Math.max(5, Math.min(60, Math.round(Number(game.seconds) || 15)));
    result.tolerance = Math.max(0, Math.min(50, Math.round(Number.isFinite(Number(game.tolerance)) ? Number(game.tolerance) : 10)));
    // Cada rodada guarda de 1 a 3 perguntas; na hora do jogo uma delas é sorteada.
    // Cabo de guerra antigo tinha uma lista só: cada pergunta vira uma rodada.
    const source = Array.isArray(game.rounds) ? game.rounds : (Array.isArray(game.questions) ? game.questions : []).map(q => [q]);
    result.rounds = source.slice(0, TUG_ROUNDS).map((round, index) => questionList('Cabo de guerra, rodada ' + (index + 1), Array.isArray(round) ? round : round?.questions, TUG_VARIANTS));
    if (!result.rounds.length) { if (!draft) throw Error('Cabo de guerra: adicione pelo menos uma rodada.'); result.rounds = [[{ text: '', options: ['', ''], correct: 0 }]]; }
  }
  if (game.type === 'challenge') {
    const simulation = text(game.simulation, 40);
    result.simulation = !simulationIds || simulationIds.includes(simulation) ? simulation : simulationIds[0];
    result.tolerance = Math.max(1, Math.min(25, Math.round(Number(game.tolerance) || 5)));
    result.answer = (Array.isArray(game.answer) ? game.answer : []).slice(0, 16).filter(item => item && typeof item === 'object').map(item => ({
      k: ['range', 'select', 'toggle', 'text'].includes(item.k) ? item.k : 'text', label: line(item.label, 60), v: text(item.v, 80),
      ...(item.k === 'range' ? { min: Number(item.min) || 0, max: Number.isFinite(Number(item.max)) ? Number(item.max) : 100 } : {}),
      ...(item.skip ? { skip: true } : {})
    }));
    if (!draft && !result.answer.some(item => !item.skip && item.k !== 'text')) throw Error('No desafio do experimento, ajuste os controles e marque a resposta certa.');
  }
  return result;
}

// O que os alunos recebem: sem a resposta.
export function publicGame(game) {
  if (!game) return game;
  const { correct, answer, questions, rounds, options, ...rest } = game;
  if (game.type === 'tug') return { ...rest, options, rounds: (rounds || []).length };
  if (game.type === 'survival' || game.type === 'race' || game.type === 'flash') return { ...rest, rounds: (questions || []).length };
  if (options) rest.options = options;
  return game.type === 'challenge' ? { ...rest, fields: (answer || []).length } : rest;
}

// Confere os valores que o aluno enviou com a resposta marcada pelo professor.
export function challengeMatches(game, values) {
  const answer = game?.answer || [];
  if (!Array.isArray(values) || !answer.some(item => !item.skip && item.k !== 'text')) return false;
  return answer.every((item, index) => {
    if (item.skip || item.k === 'text') return true;
    const value = values[index];
    if (value === undefined || value === null) return false;
    if (item.k !== 'range') return String(value) === String(item.v);
    const sent = Number(value), wanted = Number(item.v), span = Math.abs((item.max ?? 100) - (item.min ?? 0)) || 1;
    return Number.isFinite(sent) && Math.abs(sent - wanted) <= span * (game.tolerance || 5) / 100 + 1e-9;
  });
}

const online = room => room.data.players.filter(p => p.online);
const bonus = (player, points) => { player.bonus = (player.bonus || 0) + points; };

// ---- Equipes
export function assignTeam(room, player) {
  const teams = room.data.teams;
  if (!teams?.length || Number.isInteger(player.team) && player.team < teams.length) return;
  if (room.data.teamPick) { player.team = null; return; } // os alunos estão escolhendo
  const sizes = teams.map((_, index) => room.data.players.filter(p => p !== player && p.team === index).length);
  player.team = sizes.indexOf(Math.min(...sizes));
}
// Fim da escolha livre: quem não escolheu entra no time com menos gente.
export function settleTeams(room) {
  if (!room.data.teamPick) return;
  room.data.teamPick = false;
  for (const p of room.data.players) assignTeam(room, p);
}
export function formTeams(room, count, random = Math.random) {
  const d = room.data;
  d.teams = teamPalette.slice(0, Math.max(2, Math.min(10, count))).map(([name, color]) => ({ name, color }));
  const players = [...d.players];
  for (let i = players.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [players[i], players[j]] = [players[j], players[i]]; }
  players.forEach((player, index) => { player.team = index % d.teams.length; });
}
export function teamScores(room) {
  const d = room.data;
  if (!d.teams?.length) return null;
  return d.teams.map((team, index) => {
    const members = d.players.filter(p => p.team === index);
    return { ...team, index, score: members.reduce((sum, p) => sum + (p.score || 0) + (p.bonus || 0), 0), members: members.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, online: p.online, leader: team.leader === p.id })) };
  });
}

// ---- Ciclo da etapa
export function startGame(room, random = Math.random) {
  const d = room.data, config = room.slides[d.slide]?.game;
  if (!config) throw Error('Esta etapa ainda não foi configurada no editor.');
  settleTeams(room);
  d.phase = 'game';
  const game = d.game = { id: createUuid(), type: config.type, state: 'open', startedAt: room.now() };
  if (config.type === 'teams') {
    if (config.pick) { d.teams = teamPalette.slice(0, config.count).map(([name, color]) => ({ name, color })); d.teamPick = true; for (const p of d.players) if (!(Number.isInteger(p.team) && p.team < config.count)) p.team = null; game.state = 'open'; }
    else { if (d.teams?.length !== config.count) formTeams(room, config.count, random); else for (const p of d.players) assignTeam(room, p); game.state = 'done'; }
  }
  else if (config.type === 'flash') Object.assign(game, { state: 'ready', round: -1, answers: {}, times: {}, gain: {}, score: {}, wins: {}, fastest: '', deadline: 0 });
  else if (config.type === 'survival') { game.alive = online(room).map(p => p.id); game.fallen = {}; game.round = -1; game.answers = {}; game.deadline = 0; game.state = 'ready'; }
  else if (config.type === 'challenge') { game.solved = []; game.tries = {}; }
  else if (config.type === 'raffle') { game.picked = []; game.current = ''; game.drawAt = 0; game.revealAt = 0; }
  else if (config.type === 'tug') {
    // Rodada por rodada: cada rodada possui até 3 perguntas e cada participante recebe 1 sorteada aleatoriamente.
    Object.assign(game, { state: 'ready', sides: {}, round: -1, rounds: config.rounds.length, picks: {}, answers: {}, hits: [0, 0], tries: [0, 0], playerHits: {}, playerAnswered: {}, lastFeedback: {}, lastPull: null, winner: -1, deadline: 0, betweenAt: 0, pullAt: 0, roundFinalized: false });
    for (const p of online(room)) tugSide(room, p);
  }
  else if (config.type === 'race') Object.assign(game, { state: 'ready', round: -1, answers: {}, times: {}, dist: {}, gain: {}, spent: {}, order: [], deadline: 0 });
}

// Mantém lados/participantes atualizados assim que alguém entra durante um jogo ao vivo.
export function syncGameJoin(room, player) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (d.phase !== 'game' || !game || !player) return;
  if (game.type === 'tug') {
    if (!Object.hasOwn(game.sides, player.id)) tugSide(room, player);
    if (game.state === 'open' && game.round >= 0 && !Object.hasOwn(game.picks || {}, player.id)) {
      const roundQs = config?.rounds?.[game.round] || [];
      if (roundQs.length) game.picks[player.id] = Math.floor(Math.random() * roundQs.length);
    }
  }
  if (game.type === 'survival' && game.state === 'ready' && !game.alive.includes(player.id)) game.alive.push(player.id);
}

export function gameControl(room, value, random = Math.random) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game, action = value?.do;
  if (d.phase !== 'game' || !game || !config) throw Error('Esta ação não está disponível agora.');
  if (action === 'restart') { startGame(room, random); return; }
  if (action === 'end') {
    if (game.type === 'tug' && game.state !== 'done') { if (game.state === 'open') finalizeTugRound(room); finishTug(room); }
    if (game.type === 'race') { if (game.state === 'open') revealRace(room); finishRace(room); }
    if (game.type === 'teams') settleTeams(room);
    game.state = 'done'; game.resultStartedAt = room.now(); return;
  }
  if (game.type === 'teams' && action === 'shuffle') { d.teamPick = false; formTeams(room, config.count, random); game.state = 'done'; return; }
  // O apresentador pode mudar a quantidade de times na hora: preserva nome,
  // foto e líder dos times que continuam e realoca quem ficou fora.
  if (game.type === 'teams' && action === 'team-count') {
    const count = Math.max(2, Math.min(10, Math.floor(Number(value?.count) || 2)));
    const previous = d.teams || [];
    d.teams = Array.from({ length: count }, (_, i) => previous[i] || { name: teamPalette[i][0], color: teamPalette[i][1] });
    config.count = count;
    for (const p of d.players) {
      if (Number.isInteger(p.team) && p.team >= count) p.team = null;
      if (!d.teamPick) assignTeam(room, p);
    }
    game.state = d.teamPick ? 'open' : 'done';
    return;
  }
  if (game.type === 'teams' && action === 'team-rename') {
    const team = d.teams?.[Number(value?.team)], name = String(value?.name || '').trim().slice(0, 24);
    if (team && name) team.name = name;
    return;
  }
  if (game.type === 'teams' && action === 'team-leader') {
    const team = d.teams?.[Number(value?.team)], id = String(value?.player || '');
    if (team && d.players.some(p => p.id === id && p.team === Number(value?.team))) team.leader = team.leader === id ? undefined : id;
    return;
  }
  if (game.type === 'tug' && action === 'next') {
    if (game.state === 'done' || game.state === 'pull') throw Error('Esta rodada já terminou.');
    if (game.state === 'ready') {
      if (!online(room).length) throw Error('Espere pelo menos um participante entrar.');
      openTugRound(room, 0, random);
      return;
    }
    if (game.state === 'open') {
      concludeTugRound(room);
      return;
    }
    if (game.state === 'between') {
      openTugRound(room, game.round + 1, random);
      return;
    }
  }
  if (game.type === 'flash' && action === 'next') {
    if (game.state === 'open') { revealFlash(room); return; }
    if (game.state === 'done') throw Error('Esta rodada já terminou.');
    if (game.state === 'ready' && !online(room).length) throw Error('Espere pelo menos um participante entrar.');
    if (game.state === 'reveal') {
      if (game.round + 1 >= config.questions.length) { game.state = 'done'; game.resultStartedAt = room.now(); return; }
      game.state = 'leaderboard'; game.resultStartedAt = room.now(); return;
    }
    advanceFlash(room); return;
  }
  if (game.type === 'race' && action === 'next') {
    if (game.state === 'open') { revealRace(room); return; }
    if (game.state === 'done') throw Error('Esta rodada já terminou.');
    if (game.state === 'ready' && !online(room).length) throw Error('Espere pelo menos um participante entrar.');
    advanceRace(room); return;
  }
  if (game.type === 'survival' && action === 'next') {
    if (game.state === 'open') { revealSurvival(room); return; }
    if (game.state === 'ready') { game.alive = online(room).map(p => p.id); if (!game.alive.length) throw Error('Espere pelo menos um participante entrar.'); }
    if (game.state === 'done') throw Error('Esta rodada já terminou.');
    game.round++; game.answers = {}; game.state = 'open'; game.startedAt = room.now(); game.deadline = room.now() + config.seconds * 1000;
    return;
  }
  if (game.type === 'raffle' && action === 'draw') {
    let pool = online(room).filter(p => !game.picked.includes(p.id));
    if (!pool.length) { game.picked = []; pool = online(room); }
    if (!pool.length) throw Error('Espere pelo menos um participante entrar.');
    const chosen = pool[Math.floor(random() * pool.length)];
    game.picked.push(chosen.id); game.current = chosen.id; game.drawAt = room.now(); game.revealAt = game.drawAt + 2800; game.draws = (game.draws || 0) + 1;
    return;
  }
  throw Error('Esta ação não está disponível agora.');
}

// Fim do tempo (ou todos responderam): quem errou ou não respondeu cai.
export function revealSurvival(room) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (!game || game.type !== 'survival' || game.state !== 'open') return;
  const question = config.questions[game.round];
  const out = game.alive.filter(id => game.answers[id] !== question.correct);
  for (const id of out) game.fallen[id] = game.round;
  game.alive = game.alive.filter(id => !out.includes(id));
  game.state = game.alive.length <= 1 || game.round + 1 >= config.questions.length ? 'done' : 'reveal';
  if (game.state === 'done') { game.resultStartedAt = room.now(); for (const p of d.players) if (game.alive.includes(p.id)) bonus(p, SURVIVAL_POINTS); }
}
export function tickGame(room) {
  const game = room.data.game;
  if (room.data.phase !== 'game' || !game) return;
  if (game.type === 'survival' && game.state === 'open' && room.now() >= game.deadline) revealSurvival(room);
  if (game.type === 'tug' && game.state === 'open' && room.now() >= game.deadline) concludeTugRound(room);
  if (game.type === 'tug' && game.state === 'between' && room.now() >= (game.betweenAt || 0) + TUG_BETWEEN_MS) openTugRound(room, game.round + 1);
  if (game.type === 'race' && game.state === 'open' && room.now() >= game.deadline) revealRace(room);
  // A corrida segue sozinha: depois de mostrar a resposta, vem a próxima pergunta (ou o resultado).
  if (game.type === 'race' && game.state === 'reveal' && room.now() >= (game.revealAt || 0) + RACE_PAUSE) advanceRace(room);
  // No relâmpago, quando o tempo acaba a resposta aparece e aguarda o professor avançar.
  if (game.type === 'flash' && game.state === 'open' && room.now() >= game.deadline) revealFlash(room);
  if (game.type === 'tug' && game.state === 'pull' && room.now() >= game.pullAt + TUG_PULL_MS) { game.state = 'done'; game.resultStartedAt = room.now(); }
}

// ---- Relâmpago: perguntas em sequência com tempo curto.
export function revealFlash(room) {
  const game = room.data.game;
  if (!game || game.type !== 'flash' || game.state !== 'open') return;
  game.state = 'reveal'; game.revealAt = room.now();
}
function advanceFlash(room) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (game.round + 1 >= config.questions.length) { game.state = 'done'; game.resultStartedAt = room.now(); return; }
  game.round++; game.answers = {}; game.times = {}; game.gain = {}; game.fastest = ''; game.state = 'open'; game.startedAt = room.now(); game.deadline = room.now() + config.seconds * 1000;
}
const flashOrder = game => Object.keys(game.score).sort((a, b) => game.score[b] - game.score[a] || (game.wins[b] || 0) - (game.wins[a] || 0));

// ---- Cabo de guerra: rodada por rodada; cada rodada tem até 3 perguntas e cada participante recebe 1 sorteada aleatoriamente.
// Os placares ficam escondidos durante as rodadas e durante a puxada final, revelando-se só ao concluir a puxada.
function openTugRound(room, roundIndex, random = Math.random) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  const roundQs = config?.rounds?.[roundIndex];
  if (!roundQs?.length) { finishTug(room); game.state = 'pull'; game.pullAt = room.now(); return; }
  game.round = roundIndex;
  game.state = 'open';
  game.answers = {};
  game.picks = {};
  game.roundFinalized = false;
  game.betweenAt = 0;
  game.startedAt = room.now();
  game.deadline = room.now() + Math.max(config.seconds || 15, 5) * 1000;
  for (const p of online(room)) {
    tugSide(room, p);
    game.picks[p.id] = Math.floor(random() * roundQs.length);
  }
}
// Com times formados, os times 1 e 3 ficam de um lado e os 2 e 4 do outro.
function tugSide(room, player) {
  const game = room.data.game;
  if (Object.hasOwn(game.sides, player.id)) return game.sides[player.id];
  const size = side => Object.values(game.sides).filter(v => v === side).length;
  return game.sides[player.id] = room.data.teams?.length && Number.isInteger(player.team) ? player.team % 2 : size(0) <= size(1) ? 0 : 1;
}
export function tugScore(game) { return [0, 1].map(side => game.tries[side] ? Math.round(game.hits[side] / game.tries[side] * 100) : 0); }
// Ao encerrar a rodada pelo tempo ou comando do professor, quem está online e não respondeu conta como tentativa perdida.
function finalizeTugRound(room) {
  const d = room.data, game = d.game;
  if (!game || game.type !== 'tug' || game.roundFinalized) return;
  game.roundFinalized = true;
  for (const p of online(room)) {
    const side = tugSide(room, p);
    if (!Object.hasOwn(game.answers, p.id)) game.tries[side]++;
  }
}
function concludeTugRound(room) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (!game || game.type !== 'tug' || game.state !== 'open') return;
  finalizeTugRound(room);
  if (game.round + 1 < config.rounds.length) {
    game.state = 'between';
    game.betweenAt = room.now();
    return;
  }
  finishTug(room);
  game.state = 'pull';
  game.pullAt = room.now();
}
function finishTug(room) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (game.winner !== -1) return;
  const score = tugScore(game), gap = Math.abs(score[0] - score[1]);
  // Diferença dentro da tolerância = empate: ninguém consegue puxar a corda.
  game.winner = gap > (config.tolerance ?? 10) ? (score[0] > score[1] ? 0 : 1) : -2;
  if (game.winner >= 0) for (const p of d.players) if (game.sides[p.id] === game.winner) bonus(p, TUG_POINTS);
}

// ---- Corrida do saber
// Fim da pergunta (todos responderam ou o tempo acabou): mostra a resposta certa por alguns segundos.
// Os metros já foram somados na hora de cada resposta (gameInput).
export function revealRace(room) {
  const game = room.data.game;
  if (!game || game.type !== 'race' || game.state !== 'open') return;
  game.state = 'reveal'; game.revealAt = room.now();
}
// Próxima pergunta, ou o resultado depois da última.
function advanceRace(room) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (game.round + 1 >= config.questions.length) { finishRace(room); return; }
  game.round++; game.answers = {}; game.times = {}; game.gain = {}; game.state = 'open'; game.startedAt = room.now(); game.deadline = room.now() + config.seconds * 1000;
}
// Classificação: quem foi mais longe; no empate, quem gastou menos tempo nas respostas certas.
const raceOrder = game => Object.keys(game.dist).filter(id => game.dist[id] > 0).sort((a, b) => game.dist[b] - game.dist[a] || (game.spent[a] || 0) - (game.spent[b] || 0));
function finishRace(room) {
  const game = room.data.game;
  if (game.paid) return;
  game.paid = true; game.order = raceOrder(game);
  game.order.forEach((id, place) => { const p = room.data.players.find(p => p.id === id); if (p) bonus(p, RACE_POINTS[place] ?? RACE_FINISH); });
  game.state = 'done'; game.resultStartedAt = room.now();
}

// O que cada aluno envia durante a etapa.
export function gameInput(room, playerId, payload) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game, player = d.players.find(p => p.id === playerId);
  if (!player || d.phase !== 'game' || !game || !config) throw Error('Esta etapa já mudou.');
  if (game.state !== 'open') throw Error(['survival', 'tug', 'race', 'flash'].includes(game.type) && game.state !== 'done' ? 'Aguarde a próxima pergunta.' : 'Esta rodada já terminou.');
  if (!payload || typeof payload !== 'object') throw Error('Resposta inválida.');
  if (game.type === 'survival') {
    const question = config.questions[game.round], choice = payload.choice;
    if (!game.alive.includes(playerId)) throw Error('Você já caiu nesta partida.');
    if (payload.round !== game.round || room.now() >= game.deadline) throw Error('O tempo desta pergunta acabou.');
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) throw Error('Resposta inválida.');
    if (Object.hasOwn(game.answers, playerId)) throw Error('Você já respondeu.');
    game.answers[playerId] = choice;
    if (game.alive.every(id => Object.hasOwn(game.answers, id))) revealSurvival(room);
    return;
  }
  if (game.type === 'teams') {
    const custom = payload.teamCustom;
    if (custom && typeof custom === 'object') {
      const index = Number(custom.team), team = d.teams?.[index];
      if (!team) throw Error('Time não encontrado.');
      if (team.leader !== player.id) throw Error('Só o líder do time pode mudar o nome e a foto.');
      if (custom.name !== undefined) { const name = String(custom.name).trim().slice(0, 24); if (name) team.name = name; }
      if (custom.photo !== undefined) {
        const photo = String(custom.photo);
        if (photo === '') delete team.photo;
        else if (/^data:image\/(?:png|jpeg|webp);base64,/.test(photo) && photo.length <= 30000) team.photo = photo;
      }
      return;
    }
    const team = payload.team;
    if (!d.teamPick || !Number.isInteger(team) || team < 0 || team >= (d.teams?.length || 0)) throw Error('Não dá para escolher o time agora.');
    player.team = team; return;
  }
  if (game.type === 'tug') {
    const side = tugSide(room, player);
    const roundQs = config.rounds[game.round] || [];
    if (room.now() >= game.deadline) throw Error('O tempo desta pergunta acabou.');
    if (Object.hasOwn(game.answers, playerId)) throw Error('Você já respondeu esta rodada.');
    const sentRound = payload.round ?? payload.step;
    if (sentRound !== undefined && sentRound !== game.round) throw Error('Esta rodada já avançou.');
    if (!Object.hasOwn(game.picks, playerId)) game.picks[playerId] = Math.floor(Math.random() * Math.max(1, roundQs.length));
    const question = roundQs[game.picks[playerId]], choice = payload.choice;
    if (!question || !Number.isInteger(choice) || choice < 0 || choice >= question.options.length) throw Error('Resposta inválida.');
    game.answers[playerId] = choice;
    game.tries[side]++;
    game.playerAnswered[playerId] = (game.playerAnswered[playerId] || 0) + 1;
    const right = choice === question.correct;
    if (right) {
      game.hits[side]++;
      game.playerHits[playerId] = (game.playerHits[playerId] || 0) + 1;
      bonus(player, TUG_HIT);
      game.lastPull = { side, name: player.name, round: game.round, at: room.now() };
    }
    game.lastFeedback[playerId] = { right, choice, correct: question.correct, round: game.round, at: room.now() };
    if (online(room).every(p => Object.hasOwn(game.answers, p.id))) {
      concludeTugRound(room);
    }
    return;
  }
  if (game.type === 'race') {
    const question = config.questions[game.round], choice = payload.choice;
    if (payload.round !== game.round || room.now() >= game.deadline) throw Error('O tempo desta pergunta acabou.');
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) throw Error('Resposta inválida.');
    if (Object.hasOwn(game.answers, playerId)) throw Error('Você já respondeu.');
    game.answers[playerId] = choice; game.times[playerId] = room.now() - game.startedAt;
    // Em tempo real: acertou, o boneco já corre RACE_STEP metros + até RACE_SPEED pela rapidez.
    if (choice === question.correct) {
      const span = Math.max(1, config.seconds * 1000), took = Math.max(0, Math.min(span, game.times[playerId]));
      game.gain[playerId] = RACE_STEP + Math.round(RACE_SPEED * (1 - took / span));
      game.dist[playerId] = (game.dist[playerId] || 0) + game.gain[playerId];
      game.spent[playerId] = (game.spent[playerId] || 0) + took;
    }
    if (online(room).every(p => Object.hasOwn(game.answers, p.id))) revealRace(room);
    return;
  }
  if (game.type === 'flash') {
    const question = config.questions[game.round], choice = payload.choice;
    if (payload.round !== game.round || room.now() >= game.deadline) throw Error('O tempo desta pergunta acabou.');
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) throw Error('Resposta inválida.');
    if (Object.hasOwn(game.answers, playerId)) throw Error('Você já respondeu.');
    game.answers[playerId] = choice; game.times[playerId] = room.now() - game.startedAt;
    if (choice === question.correct) {
      const span = Math.max(1, config.seconds * 1000), took = Math.max(0, Math.min(span, game.times[playerId]));
      let gain = FLASH_HIT + Math.round(FLASH_SPEED * (1 - took / span));
      if (!game.fastest) { game.fastest = playerId; gain += FLASH_FIRST; game.wins[playerId] = (game.wins[playerId] || 0) + 1; }
      game.gain[playerId] = gain; game.score[playerId] = (game.score[playerId] || 0) + gain; bonus(player, gain);
    }
    if (online(room).every(p => Object.hasOwn(game.answers, p.id))) revealFlash(room);
  } else if (game.type === 'challenge') {
    if (game.solved.some(item => item.player === playerId)) throw Error('Você já acertou!');
    const now = room.now();
    if (now - (game.tries[playerId]?.at || 0) < 1500) throw Error('Espere um instante antes de tentar de novo.');
    const tries = (game.tries[playerId]?.n || 0) + 1;
    const ok = challengeMatches(config, Array.isArray(payload.values) ? payload.values.slice(0, 16) : null);
    game.tries[playerId] = { n: tries, at: now, ok };
    if (ok) { game.solved.push({ player: playerId, at: now - game.startedAt, tries }); bonus(player, game.solved.length === 1 ? CHALLENGE_FIRST : CHALLENGE_POINTS); }
  } else throw Error('Esta etapa não recebe respostas.');
}

// Retrato da etapa para um aluno (id) ou para o professor (sem id).
export function gameSnapshot(room, playerId, bare = false) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (d.phase !== 'game' || !game || !config) return null;
  const name = id => d.players.find(p => p.id === id), who = id => { const p = name(id); return p ? { id: p.id, name: p.name, avatar: p.avatar, ...(d.teams?.[p.team] ? { color: d.teams[p.team].color } : {}) } : null; };
  // Aluno não recebe o texto das perguntas (só os botões), para não dar para pesquisar.
  const ask = (question, extra) => question ? { text: bare ? '' : question.text, options: question.options.map(option => bare ? '' : option), ...extra } : null;
  const done = game.state === 'done', presenter = !playerId;
  const base = { id: game.id, type: game.type, state: game.state, text: config.text, startedAt: game.startedAt, resultStartedAt: game.resultStartedAt || 0, bare };
  if (game.type === 'teams') return { ...base, pick: Boolean(d.teamPick) };
  if (game.type === 'flash') {
    const question = game.round >= 0 ? config.questions[game.round] : null, shown = game.state === 'reveal' || game.state === 'leaderboard' || done, order = flashOrder(game);
    const teamBoard = d.teams?.length ? d.teams.map((team, index) => {
      const members = d.players.filter(p => p.team === index).map(p => ({
        id: p.id, name: p.name, avatar: p.avatar, color: team.color,
        score: game.score[p.id] || 0, gain: game.gain[p.id] || 0, wins: game.wins[p.id] || 0
      })).sort((a, b) => b.score - a.score || b.wins - a.wins);
      return {
        index, name: team.name, color: team.color,
        score: members.reduce((sum, m) => sum + m.score, 0),
        gain: members.reduce((sum, m) => sum + m.gain, 0),
        wins: members.reduce((sum, m) => sum + m.wins, 0),
        members
      };
    }).sort((a, b) => b.score - a.score || b.wins - a.wins) : null;
    return { ...base, round: game.round, rounds: config.questions.length, seconds: config.seconds, deadline: game.deadline,
      question: ask(question, { ...(shown || presenter ? { correct: question?.correct } : {}), ...(shown ? { counts: question?.options.map((_, i) => Object.values(game.answers).filter(v => v === i).length) } : {}) }),
      answered: Object.keys(game.answers).length, total: online(room).length, fastest: game.state === 'reveal' ? who(game.fastest) : null, points: [FLASH_HIT, FLASH_HIT + FLASH_SPEED, FLASH_FIRST],
      board: order.slice(0, 30).map(id => ({ ...who(id), score: game.score[id], gain: game.gain[id] || 0, wins: game.wins[id] || 0 })).filter(item => item.id),
      ...(teamBoard ? { teamBoard } : {}),
      me: playerId ? { choice: Object.hasOwn(game.answers, playerId) ? game.answers[playerId] : null, gain: shown ? (game.gain[playerId] || 0) : 0, right: shown ? Object.hasOwn(game.gain, playerId) : false, first: shown ? game.fastest === playerId : false, score: game.score[playerId] || 0, rank: order.indexOf(playerId) + 1 } : null };
  }
  if (game.type === 'survival') {
    const question = game.round >= 0 ? config.questions[game.round] : null, shown = game.state === 'reveal' || done;
    const everyone = [...game.alive, ...Object.keys(game.fallen)];
    return { ...base, round: game.round, rounds: config.questions.length, seconds: config.seconds, deadline: game.deadline,
      question: ask(question, { ...(shown || presenter ? { correct: question?.correct } : {}), ...(shown ? { counts: question?.options.map((_, i) => Object.values(game.answers).filter(v => v === i).length) } : {}) }),
      answered: Object.keys(game.answers).length, alive: game.alive.length, total: everyone.length, points: SURVIVAL_POINTS,
      players: everyone.slice(0, 40).map(id => ({ ...who(id), alive: game.alive.includes(id), fell: game.fallen[id] ?? -1, locked: Object.hasOwn(game.answers, id) })).filter(item => item.id),
      me: playerId ? { alive: game.alive.includes(playerId), playing: everyone.includes(playerId), fell: game.fallen[playerId] ?? -1, choice: Object.hasOwn(game.answers, playerId) ? game.answers[playerId] : null } : null };
  }
  if (game.type === 'challenge') {
    const mine = playerId ? game.tries[playerId] : null, place = game.solved.findIndex(item => item.player === playerId);
    return { ...base, simulation: config.simulation, solved: game.solved.slice(0, 10).map(item => ({ ...who(item.player), at: item.at, tries: item.tries })), solvedCount: game.solved.length, trying: Object.keys(game.tries).length,
      me: playerId ? { tries: mine?.n || 0, ok: place >= 0, place: place + 1, points: place === 0 ? CHALLENGE_FIRST : CHALLENGE_POINTS } : null,
      ...(done || presenter ? { answer: config.answer.filter(item => !item.skip && item.k !== 'text').map(item => ({ label: item.label, v: item.v })) } : {}) };
  }
  if (game.type === 'raffle') return { ...base, current: who(game.current), drawAt: game.drawAt, revealAt: game.revealAt || (game.drawAt ? game.drawAt + 2800 : 0), draws: game.draws || 0, left: online(room).filter(p => !game.picked.includes(p.id)).length, names: online(room).slice(0, 40).map(p => p.name), me: playerId ? game.current === playerId : false };
  if (game.type === 'race') {
    const question = game.round >= 0 ? config.questions[game.round] : null, shown = game.state === 'reveal' || done;
    const track = config.questions.length * (RACE_STEP + RACE_SPEED), order = done ? game.order : raceOrder(game);
    const runners = d.players.filter(p => p.online || game.dist[p.id]).map(p => ({ ...who(p.id), p: Math.min(1, (game.dist[p.id] || 0) / track), dist: game.dist[p.id] || 0, rank: order.indexOf(p.id) + 1 || order.length + 1,
      place: done ? order.indexOf(p.id) + 1 : 0, locked: Object.hasOwn(game.answers, p.id), ...(Object.hasOwn(game.answers, p.id) && game.state !== 'ready' ? { gain: game.gain[p.id] || 0, right: Object.hasOwn(game.gain, p.id) } : {}) }));
    const mine = runners.find(r => r.id === playerId), top = [...runners].sort((a, b) => a.rank - b.rank).slice(0, 8);
    if (mine && !top.includes(mine)) top[7] = mine;
    const shownRunners = runners.filter(r => top.includes(r));
    return { ...base, round: game.round, rounds: config.questions.length, seconds: config.seconds, deadline: game.deadline, track, nextAt: game.state === 'reveal' ? (game.revealAt || 0) + RACE_PAUSE : 0,
      question: ask(question, { ...(shown || presenter ? { correct: question?.correct } : {}), ...(shown ? { counts: question?.options.map((_, i) => Object.values(game.answers).filter(v => v === i).length) } : {}) }),
      answered: Object.keys(game.answers).length, total: runners.length, runners: shownRunners, points: RACE_POINTS,
      me: mine ? { choice: Object.hasOwn(game.answers, playerId) ? game.answers[playerId] : null, dist: mine.dist, rank: mine.rank, place: mine.place, gain: mine.gain || 0, right: Boolean(mine.right) } : null };
  }
  const count = side => Object.values(game.sides).filter(v => v === side).length;
  const totalRounds = config.rounds.length;
  const crew = side => Object.keys(game.sides).filter(id => game.sides[id] === side).slice(0, 5).map(id => {
    const person = who(id);
    return person ? { ...person, answered: Object.hasOwn(game.answers || {}, id), doneCount: game.playerAnswered?.[id] || 0, totalRounds } : null;
  }).filter(Boolean);
  const roundQs = game.round >= 0 ? (config.rounds[game.round] || []) : [];
  const myPick = playerId && Object.hasOwn(game.picks || {}, playerId) ? game.picks[playerId] : 0;
  const myAnswered = Boolean(playerId && Object.hasOwn(game.answers || {}, playerId));
  const myRawQuestion = playerId && game.state === 'open' && !myAnswered ? roundQs[myPick] : null;
  // No Cabo de Guerra cada rodada sorteia 1 de até 3 perguntas daquela rodada para cada participante.
  const myQuestion = myRawQuestion ? { text: myRawQuestion.text, options: [...myRawQuestion.options], round: game.round, rounds: totalRounds, variant: myPick, poolSize: roundQs.length } : null;
  const onlinePlayers = online(room);
  const answeredThisRound = onlinePlayers.filter(p => Object.hasOwn(game.answers || {}, p.id)).length;
  const fb = playerId ? game.lastFeedback?.[playerId] : null;
  // Com times formados o lado leva o nome e a cor dos times; sem times, os nomes do editor.
  const label = side => { const list = (d.teams || []).filter((_, i) => i % 2 === side); return list.length ? { name: list.map(team => 'Time ' + team.name).join(' + '), color: list[0].color } : { name: config.options[side], color: teamPalette[side][1] }; };
  // Mantém porcentagens e acertos ocultos até o fim da puxada da corda (state === 'done') para preservar o suspense!
  return { ...base, bare: false, round: game.round, rounds: totalRounds, seconds: Math.max(config.seconds || 15, 5), deadline: game.deadline, betweenAt: game.betweenAt || 0, betweenMs: TUG_BETWEEN_MS, tolerance: config.tolerance ?? 10,
    question: myQuestion,
    answered: answeredThisRound, total: onlinePlayers.length || (count(0) + count(1)), lastPull: done ? null : (game.lastPull || null),
    labels: [label(0), label(1)], revealScores: done, score: done ? tugScore(game) : [0, 0], hits: done ? game.hits : [0, 0], tries: done ? game.tries : [0, 0], sides: [count(0), count(1)], crews: [crew(0), crew(1)],
    winner: ['pull', 'done'].includes(game.state) ? game.winner : -1, pullAt: game.pullAt, pullMs: TUG_PULL_MS,
    side: playerId && Object.hasOwn(game.sides, playerId) ? game.sides[playerId] : null,
    choice: myAnswered ? game.answers[playerId] : null,
    me: playerId ? { side: Object.hasOwn(game.sides, playerId) ? game.sides[playerId] : null, round: game.round, rounds: totalRounds, answered: myAnswered, hits: game.playerHits?.[playerId] || 0, lastRight: fb && fb.round === game.round ? fb.right : null, lastAt: fb?.at || 0 } : null,
    points: TUG_POINTS };
}
