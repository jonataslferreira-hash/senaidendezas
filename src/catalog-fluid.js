// Simulação interativa de dois líquidos miscíveis (Navier-Stokes 2D / Stable Fluids)
// para o fundo do Catálogo de Apresentações: passar o mouse empurra, cria redemoinhos
// e mistura os dois líquidos como passar a mão na água.

const BRAND_PURPLE_RGB = [124, 82, 217]; // #7c52d9 — roxo Storage Lab
const CONTRAST_AQUA_RGB = [20, 184, 212]; // #14b8d4 — par de alto contraste quando o tema do usuário já é roxo
const DEFAULT_USER_RGB = [46, 108, 246]; // #2e6cf6 — fallback azul vibrante

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function rgbToHsl(r, g, b) {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) * 0.5;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = clamp(s, 0, 1);
  const ll = clamp(l, 0, 1);
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return [v, v, v];
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hue2rgb = t => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(hh + 1 / 3) * 255),
    Math.round(hue2rgb(hh) * 255),
    Math.round(hue2rgb(hh - 1 / 3) * 255)
  ];
}

export function hueDistance(a, b) {
  const diff = Math.abs((((a - b) % 360) + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

export function parseCssColorToRgb(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const str = raw.trim();
  if (!str) return null;

  const hex3 = /^#([0-9a-f]{3})$/i.exec(str);
  if (hex3) {
    const s = hex3[1];
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  }
  const hex6 = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(str);
  if (hex6) {
    const s = hex6[1];
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  const rgbMatch = /^rgba?\(\s*([0-9.]+%?)\s*[,\s]\s*([0-9.]+%?)\s*[,\s]\s*([0-9.]+%?)/i.exec(str);
  if (rgbMatch) {
    const parseCh = tok => (tok.endsWith('%') ? (parseFloat(tok) / 100) * 255 : parseFloat(tok));
    return [
      Math.round(clamp(parseCh(rgbMatch[1]), 0, 255)),
      Math.round(clamp(parseCh(rgbMatch[2]), 0, 255)),
      Math.round(clamp(parseCh(rgbMatch[3]), 0, 255))
    ];
  }
  const hslMatch = /^hsla?\(\s*([0-9.-]+)(?:deg)?\s*[,\s]\s*([0-9.]+)%\s*[,\s]\s*([0-9.]+)%/i.exec(str);
  if (hslMatch) {
    return hslToRgb(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]) / 100, parseFloat(hslMatch[3]) / 100);
  }
  return null;
}

function probeColorWithCanvas(cssColor) {
  if (typeof document === 'undefined' || !cssColor) return null;
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const ctx = probe.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#000000';
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    if (data[3] === 0) return null;
    return [data[0], data[1], data[2]];
  } catch {
    return null;
  }
}

function tuneLiquidRgb(rgb, dark) {
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  // Evita líquidos cinzentos/apagados mantendo o matiz escolhido pelo usuário
  const sat = s < 0.14 ? 0.78 : clamp(Math.max(s * 1.18, dark ? 0.72 : 0.70), 0.65, 0.96);
  const hue = s < 0.14 ? 214 : h;
  const lig = dark ? clamp(l, 0.50, 0.64) : clamp(l, 0.48, 0.60);
  return hslToRgb(hue, sat, lig);
}

/**
 * Resolve as cores dos dois líquidos:
 *  - Líquido A: cor do tema do usuário (--ui-accent)
 *  - Líquido B: roxo Storage Lab (#7c52d9), ou um par luminoso de alto contraste
 *    quando o tema do usuário já for roxo/violeta para os 2 líquidos continuarem
 *    claramente separáveis e visíveis na mistura.
 */
export function resolveCatalogLiquidColors(pageEl) {
  const rootEl = typeof document !== 'undefined' ? document.documentElement : null;
  const dark = Boolean(
    rootEl?.dataset?.appearance === 'dark' ||
    pageEl?.closest?.('[data-appearance="dark"]')
  );

  let rawAccent = '';
  let rawSecondaryHue = '';
  if (typeof getComputedStyle === 'function') {
    const csPage = pageEl ? getComputedStyle(pageEl) : null;
    const csRoot = rootEl ? getComputedStyle(rootEl) : null;
    rawAccent = (
      csPage?.getPropertyValue('--ui-accent') ||
      csRoot?.getPropertyValue('--ui-accent') ||
      csPage?.getPropertyValue('--studio-accent') ||
      csRoot?.getPropertyValue('--studio-accent') ||
      ''
    ).trim();
    rawSecondaryHue = (
      csPage?.getPropertyValue('--personal-secondary') ||
      csRoot?.getPropertyValue('--personal-secondary') ||
      ''
    ).trim();
  }

  const parsedUser = parseCssColorToRgb(rawAccent) || probeColorWithCanvas(rawAccent) || DEFAULT_USER_RGB;
  const colorA = tuneLiquidRgb(parsedUser, dark);
  const [hueA] = rgbToHsl(colorA[0], colorA[1], colorA[2]);
  const [hueBrand] = rgbToHsl(BRAND_PURPLE_RGB[0], BRAND_PURPLE_RGB[1], BRAND_PURPLE_RGB[2]);

  let baseB = BRAND_PURPLE_RGB;
  if (hueDistance(hueA, hueBrand) < 38) {
    const secHue = parseFloat(rawSecondaryHue);
    if (Number.isFinite(secHue) && hueDistance(hueA, secHue) >= 48) {
      baseB = hslToRgb(secHue, 0.84, dark ? 0.58 : 0.52);
    } else {
      baseB = CONTRAST_AQUA_RGB;
    }
  }
  const colorB = tuneLiquidRgb(baseB, dark);

  // Calcula cor intermediária perceptualmente viva na zona de mistura dos 2 líquidos
  const [hA, sA, lA] = rgbToHsl(colorA[0], colorA[1], colorA[2]);
  const [hB, sB, lB] = rgbToHsl(colorB[0], colorB[1], colorB[2]);
  let dh = ((hB - hA + 540) % 360) - 180;
  const hMid = (hA + dh * 0.5 + 360) % 360;
  const sMid = clamp(Math.max(sA, sB) * 1.06, 0.74, 0.98);
  const lMid = clamp((lA + lB) * 0.5 + (dark ? 0.04 : 0.02), dark ? 0.52 : 0.48, dark ? 0.68 : 0.62);
  const colorMix = hslToRgb(hMid, sMid, lMid);

  return { dark, colorA, colorB, colorMix };
}

/**
 * Motor físico Navier-Stokes 2D (Stable Fluids + Vorticidade + MacCormack)
 * para dois líquidos miscíveis em uma grade W × H.
 */
export function createFluidSimulation({ cols = 104, rows = 60 } = {}) {
  const W = Math.max(24, Math.round(cols));
  const H = Math.max(18, Math.round(rows));
  const stride = W + 2;
  const size = stride * (H + 2);

  let u = new Float32Array(size);
  let v = new Float32Array(size);
  let u0 = new Float32Array(size);
  let v0 = new Float32Array(size);
  const p = new Float32Array(size);
  const div = new Float32Array(size);
  const curl = new Float32Array(size);

  let dyeA = new Float32Array(size);
  let dyeA0 = new Float32Array(size);
  let dyeB = new Float32Array(size);
  let dyeB0 = new Float32Array(size);
  const tmp1 = new Float32Array(size);
  const tmp2 = new Float32Array(size);
  const ripple = new Float32Array(size);

  let time = 0;

  function idx(i, j) {
    return i + j * stride;
  }

  function setBounds(mode, x) {
    for (let i = 1; i <= W; i++) {
      x[i] = mode === 2 ? -x[i + stride] : x[i + stride];
      x[i + (H + 1) * stride] = mode === 2 ? -x[i + H * stride] : x[i + H * stride];
    }
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      x[row] = mode === 1 ? -x[row + 1] : x[row + 1];
      x[row + W + 1] = mode === 1 ? -x[row + W] : x[row + W];
    }
    x[0] = 0.5 * (x[1] + x[stride]);
    x[W + 1] = 0.5 * (x[W] + x[W + 1 + stride]);
    x[(H + 1) * stride] = 0.5 * (x[H * stride] + x[1 + (H + 1) * stride]);
    x[W + 1 + (H + 1) * stride] = 0.5 * (x[W + (H + 1) * stride] + x[W + 1 + H * stride]);
  }

  function project(velU, velV, iterations = 14) {
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        div[k] = -0.5 * ((velU[k + 1] - velU[k - 1]) + (velV[k + stride] - velV[k - stride]));
        // Warm-start suavizado para convergência mais limpa
        p[k] *= 0.62;
      }
    }
    setBounds(0, div);
    setBounds(0, p);

    for (let it = 0; it < iterations; it++) {
      for (let j = 1; j <= H; j++) {
        const row = j * stride;
        for (let i = 1; i <= W; i++) {
          const k = row + i;
          p[k] = (div[k] + p[k - 1] + p[k + 1] + p[k - stride] + p[k + stride]) * 0.25;
        }
      }
      setBounds(0, p);
    }

    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        velU[k] -= 0.5 * (p[k + 1] - p[k - 1]);
        velV[k] -= 0.5 * (p[k + stride] - p[k - stride]);
      }
    }
    setBounds(1, velU);
    setBounds(2, velV);
  }

  function applyVorticity(velU, velV, dt, strength = 6.2) {
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        curl[k] = 0.5 * ((velV[k + 1] - velV[k - 1]) - (velU[k + stride] - velU[k - stride]));
      }
    }
    setBounds(0, curl);

    for (let j = 2; j < H; j++) {
      const row = j * stride;
      for (let i = 2; i < W; i++) {
        const k = row + i;
        const c = curl[k];
        if (Math.abs(c) < 1e-4) continue;
        const dx = Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]);
        const dy = Math.abs(curl[k + stride]) - Math.abs(curl[k - stride]);
        const len = Math.hypot(dx, dy) + 1e-5;
        const nx = dx / len;
        const ny = dy / len;
        velU[k] += ny * c * strength * dt;
        velV[k] -= nx * c * strength * dt;
      }
    }
    setBounds(1, velU);
    setBounds(2, velV);
  }

  function advectBilinear(mode, dst, src, velU, velV, dt, damping) {
    const maxX = W + 0.5;
    const maxY = H + 0.5;
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        let x = i - dt * velU[k];
        let y = j - dt * velV[k];
        if (x < 0.5) x = 0.5;
        else if (x > maxX) x = maxX;
        if (y < 0.5) y = 0.5;
        else if (y > maxY) y = maxY;

        const i0 = x | 0;
        const i1 = i0 + 1;
        const j0 = y | 0;
        const j1 = j0 + 1;
        const s1 = x - i0;
        const s0 = 1 - s1;
        const t1 = y - j0;
        const t0 = 1 - t1;

        const r0 = j0 * stride;
        const r1 = j1 * stride;
        dst[k] = damping * (
          s0 * (t0 * src[i0 + r0] + t1 * src[i0 + r1]) +
          s1 * (t0 * src[i1 + r0] + t1 * src[i1 + r1])
        );
      }
    }
    setBounds(mode, dst);
  }

  // Advecção MacCormack com clamp local: preserva espirais, filamentos e
  // fronteiras nítidas dos dois líquidos sem virar um borradão cinza.
  function advectMacCormack(dst, src, velU, velV, dt) {
    advectBilinear(0, tmp1, src, velU, velV, dt, 1.0);
    advectBilinear(0, tmp2, tmp1, velU, velV, -dt, 1.0);

    const maxX = W + 0.5;
    const maxY = H + 0.5;
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        let x = i - dt * velU[k];
        let y = j - dt * velV[k];
        if (x < 0.5) x = 0.5;
        else if (x > maxX) x = maxX;
        if (y < 0.5) y = 0.5;
        else if (y > maxY) y = maxY;

        const i0 = x | 0;
        const i1 = i0 + 1;
        const j0 = y | 0;
        const j1 = j0 + 1;
        const r0 = j0 * stride;
        const r1 = j1 * stride;

        const v00 = src[i0 + r0];
        const v10 = src[i1 + r0];
        const v01 = src[i0 + r1];
        const v11 = src[i1 + r1];
        const lo = Math.min(v00, v10, v01, v11);
        const hi = Math.max(v00, v10, v01, v11);

        const corrected = tmp1[k] + 0.5 * (src[k] - tmp2[k]);
        dst[k] = corrected < lo ? lo : corrected > hi ? hi : corrected;
      }
    }
    setBounds(0, dst);
  }

  // Perfil alvo dos dois líquidos bem puros e claramente separáveis:
  // Líquido A (tema do usuário) e Líquido B (roxo Storage Lab) divididos por uma
  // fronteira orgânica em S, com variação natural de espessura/translucidez.
  function targetPools(nx, ny, phase) {
    const wave =
      (nx - 0.5) * 1.55 +
      (ny - 0.5) * 0.58 +
      0.19 * Math.sin(ny * Math.PI * 2.1 + phase) +
      0.11 * Math.cos(nx * Math.PI * 2.2 - phase * 0.7);
    // Transição firme para ambos os líquidos começarem bem puros e reconhecíveis
    const split = 1 / (1 + Math.exp(wave * 11.0));

    // Variação orgânica de profundidade/espessura do líquido na superfície
    const thickness =
      0.86 +
      0.22 * Math.sin(nx * Math.PI * 2.3 + ny * Math.PI * 1.4 + phase * 0.9) +
      0.12 * Math.cos(nx * Math.PI * 3.1 - ny * Math.PI * 2.6);

    // Duas gotas/línguas extras bem definidas nas pontas opostas para os 2 líquidos
    // dialogarem por toda a área visível do catálogo
    const dropA = Math.exp(-(((nx - 0.84) ** 2) / 0.022 + ((ny - 0.16) ** 2) / 0.036));
    const dropB = Math.exp(-(((nx - 0.16) ** 2) / 0.022 + ((ny - 0.84) ** 2) / 0.036));

    const pureA = clamp(split + dropA * 0.92 - dropB * 0.88, 0, 1);
    const pureB = clamp(1 - pureA, 0, 1);

    const a = clamp(pureA * thickness * 1.08, 0.015, 1.2);
    const b = clamp(pureB * thickness * 1.08, 0.015, 1.2);
    return [a, b];
  }

  function applyPointerStroke(x0, y0, x1, y1, { strength = 1, radiusScale = 1, isDown = false } = {}) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist) || dist < 1e-5 || dist > 0.42) return;

    const steps = Math.max(1, Math.min(20, Math.ceil(dist * Math.max(W, H) * 1.45)));
    const baseRadius = Math.max(4.6, W * 0.058) * radiusScale * (isDown ? 1.22 : 1);
    const invTwoSigma2 = 1 / (2 * baseRadius * baseRadius);

    // Empurrão sedoso calibrado: forte o suficiente para abrir caminho e enrolar
    // faixas dos dois líquidos sem criar aliasing de grade
    const speedBoost = clamp(dist * 14, 0.45, 1.85);
    const gain = (isDown ? 190 : 142) * strength;
    const pushU = clamp((dx / steps) * W * gain * speedBoost, -42, 42);
    const pushV = clamp((dy / steps) * H * gain * speedBoost, -42, 42);

    const dirX = dx / dist;
    const dirY = dy / dist;
    const swirlGain = clamp(dist * 24, 0.25, 2.1) * strength * (isDown ? 1.25 : 1);

    const rCells = Math.ceil(baseRadius * 2.5);

    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      const cx = 1 + (x0 + dx * f) * (W - 1);
      const cy = 1 + (y0 + dy * f) * (H - 1);
      const minI = Math.max(1, Math.floor(cx - rCells));
      const maxI = Math.min(W, Math.ceil(cx + rCells));
      const minJ = Math.max(1, Math.floor(cy - rCells));
      const maxJ = Math.min(H, Math.ceil(cy + rCells));

      for (let j = minJ; j <= maxJ; j++) {
        const ry = j - cy;
        const row = j * stride;
        for (let i = minI; i <= maxI; i++) {
          const rx = i - cx;
          const d2 = rx * rx + ry * ry;
          const w = Math.exp(-d2 * invTwoSigma2);
          if (w < 0.01) continue;
          const k = row + i;

          // Empurrão principal da mão na água
          u[k] += pushU * w;
          v[k] += pushV * w;

          // Enrolamento hidrodinâmico nas bordas do rastro (dipolo lateral)
          const side = (rx * (-dirY) + ry * dirX) / baseRadius;
          const wake = Math.exp(-d2 / (1.4 * baseRadius * baseRadius));
          u[k] += (-ry / baseRadius) * side * swirlGain * wake;
          v[k] += (rx / baseRadius) * side * swirlGain * wake;

          // Marola luminosa temporária na superfície tocada
          ripple[k] = Math.min(1.4, ripple[k] + w * (0.22 + speedBoost * 0.16));
        }
      }
    }
  }

  function applyRipple(nx, ny, strength = 1) {
    const cx = 1 + clamp(nx, 0, 1) * (W - 1);
    const cy = 1 + clamp(ny, 0, 1) * (H - 1);
    const rad = Math.max(5.5, W * 0.075);
    const inv2s2 = 1 / (2 * rad * rad);
    const rCells = Math.ceil(rad * 2.5);
    const minI = Math.max(1, Math.floor(cx - rCells));
    const maxI = Math.min(W, Math.ceil(cx + rCells));
    const minJ = Math.max(1, Math.floor(cy - rCells));
    const maxJ = Math.min(H, Math.ceil(cy + rCells));

    for (let j = minJ; j <= maxJ; j++) {
      const ry = j - cy;
      const row = j * stride;
      for (let i = minI; i <= maxI; i++) {
        const rx = i - cx;
        const d2 = rx * rx + ry * ry;
        const d = Math.sqrt(d2) + 1e-4;
        const ring = Math.exp(-d2 * inv2s2);
        if (ring < 0.01) continue;
        const k = row + i;
        const radial = 18 * strength * ring;
        const spin = 10 * strength * ring;
        u[k] += ((rx / d) * radial - (ry / d) * spin);
        v[k] += ((ry / d) * radial + (rx / d) * spin);
        ripple[k] = Math.min(1.8, ripple[k] + ring * 0.9);
      }
    }
  }

  function applyGentleCurrents(dt) {
    // Brisa/maré muito lenta para manter os 2 líquidos respirando vivos mesmo em repouso
    const t = time * 0.34;
    const amp = 0.85 * dt;
    for (let j = 1; j <= H; j++) {
      const ny = (j - 0.5) / H;
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const nx = (i - 0.5) / W;
        const k = row + i;
        const fx = Math.sin(ny * Math.PI * 2.0 + t) * Math.cos(nx * Math.PI * 1.4 - t * 0.7);
        const fy = Math.cos(nx * Math.PI * 2.0 - t * 0.85) * Math.sin(ny * Math.PI * 1.5 + t * 0.5);
        u[k] += fx * amp;
        v[k] += fy * amp;
      }
    }
  }

  function replenishEdges(dt) {
    // Reposição ultra-lenta concentrada nas margens externas para que os dois líquidos
    // nunca se diluam num tom único permanente após minutos mexendo, mas preservando
    // completamente os redemoinhos e misturas no centro por dezenas de segundos.
    const phase = time * 0.08;
    const rippleDecay = Math.exp(-dt * 2.6);
    for (let j = 1; j <= H; j++) {
      const ny = (j - 0.5) / H;
      const edgeY = Math.max(0, Math.abs(ny - 0.5) * 2 - 0.62) / 0.38;
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const nx = (i - 0.5) / W;
        const edgeX = Math.max(0, Math.abs(nx - 0.5) * 2 - 0.62) / 0.38;
        const edge = Math.max(edgeX, edgeY);
        const rate = (0.0022 + edge * edge * 0.055) * dt;
        const k = row + i;
        const [ta, tb] = targetPools(nx, ny, phase);
        dyeA[k] += (ta - dyeA[k]) * rate;
        dyeB[k] += (tb - dyeB[k]) * rate;
        ripple[k] *= rippleDecay;
      }
    }
  }

  function step(rawDt = 1 / 60) {
    const dt = clamp(rawDt, 0.004, 0.034);
    time += dt;

    applyGentleCurrents(dt);
    applyVorticity(u, v, dt, 4.8);
    project(u, v, 14);

    // Advecção da velocidade com inércia realista e sedosa de água
    const velDamping = Math.pow(0.978, dt * 60);
    advectBilinear(1, u0, u, u, v, dt, velDamping);
    advectBilinear(2, v0, v, u, v, dt, velDamping);
    [u, u0] = [u0, u];
    [v, v0] = [v0, v];

    project(u, v, 14);

    // Limita velocidade máxima para manter filamentos lisos e sem serrilhado
    for (let k = 0; k < size; k++) {
      if (u[k] > 52) u[k] = 52;
      else if (u[k] < -52) u[k] = -52;
      if (v[k] > 52) v[k] = 52;
      else if (v[k] < -52) v[k] = -52;
    }

    // Advecção MacCormack dos dois líquidos
    advectMacCormack(dyeA0, dyeA, u, v, dt);
    advectMacCormack(dyeB0, dyeB, u, v, dt);
    [dyeA, dyeA0] = [dyeA0, dyeA];
    [dyeB, dyeB0] = [dyeB0, dyeB];

    replenishEdges(dt);
  }

  function seed() {
    u.fill(0);
    v.fill(0);
    u0.fill(0);
    v0.fill(0);
    p.fill(0);
    div.fill(0);
    curl.fill(0);
    ripple.fill(0);
    time = 0;

    for (let j = 1; j <= H; j++) {
      const ny = (j - 0.5) / H;
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const nx = (i - 0.5) / W;
        const [a, b] = targetPools(nx, ny, 0.25);
        dyeA[row + i] = a;
        dyeB[row + i] = b;
      }
    }
    setBounds(0, dyeA);
    setBounds(0, dyeB);

    // Duas ondulações iniciais bem gentis na fronteira central: mantém os 2 líquidos
    // bem puros e visíveis de cada lado, já com uma curva viva convidando a mexer!
    applyPointerStroke(0.38, 0.34, 0.57, 0.42, { strength: 0.42, radiusScale: 1.25 });
    applyPointerStroke(0.62, 0.66, 0.43, 0.58, { strength: 0.42, radiusScale: 1.25 });
    for (let s = 0; s < 10; s++) step(1 / 60);
    ripple.fill(0);
  }

  function renderToImageData(imageData, palette) {
    const data = imageData.data;
    const { dark, colorA, colorB, colorMix } = palette;
    const aR = colorA[0], aG = colorA[1], aB = colorA[2];
    const bR = colorB[0], bG = colorB[1], bB = colorB[2];
    const mR = colorMix[0], mG = colorMix[1], mB = colorMix[2];

    // Presença forte e nítida dos dois líquidos nos dois modos (claro e escuro)
    const minAlpha = dark ? 0.24 : 0.20;
    const maxAlpha = dark ? 0.72 : 0.60;
    const specBoost = dark ? 36 : 30;
    const shadowDepth = dark ? 18 : 14;

    let ptr = 0;
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        const a = clamp(dyeA[k], 0, 1.35);
        const b = clamp(dyeB[k], 0, 1.35);
        const total = a + b + 1e-4;
        const wa = a / total;
        const wb = b / total;

        // Mistura perceptual concentrada exatamente na interface onde os 2 líquidos se fundem,
        // mantendo os filamentos puros de A e B bem distintos dentro dos redemoinhos!
        const rawMix = clamp(4 * wa * wb, 0, 1);
        const mixFactor = rawMix * Math.sqrt(rawMix);
        const linR = aR * wa + bR * wb;
        const linG = aG * wa + bG * wb;
        const linB = aB * wa + bB * wb;
        const mixWeight = mixFactor * 0.44;
        let r = linR * (1 - mixWeight) + mR * mixWeight;
        let g = linG * (1 - mixWeight) + mG * mixWeight;
        let bl = linB * (1 - mixWeight) + mB * mixWeight;

        // Normal suave da superfície líquida (relevo de ondas + esteira da mão)
        const gx = (dyeA[k + 1] - dyeA[k - 1]) - (dyeB[k + 1] - dyeB[k - 1]) + (u[k + 1] - u[k - 1]) * 0.038;
        const gy = (dyeA[k + stride] - dyeA[k - stride]) - (dyeB[k + stride] - dyeB[k - stride]) + (v[k + stride] - v[k - stride]) * 0.038;
        const sheen = clamp(gx * -0.58 + gy * -0.81, -0.78, 0.78);
        const speed = Math.hypot(u[k], v[k]);
        const waveGlint = clamp(ripple[k] * 0.28 + Math.min(speed * 0.014, 0.26), 0, 0.54);

        if (sheen > 0) {
          const lift = sheen * specBoost;
          r += lift;
          g += lift;
          bl += lift;
        } else {
          const dip = sheen * shadowDepth;
          r += dip;
          g += dip;
          bl += dip;
        }

        // Brilho de marola/luz onde a mão acabou de agitar a água
        if (waveGlint > 0.01) {
          const highlight = waveGlint * (dark ? 48 : 54);
          r += (255 - r) * (highlight / 255);
          g += (255 - g) * (highlight / 255);
          bl += (255 - bl) * (highlight / 255);
        }

        // Contraste sutil nas cristas/fronteiras dos dois líquidos (volume de tinta na água)
        const density = clamp((total - 0.14) / 0.98, 0, 1);
        const ridge = Math.abs(sheen) * 0.12 + mixFactor * 0.06 + waveGlint * 0.12;
        const alpha = clamp(minAlpha + density * (maxAlpha - minAlpha) + ridge, 0, 0.78);

        data[ptr] = r < 0 ? 0 : r > 255 ? 255 : r | 0;
        data[ptr + 1] = g < 0 ? 0 : g > 255 ? 255 : g | 0;
        data[ptr + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl | 0;
        data[ptr + 3] = Math.round(alpha * 255);
        ptr += 4;
      }
    }
  }

  function stats() {
    let sumA = 0;
    let sumB = 0;
    let mixSum = 0;
    let kinetic = 0;
    let curlEnergy = 0;
    let finite = true;
    const count = W * H;

    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        const a = dyeA[k];
        const b = dyeB[k];
        const uk = u[k];
        const vk = v[k];
        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(uk) || !Number.isFinite(vk)) {
          finite = false;
        }
        sumA += a;
        sumB += b;
        const tot = a + b + 1e-4;
        mixSum += (4 * a * b) / (tot * tot);
        kinetic += uk * uk + vk * vk;
        curlEnergy += Math.abs(curl[k]);
      }
    }

    return {
      cols: W,
      rows: H,
      finite,
      meanA: sumA / count,
      meanB: sumB / count,
      mixRatio: mixSum / count,
      kineticEnergy: kinetic / count,
      curlEnergy: curlEnergy / count
    };
  }

  seed();

  return {
    cols: W,
    rows: H,
    step,
    seed,
    applyPointerStroke,
    applyRipple,
    renderToImageData,
    stats,
    // Expostos apenas para inspeção/teste
    getFields: () => ({ u, v, dyeA, dyeB, curl, ripple, stride, W, H })
  };
}

