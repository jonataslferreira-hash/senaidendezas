// Etapas interativas da aula (além de Slides, Enquete e Quiz):
//   teams     – Competição em equipes: divide a turma em times e mostra o placar
//   flash     – Desafio relâmpago: uma pergunta, vence quem acertar primeiro
//   survival  – Sobrevivência: cada aluno tem 1 vida; errou, caiu e não responde mais
//   challenge – Desafio no experimento: acertar uma meta mexendo no experimento
//   raffle    – Sorteio de aluno
//   tug       – Cabo de guerra: dois lados respondem 3 perguntas; quem acerta mais puxa a corda
//   race      – Corrida: cada aluno toca na tela para o seu boneco correr até a chegada
// Cada etapa é um slide com o campo `game`. Aqui ficam as regras (sem tela), para
// a sala do professor aplicar e os testes conferirem.
import { createUuid } from './uuid.js';

export const gameTypes = ['teams', 'flash', 'survival', 'challenge', 'raffle', 'tug', 'race'];
export const isGameType = type => gameTypes.includes(type);
export const gameNames = { teams: 'Equipes', flash: 'Desafio relâmpago', survival: 'Sobrevivência', challenge: 'Desafio no experimento', raffle: 'Sorteio', tug: 'Cabo de guerra', race: 'Corrida' };
export const gameHints = {
  teams: 'Divide a turma em times e mostra o placar',
  flash: 'Uma pergunta: vence quem acertar primeiro',
  survival: 'Uma vida só: errou, caiu. Quem fica de pé?',
  challenge: 'Quem atinge a meta no experimento?',
  raffle: 'Roleta com os nomes de quem está na sala',
  tug: 'Dois lados respondem; quem acerta mais puxa a corda',
  race: 'Toque na tela para o seu boneco correr até a chegada'
};
export const teamPalette = [['Azul', '#3b82f6'], ['Laranja', '#f97316'], ['Verde', '#22c55e'], ['Rosa', '#ec4899']];
export const SURVIVAL_POINTS = 500;
export const FLASH_POINTS = 500, CHALLENGE_FIRST = 500, CHALLENGE_POINTS = 300, TUG_POINTS = 200;
export const TUG_ROUNDS = 3, TUG_HIT = 100, TUG_PULL_MS = 5000;
export const RACE_POINTS = [500, 300, 200], RACE_FINISH = 100, RACE_COUNTDOWN = 3000;

const text = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max);
const line = (value, max) => text(value, max).replace(/\s+/g, ' ').trim();

export function defaultGame(type) {
  if (type === 'teams') return { type, text: 'Que comecem os jogos!', count: 2, pick: false };
  if (type === 'race') return { type, text: 'Quem chega primeiro?', goal: 100 };
  if (type === 'flash') return { type, text: 'Quem responde primeiro?', options: ['Opção A', 'Opção B'], correct: 0 };
  if (type === 'survival') return { type, text: 'Uma vida só. Quem sobrevive?', seconds: 15, questions: [{ text: 'Primeira pergunta', options: ['Opção A', 'Opção B'], correct: 0 }] };
  if (type === 'challenge') return { type, text: 'Ajuste o experimento até chegar à meta.', simulation: 'projectile', answer: [], tolerance: 5 };
  if (type === 'raffle') return { type, text: 'Quem vai responder?' };
  return { type: 'tug', text: 'Cabo de guerra!', options: ['Lado A', 'Lado B'], seconds: 15, tolerance: 10, questions: [1, 2, 3].map(n => ({ text: 'Pergunta ' + n, options: ['Opção A', 'Opção B'], correct: 0 })) };
}

