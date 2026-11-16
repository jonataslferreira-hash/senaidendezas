import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';

import {
  BUILTIN_MODELS,
  BUILTIN_MODEL_IDS,
  isBuiltinModel,
  isValidModelId,
  modelGroups,
  modelOptionsMarkup,
  modelName
} from '../src/model-catalog.js';
import { buildBuiltinModel, PART_DETAILS } from '../src/model-builders.js';
import { newLesson, newSlide, validateLesson } from '../src/lessons.js';
import { normalizeElements, newElement } from '../src/canvas-data.js';
import { Room } from '../src/room.js';
import { readAutoSavePreference, writeAutoSavePreference } from '../src/autosave-preference.js';
import { simulationGroups, simulationMarkup } from '../src/simulations.js';

test('3D Models: 15 builtin models across Sciences & Tech (no Português/Artes/Matemática) with valid Three.js geometry and part details', () => {
  assert.equal(BUILTIN_MODELS.length, 15, 'must provide exactly 15 builtin 3D models');
  assert.equal(new Set(BUILTIN_MODEL_IDS).size, 15, 'all 15 model IDs must be unique');

  const expectedSubjects = ['Tecnologia', 'Física', 'Química', 'Biologia', 'Geografia'];
  const actualSubjects = modelGroups.map(([s]) => s);
  assert.deepEqual(actualSubjects, expectedSubjects, 'only Science & Tech subjects should have 3D models');
  for (const excluded of ['Português', 'Artes', 'Matemática']) {
    assert.ok(!actualSubjects.includes(excluded), `should not include 3D models for ${excluded}`);
  }

  for (const meta of BUILTIN_MODELS) {
    assert.equal(isBuiltinModel(meta.id), true);
    assert.equal(isValidModelId(meta.id), true);
    assert.ok(PART_DETAILS[meta.defaultPart], `missing defaultPart detail for ${meta.id}`);

    const group = new THREE.Group();
    buildBuiltinModel(group, meta.id);
    assert.ok(group.children.length >= 10, `expected rich geometry for ${meta.id}, got ${group.children.length} children`);

    let clickableParts = new Set();
    let explodeParts = 0;
    for (const child of group.children) {
      if (child.userData.part) {
        clickableParts.add(child.userData.part);
        assert.ok(PART_DETAILS[child.userData.part], `missing PART_DETAILS entry for ${meta.id}:${child.userData.part}`);
      }
      if (child.userData.explodeX || child.userData.explodeY || child.userData.explodeZ) explodeParts++;
    }
    assert.ok(clickableParts.size >= 4, `expected >= 4 clickable educational parts in ${meta.id}, got ${clickableParts.size}`);
    assert.ok(explodeParts >= 8, `expected exploded view offsets in ${meta.id}, got ${explodeParts}`);
  }

  const optionsHtml = modelOptionsMarkup('dna', { customLabel: 'Meu arquivo.glb' });
  assert.match(optionsHtml, /<optgroup label="Biologia">/, 'groups 3D models by subject');
  assert.match(optionsHtml, /value="dna" selected/, 'selects active 3D model');
  assert.match(optionsHtml, /Meu arquivo\.glb/, 'includes custom model option');
});

test('3D Models: lessons, canvas-data, and live Room accept all 15 builtin model IDs', () => {
  for (const id of BUILTIN_MODEL_IDS) {
    const lesson = newLesson('Aula 3D ' + modelName(id));
    const nativeModelSlide = { ...newSlide('Modelo ' + id), kind: 'model', model: id };
    const canvasSlide = {
      ...newSlide('Canvas ' + id),
      kind: 'canvas',
      elements: [newElement('model', { model: id })]
    };
    lesson.slides = [nativeModelSlide, canvasSlide];

    const validated = validateLesson(lesson);
    assert.equal(validated.slides[0].model, id);
    assert.equal(validated.slides[1].elements[0].model, id);

    const normalized = normalizeElements([newElement('model', { model: id })], false, v => v || '');
    assert.equal(normalized[0].model, id);

    const room = new Room('TEST3D', null, Date.now, validated);
    room.control('model', id);
    assert.equal(room.data.model, id, `Room must allow switching live to ${id}`);
  }
});

