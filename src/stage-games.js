// Etapas interativas da aula (além de Slides, Enquete e Quiz):
//   teams     – Competição em equipes: divide a turma em times e mostra o placar
//   flash     – Desafio relâmpago: uma pergunta, vence quem acertar primeiro
//   cloud     – Nuvem de palavras: cada aluno manda respostas curtas
//   challenge – Desafio no experimento: acertar uma meta mexendo no experimento
//   raffle    – Sorteio de aluno
//   tug       – Cabo de guerra: a turma escolhe um lado e puxa a corda tocando na tela
// Cada etapa é um slide com o campo `game`. Aqui ficam as regras (sem tela), para
// a sala do professor aplicar e os testes conferirem.
import { createUuid } from './uuid.js';

export const gameTypes = ['teams', 'flash', 'cloud', 'challenge', 'raffle', 'tug'];
export const isGameType = type => gameTypes.includes(type);
export const gameNames = { teams: 'Equipes', flash: 'Desafio relâmpago', cloud: 'Nuvem de palavras', challenge: 'Desafio no experimento', raffle: 'Sorteio', tug: 'Cabo de guerra' };
export const gameHints = {
  teams: 'Divide a turma em times e mostra o placar',
  flash: 'Uma pergunta: vence quem acertar primeiro',
  cloud: 'Cada aluno manda uma palavra para o telão',
  challenge: 'Quem atinge a meta no experimento?',
  raffle: 'Roleta com os nomes de quem está na sala',
  tug: 'Dois lados puxam a corda tocando na tela'
};
export const teamPalette = [['Azul', '#3b82f6'], ['Laranja', '#f97316'], ['Verde', '#22c55e'], ['Rosa', '#ec4899']];
export const FLASH_POINTS = 500, CHALLENGE_FIRST = 500, CHALLENGE_POINTS = 300, TUG_POINTS = 200;

const text = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max);
const line = (value, max) => text(value, max).replace(/\s+/g, ' ').trim();

export function defaultGame(type) {
  if (type === 'teams') return { type, text: 'Que comecem os jogos!', count: 2 };
  if (type === 'flash') return { type, text: 'Quem responde primeiro?', options: ['Opção A', 'Opção B'], correct: 0 };
  if (type === 'cloud') return { type, text: 'Em uma palavra: o que você achou da aula?' };
  if (type === 'challenge') return { type, text: 'Ajuste o experimento até chegar à meta.', simulation: 'projectile', answer: [], tolerance: 5 };
  if (type === 'raffle') return { type, text: 'Quem vai responder?' };
  return { type: 'tug', text: 'De que lado você está?', options: ['Lado A', 'Lado B'] };
}

