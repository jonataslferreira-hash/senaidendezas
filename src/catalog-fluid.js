// Simulação interativa de dois líquidos IMISCÍVEIS (não-juntáveis, como água e óleo /
// lâmpada líquida) com Navier-Stokes 2D + separação de fase conservativa (50% / 50%).
// Passar o mouse empurra, deforma e separa gotas/bolhas sem jamais misturar as duas cores.

const BRAND_PURPLE_RGB = [124, 82, 217]; // #7c52d9 — roxo Storage Lab
const CONTRAST_AQUA_RGB = [20, 184, 212]; // #14b8d4 — par de alto contraste se o tema do usuário já for roxo
const DEFAULT_USER_RGB = [46, 108, 246]; // #2e6cf6 — fallback azul vibrante

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
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
  const sat = s < 0.14 ? 0.78 : clamp(Math.max(s * 1.18, dark ? 0.74 : 0.72), 0.68, 0.96);
  const hue = s < 0.14 ? 214 : h;
  const lig = dark ? clamp(l, 0.50, 0.64) : clamp(l, 0.48, 0.59);
  return hslToRgb(hue, sat, lig);
}

/**
 * Resolve as cores puras dos dois líquidos imiscíveis:
 *  - Líquido A: cor do tema do usuário (--ui-accent)
 *  - Líquido B: roxo Storage Lab (#7c52d9), ou um par luminoso de alto contraste
 *    se o tema do usuário já for roxo/violeta.
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

  return { dark, colorA, colorB };
}

/**
 * Motor físico de dois líquidos IMISCÍVEIS (campo de fase phi ∈ [-1, +1])
 * com Navier-Stokes 2D incompressível, tensão superficial e conservação exata 50% / 50%.
 */
