// StorageAI + etapas de jogo. A IA só sabe devolver slides, enquetes e perguntas;
// aqui o pedido do professor ("com sobrevivência", "cabo de guerra"…) vira etapas de verdade:
// pedimos perguntas a mais e transformamos essas perguntas nas dinâmicas.
import { defaultGame, gameNames, TUG_ROUNDS, TUG_VARIANTS } from './stage-games.js';
import { dedupeQuestions } from './question-dedupe.js';

const lead = '(?:etapas?|din[aâ]micas?|jogos?|modos?|desafios?|rodadas?|atividades?|brincadeiras?)\\s+(?:(?:de|da|do|com|tipo)\\s+)?(?:um[a]?\\s+)?';
const rules = [
  ['teams', new RegExp(lead + '(?:equipes?|times?)\\b|(?:dividir|separar|formar|montar)\\s+(?:a\\s+turma\\s+|os\\s+alunos\\s+)?(?:em\\s+)?(?:\\d\\s+)?(?:equipes|times)|\\bcom\\s+(?:\\d\\s+)?(?:equipes|times)\\b', 'i'), 0],
  ['flash', /rel[aâ]mpago/i, 5],
  ['survival', new RegExp(lead + 'sobreviv|sobreviv[eê]ncia\\s+(?:com|de)\\s+\\d|\\b(?:uma?|a)\\s+sobreviv[eê]ncia\\b|\\be\\s+sobreviv[eê]ncia\\b', 'i'), 5],
  ['raffle', /\bsorteio\b|\broleta\b/i, 0],
  ['tug', /cabo[\s-]+de[\s-]+guerra/i, 4],
  ['race', new RegExp(lead + 'corrida|corrida\\s+(?:de\\s+|dos\\s+)?(?:bonecos?|bonequinhos?|perguntas?|saber|conhecimento)|\\buma\\s+corrida\\b|\\be\\s+corrida\\b', 'i'), 4]
];

