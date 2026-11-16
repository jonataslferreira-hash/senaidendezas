import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createFluidSimulation,
  parseCssColorToRgb,
  resolveCatalogLiquidColors,
  hueDistance,
  rgbToHsl
} from '../src/catalog-fluid.js';

test('catalog fluid initializes with exact 50/50 immiscible phase split', () => {
  const sim = createFluidSimulation({ cols: 96, rows: 56 });
  const initial = sim.stats();

  assert.equal(initial.finite, true);
  assert.ok(
    Math.abs(initial.shareA - 0.5) < 0.015 && Math.abs(initial.shareB - 0.5) < 0.015,
    `expected equal 50/50 liquid shares, got A=${initial.shareA.toFixed(4)} B=${initial.shareB.toFixed(4)}`
  );
  assert.ok(
    initial.interfaceRatio < 0.12,
    `expected crisp immiscible boundary (interfaceRatio < 0.12), got ${initial.interfaceRatio.toFixed(4)}`
  );
});

test('pointer strokes deform bubbles and waves while keeping liquids immiscible and 50/50', () => {
  const sim = createFluidSimulation({ cols: 96, rows: 56 });
  const beforePhi = new Float32Array(sim.getFields().phi);

  for (let i = 0; i < 16; i++) {
    const t0 = i / 16;
    const t1 = (i + 1) / 16;
    sim.applyPointerStroke(0.18 + t0 * 0.64, 0.34 + Math.sin(t0 * Math.PI) * 0.2, 0.18 + t1 * 0.64, 0.34 + Math.sin(t1 * Math.PI) * 0.2, {
      strength: 1.25
    });
    sim.step(1 / 60);
  }
  const active = sim.stats();
  assert.ok(active.kineticEnergy > 1, `expected pointer stroke to impart flow energy, got ${active.kineticEnergy}`);
  assert.ok(active.curlEnergy > 0.05, `expected vorticity after pointer drag, got ${active.curlEnergy}`);

  for (let f = 0; f < 45; f++) sim.step(1 / 60);
  const after = sim.stats();
  assert.equal(after.finite, true);

  // Os dois líquidos continuam estritamente 50/50 mesmo depois de agitados
  assert.ok(
    Math.abs(after.shareA - 0.5) < 0.025 && Math.abs(after.shareB - 0.5) < 0.025,
    `expected conserved 50/50 split after stirring, got A=${after.shareA.toFixed(4)} B=${after.shareB.toFixed(4)}`
  );
  // Fronteira continua nítida (não se dilui em uma terceira cor)
  assert.ok(
    after.interfaceRatio < 0.14,
    `expected immiscible liquids not to blend together, got interfaceRatio=${after.interfaceRatio.toFixed(4)}`
  );

  // Confirmar que a forma realmente se moveu/deformou com o mouse
  const afterPhi = sim.getFields().phi;
  let movedCells = 0;
  for (let k = 0; k < beforePhi.length; k++) {
    if (Math.abs(afterPhi[k] - beforePhi[k]) > 0.5) movedCells++;
  }
  assert.ok(movedCells > 80, `expected pointer drag to displace phase interface, movedCells=${movedCells}`);

  // Renderização não produz NaN e mantém transparência controlada
  const img = { data: new Uint8ClampedArray(sim.cols * sim.rows * 4) };
  sim.renderToImageData(img, { dark: false, colorA: [36, 184, 124], colorB: [124, 82, 217] });
  let maxAlpha = 0;
  let nonZero = 0;
  for (let i = 3; i < img.data.length; i += 4) {
    if (img.data[i] > 0) nonZero++;
    if (img.data[i] > maxAlpha) maxAlpha = img.data[i];
  }
  assert.ok(nonZero > sim.cols * sim.rows * 0.9, 'expected liquid canvas pixels populated');
  assert.ok(maxAlpha <= 220, `expected soft translucent background overlay, got maxAlpha=${maxAlpha}`);
});

test('catalog fluid stays numerically stable under strong repeated ripples and drags', () => {
  const sim = createFluidSimulation({ cols: 64, rows: 40 });
  for (let n = 0; n < 30; n++) {
    const a = (n * 0.17) % 1;
    const b = ((n + 3) * 0.23) % 1;
    sim.applyRipple(a, b, 1.4);
    sim.applyPointerStroke(a, b, Math.min(0.95, a + 0.18), Math.max(0.05, b - 0.15), {
      strength: 1.6,
      isDown: true
    });
    sim.step(1 / 30);
  }
  const s = sim.stats();
  assert.equal(s.finite, true);
  assert.ok(Math.abs(s.shareA - 0.5) < 0.03, `expected stability and 50/50 mass balance, got shareA=${s.shareA}`);
});

test('resolveCatalogLiquidColors pairs user accent with Storage Lab purple and auto-contrasts purple themes', () => {
  assert.deepEqual(parseCssColorToRgb('#2e6cf6'), [46, 108, 246]);
  assert.deepEqual(parseCssColorToRgb('#f0a'), [255, 0, 170]);
  assert.deepEqual(parseCssColorToRgb('rgb(124, 82, 217)'), [124, 82, 217]);

  const origGetCS = globalThis.getComputedStyle;
  try {
    globalThis.getComputedStyle = () => ({
      getPropertyValue(prop) {
        if (prop === '--ui-accent') return '#16a34a';
        return '';
      }
    });
    const greenPalette = resolveCatalogLiquidColors({});
    const [hA] = rgbToHsl(...greenPalette.colorA);
    const [hB] = rgbToHsl(...greenPalette.colorB);
    assert.ok(hueDistance(hA, hB) > 60, `expected strong contrast between green and purple, got ${hueDistance(hA, hB)}`);

    globalThis.getComputedStyle = () => ({
      getPropertyValue(prop) {
        if (prop === '--ui-accent') return '#7c52d9';
        return '';
      }
    });
    const purplePalette = resolveCatalogLiquidColors({});
    const [phA] = rgbToHsl(...purplePalette.colorA);
    const [phB] = rgbToHsl(...purplePalette.colorB);
    assert.ok(
      hueDistance(phA, phB) > 45,
      `expected automatic contrast liquid when user theme is purple, got hueDistance=${hueDistance(phA, phB)}`
    );
  } finally {
    globalThis.getComputedStyle = origGetCS;
  }
});

test('template-store mounts interactive fluid canvas and preserves frosted glass dark mode styling', () => {
  const storeJs = fs.readFileSync('src/template-store.js', 'utf8');
  const storeCss = fs.readFileSync('src/template-store.css', 'utf8');

  assert.match(storeJs, /mountCatalogFluid/, 'template-store must mount interactive catalog fluid');
  assert.match(storeJs, /data-tstore-fluid/, 'template-store must render the fluid canvas element');
  assert.match(storeCss, /\.tstore-fluid-canvas/, 'template-store.css must style the fluid canvas');
  assert.match(storeCss, /backdrop-filter:\s*blur/, 'template-store.css must keep frosted-glass cards above liquid');
});
