import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ONLINE_MODELS,
  ONLINE_MODEL_GROUPS,
  onlineGroupLabel,
  onlineModelUrl,
  onlineModelSizeLabel
} from '../src/online-catalog.js';

test('catálogo da biblioteca online tem grupos e modelos íntegros', () => {
  assert.ok(ONLINE_MODELS.length >= 80, 'a biblioteca deveria trazer ao menos 80 modelos');
  const ids = new Set(ONLINE_MODELS.map(m => m.id));
  assert.equal(ids.size, ONLINE_MODELS.length, 'ids devem ser únicos');
  const files = new Set(ONLINE_MODELS.map(m => m.file));
  assert.equal(files.size, ONLINE_MODELS.length, 'cada modelo aponta para um arquivo distinto');
  const groups = new Set(ONLINE_MODEL_GROUPS.map(g => g.id));
  for (const model of ONLINE_MODELS) {
    assert.ok(groups.has(model.group), `grupo desconhecido em ${model.id}`);
    assert.ok(model.name.trim().length >= 3, `nome curto demais em ${model.id}`);
    assert.ok(/\.glb$/i.test(model.file), `${model.id} deveria apontar para um GLB`);
    assert.ok(Number.isFinite(model.bytes) && model.bytes > 0, `${model.id} sem tamanho válido`);
    assert.ok(model.bytes <= 15 * 1024 * 1024, `${model.id} passa do limite de 15 MB`);
  }
  for (const group of ONLINE_MODEL_GROUPS) {
    assert.ok(ONLINE_MODELS.some(m => m.group === group.id), `grupo vazio: ${group.id}`);
    assert.ok(group.label.trim().length >= 3);
  }
});

test('fontes da biblioteca online são gratuitas e sem cadastro', () => {
  const sources = new Set(ONLINE_MODELS.map(m => m.source));
  assert.deepEqual([...sources].sort(), ['kenney', 'nasa']);
  for (const model of ONLINE_MODELS) {
    if (model.source === 'nasa') assert.ok(model.file.startsWith('3D Models/'), `caminho NASA inesperado em ${model.id}`);
    else assert.ok(model.file.startsWith('3d/'), `caminho Kenney inesperado em ${model.id}`);
  }
});

test('URLs da biblioteca apontam para o GitHub com caminho codificado', () => {
  for (const model of ONLINE_MODELS) {
    const url = onlineModelUrl(model);
    assert.match(url, /^https:\/\/raw\.githubusercontent\.com\//);
    assert.ok(!url.includes(' '), `URL com espaço em ${model.id}`);
    assert.ok(decodeURIComponent(url).endsWith(model.file), `URL não reconstrói o caminho de ${model.id}`);
  }
});

test('rótulos de grupo e tamanho são legíveis', () => {
  assert.equal(onlineGroupLabel('espaco'), 'Espaço e Astronomia');
  assert.equal(onlineGroupLabel('inexistente'), 'Biblioteca');
  assert.equal(onlineModelSizeLabel(512), '1 KB');
  assert.equal(onlineModelSizeLabel(3 * 1024 * 1024), '3,0 MB');
  assert.equal(onlineModelSizeLabel(0), '');
});
