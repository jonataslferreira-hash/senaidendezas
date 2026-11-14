// Terceira leva: experimentos de bancada, como os feitos em um laboratório escolar.
// "mixing" usa controles novos: valores guardados (hidden) e botões/peças clicáveis
// na cena (data-lab-act), tratados por sim.act().
import { num, short, clamp, label, seeded, wave } from './sim-lab.js';

const f = value => Number(value).toFixed(1);
const lerp = (a, b, k) => a + (b - a) * k;
const rgb = color => `rgb(${color.map(Math.round).join(',')})`;

// ------------------------------------------------------------------ Misturas
export const mixLiquids = {
  water: ['Água', [125, 211, 252]],
  vinegar: ['Vinagre', [253, 230, 138]],
  bicarb: ['Bicarbonato', [226, 232, 240]],
  cabbage: ['Repolho roxo', [124, 58, 237]],
  oil: ['Óleo', [250, 204, 21]],
  soap: ['Detergente', [74, 222, 128]]
};
const mixIds = Object.keys(mixLiquids);
export const MIX_MAX_EACH = 4, MIX_MAX_TOTAL = 12;
export function mixInfo(counts = {}) {
  const c = Object.fromEntries(mixIds.map(id => [id, clamp(Math.round(Number(counts[id]) || 0), 0, MIX_MAX_EACH)]));
  const total = mixIds.reduce((sum, id) => sum + c[id], 0), watery = total - c.oil;
  const net = c.vinegar - c.bicarb, reacted = Math.min(c.vinegar, c.bicarb);
  const kind = net > 0 ? 'ácida' : net < 0 ? 'básica' : 'neutra';
  // O óleo não se mistura com a água; o detergente quebra o óleo em gotinhas.
  const oilLayer = c.oil > 0 && !c.soap && watery > 0 ? c.oil : 0, emulsion = c.oil > 0 && c.soap > 0;
  let color = [125, 211, 252];
  if (watery > 0 || c.oil) {
    const parts = mixIds.filter(id => c[id] && id !== 'cabbage' && (id !== 'oil' || !oilLayer));
    const weight = parts.reduce((sum, id) => sum + c[id], 0) || 1;
    color = parts.length ? [0, 1, 2].map(i => parts.reduce((sum, id) => sum + mixLiquids[id][1][i] * c[id], 0) / weight) : mixLiquids.cabbage[1];
  }
  // O suco de repolho roxo é um indicador: rosa no ácido, roxo no neutro, verde no básico.
  if (c.cabbage) {
    const tone = net > 0 ? [236, 72, 153] : net < 0 ? [20, 184, 166] : [139, 92, 246], strength = clamp(.55 + c.cabbage * .15, 0, 1);
    color = color.map((value, i) => lerp(value, tone[i], strength));
  }
  if (emulsion) color = color.map(value => lerp(value, 255, .35));
  const foam = reacted * (c.soap ? 2.2 : 1);
  const facts = [];
  if (!total) facts.push('Pote vazio: toque em um béquer para despejar');
  if (reacted) facts.push(c.soap ? 'Vinagre + bicarbonato soltam gás; o detergente prende o gás e vira muita espuma' : 'Vinagre + bicarbonato reagem e soltam gás carbônico: bolhas!');
  if (c.cabbage && total > c.cabbage) facts.push(`O repolho roxo ficou ${net > 0 ? 'rosa: a mistura é ácida' : net < 0 ? 'verde: a mistura é básica' : 'roxo: a mistura é neutra'}`);
  else if (c.cabbage) facts.push('Só o indicador de repolho roxo: junte vinagre ou bicarbonato');
  if (oilLayer) facts.push('O óleo não se mistura com a água e boia, porque é menos denso');
  if (emulsion) facts.push('O detergente quebrou o óleo em gotinhas: agora ele se mistura');
  if (total && !facts.length) facts.push(c.oil && !watery ? 'Só óleo no pote' : 'Mistura homogênea: virou um líquido só');
  return { ...c, total, watery, net, reacted, kind, oilLayer, emulsion, color, foam, facts, full: total >= MIX_MAX_TOTAL };
}

