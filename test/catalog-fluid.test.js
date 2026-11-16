import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createFluidSimulation,
  hueDistance,
  parseCssColorToRgb,
  resolveCatalogLiquidColors,
  rgbToHsl
} from '../src/catalog-fluid.js';

test('Simulação de 2 líquidos inicia com ambos os líquidos visíveis e espacialmente separados', () => {
  const sim = createFluidSimulation({ cols: 64, rows: 40 });
  const st = sim.stats();
  assert.equal(st.finite, true);
  assert.ok(st.meanA > 0.35, `Líquido A deve ser bem presente (meanA=${st.meanA})`);
  assert.ok(st.meanB > 0.35, `Líquido B deve ser bem presente (meanB=${st.meanB})`);

  const { dyeA, dyeB, stride, W, H } = sim.getFields();
  let leftA = 0, rightA = 0, leftB = 0, rightB = 0;
  for (let j = 1; j <= H; j++) {
    for (let i = 1; i <= W; i++) {
      const k = i + j * stride;
      if (i <= W / 2) { leftA += dyeA[k]; leftB += dyeB[k]; }
      else { rightA += dyeA[k]; rightB += dyeB[k]; }
    }
  }
  assert.ok(leftA > rightA, 'Líquido A predomina de um lado no início');
  assert.ok(rightB > leftB, 'Líquido B predomina do lado oposto no início');
});

test('Passar o ponteiro empurra o líquido, gera vorticidade e mistura os dois líquidos como mão na água', () => {
  const sim = createFluidSimulation({ cols: 64, rows: 40 });
  // Deixa acalmar ligeiramente após o seed para medir claramente o impacto do mouse
  for (let i = 0; i < 20; i++) sim.step(1 / 60);
  const before = sim.stats();

  // Simula arrastar o mouse em curva cruzando a fronteira entre os dois líquidos
  const path = [
    [0.18, 0.35], [0.35, 0.32], [0.55, 0.42], [0.76, 0.52],
    [0.64, 0.72], [0.42, 0.62], [0.25, 0.55]
  ];
  for (let p = 1; p < path.length; p++) {
    const [x0, y0] = path[p - 1];
    const [x1, y1] = path[p];
    for (let s = 1; s <= 6; s++) {
      sim.applyPointerStroke(
        x0 + (x1 - x0) * ((s - 1) / 6),
        y0 + (y1 - y0) * ((s - 1) / 6),
        x0 + (x1 - x0) * (s / 6),
        y0 + (y1 - y0) * (s / 6)
      );
      sim.step(1 / 60);
    }
  }
  const after = sim.stats();

  assert.equal(after.finite, true);
  assert.ok(after.kineticEnergy > before.kineticEnergy, 'gesto do ponteiro transfere momento ao fluido');
  assert.ok(after.curlEnergy > 0.1, 'incompressibilidade + vorticidade geram redemoinhos reais');
  assert.ok(after.mixRatio > before.mixRatio, `mistura entre os dois líquidos aumenta (${before.mixRatio.toFixed(3)} -> ${after.mixRatio.toFixed(3)})`);

  // Renderização para ImageData gera pixels visíveis e coloridos (sem transparência apagada)
  const img = { data: new Uint8ClampedArray(sim.cols * sim.rows * 4) };
  sim.renderToImageData(img, {
    dark: false,
    colorA: [34, 184, 146],
    colorB: [124, 82, 217],
    colorMix: [48, 152, 224]
  });
  let sumAlpha = 0;
  for (let i = 3; i < img.data.length; i += 4) sumAlpha += img.data[i];
  const meanAlpha = sumAlpha / (sim.cols * sim.rows);
  assert.ok(meanAlpha >= 100, `líquidos devem renderizar claramente visíveis (meanAlpha=${meanAlpha.toFixed(1)})`);
});

test('Clique/onda radial e simulação prolongada permanecem numericamente estáveis', () => {
  const sim = createFluidSimulation({ cols: 56, rows: 36 });
  sim.applyRipple(0.5, 0.5, 1.4);
  for (let i = 0; i < 120; i++) {
    if (i % 15 === 0) sim.applyPointerStroke(0.1, 0.2, 0.4, 0.45, { isDown: true });
    sim.step(1 / 60);
  }
  const st = sim.stats();
  assert.equal(st.finite, true);
  assert.ok(st.meanA > 0.2 && st.meanB > 0.2, 'ambos os líquidos continuam vivos após uso contínuo');
});

test('Cores dos 2 líquidos garantem contraste mesmo quando o tema do usuário já é roxo', () => {
  assert.deepEqual(parseCssColorToRgb('#7c52d9'), [124, 82, 217]);
  assert.deepEqual(parseCssColorToRgb('rgb(46, 108, 246)'), [46, 108, 246]);
  const parsedHsl = parseCssColorToRgb('hsl(152 60% 45%)');
  assert.ok(Array.isArray(parsedHsl) && parsedHsl[1] > parsedHsl[0] && parsedHsl[1] > parsedHsl[2]);

  const prevDoc = globalThis.document;
  const prevGcs = globalThis.getComputedStyle;
  try {
    globalThis.document = { documentElement: { dataset: { appearance: 'light' } } };

    // Tema verde -> Líquido A verde, Líquido B roxo Storage Lab
    globalThis.getComputedStyle = () => ({
      getPropertyValue: prop => (prop === '--ui-accent' ? '#24a873' : '')
    });
    const greenTheme = resolveCatalogLiquidColors({});
    const [hGreenA] = rgbToHsl(...greenTheme.colorA);
    const [hGreenB] = rgbToHsl(...greenTheme.colorB);
    assert.ok(hueDistance(hGreenA, 156) < 25, 'Líquido A acompanha tema verde do usuário');
    assert.ok(hueDistance(hGreenB, 260) < 25, 'Líquido B mantém roxo Storage Lab');

    // Tema roxo (parecido com marca) -> Líquido B muda automaticamente para contraste nítido
    globalThis.getComputedStyle = () => ({
      getPropertyValue: prop => (prop === '--ui-accent' ? '#7c52d9' : '')
    });
    const purpleTheme = resolveCatalogLiquidColors({});
    const [hPurpA] = rgbToHsl(...purpleTheme.colorA);
    const [hPurpB] = rgbToHsl(...purpleTheme.colorB);
    assert.ok(
      hueDistance(hPurpA, hPurpB) >= 38,
      `Quando o usuário já usa roxo, os 2 líquidos devem continuar distintos (Δh=${hueDistance(hPurpA, hPurpB).toFixed(1)})`
    );
  } finally {
    globalThis.document = prevDoc;
    globalThis.getComputedStyle = prevGcs;
  }
});

test('Catálogo renderiza canvas fluido interativo e CSS sticky compatível com modo claro e escuro', () => {
  const js = readFileSync(new URL('../src/template-store.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/template-store.css', import.meta.url), 'utf8');
  assert.match(js, /mountCatalogFluid/);
  assert.match(js, /class="tstore-fluid-canvas"\s+data-tstore-fluid/);
  assert.match(css, /\.tstore-ambient\s*\{[\s\S]*?position:\s*sticky;/);
  assert.match(css, /\.tstore-fluid-canvas\s*\{/);
  assert.match(css, /html\[data-appearance="dark"\]\s+\.tstore-fluid-canvas/);
});
