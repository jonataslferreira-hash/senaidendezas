// Perguntas repetidas incomodam: comparamos os textos palavra a palavra e
// descartamos as que ficam parecidas demais com uma anterior.
const questionKey = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function questionSimilarity(a, b) {
  const words = value => new Set(questionKey(value).split(' ').filter(word => word.length > 2));
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let hits = 0;
  for (const word of A) if (B.has(word)) hits++;
  return hits / Math.min(A.size, B.size);
}

export function dedupeQuestions(list) {
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (out.some(previous => questionSimilarity(previous?.text, item?.text) >= 0.72)) continue;
    out.push(item);
  }
  return out;
}