// Limpa o que veio do editor. Em rascunho aceita campos incompletos.
export function validateGame(game, draft = false, simulationIds = null) {
  if (game == null || typeof game !== 'object' || !isGameType(game.type)) return null;
  const result = { type: game.type, text: text(game.text, 300) };
  if (!draft && !result.text.trim()) throw Error('Escreva o enunciado da etapa "' + gameNames[game.type] + '".');
  if (game.type === 'teams') { result.count = Math.max(2, Math.min(4, Math.floor(Number(game.count) || 2))); result.pick = Boolean(game.pick); }
  if (game.type === 'race') result.goal = [60, 100, 150].includes(Number(game.goal)) ? Number(game.goal) : 100;
  const questionList = label => {
    const list = (Array.isArray(game.questions) ? game.questions : []).slice(0, 20).filter(q => q && typeof q === 'object').map((q, index) => {
      const options = (Array.isArray(q.options) ? q.options : []).slice(0, 4).map(o => text(o, 200));
      while (options.length < 2) options.push('');
      if (!draft && (!text(q.text, 300).trim() || options.some(o => !o.trim()))) throw Error(label + ': preencha a pergunta ' + (index + 1) + ' e todas as opções dela.');
      return { text: text(q.text, 300), options, correct: Math.max(0, Math.min(options.length - 1, Math.floor(Number(q.correct) || 0))) };
    });
    if (!list.length) { if (!draft) throw Error(label + ': adicione pelo menos uma pergunta.'); return [{ text: '', options: ['', ''], correct: 0 }]; }
    return list;
  };
  if (game.type === 'flash') {
    const options = (Array.isArray(game.options) ? game.options : []).slice(0, 4).map(o => text(o, 200));
    if (!draft && (options.length < 2 || options.some(o => !o.trim()))) throw Error('O desafio relâmpago precisa de 2 a 4 opções preenchidas.');
    result.options = options.length ? options : ['', ''];
    result.correct = Math.max(0, Math.min(result.options.length - 1, Math.floor(Number(game.correct) || 0)));
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
    result.questions = questionList('Cabo de guerra');
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
  const { correct, answer, questions, ...rest } = game;
  if (game.type === 'survival' || game.type === 'tug') return { ...rest, rounds: game.type === 'tug' ? Math.min(TUG_ROUNDS, (questions || []).length) : (questions || []).length };
  // No relâmpago o enunciado é a própria pergunta: o aluno só recebe os botões.
  if (game.type === 'flash') return { ...rest, text: '', options: (game.options || []).map(() => '') };
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
  d.teams = teamPalette.slice(0, Math.max(2, Math.min(4, count))).map(([name, color]) => ({ name, color }));
  const players = [...d.players];
  for (let i = players.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [players[i], players[j]] = [players[j], players[i]]; }
  players.forEach((player, index) => { player.team = index % d.teams.length; });
}
export function teamScores(room) {
  const d = room.data;
  if (!d.teams?.length) return null;
  return d.teams.map((team, index) => {
    const members = d.players.filter(p => p.team === index);
    return { ...team, index, score: members.reduce((sum, p) => sum + (p.score || 0) + (p.bonus || 0), 0), members: members.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, online: p.online })) };
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
  else if (config.type === 'flash') { game.answers = {}; game.winner = ''; }
  else if (config.type === 'survival') { game.alive = online(room).map(p => p.id); game.fallen = {}; game.round = -1; game.answers = {}; game.deadline = 0; game.state = 'ready'; }
  else if (config.type === 'challenge') { game.solved = []; game.tries = {}; }
  else if (config.type === 'raffle') { game.picked = []; game.current = ''; game.drawAt = 0; }
  else if (config.type === 'tug') {
    const pool = config.questions.map((_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    Object.assign(game, { state: 'ready', sides: {}, order: pool.slice(0, TUG_ROUNDS), round: -1, answers: {}, hits: [0, 0], tries: [0, 0], winner: -1, deadline: 0, pullAt: 0 });
  }
  else if (config.type === 'race') Object.assign(game, { state: 'ready', progress: {}, last: {}, finished: [], startAt: 0, goal: config.goal });
}

export function gameControl(room, value, random = Math.random) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game, action = value?.do;
  if (d.phase !== 'game' || !game || !config) throw Error('Esta ação não está disponível agora.');
  if (action === 'restart') { startGame(room, random); return; }
  if (action === 'end') {
    if (game.type === 'tug' && game.state !== 'done') { if (game.state === 'open') revealTug(room); finishTug(room); }
    if (game.type === 'race') finishRace(room);
    if (game.type === 'teams') settleTeams(room);
    game.state = 'done'; return;
  }
  if (game.type === 'teams' && action === 'shuffle') { d.teamPick = false; formTeams(room, config.count, random); game.state = 'done'; return; }
  if (game.type === 'tug' && action === 'next') {
    if (game.state === 'open') { revealTug(room); return; }
    if (game.state === 'done' || game.state === 'pull') throw Error('Esta rodada já terminou.');
    if (game.state === 'ready') { if (!online(room).length) throw Error('Espere pelo menos um participante entrar.'); for (const p of online(room)) tugSide(room, p); }
    if (game.round + 1 >= game.order.length) { finishTug(room); game.state = 'pull'; game.pullAt = room.now(); return; }
    game.round++; game.answers = {}; game.state = 'open'; game.startedAt = room.now(); game.deadline = room.now() + config.seconds * 1000;
    return;
  }
  if (game.type === 'race' && action === 'next' && game.state === 'ready') {
    if (!online(room).length) throw Error('Espere pelo menos um participante entrar.');
    game.state = 'open'; game.startAt = room.now() + RACE_COUNTDOWN; return;
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
    game.picked.push(chosen.id); game.current = chosen.id; game.drawAt = room.now(); game.draws = (game.draws || 0) + 1;
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
  if (game.state === 'done') for (const p of d.players) if (game.alive.includes(p.id)) bonus(p, SURVIVAL_POINTS);
}
export function tickGame(room) {
  const game = room.data.game;
  if (room.data.phase !== 'game' || !game) return;
  if (game.type === 'survival' && game.state === 'open' && room.now() >= game.deadline) revealSurvival(room);
  if (game.type === 'tug' && game.state === 'open' && room.now() >= game.deadline) revealTug(room);
  if (game.type === 'tug' && game.state === 'pull' && room.now() >= game.pullAt + TUG_PULL_MS) game.state = 'done';
}

// ---- Cabo de guerra: dois lados, 3 perguntas sorteadas, vence quem acerta mais.
// Com times formados, os times 1 e 3 ficam de um lado e os 2 e 4 do outro.
function tugSide(room, player) {
  const game = room.data.game;
  if (Object.hasOwn(game.sides, player.id)) return game.sides[player.id];
  const size = side => Object.values(game.sides).filter(v => v === side).length;
  return game.sides[player.id] = room.data.teams?.length && Number.isInteger(player.team) ? player.team % 2 : size(0) <= size(1) ? 0 : 1;
}
export function tugScore(game) { return [0, 1].map(side => game.tries[side] ? Math.round(game.hits[side] / game.tries[side] * 100) : 0); }
function revealTug(room) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (!game || game.type !== 'tug' || game.state !== 'open') return;
  const question = config.questions[game.order[game.round]];
  // Conta todo mundo do lado (quem não respondeu pesa como erro), assim time grande não leva vantagem.
  for (const [id, side] of Object.entries(game.sides)) {
    const player = d.players.find(p => p.id === id);
    if (!player || !player.online && !Object.hasOwn(game.answers, id)) continue;
    game.tries[side]++;
    if (game.answers[id] === question.correct) { game.hits[side]++; bonus(player, TUG_HIT); }
  }
  game.state = 'reveal';
}
function finishTug(room) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (game.winner !== -1) return;
  const score = tugScore(game), gap = Math.abs(score[0] - score[1]);
  // Diferença dentro da tolerância = empate: ninguém consegue puxar a corda.
  game.winner = gap > (config.tolerance ?? 10) ? (score[0] > score[1] ? 0 : 1) : -2;
  if (game.winner >= 0) for (const p of d.players) if (game.sides[p.id] === game.winner) bonus(p, TUG_POINTS);
}