// -------------------------------------------------------------------- Mola
export const springs = { soft: ['Mola mole', 10], medium: ['Mola média', 25], hard: ['Mola dura', 50] };
export function hookeInfo(mass = 200, spring = 'soft') {
  const id = Object.hasOwn(springs, spring) ? spring : 'soft', grams = clamp(Number(mass) || 0, 0, 500), [name, k] = springs[id];
  const force = grams / 1000 * 9.8, stretch = force / k * 100;
  return { id, name, k, mass: grams, force, stretch };
}

// -------------------------------------------------------------- Microscópio
export const microSamples = {
  onion: ['Casca de cebola', 'células em forma de tijolo'],
  elodea: ['Folha de planta aquática', 'células verdes com cloroplastos'],
  blood: ['Gota de sangue', 'glóbulos vermelhos']
};
const objectives = { 4: 35, 10: 55, 40: 70 };
export function microscopeInfo(sample = 'onion', objective = 10, focus = 50) {
  const id = Object.hasOwn(microSamples, sample) ? sample : 'onion', lens = Object.hasOwn(objectives, String(objective)) ? Number(objective) : 10;
  const target = objectives[lens], knob = clamp(Number(focus) || 0, 0, 100), off = Math.abs(knob - target);
  // Quanto maior o aumento, mais sensível fica o foco.
  const blur = Math.max(0, off - 2) * (lens === 40 ? .55 : lens === 10 ? .35 : .22);
  return { id, name: microSamples[id][0], detail: microSamples[id][1], lens, zoom: lens * 10, target, focus: knob, blur, sharp: blur < .6, direction: knob < target ? 'aumente' : 'diminua' };
}

const beaker = (x, y, width, height, color, level = .7) => `<rect x="${f(x + 2)}" y="${f(y + height * (1 - level))}" width="${f(width - 4)}" height="${f(height * level - 2)}" rx="3" fill="${color}" opacity=".9"/><path d="M${f(x)} ${f(y)}v${f(height - 5)}a5 5 0 0 0 5 5h${f(width - 10)}a5 5 0 0 0 5-5V${f(y)}" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" opacity=".85"/>`;

