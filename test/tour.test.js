// Tour de boas-vindas: persistência da escolha e forma das etapas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldOfferTour, markTourSeen, tourSteps, TOUR_STORAGE_KEY, kuroMascot } from '../src/tour.js';

const storage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), data }; };

test('tour é oferecido só para quem nunca viu', () => {
  const s = storage();
  assert.equal(shouldOfferTour(s), true);
  markTourSeen(s, 'done');
  assert.equal(shouldOfferTour(s), false);
  assert.equal(s.data.get(TOUR_STORAGE_KEY), 'done');
  const other = storage();
  markTourSeen(other, 'skipped');
  assert.equal(shouldOfferTour(other), false, 'pular o tour também suprime a próxima oferta');
});

test('etapas do tour têm forma válida e ids únicos', () => {
  assert.ok(tourSteps.length >= 8, 'cobertura mínima de abas e editor');
  assert.deepEqual([...new Set(tourSteps.map(s => s.id))].sort(), tourSteps.map(s => s.id).sort(), 'ids únicos');
  for (const step of tourSteps) {
    assert.ok(step.id && step.title && step.text, `etapa ${step.id} completa`);
    assert.ok(step.target === null || typeof step.target === 'string', `alvo da etapa ${step.id} é seletor ou null`);
    assert.ok(!step.nav || ['join', 'shared'].includes(step.nav), `navegação da etapa ${step.id} é uma aba conhecida`);
  }
  assert.equal(tourSteps[0].target, null, 'abertura é conversa, sem destaque');
  assert.equal(tourSteps.at(-1).id, 'bye', 'última etapa é a despedida');
  assert.equal(tourSteps.filter(s => s.editor).length, 1, 'exatamente uma etapa entra no editor');
});

test('etapas cobrem as abas da tela inicial', () => {
  const targets = tourSteps.map(s => s.target || '').join(' ');
  for (const expected of ['[data-library-grid]', '.create-import-card', '.studio-rail button[data-studio-action="storage-ai"]', '#join-form', '.shared-library'])
    assert.ok(targets.includes(expected), `cobre ${expected}`);
});

test('mascote Kuro é um SVG com partes separadas e animáveis', () => {
  assert.ok(kuroMascot.includes('<svg'), 'é SVG');
  for (const part of ['kuro-ear-l', 'kuro-ear-r', 'kuro-eyes', 'kuro-mouth', 'kuro-mouth-open', 'kuro-arm', 'kuro-head'])
    assert.ok(kuroMascot.includes(part), `parte ${part} presente e nomeada`);
  assert.ok(!kuroMascot.includes('<img'), 'vetor, não imagem raster');
});

test('trilha nova em loop e narração com caminho relativo (sem 404 no Pages)', () => {
  const code = readFileSync(new URL('../src/tour.js', import.meta.url), 'utf8');
  assert.ok(code.includes('files.catbox.moe/1jds9q.mp3'), 'usa a trilha nova em loop');
  assert.ok(!code.includes('`/tour/step-'), 'narração é caminho relativo — barra absoluta dá 404 no deploy com base ./');
  assert.ok(code.includes('duckMusic'), 'trilha abaixa volume e velocidade só enquanto a narração fala');
  const css = readFileSync(new URL('../src/tour.css', import.meta.url), 'utf8');
  assert.ok(!css.includes('.site-tour.has-target .tour-backdrop{background:'), 'backdrop não escurece o alvo do spotlight');
});