function isReducedMotion() {
  if (typeof document !== 'undefined' && document.documentElement?.dataset?.motion === 'reduced') {
    return true;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const prefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefers && document?.documentElement?.dataset?.motion !== 'normal') return true;
  }
  return false;
}

/**
 * Conecta a simulação de 2 líquidos ao <canvas> do Catálogo de Apresentações.
 * Permite reaproveitar `existingSim` entre re-renders do catálogo para que os
 * líquidos nunca deem saltos ao trocar abas/filtros.
 */
export function mountCatalogFluid({ page, canvas, existingSim = null }) {
  if (!page || !canvas || typeof canvas.getContext !== 'function') {
    return { sim: existingSim, destroy: () => {} };
  }

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return { sim: existingSim, destroy: () => {} };

  const rect0 = canvas.getBoundingClientRect?.() || { width: 1200, height: 720 };
  const w0 = Math.max(320, rect0.width || window.innerWidth || 1200);
  const h0 = Math.max(240, rect0.height || window.innerHeight || 720);
  const aspect = clamp(h0 / w0, 0.42, 1.45);
  const targetCols = w0 < 680 ? 78 : 108;
  const targetRows = clamp(Math.round(targetCols * aspect), 44, 84);

  const sim = existingSim || createFluidSimulation({ cols: targetCols, rows: targetRows });

  const offscreen = document.createElement('canvas');
  offscreen.width = sim.cols;
  offscreen.height = sim.rows;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return { sim, destroy: () => {} };
  const imageData = offCtx.createImageData(sim.cols, sim.rows);

  let palette = resolveCatalogLiquidColors(page);
  let rafId = 0;
  let lastTs = 0;
  let destroyed = false;

  const pointers = new Map();

  function syncCanvasSize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const maxW = 960;
    const scale = Math.min(1, maxW / (r.width * dpr));
    const pw = Math.max(200, Math.round(r.width * dpr * scale));
    const ph = Math.max(140, Math.round(r.height * dpr * scale));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
  }

  function refreshPalette() {
    palette = resolveCatalogLiquidColors(page);
  }

  function drawFrame() {
    sim.renderToImageData(imageData, palette);
    offCtx.putImageData(imageData, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }

  function toNormalized(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) {
      return null;
    }
    return {
      x: clamp((clientX - r.left) / r.width, 0, 1),
      y: clamp((clientY - r.top) / r.height, 0, 1)
    };
  }

  function onPointerMove(event) {
    if (destroyed || isReducedMotion()) return;
    const pos = toNormalized(event.clientX, event.clientY);
    const id = event.pointerId ?? 0;
    if (!pos) {
      pointers.delete(id);
      return;
    }
    const prev = pointers.get(id);
    pointers.set(id, pos);
    if (!prev) return;

    const isTouch = event.pointerType === 'touch';
    const isDown = Boolean(event.buttons & 1) || isTouch;
    sim.applyPointerStroke(prev.x, prev.y, pos.x, pos.y, {
      strength: isTouch ? 1.15 : 1.0,
      radiusScale: isTouch ? 1.18 : 1.0,
      isDown
    });
  }

  function onPointerDown(event) {
    if (destroyed || isReducedMotion()) return;
    const pos = toNormalized(event.clientX, event.clientY);
    if (!pos) return;
    pointers.set(event.pointerId ?? 0, pos);
    sim.applyRipple(pos.x, pos.y, event.pointerType === 'touch' ? 0.9 : 0.78);
  }

  function onPointerClear(event) {
    pointers.delete(event.pointerId ?? 0);
  }

  function onWindowBlur() {
    pointers.clear();
  }

  function tick(ts) {
    if (destroyed) return;
    if (document.hidden) {
      rafId = 0;
      return;
    }
    const dt = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
    lastTs = ts;
    sim.step(dt);
    drawFrame();
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (destroyed || rafId || isReducedMotion() || document.hidden) return;
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
  }

  function onVisibility() {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    } else {
      refreshPalette();
      syncCanvasSize();
      drawFrame();
      startLoop();
    }
  }

  syncCanvasSize();
  refreshPalette();
  drawFrame();

  let resizeObserver = null;
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
      if (isReducedMotion()) drawFrame();
    });
    resizeObserver.observe(canvas);
  }

  let themeObserver = null;
  if (typeof MutationObserver === 'function' && document.documentElement) {
    themeObserver = new MutationObserver(() => {
      refreshPalette();
      if (isReducedMotion()) drawFrame();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-appearance', 'data-ui-style', 'data-motion', 'style']
    });
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerClear, { passive: true });
  window.addEventListener('pointercancel', onPointerClear, { passive: true });
  window.addEventListener('blur', onWindowBlur, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  if (!isReducedMotion()) {
    startLoop();
  }

  return {
    sim,
    destroy() {
      destroyed = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerClear);
      window.removeEventListener('pointercancel', onPointerClear);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      pointers.clear();
    }
  };
}