test('Mobile editor toolbar hides video/model/simulation on bar and arranges Mais popover in 2 columns', () => {
  const mobileCss = fs.readFileSync('src/mobile.css', 'utf8');
  const designerJs = fs.readFileSync('src/slide-designer.js', 'utf8');

  // Barra inferior mobile esconde video, model e simulation mesmo com [data-selection-type=""]
  assert.match(
    mobileCss,
    /\.designer-toolbar\[data-selection-type=""\]>:is\(\[data-designer-action=video\],\[data-designer-action=model\],\[data-designer-action=simulation\]\)[\s\S]*display:none!important/,
    'video, model, and simulation must stay hidden on mobile bottom bar'
  );
  // Apenas Ajustes, Texto, Imagem e Forma ganham flex-column direto (não button:not(.desktop-history))
  assert.doesNotMatch(
    mobileCss,
    /\.designer-toolbar\[data-selection-type=""\]>button:not\(\.desktop-history\)/,
    'removed overly broad mobile button selector that re-exposed hidden tools'
  );
  // Popover Mais em grade de 2 colunas com Vídeo, Modelo 3D e Simulação
  assert.match(designerJs, /<div class="mobile-more-grid">/, 'Mais popover uses dedicated 2-column grid container');
  assert.match(
    mobileCss,
    /\.designer-insert-more\[open\]>div\{[\s\S]*display:grid;[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
    'Mais popover arranges items in 2 columns on mobile'
  );
});

test('Editor header title wraps cleanly across lines when no subtitle sits below it', () => {
  const mobileCss = fs.readFileSync('src/mobile.css', 'utf8');
  const refineCss = fs.readFileSync('src/editor-refinement.css', 'utf8');

  assert.match(mobileCss, /\.editor-heading-meta,[\s\S]*\.editor-heading-hint\{display:none!important\}/, 'hides empty meta container on mobile');
  assert.match(mobileCss, /\.editor-title\{[\s\S]*white-space:normal;[\s\S]*overflow-wrap:break-word/, 'allows clean title wrapping on mobile');
  assert.match(refineCss, /\.editor-title-block:not\(:has\(\.editor-heading-meta:not\(:empty\)\)\)\s+\.editor-title/, 'wraps title when no metadata is underneath');
});

test('Profile auto-save preference and unified cloud save button logic', () => {
  const profileJs = fs.readFileSync('src/profile.js', 'utf8');
  const studioJs = fs.readFileSync('src/studio.js', 'utf8');
  const wsCss = fs.readFileSync('src/workspace-styles.css', 'utf8');

  // Preferência de auto-save no perfil
  assert.match(profileJs, /name="auto_save"/, 'profile form includes auto_save checkbox');
  assert.match(profileJs, /autosave-preference-changed/, 'profile notifies editor immediately when auto_save changes');

  // Leitura da preferência (user_metadata + fallback localStorage)
  assert.equal(readAutoSavePreference({ user_metadata: { auto_save: true } }), true);
  assert.equal(readAutoSavePreference({ user_metadata: { auto_save: false } }), false);
  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v))
  };
  try {
    writeAutoSavePreference(true);
    assert.equal(readAutoSavePreference(null), true);
    writeAutoSavePreference(false);
    assert.equal(readAutoSavePreference(null), false);
  } finally {
    globalThis.localStorage = prevStorage;
  }

  // Botão unificado quando já salvo na nuvem + ocultação total com auto-save
  assert.match(studioJs, /if \(this\.autoSaveEnabled\(\)\) return '';/, 'hides all save buttons when auto-save is active');
  assert.match(studioJs, /is-unified-cloud/, 'unifies local and cloud save into a single cloud button when cloud-backed');
  assert.match(studioJs, /scheduleAutoSave\(/, 'schedules debounced auto-save on dirty edits');
  assert.match(wsCss, /\[data-studio-action=cloud-save\]:not\(\.is-unified\)\{display:none\}/, 'keeps unified cloud button visible in mobile bar');
});

test('Mobile Simulation Lab puts Experimento inline, moves Importar/Base to footer left, hides Cancelar, and prevents controls collapse', () => {
  const finishingCss = fs.readFileSync('src/finishing.css', 'utf8');
  const designerJs = fs.readFileSync('src/slide-designer.js', 'utf8');

  // Texto "Experimento" na mesma linha do seletor e botões Importar/Base com ícones no footer
  assert.match(designerJs, /<label class="simulation-modal-select-wrap"><span>Experimento<\/span><select/, 'Experimento label wraps text in span for inline row');
  assert.match(designerJs, /class="simulation-modal-foot-tools"[\s\S]*data-sim-import[\s\S]*<span>Importar<\/span>[\s\S]*data-sim-template[\s\S]*<span>Base<\/span>/, 'footer includes Importar and Base icon buttons');

  // Bloco mobile 44 no final de finishing.css garante precedência absoluta
  assert.match(
    finishingCss,
    /dialog\.simulation-modal \.simulation-modal-select-wrap \{[\s\S]*display: flex;[\s\S]*align-items: center;/,
    'Experimento label sits on the same line as the select on mobile'
  );
  assert.match(
    finishingCss,
    /dialog\.simulation-modal \.simulation-modal-actions:has\(\[data-sim-confirm\]\) \[data-sim-cancel\] \{\s*display: none;\s*\}/,
    'hides Cancelar button in mobile footer to make room for Importar/Base'
  );
  assert.match(
    finishingCss,
    /dialog\.simulation-modal \.simulation-modal-import-row \{ display: none; \}/,
    'hides upper import row on mobile to give vertical space to simulator'
  );
  assert.match(
    finishingCss,
    /dialog\.simulation-modal \.simulation-modal-stage > \.simulation-widget > \.simulation-controls \{[\s\S]*flex: 0 0 auto;[\s\S]*min-height: max-content;[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    'mobile simulation controls never collapse to 0px and use compact 2-column layout'
  );
  assert.match(
    finishingCss,
    /dialog\.simulation-modal \.simulation-modal-stage > \.simulation-widget \{[\s\S]*height: 100%;[\s\S]*min-height: 0;[\s\S]*overflow: hidden;/,
    'mobile simulation widget fills stage cleanly without overflowing text outside card'
  );
  assert.match(
    finishingCss,
    /dialog\.simulation-modal \.simulation-modal-current \{ display: none; \}/,
    'hides duplicate experiment title in mobile modal footer to reclaim vertical space'
  );

  // Todos os experimentos renderizam estrutura válida
  for (const [, items] of simulationGroups) {
    for (const [id] of items) {
      const html = simulationMarkup(id);
      assert.match(html, /<svg viewBox="0 0 400 220"/, `valid viewBox for ${id}`);
      assert.match(html, /class="simulation-controls"/, `controls container for ${id}`);
      assert.match(html, /class="simulation-result"/, `result readout for ${id}`);
      assert.doesNotMatch(html, /\bNaN\b|\bundefined\b/, `no NaN/undefined in ${id}`);
    }
  }
});