// Limpa o que veio do editor. Em rascunho aceita campos incompletos.
export function validateGame(game, draft = false, simulationIds = null) {
  if (game == null || typeof game !== 'object' || !isGameType(game.type)) return null;
  const result = { type: game.type, text: text(game.text, 300) };
  if (!draft && !result.text.trim()) throw Error('Escreva o enunciado da etapa "' + gameNames[game.type] + '".');
  if (game.type === 'teams') result.count = Math.max(2, Math.min(4, Math.floor(Number(game.count) || 2)));
  if (game.type === 'flash') {
    const options = (Array.isArray(game.options) ? game.options : []).slice(0, 4).map(o => text(o, 200));
    if (!draft && (options.length < 2 || options.some(o => !o.trim()))) throw Error('O desafio relâmpago precisa de 2 a 4 opções preenchidas.');
    result.options = options.length ? options : ['', ''];
    result.correct = Math.max(0, Math.min(result.options.length - 1, Math.floor(Number(game.correct) || 0)));
  }
  if (game.type === 'tug') {
    const options = (Array.isArray(game.options) ? game.options : []).slice(0, 2).map(o => text(o, 60));
    while (options.length < 2) options.push('');
    if (!draft && options.some(o => !o.trim())) throw Error('O cabo de guerra precisa do nome dos dois lados.');
    result.options = options;
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
  const { correct, answer, ...rest } = game;
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
  const sizes = teams.map((_, index) => room.data.players.filter(p => p !== player && p.team === index).length);
  player.team = sizes.indexOf(Math.min(...sizes));
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
  d.phase = 'game';
  const game = d.game = { id: createUuid(), type: config.type, state: 'open', startedAt: room.now() };
  if (config.type === 'teams') { if (d.teams?.length !== config.count) formTeams(room, config.count, random); else for (const p of d.players) assignTeam(room, p); game.state = 'done'; }
  else if (config.type === 'flash') { game.answers = {}; game.winner = ''; }
  else if (config.type === 'cloud') game.entries = [];
  else if (config.type === 'challenge') { game.solved = []; game.tries = {}; }
  else if (config.type === 'raffle') { game.picked = []; game.current = ''; game.drawAt = 0; }
  else if (config.type === 'tug') { game.sides = {}; game.taps = [0, 0]; game.winner = -1; game.goal = 30; game.last = {}; }
}

export function gameControl(room, value, random = Math.random) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game, action = value?.do;
  if (d.phase !== 'game' || !game || !config) throw Error('Esta ação não está disponível agora.');
  if (action === 'restart') { startGame(room, random); return; }
  if (action === 'end') { if (game.type === 'tug' && game.winner < 0) finishTug(room, game.taps[0] === game.taps[1] ? -2 : game.taps[0] > game.taps[1] ? 0 : 1); game.state = 'done'; return; }
  if (game.type === 'teams' && action === 'shuffle') { formTeams(room, config.count, random); return; }
  if (game.type === 'cloud' && action === 'remove') { game.entries = game.entries.filter(entry => entry.id !== value.id); return; }
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

function finishTug(room, side) {
  const game = room.data.game;
  game.winner = side; game.state = 'done';
  if (side >= 0) for (const p of room.data.players) if (game.sides[p.id] === side) bonus(p, TUG_POINTS);
}

// O que cada aluno envia durante a etapa.
export function gameInput(room, playerId, payload) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game, player = d.players.find(p => p.id === playerId);
  if (!player || d.phase !== 'game' || !game || !config) throw Error('Esta etapa já mudou.');
  if (game.state !== 'open') throw Error('Esta rodada já terminou.');
  if (!payload || typeof payload !== 'object') throw Error('Resposta inválida.');
  if (game.type === 'flash') {
    const choice = payload.choice;
    if (!Number.isInteger(choice) || choice < 0 || choice >= config.options.length) throw Error('Resposta inválida.');
    if (Object.hasOwn(game.answers, playerId)) throw Error('Você já respondeu.');
    game.answers[playerId] = choice;
    if (choice === config.correct) { game.winner = playerId; game.state = 'done'; bonus(player, FLASH_POINTS); }
    else if (online(room).every(p => Object.hasOwn(game.answers, p.id))) game.state = 'done';
  } else if (game.type === 'cloud') {
    const word = line(payload.word, 40);
    if (!word) throw Error('Escreva uma palavra ou frase curta.');
    const mine = game.entries.filter(entry => entry.player === playerId);
    if (mine.length >= 3) throw Error('Você já enviou 3 respostas.');
    if (mine.some(entry => entry.text.toLowerCase() === word.toLowerCase())) throw Error('Você já enviou esta resposta.');
    if (game.entries.length >= 240) throw Error('O mural está cheio.');
    game.entries.push({ id: createUuid().slice(0, 8), player: playerId, text: word });
  } else if (game.type === 'challenge') {
    if (game.solved.some(item => item.player === playerId)) throw Error('Você já acertou!');
    const now = room.now();
    if (now - (game.tries[playerId]?.at || 0) < 1500) throw Error('Espere um instante antes de tentar de novo.');
    const tries = (game.tries[playerId]?.n || 0) + 1;
    const ok = challengeMatches(config, Array.isArray(payload.values) ? payload.values.slice(0, 16) : null);
    game.tries[playerId] = { n: tries, at: now, ok };
    if (ok) { game.solved.push({ player: playerId, at: now - game.startedAt, tries }); bonus(player, game.solved.length === 1 ? CHALLENGE_FIRST : CHALLENGE_POINTS); }
  } else if (game.type === 'tug') {
    if (payload.side === 0 || payload.side === 1) {
      if (Object.hasOwn(game.sides, playerId)) throw Error('Você já escolheu um lado.');
      game.sides[playerId] = payload.side;
    }
    const taps = Math.floor(Number(payload.taps) || 0);
    if (taps > 0) {
      const side = game.sides[playerId];
      if (side === undefined) throw Error('Escolha um lado primeiro.');
      // Limite de ~12 toques por segundo por aluno, para ninguém "turbinar" a corda.
      const now = room.now(), since = Math.max(200, now - (game.last[playerId] || game.startedAt));
      game.last[playerId] = now;
      game.taps[side] += Math.min(taps, Math.ceil(since / 1000 * 12));
      game.goal = Math.max(30, 20 * Math.max(1, Math.ceil(Object.keys(game.sides).length / 2)));
      const lead = game.taps[0] - game.taps[1];
      if (Math.abs(lead) >= game.goal) finishTug(room, lead > 0 ? 0 : 1);
    }
  } else throw Error('Esta etapa não recebe respostas.');
}

