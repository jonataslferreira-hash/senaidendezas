// StorageAI + etapas de jogo. A IA só sabe devolver slides, enquetes e perguntas;
// aqui o pedido do professor ("com sobrevivência", "cabo de guerra"…) vira etapas de verdade:
// pedimos perguntas a mais e transformamos essas perguntas nas dinâmicas.
import { defaultGame, gameNames } from './stage-games.js';

const lead = '(?:etapas?|din[aâ]micas?|jogos?|modos?|desafios?|rodadas?|atividades?|brincadeiras?)\\s+(?:(?:de|da|do|com|tipo)\\s+)?(?:um[a]?\\s+)?';
const rules = [
  ['teams', new RegExp(lead + '(?:equipes?|times?)\\b|(?:dividir|separar|formar|montar)\\s+(?:a\\s+turma\\s+|os\\s+alunos\\s+)?(?:em\\s+)?(?:\\d\\s+)?(?:equipes|times)|\\bcom\\s+(?:\\d\\s+)?(?:equipes|times)\\b', 'i'), 0],
  ['flash', /rel[aâ]mpago/i, 1],
  ['survival', new RegExp(lead + 'sobreviv|sobreviv[eê]ncia\\s+(?:com|de)\\s+\\d|\\b(?:uma?|a)\\s+sobreviv[eê]ncia\\b|\\be\\s+sobreviv[eê]ncia\\b', 'i'), 5],
  ['raffle', /\bsorteio\b|\broleta\b/i, 0],
  ['tug', /cabo[\s-]+de[\s-]+guerra/i, 4],
  ['race', new RegExp(lead + 'corrida|corrida\\s+(?:de\\s+|dos\\s+)?(?:bonecos?|bonequinhos?|perguntas?|saber|conhecimento)|\\buma\\s+corrida\\b|\\be\\s+corrida\\b', 'i'), 4]
];

// Quais dinâmicas o pedido cita e quantas perguntas cada uma precisa.
// Quantas perguntas cada dinâmica aceita: [mínimo, máximo]. Relâmpago é sempre 1; equipes e sorteio não usam.
export const GAME_QUESTION_RANGE = { survival: [1, 25], tug: [3, 25], race: [2, 25] };
export const QUIZ_LIMIT = 50;
const clampNeed = (type, value, fallback) => { const range = GAME_QUESTION_RANGE[type]; if (!range) return fallback; const n = Math.trunc(Number(value)); return Number.isFinite(n) && n > 0 ? Math.max(range[0], Math.min(range[1], n)) : fallback; };
// `picked` são as etapas marcadas no painel "Montar a aula"; `counts` é o número de perguntas escolhido para cada uma.
export function requestedGames(prompt, picked = [], counts = {}) {
  const source = String(prompt || ''), chosen = new Set(Array.isArray(picked) ? picked : []);
  return rules.filter(([type, pattern]) => chosen.has(type) || pattern.test(source)).map(([type, , need]) => {
    // "corrida com 20 perguntas", "sobrevivência de 8", "cabo de guerra com 10 questões"
    const label = { survival: 'sobreviv[eê]ncia', tug: 'cabo\\s+de\\s+guerra', race: 'corrida(?:\\s+do\\s+saber)?' }[type];
    const asked = label ? Number(source.match(new RegExp(label + '\\s+(?:com|de)\\s+(\\d{1,2})', 'i'))?.[1]) : 0;
    return { type, need: clampNeed(type, chosen.has(type) && counts?.[type] ? counts[type] : asked, need) };
  });
}
export const gameQuestionNeed = games => games.reduce((sum, game) => sum + game.need, 0);

