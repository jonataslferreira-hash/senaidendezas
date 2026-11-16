// Perguntas repetidas incomodam: comparamos os textos palavra a palavra e
// descartamos as que ficam parecidas demais com uma anterior.
// Palavras muito comuns (artigos, pronomes, conectivos) não contam na
// comparação; números e nomes curtos contam, porque costumam ser a diferença.
const STOPWORDS = new Set('a,o,as,os,um,uma,uns,umas,de,do,da,dos,das,em,no,na,nos,nas,por,para,pra,com,sem,e,ou,que,qual,quais,quem,quando,onde,como,porque,ao,aos,pelo,pela,se,ja,ser,tem,sua,seu,suas,seus,isso,isto,esse,essa,este,esta'.split(','));

const questionKey = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const contentWords = value => new Set(questionKey(value).split(' ').filter(word => word && !STOPWORDS.has(word)));

function questionSimilarity(a, b) {
  const A = contentWords(a), B = contentWords(b);
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