// Retrato da etapa para um aluno (id) ou para o professor (sem id).
export function gameSnapshot(room, playerId) {
  const d = room.data, game = d.game, config = room.slides[d.slide]?.game;
  if (d.phase !== 'game' || !game || !config) return null;
  const name = id => d.players.find(p => p.id === id), who = id => { const p = name(id); return p ? { id: p.id, name: p.name, avatar: p.avatar } : null; };
  const done = game.state === 'done', presenter = !playerId;
  const base = { id: game.id, type: game.type, state: game.state, text: config.text, startedAt: game.startedAt };
  if (game.type === 'teams') return base;
  if (game.type === 'flash') return { ...base, options: config.options, answered: Object.keys(game.answers).length, choice: playerId && Object.hasOwn(game.answers, playerId) ? game.answers[playerId] : null, winner: who(game.winner), points: FLASH_POINTS, ...(done || presenter ? { correct: config.correct } : {}), ...(done ? { counts: config.options.map((_, i) => Object.values(game.answers).filter(v => v === i).length) } : {}) };
  if (game.type === 'cloud') {
    const groups = new Map();
    for (const entry of game.entries) { const key = entry.text.toLowerCase(); const item = groups.get(key) || { text: entry.text, n: 0, ids: [] }; item.n++; item.ids.push(entry.id); groups.set(key, item); }
    return { ...base, words: [...groups.values()].sort((a, b) => b.n - a.n).slice(0, 60).map(({ text, n, ids }) => presenter ? { text, n, id: ids[0] } : { text, n }), total: game.entries.length, mine: playerId ? game.entries.filter(entry => entry.player === playerId).map(entry => entry.text) : [] };
  }
  if (game.type === 'challenge') {
    const mine = playerId ? game.tries[playerId] : null, place = game.solved.findIndex(item => item.player === playerId);
    return { ...base, simulation: config.simulation, solved: game.solved.slice(0, 10).map(item => ({ ...who(item.player), at: item.at, tries: item.tries })), solvedCount: game.solved.length, trying: Object.keys(game.tries).length,
      me: playerId ? { tries: mine?.n || 0, ok: place >= 0, place: place + 1, points: place === 0 ? CHALLENGE_FIRST : CHALLENGE_POINTS } : null,
      ...(done || presenter ? { answer: config.answer.filter(item => !item.skip && item.k !== 'text').map(item => ({ label: item.label, v: item.v })) } : {}) };
  }
  if (game.type === 'raffle') return { ...base, current: who(game.current), drawAt: game.drawAt, draws: game.draws || 0, left: online(room).filter(p => !game.picked.includes(p.id)).length, names: online(room).slice(0, 40).map(p => p.name), me: playerId ? game.current === playerId : false };
  const count = side => Object.values(game.sides).filter(v => v === side).length;
  return { ...base, options: config.options, taps: game.taps, goal: game.goal, winner: game.winner, sides: [count(0), count(1)], side: playerId && Object.hasOwn(game.sides, playerId) ? game.sides[playerId] : null, points: TUG_POINTS };
}
