// Tour de boas-vindas: persistência da escolha e forma das etapas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldOfferTour, markTourSeen, tourSteps, TOUR_STORAGE_KEY } from '../src/tour.js';

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
  for (const expected of ['[data-library-grid]', '.create-import-card', '.storage-ai-primary', '#join-form', '.shared-library'])
    assert.ok(targets.includes(expected), `cobre ${expected}`);
});