// ---- Corrida
function finishRace(room) {
  const game = room.data.game;
  if (game.paid) return;
  game.paid = true;
  game.finished.forEach((id, place) => { const p = room.data.players.find(p => p.id === id); if (p) bonus(p, RACE_POINTS[place] ?? RACE_FINISH); });
  game.state = 'done';
}

// O que cada aluno envia durante a etapa.
export function gameInput(room, playerId, payload) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game, player = d.players.find(p => p.id === playerId);
  if (!player || d.phase !== 'game' || !game || !config) throw Error('Esta etapa já mudou.');
  if (game.state !== 'open') throw Error(['survival', 'tug'].includes(game.type) && game.state !== 'done' ? 'Aguarde a próxima pergunta.' : game.type === 'race' && game.state === 'ready' ? 'A corrida ainda não começou.' : 'Esta rodada já terminou.');
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
    const team = payload.team;
    if (!d.teamPick || !Number.isInteger(team) || team < 0 || team >= (d.teams?.length || 0)) throw Error('Não dá para escolher o time agora.');
    player.team = team; return;
  }
  if (game.type === 'tug') {
    const question = config.questions[game.order[game.round]], choice = payload.choice;
    tugSide(room, player);
    if (payload.round !== game.round || room.now() >= game.deadline) throw Error('O tempo desta pergunta acabou.');
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) throw Error('Resposta inválida.');
    if (Object.hasOwn(game.answers, playerId)) throw Error('Você já respondeu.');
    game.answers[playerId] = choice;
    if (online(room).every(p => Object.hasOwn(game.answers, p.id))) revealTug(room);
    return;
  }
  if (game.type === 'race') {
    const now = room.now(), taps = Math.floor(Number(payload.taps) || 0);
    if (now < game.startAt) throw Error('Espere a largada!');
    if (taps <= 0 || game.finished.includes(playerId)) return;
    // Limite de ~12 toques por segundo por aluno.
    const since = Math.max(200, now - (game.last[playerId] || game.startAt));
    game.last[playerId] = now;
    game.progress[playerId] = Math.min(game.goal, (game.progress[playerId] || 0) + Math.min(taps, Math.ceil(since / 1000 * 12)));
    if (game.progress[playerId] >= game.goal) game.finished.push(playerId);
    if (game.finished.length >= Math.min(3, online(room).length)) finishRace(room);
    return;
  }
  if (game.type === 'flash') {
    const choice = payload.choice;
    if (!Number.isInteger(choice) || choice < 0 || choice >= config.options.length) throw Error('Resposta inválida.');
    if (Object.hasOwn(game.answers, playerId)) throw Error('Você já respondeu.');
    game.answers[playerId] = choice;
    if (choice === config.correct) { game.winner = playerId; game.state = 'done'; bonus(player, FLASH_POINTS); }
    else if (online(room).every(p => Object.hasOwn(game.answers, p.id))) game.state = 'done';
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
  const base = { id: game.id, type: game.type, state: game.state, text: bare && game.type === 'flash' ? '' : config.text, startedAt: game.startedAt, bare };
  if (game.type === 'teams') return { ...base, pick: Boolean(d.teamPick) };
  if (game.type === 'flash') return { ...base, options: config.options.map(option => bare ? '' : option), answered: Object.keys(game.answers).length, choice: playerId && Object.hasOwn(game.answers, playerId) ? game.answers[playerId] : null, winner: who(game.winner), points: FLASH_POINTS, ...(done || presenter ? { correct: config.correct } : {}), ...(done ? { counts: config.options.map((_, i) => Object.values(game.answers).filter(v => v === i).length) } : {}) };
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
  if (game.type === 'raffle') return { ...base, current: who(game.current), drawAt: game.drawAt, draws: game.draws || 0, left: online(room).filter(p => !game.picked.includes(p.id)).length, names: online(room).slice(0, 40).map(p => p.name), me: playerId ? game.current === playerId : false };
  if (game.type === 'race') {
    const runners = d.players.filter(p => p.online || game.progress[p.id]).map(p => ({ ...who(p.id), p: Math.min(1, (game.progress[p.id] || 0) / game.goal), place: game.finished.indexOf(p.id) + 1 }))
      .sort((a, b) => (a.place || 99) - (b.place || 99) || b.p - a.p);
    const mine = runners.find(r => r.id === playerId), shown = runners.slice(0, 8);
    if (mine && !shown.includes(mine)) shown[7] = mine;
    const rank = id => runners.findIndex(r => r.id === id) + 1, order = d.players.map(p => p.id);
    shown.forEach(r => { r.rank = rank(r.id); }); shown.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
    return { ...base, goal: game.goal, startAt: game.startAt, runners: shown, total: runners.length, finished: game.finished.length, points: RACE_POINTS, me: mine ? { p: mine.p, place: mine.place, rank: runners.indexOf(mine) + 1 } : null };
  }
  const count = side => Object.values(game.sides).filter(v => v === side).length;
  const crew = side => Object.keys(game.sides).filter(id => game.sides[id] === side).slice(0, 5).map(who).filter(Boolean);
  const question = game.round >= 0 ? config.questions[game.order[game.round]] : null, shown = game.state !== 'open' && game.state !== 'ready';
  // Com times formados o lado leva o nome e a cor dos times; sem times, os nomes do editor.
  const label = side => { const list = (d.teams || []).filter((_, i) => i % 2 === side); return list.length ? { name: list.map(team => 'Time ' + team.name).join(' + '), color: list[0].color } : { name: config.options[side], color: teamPalette[side][1] }; };
  return { ...base, round: game.round, rounds: game.order.length, seconds: config.seconds, deadline: game.deadline, tolerance: config.tolerance ?? 10,
    question: ask(question, { ...(shown || presenter ? { correct: question?.correct } : {}), ...(shown ? { counts: question?.options.map((_, i) => Object.values(game.answers).filter(v => v === i).length) } : {}) }),
    answered: Object.keys(game.answers).length, total: count(0) + count(1), labels: [label(0), label(1)], score: tugScore(game), hits: game.hits, sides: [count(0), count(1)], crews: [crew(0), crew(1)],
    winner: ['pull', 'done'].includes(game.state) ? game.winner : -1, pullAt: game.pullAt, pullMs: TUG_PULL_MS, side: playerId && Object.hasOwn(game.sides, playerId) ? game.sides[playerId] : null, choice: playerId && Object.hasOwn(game.answers, playerId) ? game.answers[playerId] : null, points: TUG_POINTS };
}