export function createFluidSimulation({ cols = 108, rows = 62 } = {}) {
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

  // phi = +1 -> 100% Líquido A (tema do usuário)
  // phi = -1 -> 100% Líquido B (roxo Storage Lab)
  let phi = new Float32Array(size);
  let phi0 = new Float32Array(size);
  const tmp1 = new Float32Array(size);
  const tmp2 = new Float32Array(size);
  const lap = new Float32Array(size);
  const ripple = new Float32Array(size);

  let time = 0;

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

  function applyVorticity(velU, velV, dt, strength = 3.2) {
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
        velU[k] += (dy / len) * c * strength * dt;
        velV[k] -= (dx / len) * c * strength * dt;
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
        dst[k] = clamp(corrected < lo ? lo : corrected > hi ? hi : corrected, -1, 1);
      }
    }
    setBounds(0, dst);
  }

  // Separação de fase conservativa (Allen-Cahn isotrópico 9-pontos + tensão superficial):
  // 1) Mantém os dois líquidos estritamente imiscíveis (fronteira fina, lisa e sem serrilhado);
  // 2) Tensão superficial arredonda gotas/bolhas como água e óleo / lâmpada líquida;
  // 3) Conservação global exata mantém 50% Líquido A e 50% Líquido B em todos os frames!
  function enforceImmisciblePhase(dt) {
    // 1. Laplaciano isotrópico de 9 pontos (elimina serrilhado diagonal e cria gotas perfeitamente redondas)
    const tension = 34.0 * dt;
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      const rUp = row - stride;
      const rDn = row + stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        const ortho = phi[k - 1] + phi[k + 1] + phi[rUp + i] + phi[rDn + i];
        const diag = phi[rUp + i - 1] + phi[rUp + i + 1] + phi[rDn + i - 1] + phi[rDn + i + 1];
        const l = (4 * ortho + diag) * 0.05 - phi[k];
        lap[k] = l;
        // Força capilar puxa filamentos finos para formar gotas/bolhas arredondadas
        const gx = 0.5 * (phi[k + 1] - phi[k - 1]);
        const gy = 0.5 * (phi[rDn + i] - phi[rUp + i]);
        u[k] += l * gx * tension;
        v[k] += l * gy * tension;
      }
    }

    // 2. Re-agrupamento de fase (impede difusão/mistura das cores, suavizando a curvatura)
    const mobility = 11.5 * dt;
    const eps2 = 2.35;
    let sumPhi = 0;
    let interfaceWeight = 0;

    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        const c = phi[k];
        const next = clamp(c + mobility * (c * (1 - c * c) + eps2 * lap[k]), -1, 1);
        phi0[k] = next;
        sumPhi += next;
        interfaceWeight += Math.max(0.015, 1 - next * next);
      }
    }

    // 3. Correção exata de conservação de massa -> garante 50.0% A e 50.0% B sempre!
    const correction = interfaceWeight > 1e-4 ? sumPhi / interfaceWeight : 0;
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        const c = phi0[k];
        const w = Math.max(0.015, 1 - c * c);
        phi[k] = clamp(c - correction * w, -1, 1);
      }
    }
    setBounds(0, phi);
  }

  // Perfil inicial perfeitamente antissimétrico (50% exato de cada líquido):
  // duas grandes massas orgânicas em S + bolhas livres simétricas (estilo lâmpada líquida).
  function initialPhaseField(nx, ny) {
    // Onda central perfeitamente antissimétrica em torno de (0.5, 0.5)
    const dx = nx - 0.5;
    const dy = ny - 0.5;
    const wave = -dx * 1.65 - dy * 0.42 + 0.14 * Math.sin(dy * Math.PI * 2.2);
    let val = Math.tanh(wave * 11.0);

    // Par simétrico de bolhas livres (uma gota de A no lado B, uma gota idêntica de B no lado A)
    const aspect = W / H;
    const blob = (cx, cy, r) => {
      const d = Math.hypot((nx - cx) * aspect, ny - cy);
      return smoothstep(r + 0.04, r - 0.04, d);
    };

    // Bolhas maiores + bolhinhas irmãs perfeitamente espelhadas (soma total = 0!)
    const bA1 = blob(0.76, 0.26, 0.135);
    const bB1 = blob(0.24, 0.74, 0.135);
    const bA2 = blob(0.84, 0.68, 0.085);
    const bB2 = blob(0.16, 0.32, 0.085);

    val = clamp(val + (bA1 + bA2) * 2.0 - (bB1 + bB2) * 2.0, -1, 1);
    return val;
  }

  function applyPointerStroke(x0, y0, x1, y1, { strength = 1, radiusScale = 1, isDown = false } = {}) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist) || dist < 1e-5 || dist > 0.42) return;

    const steps = Math.max(1, Math.min(20, Math.ceil(dist * Math.max(W, H) * 1.45)));
    const baseRadius = Math.max(4.6, W * 0.058) * radiusScale * (isDown ? 1.24 : 1);
    const invTwoSigma2 = 1 / (2 * baseRadius * baseRadius);

    const speedBoost = clamp(dist * 14, 0.48, 1.9);
    const gain = (isDown ? 195 : 150) * strength;
    const pushU = clamp((dx / steps) * W * gain * speedBoost, -44, 44);
    const pushV = clamp((dy / steps) * H * gain * speedBoost, -44, 44);

    const dirX = dx / dist;
    const dirY = dy / dist;
    const swirlGain = clamp(dist * 22, 0.22, 1.9) * strength * (isDown ? 1.2 : 1);
    const rCells = Math.ceil(baseRadius * 2.4);

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

          u[k] += pushU * w;
          v[k] += pushV * w;

          const side = (rx * (-dirY) + ry * dirX) / baseRadius;
          const wake = Math.exp(-d2 / (1.4 * baseRadius * baseRadius));
          u[k] += (-ry / baseRadius) * side * swirlGain * wake;
          v[k] += (rx / baseRadius) * side * swirlGain * wake;

          ripple[k] = Math.min(1.4, ripple[k] + w * (0.24 + speedBoost * 0.16));
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
        const spin = 9 * strength * ring;
        u[k] += ((rx / d) * radial - (ry / d) * spin);
        v[k] += ((ry / d) * radial + (rx / d) * spin);
        ripple[k] = Math.min(1.8, ripple[k] + ring * 0.85);
      }
    }
  }

  function applyGentleCurrents(dt) {
    // Corrente de convecção muito suave (efeito lâmpada líquida viva mesmo sem mexer)
    const t = time * 0.36;
    const amp = 1.05 * dt;
    const rippleDecay = Math.exp(-dt * 2.8);
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
        ripple[k] *= rippleDecay;
      }
    }
  }

  function step(rawDt = 1 / 60) {
    const dt = clamp(rawDt, 0.004, 0.034);
    time += dt;

    applyGentleCurrents(dt);
    applyVorticity(u, v, dt, 3.2);
    project(u, v, 14);

    const velDamping = Math.pow(0.976, dt * 60);
    advectBilinear(1, u0, u, u, v, dt, velDamping);
    advectBilinear(2, v0, v, u, v, dt, velDamping);
    [u, u0] = [u0, u];
    [v, v0] = [v0, v];

    project(u, v, 14);

    for (let k = 0; k < size; k++) {
      if (u[k] > 50) u[k] = 50;
      else if (u[k] < -50) u[k] = -50;
      if (v[k] > 50) v[k] = 50;
      else if (v[k] < -50) v[k] = -50;
    }

    // Advecção MacCormack do campo de fase seguida de separação imiscível + conservação 50/50
    advectMacCormack(phi0, phi, u, v, dt);
    [phi, phi0] = [phi0, phi];

    enforceImmisciblePhase(dt);
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
        phi[row + i] = initialPhaseField(nx, ny);
      }
    }
    setBounds(0, phi);

    // Pequeno relaxamento inicial para suavizar os meniscos preservando exatamente 50% / 50%
    for (let s = 0; s < 6; s++) enforceImmisciblePhase(1 / 60);
    u.fill(0);
    v.fill(0);
    ripple.fill(0);
  }

  function renderToImageData(imageData, palette) {
    const data = imageData.data;
    const { dark, colorA, colorB } = palette;
    const aR = colorA[0], aG = colorA[1], aB = colorA[2];
    const bR = colorB[0], bG = colorB[1], bB = colorB[2];

    // Pré-suaviza uma cópia rasa da fase (tmp1) para normais 3D macias sem alterar phi
    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      const rUp = row - stride;
      const rDn = row + stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        tmp1[k] = (
          phi[k] * 4 +
          phi[k - 1] + phi[k + 1] + phi[rUp + i] + phi[rDn + i]
        ) * 0.125;
      }
    }
    setBounds(0, tmp1);

    const bodyAlpha = dark ? 0.56 : 0.48;
    const edgeAlphaBoost = dark ? 0.18 : 0.16;
    const rimSpec = dark ? 112 : 96;
    const rimShadow = dark ? 34 : 24;

    let ptr = 0;
    for (let j = 1; j <= H; j++) {
      const ny = (j - 0.5) / H;
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const nx = (i - 0.5) / W;
        const k = row + i;
        const c = phi[k];
        const cs = tmp1[k];

        // Fronteira anti-aliased limpa: cor A pura de um lado e cor B pura do outro (zero mistura)
        const isA = smoothstep(-0.22, 0.22, c);
        let r = bR + (aR - bR) * isA;
        let g = bG + (aG - bG) * isA;
        let bl = bB + (aB - bB) * isA;

        // Volume líquido suave interno (efeito profundidade de lâmpada de óleo/água)
        const glowWave = 0.5 + 0.5 * Math.sin(nx * 3.1 - ny * 2.4 + time * 0.35);
        const volLight = (glowWave - 0.45) * 0.16;
        if (volLight > 0) {
          r += (255 - r) * volLight;
          g += (255 - g) * volLight;
          bl += (255 - bl) * volLight;
        } else {
          const d = 1 + volLight * 0.7;
          r *= d; g *= d; bl *= d;
        }

        // Menisco 3D (tensão superficial): normal suave nas bordas arredondadas das gotas
        const gx = 0.5 * (tmp1[k + 1] - tmp1[k - 1]);
        const gy = 0.5 * (tmp1[k + stride] - tmp1[k - stride]);
        const gradMag = Math.hypot(gx, gy);
        const meniscus = Math.exp(-(cs * cs) / 0.20) * clamp(gradMag * 1.9, 0, 1);

        // Iluminação de topo-esquerdo nas gotas + leve sombra no verso do menisco
        const invG = gradMag > 1e-4 ? 1 / gradMag : 0;
        const ndotl = (gx * -0.58 + gy * -0.81) * invG;
        const rimLight = ndotl * meniscus;

        // Especular vítreo brilhante na crista iluminada da gota
        const spec = Math.pow(Math.max(0, ndotl), 2.2) * meniscus;
        if (rimLight > 0) {
          const boost = (rimLight * rimSpec + spec * 70) / 255;
          r += (255 - r) * clamp(boost, 0, 0.52);
          g += (255 - g) * clamp(boost, 0, 0.52);
          bl += (255 - bl) * clamp(boost, 0, 0.52);
        } else {
          const darken = 1 + rimLight * (rimShadow / 100);
          r *= darken;
          g *= darken;
          bl *= darken;
        }

        // Reflexo suave de marola onde o ponteiro passou recentemente
        const speed = Math.hypot(u[k], v[k]);
        const waveGlint = clamp(ripple[k] * 0.24 + Math.min(speed * 0.011, 0.18), 0, 0.42);
        if (waveGlint > 0.01) {
          const glint = waveGlint * (dark ? 0.18 : 0.22);
          r += (255 - r) * glint;
          g += (255 - g) * glint;
          bl += (255 - bl) * glint;
        }

        const alpha = clamp(bodyAlpha + glowWave * 0.05 + meniscus * edgeAlphaBoost + waveGlint * 0.08, 0.30, 0.82);

        data[ptr] = r < 0 ? 0 : r > 255 ? 255 : r | 0;
        data[ptr + 1] = g < 0 ? 0 : g > 255 ? 255 : g | 0;
        data[ptr + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl | 0;
        data[ptr + 3] = Math.round(alpha * 255);
        ptr += 4;
      }
    }
  }

  function stats() {
    let countA = 0;
    let countB = 0;
    let interfaceCells = 0;
    let phiSum = 0;
    let kinetic = 0;
    let curlEnergy = 0;
    let finite = true;
    const total = W * H;

    for (let j = 1; j <= H; j++) {
      const row = j * stride;
      for (let i = 1; i <= W; i++) {
        const k = row + i;
        const c = phi[k];
        const uk = u[k];
        const vk = v[k];
        if (!Number.isFinite(c) || !Number.isFinite(uk) || !Number.isFinite(vk)) {
          finite = false;
        }
        phiSum += c;
        if (c > 0) countA++;
        else countB++;
        // Células realmente intermediárias (misturadas) — em líquidos imiscíveis deve ser mínimo!
        if (Math.abs(c) < 0.35) interfaceCells++;
        kinetic += uk * uk + vk * vk;
        curlEnergy += Math.abs(curl[k]);
      }
    }

    return {
      cols: W,
      rows: H,
      finite,
      shareA: countA / total,
      shareB: countB / total,
      meanPhi: phiSum / total,
      interfaceRatio: interfaceCells / total,
      kineticEnergy: kinetic / total,
      curlEnergy: curlEnergy / total
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
    getFields: () => ({ u, v, phi, curl, ripple, stride, W, H })
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
 * Conecta a simulação de 2 líquidos imiscíveis ao <canvas> do Catálogo.
 * Mantém `existingSim` vivo entre re-renders para os líquidos nunca saltarem ao filtrar.
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
  const targetCols = w0 < 680 ? 88 : 128;
  const targetRows = clamp(Math.round(targetCols * aspect), 52, 92);

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