// O serviço entrega no máximo 3 quizzes × 10 questões por chamada. Aqui sai o primeiro pedido (até 30)
// e `want`, o total de verdade (quiz + dinâmicas): o que faltar é buscado em lotes por completeActivities.
export function withGameQuestions(activities, games) {
  const quizzes = activities.quizzes || 0, perQuiz = quizzes ? Math.min(activities.questions || 0, Math.floor(QUIZ_LIMIT / quizzes)) : 0;
  const quizTotal = quizzes * perQuiz, need = gameQuestionNeed(games), want = quizTotal + need;
  if (!need && perQuiz <= 10) return { request: activities, quizTotal, want: quizTotal };
  const first = Math.min(30, want), groups = Math.max(1, Math.min(3, Math.ceil(first / 10)));
  return { request: { ...activities, quizzes: groups, questions: Math.max(1, Math.min(10, Math.ceil(first / groups))) }, quizTotal, want };
}

// Separa as perguntas: as primeiras ficam no quiz, as seguintes alimentam as dinâmicas.
export function takeGameQuestions(result, games, quizTotal) {
  const all = Array.isArray(result.questions) ? result.questions : [];
  result.questions = all.slice(0, quizTotal);
  const rest = all.slice(quizTotal), want = gameQuestionNeed(games);
  // Vieram menos perguntas do que o pedido: primeiro garante o mínimo de cada dinâmica, depois reparte o que sobrar.
  const least = game => Math.min(game.need, GAME_QUESTION_RANGE[game.type]?.[0] ?? game.need);
  let spare = rest.length - games.reduce((sum, game) => sum + least(game), 0), at = 0;
  result.games = games.map(game => {
    const take = rest.length >= want ? game.need : spare < 0 ? game.need : least(game) + Math.min(game.need - least(game), Math.max(0, spare));
    if (rest.length < want && spare > 0) spare -= take - least(game);
    const questions = rest.slice(at, at + take); at += take;
    return { type: game.type, questions };
  });
  return result;
}

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const usable = item => { const options = (Array.isArray(item?.options) ? item.options : []).slice(0, 4).map(option => clean(option, 200)); return clean(item?.text, 300) && options.length >= 2 && options.every(Boolean) && Number.isInteger(item.correct) && item.correct >= 0 && item.correct < options.length ? { text: clean(item.text, 300), options, correct: item.correct } : null; };

// Cria as etapas na aula. Devolve quantas entraram e quais ficaram de fora por falta de perguntas.
export function addGameStages(lesson, games, { newSlide, createUuid }) {
  const skipped = []; let added = 0;
  if (!Array.isArray(games) || !games.length) return { added, skipped };
  if (!lesson.activityBlocks) lesson.activityBlocks = [{ id: 'slides', type: 'slides', items: lesson.slides.filter(slide => !slide.poll && !slide.game).map(slide => slide.id) }, ...lesson.slides.filter(slide => slide.poll).map(slide => ({ id: createUuid(), type: 'poll', items: [slide.id] })), ...(lesson.questions.length ? [{ id: 'quiz', type: 'quiz', items: lesson.questions.map(question => question.id) }] : [])];
  for (const { type, questions } of games) {
    if (lesson.activityBlocks.length >= 24 || lesson.slides.length >= 80) { skipped.push(gameNames[type]); continue; }
    const game = defaultGame(type), list = (questions || []).map(usable).filter(Boolean);
    if (type === 'flash') { if (!list.length) { skipped.push(gameNames[type]); continue; } Object.assign(game, list[0]); }
    if (type === 'survival' || type === 'tug' || type === 'race') { if (list.length < (type === 'tug' ? 3 : type === 'race' ? 2 : 1)) { skipped.push(gameNames[type]); continue; } game.questions = list; }
    const slide = { ...newSlide(), title: type === 'flash' ? game.text.slice(0, 160) : gameNames[type], game };
    const block = { id: createUuid(), type, items: [slide.id] };
    lesson.slides.push(slide);
    // Equipes vem antes de todas as outras atividades; o resto entra antes do primeiro quiz.
    const blocks = lesson.activityBlocks, firstLive = blocks.findIndex(item => item.type !== 'slides'), firstQuiz = blocks.findIndex(item => item.type === 'quiz');
    if (type === 'teams' && firstLive >= 0) blocks.splice(firstLive, 0, block); else if (type !== 'teams' && firstQuiz >= 0) blocks.splice(firstQuiz, 0, block); else blocks.push(block);
    added++;
  }
  return { added, skipped };
}