export const benchSims = {
  mixing: {
    name: 'Bancada de misturas · béqueres', subject: 'Química', aria: 'Bancada com seis béqueres e um pote para misturar',
    note: 'Toque em um béquer para despejar no pote. Junte vinagre com bicarbonato, teste o repolho roxo, tente misturar óleo e água.',
    controls: [
      ['buttons', '', 'Despejar no pote', [...mixIds.map(id => [`pour:${id}`, mixLiquids[id][0]]), ['reset', 'Esvaziar o pote']]],
      ...mixIds.map(id => ['hidden', id, '', 0]), ['hidden', 'last', '', -1], ['hidden', 'stamp', '', -9]
    ],
    ambient: true,
    // Clique em um béquer (ou botão): soma uma dose; "reset" esvazia.
    act(p, action, time = 0) {
      if (action === 'reset') return { ...Object.fromEntries(mixIds.map(id => [id, 0])), last: -1, stamp: -9 };
      const id = action.replace('pour:', ''), now = mixInfo(p);
      if (!mixIds.includes(id) || now.full || now[id] >= MIX_MAX_EACH) return null;
      return { [id]: now[id] + 1, last: mixIds.indexOf(id), stamp: Math.round(time * 100) / 100 };
    },
    compute: p => ({ ...p, ...mixInfo(p) }),
    draw(p, m, t) {
      const since = t - p.stamp, pouring = p.last >= 0 && since >= 0 && since < 1.2, k = pouring ? since / 1.2 : 1;
      const potX = 126, potW = 148, potTop = 92, potBottom = 204, unit = (potBottom - potTop - 8) / MIX_MAX_TOTAL;
      // Durante o despejo o nível sobe aos poucos.
      const shownTotal = m.total - (pouring ? 1 - clamp((k - .3) / .5, 0, 1) : 0), surface = potBottom - shownTotal * unit;
      const oilH = m.oilLayer * unit, wateryTop = surface + oilH, color = rgb(m.color);
      const shelf = mixIds.map((id, i) => {
        const [name, tone] = mixLiquids[id], x = 20 + i * 62, left = MIX_MAX_EACH - m[id], active = pouring && p.last === i;
        let transform = '';
        if (active) {
          // Vai até o pote, vira, despeja e volta.
          const go = clamp(k / .3, 0, 1) * (1 - clamp((k - .8) / .2, 0, 1)), tilt = clamp((k - .2) / .15, 0, 1) * (1 - clamp((k - .8) / .15, 0, 1));
          const dx = (potX + potW / 2 - 38 - x) * go, dy = 14 * go;
          transform = ` transform="translate(${f(dx)} ${f(dy)}) rotate(${f(tilt * 70)} ${x + 38} ${12})"`;
        }
        return `<g data-lab-act="pour:${id}" style="cursor:pointer"${transform}><rect x="${x - 4}" y="6" width="46" height="62" fill="transparent"/>${beaker(x, 12, 38, 40, rgb(tone), left ? .2 + left / MIX_MAX_EACH * .65 : .04)}${active ? '' : label(x + 19, 64, name, { size: 7.5, weight: 700 })}</g>`;
      }).join('');
      const stream = pouring && k > .3 && k < .8 ? `<path d="M${potX + potW / 2 + 2} 30V${f(surface)}" stroke="${rgb(mixLiquids[mixIds[p.last]][1])}" stroke-width="5" stroke-linecap="round" opacity=".9"/>` : '';
      const fizz = m.reacted ? Array.from({ length: Math.round(8 + m.foam * 5) }, (_, i) => { const q = (seeded(i) + t * (.3 + seeded(i + 8) * .4)) % 1; return `<circle cx="${f(potX + 10 + seeded(i + 20) * (potW - 20))}" cy="${f(potBottom - 6 - q * (potBottom - 10 - wateryTop))}" r="${f(1.4 + seeded(i + 3) * 2.2)}" fill="none" stroke="#fff" stroke-width="1.1" opacity="${f(.85 - q * .5)}"/>`; }).join('') : '';
      const foamH = Math.min(m.foam * 7, surface - 70) * (.92 + .08 * Math.sin(t * 3));
      const foam = m.reacted && shownTotal > 0 ? Array.from({ length: 12 }, (_, i) => `<circle cx="${f(potX + 8 + i * (potW - 16) / 11)}" cy="${f(surface - foamH * (.35 + .5 * seeded(i + 60)) + Math.sin(t * 4 + i) * 1.2)}" r="${f(7 + foamH * .32)}" fill="#f8fafc" opacity=".92"/>`).join('') + `<rect x="${potX + 3}" y="${f(surface - foamH * .5)}" width="${potW - 6}" height="${f(foamH * .5 + 2)}" fill="#f8fafc" opacity=".92"/>` : '';
      const droplets = m.emulsion ? Array.from({ length: 16 }, (_, i) => `<circle cx="${f(potX + 10 + wave(seeded(i) * 2 + t * .05) * (potW - 20))}" cy="${f(wateryTop + 6 + wave(seeded(i + 30) * 2 + t * .04) * Math.max(0, potBottom - wateryTop - 14))}" r="2.2" fill="#fde047" opacity=".8"/>`).join('') : '';
      const liquid = shownTotal > 0 ? `<rect x="${potX + 3}" y="${f(wateryTop)}" width="${potW - 6}" height="${f(Math.max(0, potBottom - 3 - wateryTop))}" rx="4" fill="${color}" opacity=".9"/>${oilH ? `<rect x="${potX + 3}" y="${f(surface)}" width="${potW - 6}" height="${f(oilH)}" fill="#facc15" opacity=".88"/>${label(potX + potW + 6, surface + oilH / 2 + 3, 'óleo', { size: 8, anchor: 'start', color: '#fde047' })}` : ''}` : '';
      const facts = m.facts.slice(0, 3).flatMap(text => { const words = text.split(' '), lines = ['']; for (const word of words) { if ((lines.at(-1) + ' ' + word).length > 22) lines.push(word); else lines[lines.length - 1] = (lines.at(-1) + ' ' + word).trim(); } return lines.map((line, i) => (i ? '   ' : '• ') + line); });
      return `<rect x="8" y="72" width="384" height="3" rx="1.5" fill="currentColor" opacity=".25"/>${shelf}${stream}
        ${liquid}${droplets}${fizz}${foam}
        <path d="M${potX} ${potTop}V${potBottom - 8}a8 8 0 0 0 8 8h${potW - 16}a8 8 0 0 0 8-8V${potTop}" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" opacity=".9"/>
        ${label(62, 100, `${m.total} de ${MIX_MAX_TOTAL} doses`, { size: 10, weight: 700 })}${m.total ? label(62, 116, `mistura ${m.kind}`, { size: 10, weight: 700, color: m.kind === 'ácida' ? '#f9a8d4' : m.kind === 'básica' ? '#5eead4' : '#c4b5fd' }) : ''}
        <g data-lab-act="reset" style="cursor:pointer"><rect x="20" y="176" width="84" height="26" rx="13" fill="currentColor" opacity=".14"/>${label(62, 193, '↺ Esvaziar', { size: 10, weight: 700 })}</g>
        ${facts.slice(0, 11).map((line, i) => label(284, 94 + i * 11, line, { size: 8.5, anchor: 'start', opacity: .92 })).join('')}`;
    },
    text: m => m.total ? `${mixIds.filter(id => m[id]).map(id => `${m[id]}× ${mixLiquids[id][0].toLowerCase()}`).join(' + ')}. ${m.facts.map(text => text.replace(/[.!]$/, '')).join('. ')}` : m.facts[0]
  },
  hooke: {
    name: 'Mola e pesos · Lei de Hooke', subject: 'Física', aria: 'Mola pendurada em um suporte com pesos e régua',
    note: 'Dobrando o peso, o alongamento dobra: é a Lei de Hooke (F = k · x). Molas duras esticam menos.',
    controls: [['range', 'mass', 'Massa pendurada (g)', 0, 500, 200, 50], ['select', 'spring', 'Mola', Object.entries(springs).map(([id, item]) => [id, `${item[0]} (k = ${item[1]} N/m)`])]],
    ambient: true,
    compute: p => ({ ...p, ...hookeInfo(p.mass, p.spring) }),
    draw(p, m, t) {
      // 1 cm = 2,2 px. Um balanço pequeno mostra que a mola está viva.
      const bob = m.mass ? Math.sin(t * Math.sqrt(m.k / Math.max(.05, m.mass / 1000)) * .6) * 2.2 : 0;
      const top = 26, rest = 44, length = rest + m.stretch * 2.2 + bob, end = top + length, coils = 12;
      const spring = Array.from({ length: coils * 2 + 1 }, (_, i) => `${i ? 'L' : 'M'}${f(120 + (i === 0 || i === coils * 2 ? 0 : i % 2 ? 11 : -11))} ${f(top + length * i / (coils * 2))}`).join('');
      const discs = Array.from({ length: m.mass / 50 }, (_, i) => `<rect x="${104 - (i % 2) * 2}" y="${f(end + 10 + i * 5)}" width="${32 + (i % 2) * 4}" height="4.4" rx="2" fill="${i % 2 ? '#fbbf24' : '#f59e0b'}"/>`).join('');
      const ruler = Array.from({ length: 11 }, (_, i) => `<path d="M176 ${f(top + rest + i * 11)}h${i % 5 ? 6 : 10}" stroke="#0f172a" stroke-width="1"/>${i % 5 ? '' : label(194, top + rest + i * 11 + 3, String(i * 5), { size: 7, color: '#0f172a', anchor: 'start' })}`).join('');
      // Gráfico força × alongamento da mola escolhida.
      const gx = 250, gy = 190, gw = 120, gh = 90, px = gx + clamp(m.stretch / 50, 0, 1) * gw, py = gy - clamp(m.force / 5, 0, 1) * gh, lineEnd = Math.min(1, 5 / (m.k * .5));
      return `<path d="M60 206h120M70 206V16h64" fill="none" stroke="#94a3b8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${spring}" fill="none" stroke="#e2e8f0" stroke-width="2.2" stroke-linejoin="round"/><path d="M120 ${f(end)}v8" stroke="#e2e8f0" stroke-width="2"/><rect x="108" y="${f(end + 6)}" width="24" height="4" rx="2" fill="#94a3b8"/>${discs}
        <rect x="174" y="${top + rest - 6}" width="34" height="126" rx="3" fill="#fde68a"/>${ruler}${label(191, top + rest - 10, 'cm', { size: 7.5, opacity: .7 })}
        <path d="M140 ${f(end + 6)}H172" stroke="#f87171" stroke-width="1.5" stroke-dasharray="3 3"/>
        ${label(310, 30, `${num(m.stretch)} cm`, { size: 24, weight: 800, color: '#fde047' })}${label(310, 46, 'de alongamento', { size: 9.5, opacity: .8 })}
        ${label(310, 66, `peso: ${num(m.force, 2)} N  ·  k = ${m.k} N/m`, { size: 9, color: '#7dd3fc' })}
        <path d="M${gx} ${gy - gh}V${gy}H${gx + gw}" fill="none" stroke="currentColor" opacity=".5"/><path d="M${gx} ${gy}L${f(gx + (5 / m.k * 100 / 50) * gw * lineEnd)} ${f(gy - gh * lineEnd)}" stroke="#7dd3fc" stroke-width="2"/>
        <circle cx="${f(px)}" cy="${f(py)}" r="4.5" fill="#fde047"/>${label(gx + gw / 2, gy + 13, 'alongamento (cm)', { size: 8, opacity: .7 })}${label(gx - 4, gy - gh - 5, 'força (N)', { size: 8, opacity: .7, anchor: 'start' })}`;
    },
    text: m => m.mass ? `${m.mass} g na ${m.name.toLowerCase()}: peso de ${num(m.force, 2)} N estica a mola ${num(m.stretch)} cm (x = F ÷ k = ${num(m.force, 2)} ÷ ${m.k})` : 'Sem peso a mola fica no comprimento natural: pendure massas para esticar'
  },
  microscope: {
    name: 'Microscópio · foco e aumento', subject: 'Biologia', aria: 'Campo de visão de um microscópio com uma amostra',
    note: 'Aumento total = objetiva × ocular (10×). Ao trocar de objetiva é preciso ajustar o foco de novo.',
    controls: [['select', 'sample', 'Lâmina', Object.entries(microSamples).map(([id, item]) => [id, item[0]])], ['select', 'objective', 'Objetiva', [['10', '10× (aumento de 100×)'], ['4', '4× (aumento de 40×)'], ['40', '40× (aumento de 400×)']]], ['range', 'focus', 'Botão de foco', 0, 100, 40, 1]],
    ambient: true,
    compute: p => ({ ...p, ...microscopeInfo(p.sample, p.objective, p.focus) }),
    draw(p, m, t) {
      const cx = 112, cy = 110, R = 96, size = m.lens === 4 ? 15 : m.lens === 10 ? 36 : 118;
      let cells = '';
      if (m.id === 'blood') {
        const count = m.lens === 4 ? 150 : m.lens === 10 ? 44 : 7, radius = size * .3;
        cells = `<rect x="0" y="0" width="230" height="220" fill="#fee2e2"/>` + Array.from({ length: count }, (_, i) => { const x = 10 + wave(seeded(i) * 2 + t * .012 * (i % 2 ? 1 : -1)) * 204, y = 8 + wave(seeded(i + 70) * 2 + t * .01) * 204; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(radius)}" fill="#ef4444" opacity=".85"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(radius * .45)}" fill="#fca5a5" opacity=".9"/>`; }).join('')
          + (m.lens >= 10 ? `<circle cx="${f(cx + 30)}" cy="${f(cy - 24)}" r="${f(radius * 1.25)}" fill="#ddd6fe"/><circle cx="${f(cx + 30)}" cy="${f(cy - 24)}" r="${f(radius * .7)}" fill="#7c3aed" opacity=".8"/>` : '');
      } else {
        const green = m.id === 'elodea', w = size * (green ? 1.5 : 2.2), h = size, rows = Math.ceil(220 / h) + 1, cols = Math.ceil(230 / w) + 2;
        cells = `<rect x="0" y="0" width="230" height="220" fill="${green ? '#dcfce7' : '#fdf4ff'}"/>`;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const x = col * w - (row % 2 ? w / 2 : 0) - 4, y = row * h - 4, id = row * 31 + col;
          cells += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(size * .12)}" fill="${green ? '#bbf7d0' : '#fae8ff'}" stroke="${green ? '#15803d' : '#a855f7'}" stroke-width="${f(Math.max(.6, size * .035))}"/>`;
          if (m.lens >= 10 && !green) cells += `<circle cx="${f(x + w * (.3 + seeded(id) * .4))}" cy="${f(y + h * (.35 + seeded(id + 5) * .3))}" r="${f(size * .11)}" fill="#7e22ce" opacity=".75"/>`;
          // Cloroplastos circulam dentro da célula viva (ciclose), visível nos aumentos maiores.
          if (m.lens >= 10 && green) for (let dot = 0; dot < (m.lens === 40 ? 9 : 4); dot++) { const a = seeded(id * 7 + dot) * 6.28 + t * .5; cells += `<ellipse cx="${f(x + w / 2 + Math.cos(a) * w * .34)}" cy="${f(y + h / 2 + Math.sin(a) * h * .3)}" rx="${f(size * .075)}" ry="${f(size * .05)}" fill="#16a34a"/>`; }
        }
      }
      const blurId = `sl-blur-${Math.round(m.blur * 10)}`, knob = m.focus / 100 * 300 - 150;
      return `<defs><clipPath id="sl-scope"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><filter id="${blurId}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${f(m.blur)}"/></filter></defs>
        <circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="#020617"/><g clip-path="url(#sl-scope)"><g filter="url(#${blurId})">${cells}</g></g><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#0f172a" stroke-width="5"/>
        ${label(306, 40, `${m.zoom}×`, { size: 32, weight: 800, color: '#fde047' })}${label(306, 56, `objetiva ${m.lens}× · ocular 10×`, { size: 9.5, opacity: .8 })}
        ${label(306, 84, m.sharp ? 'IMAGEM NÍTIDA' : 'FORA DE FOCO', { size: 12, weight: 800, color: m.sharp ? '#86efac' : '#fca5a5' })}${label(306, 99, m.sharp ? m.detail : `${m.direction} o foco aos poucos`, { size: 9, opacity: .85 })}
        <circle cx="306" cy="150" r="30" fill="#334155"/><circle cx="306" cy="150" r="22" fill="#475569"/><path d="M306 150V124" stroke="#fde047" stroke-width="4" stroke-linecap="round" transform="rotate(${f(knob)} 306 150)"/>
        ${label(306, 198, 'botão de foco', { size: 8.5, opacity: .7 })}`;
    },
    text: m => m.sharp ? `${m.name} com aumento de ${m.zoom}×: imagem nítida, dá para ver ${m.detail}${m.lens === 4 ? '. Troque a objetiva para ver mais detalhes' : ''}` : `${m.name} com aumento de ${m.zoom}×: fora de foco. ${m.direction[0].toUpperCase() + m.direction.slice(1)} o botão de foco até a imagem ficar nítida`
  }
};
