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
  ['race', new RegExp(lead + 'corrida|corrida\\s+(?:de\\s+|dos\\s+)?(?:bonecos?|bonequinhos?|toques?)|\\buma\\s+corrida\\b|\\be\\s+corrida\\b', 'i'), 0]
];

// Quais dinâmicas o pedido cita e quantas perguntas cada uma precisa.
// `picked` são as etapas marcadas no painel "Montar a aula".
export function requestedGames(prompt, picked = []) {
  const source = String(prompt || ''), chosen = new Set(Array.isArray(picked) ? picked : []);
  return rules.filter(([type, pattern]) => chosen.has(type) || pattern.test(source)).map(([type, , need]) => {
    if (type !== 'survival') return { type, need };
    const asked = Number(source.match(/sobreviv[eê]ncia\s+(?:com|de)\s+(\d{1,2})/i)?.[1]);
    return { type, need: asked > 0 ? Math.min(10, asked) : need };
  });
}
export const gameQuestionNeed = games => games.reduce((sum, game) => sum + game.need, 0);

// Ajusta o pedido de perguntas para caber as do quiz + as das dinâmicas (limites do serviço: 3 quizzes × 10).
export function withGameQuestions(activities, games) {
  const quizTotal = (activities.quizzes || 0) * (activities.questions || 0), need = gameQuestionNeed(games);
  if (!need) return { request: activities, quizTotal };
  const total = Math.min(30, quizTotal + need), quizzes = Math.max(1, activities.quizzes || 0, Math.min(3, Math.ceil(total / 10)));
  return { request: { ...activities, quizzes, questions: Math.max(1, Math.min(10, Math.ceil(total / quizzes))) }, quizTotal };
}

// Separa as perguntas: as primeiras ficam no quiz, as seguintes alimentam as dinâmicas.
export function takeGameQuestions(result, games, quizTotal) {
  const all = Array.isArray(result.questions) ? result.questions : [];
  let rest = all.slice(quizTotal);
  result.questions = all.slice(0, quizTotal);
  result.games = games.map(game => { const questions = rest.slice(0, game.need); rest = rest.slice(game.need); return { type: game.type, questions }; });
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
    if (type === 'survival' || type === 'tug') { if (list.length < (type === 'tug' ? 3 : 1)) { skipped.push(gameNames[type]); continue; } game.questions = list; }
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