// Quais dinâmicas o pedido cita e quantas perguntas cada uma precisa.
// Quantas perguntas cada dinâmica aceita: [mínimo, máximo]. Equipes e sorteio não usam.
// No cabo de guerra o número é de rodadas (até 12), e a IA gera 3 perguntas por rodada.
export const TUG_QUESTIONS_PER_ROUND = TUG_VARIANTS;
export const GAME_QUESTION_RANGE = { flash: [1, 25], survival: [1, 25], tug: [1, TUG_ROUNDS], race: [2, 25] };
export const QUIZ_LIMIT = 50;
export const gameQuestionTotal = (type, count) => type === 'tug' ? count * TUG_QUESTIONS_PER_ROUND : count;
const clampNeed = (type, value, fallback) => { const range = GAME_QUESTION_RANGE[type]; if (!range) return fallback; const n = Math.trunc(Number(value)); return Number.isFinite(n) && n > 0 ? Math.max(range[0], Math.min(range[1], n)) : fallback; };
// `picked` são as etapas marcadas no painel "Montar a aula"; `counts` é o número de perguntas/rodadas escolhido para cada uma.
export function requestedGames(prompt, picked = [], counts = {}) {
  const source = String(prompt || ''), chosen = new Set(Array.isArray(picked) ? picked : []);
  return rules.filter(([type, pattern]) => chosen.has(type) || pattern.test(source)).map(([type, , need]) => {
    // "corrida com 20 perguntas", "sobrevivência de 8", "cabo de guerra com 5 rodadas"
    const label = { flash: '(?:desafio\\s+)?rel[aâ]mpago', survival: 'sobreviv[eê]ncia', tug: 'cabo\\s+de\\s+guerra', race: 'corrida(?:\\s+do\\s+saber)?' }[type];
    const asked = label ? Number(source.match(new RegExp(label + '\\s+(?:com|de)\\s+(\\d{1,2})', 'i'))?.[1]) : 0;
    const count = clampNeed(type, chosen.has(type) && counts?.[type] ? counts[type] : asked, need);
    return type === 'tug' ? { type, rounds: count, need: count * TUG_QUESTIONS_PER_ROUND } : { type, need: count };
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
  // O mesmo filtro do quiz: as perguntas quase repetidas caem antes de virar etapas de jogo.
  const all = dedupeQuestions(Array.isArray(result.questions) ? result.questions : []);
  result.questions = all.slice(0, quizTotal);
  const rest = all.slice(quizTotal), want = gameQuestionNeed(games);
  // Vieram menos perguntas do que o pedido: cada dinâmica recebe o mínimo e o resto é repartido uma a uma, por igual.
  const takes = games.map(game => rest.length >= want ? game.need : Math.min(game.need, GAME_QUESTION_RANGE[game.type]?.[0] ?? game.need));
  let spare = rest.length - takes.reduce((sum, n) => sum + n, 0);
  for (let moved = true; spare > 0 && moved;) { moved = false; games.forEach((game, i) => { if (spare > 0 && takes[i] < game.need) { takes[i]++; spare--; moved = true; } }); }
  let at = 0;
  result.games = games.map((game, i) => { const questions = rest.slice(at, at + takes[i]); at += takes[i]; return { type: game.type, questions, ...(game.rounds ? { rounds: game.rounds } : {}) }; });
  return result;
}

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const usable = item => { const options = (Array.isArray(item?.options) ? item.options : []).slice(0, 4).map(option => clean(option, 200)); return clean(item?.text, 300) && options.length >= 2 && options.every(Boolean) && Number.isInteger(item.correct) && item.correct >= 0 && item.correct < options.length ? { text: clean(item.text, 300), options, correct: item.correct } : null; };

// Cria as etapas na aula. Devolve quantas entraram e quais ficaram de fora por falta de perguntas.
export function addGameStages(lesson, games, { newSlide, createUuid }) {
  const skipped = []; let added = 0;
  if (!Array.isArray(games) || !games.length) return { added, skipped };
  if (!lesson.activityBlocks) lesson.activityBlocks = [{ id: 'slides', type: 'slides', items: lesson.slides.filter(slide => !slide.poll && !slide.game).map(slide => slide.id) }, ...lesson.slides.filter(slide => slide.poll).map(slide => ({ id: createUuid(), type: 'poll', items: [slide.id] })), ...(lesson.questions.length ? [{ id: 'quiz', type: 'quiz', items: lesson.questions.map(question => question.id) }] : [])];
  for (const { type, questions, rounds } of games) {
    if (lesson.activityBlocks.length >= 24 || lesson.slides.length >= 80) { skipped.push(gameNames[type]); continue; }
    const game = defaultGame(type), list = (questions || []).map(usable).filter(Boolean);
    if (type === 'flash' || type === 'survival' || type === 'tug' || type === 'race') {
      if (list.length < (type === 'race' ? 2 : 1)) { skipped.push(gameNames[type]); continue; }
      // Cabo de guerra: agrupa 3 perguntas da IA por rodada (sorteadas durante o jogo).
      if (type === 'tug') {
        const targetRounds = Math.min(TUG_ROUNDS, Math.max(1, Math.min(list.length, Number(rounds) || Math.ceil(list.length / TUG_QUESTIONS_PER_ROUND))));
        if (list.length >= targetRounds * TUG_QUESTIONS_PER_ROUND) {
          game.rounds = Array.from({ length: targetRounds }, (_, r) => list.slice(r * TUG_QUESTIONS_PER_ROUND, (r + 1) * TUG_QUESTIONS_PER_ROUND));
        } else {
          const buckets = Array.from({ length: targetRounds }, () => []);
          for (const [i, question] of list.entries()) {
            const bucket = buckets[i % targetRounds];
            if (bucket.length < TUG_QUESTIONS_PER_ROUND) bucket.push(question);
          }
          game.rounds = buckets.filter(bucket => bucket.length);
        }
      } else game.questions = list.slice(0, 25);
    }
    const slide = { ...newSlide(), title: gameNames[type], game };
    const block = { id: createUuid(), type, items: [slide.id] };
    lesson.slides.push(slide);
    // Equipes vem antes de todas as outras atividades; o resto entra antes do primeiro quiz.
    const blocks = lesson.activityBlocks, firstLive = blocks.findIndex(item => item.type !== 'slides'), firstQuiz = blocks.findIndex(item => item.type === 'quiz');
    if (type === 'teams' && firstLive >= 0) blocks.splice(firstLive, 0, block); else if (type !== 'teams' && firstQuiz >= 0) blocks.splice(firstQuiz, 0, block); else blocks.push(block);
    added++;
  }
  return { added, skipped };
}
