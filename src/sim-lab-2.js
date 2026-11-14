// Segunda leva de experimentos do laboratório, no mesmo formato de sim-lab.js:
// controles, cálculo (compute), cena em SVG 400×220 (draw) e frase do resultado.
import { num, short, clamp, label, arrow, seeded, wave, photosynthesisInfo } from './sim-lab.js';

const f = value => Number(value).toFixed(1);
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (a, b, k) => `rgb(${a.map((value, index) => Math.round(lerp(value, b[index], k))).join(',')})`;

// ------------------------------------------------------------------- Cálculos
export function seesawInfo(massA = 30, armA = 100, massB = 30, armB = 100) {
  const a = Math.max(0, Number(massA) || 0) * Math.max(0, Number(armA) || 0), b = Math.max(0, Number(massB) || 0) * Math.max(0, Number(armB) || 0);
  const balanced = Math.abs(a - b) <= Math.max(a, b, 1) * .02;
  return { torqueA: a, torqueB: b, balanced, side: balanced ? 'equilíbrio' : a > b ? 'esquerda' : 'direita', neededArmB: massB > 0 ? a / massB : 0 };
}
export function phInfo(acid = 50, base = 25) {
  const a = Math.max(0, Number(acid) || 0), b = Math.max(0, Number(base) || 0), volume = a + b;
  if (!volume) return { ph: 7, kind: 'neutro', volume: 0 };
  // Ácido e base fortes, os dois a 0,1 mol/L: sobra quem estiver em maior volume.
  const excess = (a - b) * .1 / volume;
  const ph = Math.abs(excess) < 1e-7 ? 7 : excess > 0 ? -Math.log10(excess) : 14 + Math.log10(-excess);
  return { ph: clamp(ph, 0, 14), kind: ph < 6.5 ? 'ácido' : ph > 7.5 ? 'básico' : 'neutro', volume };
}
export const stateSubstances = {
  water: ['Água', 0, 100, [56, 189, 248], -60, 160],
  ethanol: ['Álcool', -114, 78, [196, 181, 253], -160, 130],
  iron: ['Ferro', 1538, 2862, [251, 146, 60], 800, 3400],
  oxygen: ['Oxigênio', -219, -183, [134, 239, 172], -250, -150],
  chocolate: ['Chocolate', 34, 160, [180, 110, 70], -10, 200]
};
export function matterInfo(substance = 'water', heat = 40) {
  const id = Object.hasOwn(stateSubstances, substance) ? substance : 'water', [name, melt, boil, color, low, high] = stateSubstances[id];
  const k = clamp(Number(heat) || 0, 0, 100) / 100, temperature = Math.round(lerp(low, high, k));
  const state = temperature < melt ? 'sólido' : temperature < boil ? 'líquido' : 'gasoso';
  return { id, name, melt, boil, color, low, high, temperature, state, k };
}
export const heartActivities = { rest: ['sentado', 0], sleep: ['dormindo', -.08], walk: ['caminhando', .35], run: ['correndo', .7], sprint: ['em corrida máxima', .95] };
export function heartInfo(activity = 'rest', age = 14) {
  const id = Object.hasOwn(heartActivities, activity) ? activity : 'rest', years = clamp(Math.round(Number(age) || 14), 6, 80);
  const max = 220 - years, rest = years < 12 ? 85 : years < 18 ? 75 : 68, [name, effort] = heartActivities[id];
  const bpm = Math.round(rest + (max - rest) * effort);
  // Volume por batida cresce um pouco com o esforço.
  const litres = bpm * (55 + 45 * Math.max(0, effort)) / 1000;
  return { id, name, age: years, max, rest, bpm, litres, effort };
}
export function contagionInfo(vaccinated = 20, spread = 3, day = 10, people = 60) {
  const total = people, immune = Math.round(total * clamp(Number(vaccinated) || 0, 0, 95) / 100), r0 = clamp(Number(spread) || 1, 1, 8), days = clamp(Math.round(Number(day) || 0), 0, 30);
  let susceptible = total - immune - 1, sick = 1, recovered = 0;
  const history = [[susceptible, sick, recovered]];
  // Modelo SIR simples: cada doente fica 4 dias doente e contagia r0 pessoas se todos puderem pegar.
  for (let step = 0; step < days; step++) {
    const fresh = Math.min(susceptible, r0 / 4 * sick * susceptible / total), healed = sick / 4;
    susceptible -= fresh; sick += fresh - healed; recovered += healed;
    history.push([susceptible, sick, recovered]);
  }
  const effective = r0 * (total - immune) / total;
  return { total, immune, r0, day: days, sick: Math.round(sick), recovered: Math.round(recovered), reached: Math.round(sick + recovered), healthy: Math.max(0, total - immune - Math.round(sick + recovered)), effective, protectedGroup: effective < 1, threshold: Math.ceil((1 - 1 / r0) * 100) };
}
export function equationInfo(a = 3, b = 4, total = 19, x = 2) {
  const A = clamp(Math.round(Number(a) || 1), 1, 6), B = clamp(Math.round(Number(b) || 0), 0, 12), T = clamp(Math.round(Number(total) || 0), 1, 60), X = clamp(Number(x) || 0, 0, 12);
  const left = A * X + B, solution = (T - B) / A;
  return { a: A, b: B, total: T, x: X, left, solution, balanced: Math.abs(left - T) < .001, side: left > T ? 'esquerda' : left < T ? 'direita' : 'equilíbrio' };
}
const moonNames = ['Lua nova', 'Crescente', 'Quarto crescente', 'Crescente gibosa', 'Lua cheia', 'Minguante gibosa', 'Quarto minguante', 'Minguante'];
export function moonInfo(day = 7) {
  const d = ((Number(day) || 0) % 29.5 + 29.5) % 29.5, phase = d / 29.5, lit = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
  const index = Math.round(phase * 8) % 8;
  return { day: d, phase, lit, name: moonNames[index], waxing: phase < .5 };
}
export const pixelColors = { 2: ['2 cores (1 bit)', 1], 8: ['8 cores (3 bits)', 3], 64: ['64 cores (6 bits)', 6], full: ['16 milhões (24 bits)', 24] };
export function pixelInfo(size = 16, colors = 'full') {
  const side = clamp(Math.round(Number(size) || 8), 4, 32), key = Object.hasOwn(pixelColors, colors) ? String(colors) : 'full', bits = pixelColors[key][1];
  return { side, key, bits, pixels: side * side, bytes: side * side * bits / 8, levels: key === 'full' ? 256 : key === '64' ? 4 : 2 };
}
export const refractionMaterials = { water: ['Água', 1.33, '#38bdf8'], glass: ['Vidro', 1.5, '#a5f3fc'], diamond: ['Diamante', 2.42, '#e0e7ff'] };
export function refractionInfo(angle = 45, material = 'water') {
  const id = Object.hasOwn(refractionMaterials, material) ? material : 'water', incidence = clamp(Number(angle) || 0, 0, 85), [name, index, color] = refractionMaterials[id];
  const refracted = Math.asin(Math.sin(incidence * Math.PI / 180) / index) * 180 / Math.PI;
  return { id, name, index, color, incidence, refracted, bend: incidence - refracted, speed: Math.round(300000 / index / 1000) * 1000 };
}
export const tabletForms = { whole: ['inteiro', 1], halves: ['partido em 4', 2.2], powder: ['em pó', 6] };
export function reactionInfo(temperature = 25, form = 'whole') {
  const id = Object.hasOwn(tabletForms, form) ? form : 'whole', t = clamp(Number(temperature) || 0, 0, 90), [name, surface] = tabletForms[id];
  // Regra prática: a velocidade dobra a cada 10 °C; mais superfície, mais contato.
  const rate = 2 ** ((t - 25) / 10) * surface, seconds = Math.max(.5, 20 / rate);
  return { id, name, temperature: t, surface, rate, seconds };
}
export const planets = {
  mercury: ['Mercúrio', 58, 88, '#a8a29e', 3], venus: ['Vênus', 108, 225, '#fbbf24', 5], earth: ['Terra', 150, 365, '#38bdf8', 5.5], mars: ['Marte', 228, 687, '#f87171', 4],
  jupiter: ['Júpiter', 778, 4333, '#fdba74', 10], saturn: ['Saturno', 1427, 10759, '#fde68a', 9], uranus: ['Urano', 2871, 30687, '#67e8f9', 7], neptune: ['Netuno', 4498, 60190, '#818cf8', 7]
};
export function planetInfo(planet = 'mars', age = 12) {
  const id = Object.hasOwn(planets, planet) ? planet : 'mars', [name, distance, period] = planets[id], years = clamp(Number(age) || 0, 1, 100);
  return { id, name, distance, period, age: years, localAge: years * 365.25 / period, lightMinutes: distance * 1e6 / 299792 / 60 };
}
const seasonNames = ['Verão', 'Outono', 'Inverno', 'Primavera'];
export function seasonsInfo(month = 1, tilt = 23.5) {
  const m = clamp(Math.round(Number(month) || 1), 1, 12), axis = clamp(Number(tilt) || 0, 0, 45);
  // Sul: verão em dez–fev. O Norte fica sempre na estação oposta.
  const south = Math.floor((m % 12) / 3), north = (south + 2) % 4;
  // Horas de luz em São Paulo (23,5° S), em função da inclinação.
  const declination = -axis * Math.cos((m - .5) / 12 * 2 * Math.PI) * Math.PI / 180;
  const daylight = 24 / Math.PI * Math.acos(clamp(-Math.tan(-23.5 * Math.PI / 180) * Math.tan(declination), -1, 1));
  return { month: m, tilt: axis, south: axis < 1 ? 'Sem estações' : seasonNames[south], north: axis < 1 ? 'Sem estações' : seasonNames[north], daylight, angle: (m - .5) / 12 * 2 * Math.PI };
}
const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// --------------------------------------------------------------- Peças de cena
const child = (x, y, scale, color) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(scale)})"><circle cx="0" cy="-30" r="8" fill="#fcd9b6"/><path d="M-7 -21h14l3 18h-20z" fill="${color}"/><path d="M-6 -3l-9 6M6 -3l9 6" stroke="#475569" stroke-width="4" stroke-linecap="round"/><path d="M-7 -17l-9 8M7 -17l9 8" stroke="#fcd9b6" stroke-width="3.5" stroke-linecap="round"/></g>`;
const sky = (top, bottom) => `<defs><linearGradient id="sl-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect x="8" y="8" width="384" height="204" rx="12" fill="url(#sl-sky)"/>`;
// Cor do indicador universal conforme o pH.
const phStops = [[220, 38, 38], [249, 115, 22], [250, 204, 21], [34, 197, 94], [20, 184, 166], [59, 130, 246], [124, 58, 237]];
const phColor = ph => { const k = clamp(ph, 0, 14) / 14 * (phStops.length - 1), i = Math.min(phStops.length - 2, Math.floor(k)); return mix(phStops[i], phStops[i + 1], k - i); };
// Desenho-base dos pixels: sol, céu, morro e casa. Devolve [r, g, b] para um ponto (u, v) de 0 a 1.
function pictureAt(u, v) {
  if ((u - .78) ** 2 + (v - .22) ** 2 < .012) return [253, 224, 71];
  if (u > .2 && u < .5 && v > .55 && v < .82) return u > .31 && u < .39 && v > .66 ? [120, 53, 15] : [248, 113, 113];
  if (v > .38 && v <= .55 && Math.abs(u - .35) < (v - .38) * 1.05) return [153, 27, 27];
  if (v > .8 - .12 * Math.sin(u * 5)) return [34, 197, 94];
  if (v > .62 - .1 * Math.sin(u * 3 + 1) && u > .5) return [22, 163, 74];
  return [lerp(56, 186, v), lerp(189, 230, v), 248];
}

export const moreSims = {
  // ------------------------------------------------------------------ Física
  lever: {
    name: 'Gangorra · equilíbrio', subject: 'Física', aria: 'Duas crianças em uma gangorra',
    note: 'Peso × distância até o apoio: quem tiver o maior resultado desce. Iguais, a gangorra fica parada.',
    controls: [['range', 'massA', 'Peso da Ana (kg)', 10, 60, 40, 1], ['range', 'armA', 'Distância da Ana ao apoio (cm)', 20, 150, 75, 5], ['range', 'massB', 'Peso do Beto (kg)', 10, 60, 20, 1], ['range', 'armB', 'Distância do Beto ao apoio (cm)', 20, 150, 150, 5]],
    ambient: true,
    compute: p => ({ ...p, ...seesawInfo(p.massA, p.armA, p.massB, p.armB) }),
    draw(p, m, t) {
      const difference = clamp((m.torqueB - m.torqueA) / Math.max(m.torqueA, m.torqueB, 1), -1, 1);
      // Em equilíbrio a tábua balança de leve; fora dele, encosta no chão do lado mais pesado.
      const tilt = m.balanced ? Math.sin(t * 2.2) * 2.2 : Math.sign(difference) * (9 + 5 * Math.abs(difference)) + Math.sin(t * 5) * .5 * Math.exp(-t * .4);
      const xA = 200 - p.armA, xB = 200 + p.armB;
      return `${sky('#1e3a5f', '#16324a')}<path d="M8 178h384v22a12 12 0 0 1-12 12H20a12 12 0 0 1-12-12z" fill="#166534"/>
        <path d="M200 132l-20 46h40z" fill="#94a3b8"/>
        <g transform="rotate(${f(tilt)} 200 132)"><rect x="40" y="127" width="320" height="9" rx="4.5" fill="#f59e0b"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${50 + i * 50} 136v5" stroke="#fff" opacity=".45"/>`).join('')}
          ${child(xA, 128, .7 + p.massA / 110, '#f472b6')}${child(xB, 128, .7 + p.massB / 110, '#60a5fa')}
          ${label(xA, 76 - p.massA / 4, `Ana ${p.massA} kg`, { size: 10, weight: 700, color: '#fbcfe8' })}${label(xB, 76 - p.massB / 4, `Beto ${p.massB} kg`, { size: 10, weight: 700, color: '#bfdbfe' })}</g>
        ${label(104, 30, `${p.massA} × ${p.armA} = ${short(m.torqueA)}`, { size: 11, weight: 700, color: '#fbcfe8' })}${label(296, 30, `${p.massB} × ${p.armB} = ${short(m.torqueB)}`, { size: 11, weight: 700, color: '#bfdbfe' })}
        ${label(200, 30, m.balanced ? '=' : m.torqueA > m.torqueB ? '&gt;' : '&lt;', { size: 16, weight: 800, color: '#fde047' })}
        ${label(200, 204, m.balanced ? 'EQUILÍBRIO' : `desce para a ${m.side}`, { size: 11, weight: 800, color: m.balanced ? '#86efac' : '#fde047' })}`;
    },
    text: m => m.balanced ? `Equilíbrio: ${m.massA} kg × ${m.armA} cm = ${m.massB} kg × ${m.armB} cm` : `A gangorra desce para a ${m.side}. Para equilibrar, o Beto precisa sentar a ${short(m.neededArmB)} cm do apoio`
  },
  refraction: {
    name: 'Luz · reflexão e refração', subject: 'Física', aria: 'Raio de luz passando do ar para outro material',
    note: 'Ao entrar em um material mais denso a luz fica mais lenta e muda de direção. Parte dela volta: é o reflexo.',
    controls: [['range', 'angle', 'Ângulo do raio (°)', 0, 85, 45, 1], ['select', 'material', 'Material', Object.entries(refractionMaterials).map(([id, item]) => [id, `${item[0]} (índice ${String(item[1]).replace('.', ',')})`])]],
    ambient: true,
    compute: p => ({ ...p, ...refractionInfo(p.angle, p.material) }),
    draw(p, m, t) {
      const a = m.incidence * Math.PI / 180, r = m.refracted * Math.PI / 180, cx = 200, cy = 110, len = 96;
      const from = [cx - Math.sin(a) * len, cy - Math.cos(a) * len], reflect = [cx + Math.sin(a) * len, cy - Math.cos(a) * len], inside = [cx + Math.sin(r) * len, cy + Math.cos(r) * len];
      const pulse = (t * .9) % 1, dot = (p0, p1, k) => `<circle cx="${f(lerp(p0[0], p1[0], k))}" cy="${f(lerp(p0[1], p1[1], k))}" r="3.5" fill="#fff"/>`;
      const arc = (start, end, radius, color) => { const s = [cx + Math.sin(start) * radius, cy - Math.cos(start) * radius], e = [cx + Math.sin(end) * radius, cy - Math.cos(end) * radius]; return `<path d="M${f(s[0])} ${f(s[1])}A${radius} ${radius} 0 0 ${end > start ? 1 : 0} ${f(e[0])} ${f(e[1])}" fill="none" stroke="${color}" stroke-width="1.5"/>`; };
      return `<rect x="8" y="8" width="384" height="102" rx="12" fill="#0f172a"/><rect x="8" y="110" width="384" height="102" fill="${m.color}" opacity=".3"/>
        <path d="M8 110h384" stroke="${m.color}" stroke-width="2"/><path d="M200 14V206" stroke="currentColor" stroke-dasharray="4 5" opacity=".45"/>
        ${label(24, 30, 'AR', { size: 11, anchor: 'start', weight: 700, opacity: .8 })}${label(24, 200, m.name.toUpperCase(), { size: 11, anchor: 'start', weight: 700, color: m.color })}
        <path d="M${f(from[0])} ${f(from[1])}L${cx} ${cy}" stroke="#fde047" stroke-width="4" stroke-linecap="round"/>
        <path d="M${cx} ${cy}L${f(reflect[0])} ${f(reflect[1])}" stroke="#fde047" stroke-width="2" stroke-linecap="round" opacity=".5"/>
        <path d="M${cx} ${cy}L${f(inside[0])} ${f(inside[1])}" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>
        ${pulse < .5 ? dot(from, [cx, cy], pulse * 2) : dot([cx, cy], inside, (pulse - .5) * 2)}
        ${arc(-a, 0, 34, '#fde047')}${arc(Math.PI, Math.PI - r, 34, '#fb923c')}
        ${label(cx - Math.sin(a / 2) * 50, cy - Math.cos(a / 2) * 50 + 4, `${m.incidence}°`, { size: 11, weight: 700, color: '#fde047' })}
        ${label(cx + Math.sin(r / 2) * 52, cy + Math.cos(r / 2) * 52 + 4, `${num(m.refracted)}°`, { size: 11, weight: 700, color: '#fb923c' })}
        ${label(376, 30, 'reflexo', { size: 9, anchor: 'end', opacity: .7 })}${label(376, 200, `luz a ${m.speed.toLocaleString('pt-BR')} km/s`, { size: 9, anchor: 'end', opacity: .8 })}`;
    },
    text: m => m.incidence === 0 ? `Raio reto (0°): a luz entra em ${m.name.toLowerCase()} sem desviar, só fica mais lenta` : `O raio chega a ${m.incidence}° e segue a ${num(m.refracted)}° dentro de ${m.name.toLowerCase()}: desviou ${num(m.bend)}°`
  },
  // ----------------------------------------------------------------- Química
  neutralization: {
    name: 'Ácido e base · pH', subject: 'Química', aria: 'Béquer com mistura de ácido e base e escala de pH',
    note: 'O indicador muda de cor com o pH: vermelho é ácido, verde é neutro, roxo é básico. Volumes iguais se anulam.',
    controls: [['range', 'acid', 'Ácido (mL)', 0, 100, 50, 1], ['range', 'base', 'Base (mL)', 0, 100, 25, 1]],
    ambient: true,
    compute: p => ({ ...p, ...phInfo(p.acid, p.base) }),
    draw(p, m, t) {
      const color = phColor(m.ph), level = 176 - m.volume / 200 * 120, x = 60 + m.ph / 14 * 280;
      const bubbles = Array.from({ length: 9 }, (_, i) => { const k = (seeded(i) + t * (.18 + seeded(i + 9) * .2)) % 1; return `<circle cx="${f(80 + seeded(i + 20) * 90)}" cy="${f(176 - k * (176 - level))}" r="${f(1.5 + seeded(i + 3) * 2.5)}" fill="#fff" opacity="${f(.5 * (1 - k))}"/>`; }).join('');
      const drop = (cx, fill, amount, phase) => amount ? `<circle cx="${cx}" cy="${f(20 + ((t * .8 + phase) % 1) * (level - 24))}" r="3.5" fill="${fill}"/>` : '';
      return `<path d="M62 40V170a12 12 0 0 0 12 12h102a12 12 0 0 0 12-12V40" fill="none" stroke="currentColor" stroke-width="3" opacity=".6"/>
        ${m.volume ? `<path d="M65 ${f(level + Math.sin(t * 2) * 1.2)}Q125 ${f(level - 3 + Math.sin(t * 2.4) * 2)} 185 ${f(level + Math.cos(t * 2) * 1.2)}V168a11 11 0 0 1-11 11H76a11 11 0 0 1-11-11z" fill="${color}" opacity=".88"/>${bubbles}` : ''}
        <rect x="92" y="8" width="10" height="14" rx="3" fill="#f87171"/><rect x="148" y="8" width="10" height="14" rx="3" fill="#a78bfa"/>${drop(97, '#f87171', p.acid, 0)}${drop(153, '#a78bfa', p.base, .5)}
        ${label(97, 36, 'ácido', { size: 8, color: '#fca5a5' })}${label(153, 36, 'base', { size: 8, color: '#c4b5fd' })}
        ${label(300, 52, 'pH', { size: 13, weight: 700, opacity: .75 })}${label(300, 96, num(m.ph), { size: 40, weight: 800, color })}${label(300, 116, m.kind.toUpperCase(), { size: 12, weight: 800, color })}
        ${Array.from({ length: 28 }, (_, i) => `<rect x="${60 + i * 10}" y="196" width="10.5" height="10" fill="${phColor(i / 2)}"/>`).join('')}
        <path d="M${f(x)} 192l-5-8h10z" fill="#fff"/>
        ${[[2, 'limão'], [7, 'água'], [10, 'sabão'], [13, 'soda']].map(([value, name]) => label(60 + value / 14 * 280, 218, name, { size: 7.5, opacity: .7 })).join('')}`;
    },
    text: m => !m.volume ? 'Béquer vazio: adicione ácido ou base' : `${m.acid} mL de ácido + ${m.base} mL de base → pH ${num(m.ph)} (${m.kind})${m.kind === 'neutro' ? ': um anulou o outro' : m.kind === 'ácido' ? ': sobrou ácido' : ': sobrou base'}`
  },
  states: {
    name: 'Estados da matéria', subject: 'Química', aria: 'Partículas de uma substância aquecida ou resfriada',
    note: 'Cada substância derrete e ferve em uma temperatura própria. Ao aquecer, as partículas se agitam e se afastam.',
    controls: [['select', 'substance', 'Substância', Object.entries(stateSubstances).map(([id, item]) => [id, item[0]])], ['range', 'heat', 'Esfriar ◀ ▶ aquecer', 0, 100, 40, 1]],
    ambient: true,
    compute: p => ({ ...p, ...matterInfo(p.substance, p.heat) }),
    draw(p, m, t) {
      const tone = `rgb(${m.color.join(',')})`, energy = .3 + m.k * 2.4;
      const dots = Array.from({ length: 30 }, (_, i) => {
        let x, y;
        if (m.state === 'sólido') { x = 66 + (i % 6) * 21 + Math.sin(t * 10 + i) * (.4 + m.k * 2.5); y = 96 + Math.floor(i / 6) * 19 + Math.cos(t * 9 + i * 2) * (.4 + m.k * 2.5); }
        else if (m.state === 'líquido') { x = 52 + wave(seeded(i) * 2 + t * energy * .1 * (i % 2 ? 1 : -1)) * 154; y = 124 + wave(seeded(i + 40) * 2 + t * energy * .08) * 54; }
        else { x = 52 + wave(seeded(i) * 2 + t * energy * .3 * (i % 2 ? 1 : -1)) * 154; y = 34 + wave(seeded(i + 40) * 2 + t * energy * .26) * 144; }
        return `<circle cx="${f(x)}" cy="${f(y)}" r="6.5" fill="${tone}" stroke="#fff" stroke-opacity=".35"/>`;
      }).join('');
      // Embaixo do pote: gelo quando está frio, chama quando está quente.
      const base = m.k < .34 ? Array.from({ length: 5 }, (_, i) => `<rect x="${64 + i * 28}" y="194" width="18" height="14" rx="3" fill="#bae6fd" opacity=".85" transform="rotate(${i % 2 ? 8 : -6} ${73 + i * 28} 201)"/>`).join('')
        : Array.from({ length: 6 }, (_, i) => { const h = (8 + m.k * 16) * (.7 + .3 * Math.sin(t * 9 + i * 1.7)); return `<path d="M${62 + i * 24} 210q7 ${f(-h * 2)} 14 0z" fill="${i % 2 ? '#fb923c' : '#facc15'}"/>`; }).join('');
      const ty = value => 196 - clamp((value - m.low) / (m.high - m.low), 0, 1) * 166, yMelt = ty(m.melt), yBoil = ty(m.boil), yNow = ty(m.temperature);
      const zone = (y1, y2, color, name) => `<rect x="282" y="${f(y1)}" width="18" height="${f(Math.max(0, y2 - y1))}" fill="${color}" opacity=".8"/>${y2 - y1 > 14 ? label(306, (y1 + y2) / 2 + 3, name, { size: 9, anchor: 'start', color }) : ''}`;
      return `${label(129, 22, `${m.name.toUpperCase()} · ${m.state.toUpperCase()}`, { size: 13, weight: 800, color: tone })}
        <path d="M40 30V186a6 6 0 0 0 6 6h166a6 6 0 0 0 6-6V30" fill="${m.state === 'líquido' ? tone : 'none'}" fill-opacity=".12" stroke="currentColor" stroke-width="3" opacity=".6"/>${dots}${base}
        ${zone(30, yBoil, '#fca5a5', 'gasoso')}${zone(yBoil, yMelt, '#7dd3fc', 'líquido')}${zone(yMelt, 196, '#e0f2fe', 'sólido')}
        ${label(278, yBoil + 3, `${m.boil} °C`, { size: 8, anchor: 'end', opacity: .8 })}${label(278, yMelt + 3, `${m.melt} °C`, { size: 8, anchor: 'end', opacity: .8 })}
        <path d="M276 ${f(yNow)}h30" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>${label(352, 22, `${m.temperature.toLocaleString('pt-BR')} °C`, { size: 14, weight: 800, color: '#fde047' })}`;
    },
    text: m => `${m.name} a ${m.temperature.toLocaleString('pt-BR')} °C: estado ${m.state}. Derrete a ${m.melt.toLocaleString('pt-BR')} °C e ferve a ${m.boil.toLocaleString('pt-BR')} °C`
  },
  reaction: {
    name: 'Velocidade das reações · efervescente', subject: 'Química', aria: 'Comprimido efervescente dissolvendo em um copo de água',
    note: 'Água mais quente e comprimido em pedaços menores aumentam o contato entre as partículas: a reação acelera.',
    controls: [['range', 'temperature', 'Temperatura da água (°C)', 5, 80, 25, 5], ['select', 'form', 'Comprimido', Object.entries(tabletForms).map(([id, item]) => [id, item[0]])]],
    ambient: true,
    compute: p => ({ ...p, ...reactionInfo(p.temperature, p.form) }),
    draw(p, m, t) {
      // O copo recomeça a cada ciclo: tempo de dissolver + 1,5 s de pausa.
      const cycle = m.seconds + 1.5, now = t % cycle, left = clamp(1 - now / m.seconds, 0, 1), water = mix([56, 189, 248], [248, 113, 113], clamp((m.temperature - 5) / 75, 0, 1));
      const count = left > 0 ? Math.round(clamp(m.rate * 5, 3, 46)) : 0;
      const bubbles = Array.from({ length: count }, (_, i) => { const k = (seeded(i) + t * (.5 + seeded(i + 7))) % 1; return `<circle cx="${f(96 + seeded(i + 30) * 88 + Math.sin(t * 3 + i) * 3)}" cy="${f(186 - k * 112)}" r="${f(1.5 + seeded(i + 2) * 3)}" fill="none" stroke="#fff" stroke-width="1.2" opacity="${f(.9 - k * .6)}"/>`; }).join('');
      const pieces = m.id === 'whole' ? [[140, 184, 22]] : m.id === 'halves' ? [[112, 186, 12], [132, 184, 12], [152, 186, 12], [170, 184, 12]] : Array.from({ length: 16 }, (_, i) => [96 + i * 5.6, 186 - (i % 3) * 2, 3.5]);
      const tablet = pieces.map(([x, y, size]) => `<ellipse cx="${f(x)}" cy="${y}" rx="${f(size * left)}" ry="${f(size * left * .42)}" fill="#fff"/>`).join('');
      const bar = clamp(now / m.seconds, 0, 1);
      return `<path d="M82 46l10 150h100l10-150" fill="none" stroke="currentColor" stroke-width="3" opacity=".6" stroke-linejoin="round"/>
        <path d="M85 70l8 124h98l8-124z" fill="${water}" opacity=".45"/>${tablet}${bubbles}
        ${label(142, 34, `água a ${m.temperature} °C`, { size: 10, weight: 700, color: water })}
        ${label(300, 60, 'tempo para dissolver', { size: 10, opacity: .75 })}${label(300, 100, `${m.seconds < 10 ? num(m.seconds) : Math.round(m.seconds)} s`, { size: 34, weight: 800, color: '#fde047' })}
        <rect x="240" y="118" width="120" height="10" rx="5" fill="currentColor" opacity=".14"/><rect x="240" y="118" width="${f(120 * bar)}" height="10" rx="5" fill="#fde047"/>
        ${label(300, 148, left > 0 ? 'reagindo…' : 'dissolveu!', { size: 11, weight: 700, color: left > 0 ? '#e2e8f0' : '#86efac' })}
        ${label(300, 180, `${num(m.rate)}× a velocidade`, { size: 11, weight: 700 })}${label(300, 194, 'de um comprimido inteiro a 25 °C', { size: 8, opacity: .7 })}`;
    },
    text: m => `Comprimido ${m.name} em água a ${m.temperature} °C dissolve em cerca de ${m.seconds < 10 ? num(m.seconds) : Math.round(m.seconds)} s (${num(m.rate)}× a velocidade de referência)`
  },
  // ---------------------------------------------------------------- Biologia
  heart: {
    name: 'Coração · batimentos e exercício', subject: 'Biologia', aria: 'Coração batendo e traçado dos batimentos',
    note: 'No exercício os músculos pedem mais oxigênio, e o coração bate mais rápido para levar mais sangue.',
    controls: [['select', 'activity', 'O que a pessoa está fazendo', Object.entries(heartActivities).map(([id, item]) => [id, item[0]])], ['range', 'age', 'Idade (anos)', 6, 80, 14, 1]],
    ambient: true,
    compute: p => ({ ...p, ...heartInfo(p.activity, p.age) }),
    draw(p, m, t) {
      const beat = t * m.bpm / 60, phase = beat % 1, squeeze = phase < .18 ? Math.sin(phase / .18 * Math.PI) : 0, scale = 1 + squeeze * .16;
      // Traçado: cada batida desenha um pico; o papel corre para a esquerda.
      const points = Array.from({ length: 150 }, (_, i) => { const k = (beat - (149 - i) / 60 + 100) % 1, y = k < .06 ? -34 * Math.sin(k / .06 * Math.PI) : k < .12 ? 12 * Math.sin((k - .06) / .06 * Math.PI) : k > .3 && k < .45 ? -7 * Math.sin((k - .3) / .15 * Math.PI) : 0; return `${f(200 + i * 1.2)} ${f(160 + y)}`; }).join('L');
      const cells = Array.from({ length: 10 }, (_, i) => { const k = (seeded(i) + beat * .22) % 1; return `<circle cx="${f(30 + k * 150)}" cy="${f(186 + Math.sin(k * 9 + i) * 5)}" r="4" fill="#f87171" opacity=".9"/>`; }).join('');
      const zone = m.bpm / m.max, zoneColor = zone < .55 ? '#86efac' : zone < .8 ? '#fde047' : '#f87171';
      return `<g transform="translate(104 92) scale(${f(scale)})"><path d="M0 44C-58 6-52-44-22-44-8-44 0-32 0-24 0-32 8-44 22-44 52-44 58 6 0 44Z" fill="#ef4444"/><path d="M-22-36c-14 0-22 12-20 26" fill="none" stroke="#fecaca" stroke-width="4" stroke-linecap="round" opacity=".7"/></g>
        <rect x="20" y="174" width="170" height="24" rx="12" fill="#7f1d1d" opacity=".55"/>${cells}${label(105, 212, 'sangue levando oxigênio', { size: 8, opacity: .7 })}
        ${label(296, 46, String(m.bpm), { size: 44, weight: 800, color: zoneColor })}${label(296, 64, 'batimentos por minuto', { size: 10, opacity: .8 })}
        <rect x="216" y="76" width="160" height="8" rx="4" fill="currentColor" opacity=".14"/><rect x="216" y="76" width="${f(160 * clamp(zone, 0, 1))}" height="8" rx="4" fill="${zoneColor}"/>
        ${label(296, 98, `${Math.round(zone * 100)}% do máximo para ${m.age} anos (${m.max})`, { size: 8.5, opacity: .75 })}
        <rect x="198" y="112" width="186" height="74" rx="8" fill="#052e16" opacity=".6"/><path d="M${points}" fill="none" stroke="#4ade80" stroke-width="2" stroke-linejoin="round"/>
        ${label(291, 204, `${num(m.litres)} litros de sangue por minuto`, { size: 10, weight: 700, color: '#fca5a5' })}`;
    },
    text: m => `${m.age} anos, ${m.name}: cerca de ${m.bpm} batimentos por minuto, bombeando ${num(m.litres)} litros de sangue por minuto`
  },
  contagion: {
    name: 'Contágio e vacinação', subject: 'Biologia', aria: 'Turma de 60 pessoas durante um surto',
    note: 'Quando muita gente está vacinada, o vírus não acha para onde ir e protege até quem não pôde se vacinar.',
    controls: [['range', 'vaccinated', 'Pessoas vacinadas (%)', 0, 95, 20, 5], ['range', 'spread', 'Cada doente contagia (pessoas)', 1, 8, 3, 1], ['range', 'day', 'Dia do surto', 0, 30, 0, 1]],
    drive: { param: 'day', min: 0, max: 30, speed: 2.5, step: 1 },
    compute: p => ({ ...p, ...contagionInfo(p.vaccinated, p.spread, p.day) }),
    draw(p, m, t) {
      // Ordem fixa: quem é vacinado e a fila de quem adoece não mudam a cada repintura.
      const order = Array.from({ length: m.total }, (_, i) => i).sort((a, b) => seeded(a + 5) - seeded(b + 5)), rank = new Map(order.map((id, index) => [id, index]));
      const people = Array.from({ length: m.total }, (_, i) => {
        const r = rank.get(i), x = 34 + (i % 12) * 22, y = 44 + Math.floor(i / 12) * 30;
        const state = r < m.immune ? 'v' : r < m.immune + m.recovered ? 'r' : r < m.immune + m.reached ? 's' : 'h';
        const color = { v: '#60a5fa', r: '#94a3b8', s: '#f87171', h: '#86efac' }[state], bob = state === 's' ? Math.sin(t * 6 + i) * 1.2 : 0;
        return `<g transform="translate(${x} ${f(y + bob)})"><circle cy="-8" r="5" fill="${color}"/><path d="M-6 9a6 9 0 0 1 12 0z" fill="${color}"/>${state === 'v' ? '<path d="M-3 2h6v3q-3 3-6 0z" fill="#fff" opacity=".9"/>' : ''}</g>`;
      }).join('');
      const legend = [['#86efac', `saudáveis ${m.healthy}`], ['#f87171', `doentes ${m.sick}`], ['#94a3b8', `curados ${m.recovered}`], ['#60a5fa', `vacinados ${m.immune}`]];
      return `${people}${legend.map(([color, name], i) => `<circle cx="${306}" cy="${48 + i * 22}" r="5" fill="${color}"/>${label(316, 52 + i * 22, name, { size: 10, anchor: 'start', weight: 600 })}`).join('')}
        ${label(30, 24, `DIA ${m.day}`, { size: 13, anchor: 'start', weight: 800, color: '#fde047' })}
        ${label(344, 150, m.protectedGroup ? 'SURTO CONTIDO' : 'SURTO SE ESPALHA', { size: 9.5, weight: 800, color: m.protectedGroup ? '#86efac' : '#f87171' })}
        ${label(344, 166, `proteção coletiva a partir`, { size: 8, opacity: .75 })}${label(344, 177, `de ${m.threshold}% vacinados`, { size: 8, opacity: .75 })}
        <rect x="30" y="200" width="262" height="8" rx="4" fill="currentColor" opacity=".14"/><rect x="30" y="200" width="${f(262 * m.reached / m.total)}" height="8" rx="4" fill="#f87171"/>${label(300, 208, `${m.reached} de ${m.total} já pegaram`, { size: 9, anchor: 'start' })}`;
    },
    text: m => `Dia ${m.day}, com ${m.vaccinated}% vacinados: ${m.reached} de ${m.total} pessoas já pegaram a doença. ${m.protectedGroup ? 'O surto não consegue se espalhar' : `Seriam precisos ${m.threshold}% vacinados para conter`}`
  },
  photosynthesis: {
    name: 'Fotossíntese', subject: 'Biologia', aria: 'Planta recebendo luz, água e gás carbônico',
    note: 'Luz + água + gás carbônico viram açúcar e oxigênio. O ingrediente que estiver faltando limita a produção.',
    controls: [['range', 'light', 'Luz do Sol (%)', 0, 100, 80, 5], ['range', 'co2', 'Gás carbônico (%)', 0, 100, 60, 5], ['range', 'water', 'Água (%)', 0, 100, 70, 5]],
    ambient: true,
    compute: p => ({ ...p, ...photosynthesisInfo(p.light, p.co2, p.water) }),
    draw(p, m, t) {
      const rate = m.rate / 100, sway = Math.sin(t * 1.4) * 3, leaf = .55 + rate * .5, green = mix([120, 113, 60], [34, 197, 94], rate);
      const rays = Array.from({ length: 6 }, (_, i) => `<path d="M${52 + i * 4} ${44 + i * 3}L${f(150 + i * 12)} ${f(100 + i * 8)}" stroke="#fde047" stroke-width="2.5" stroke-dasharray="7 9" stroke-dashoffset="${f(-t * 26)}" opacity="${f(p.light / 100 * .85)}"/>`).join('');
      const flow = (count, amount, make) => Array.from({ length: Math.round(count * amount / 100) }, (_, i) => make((seeded(i) + t * (.16 + seeded(i + 4) * .1)) % 1, i)).join('');
      const co2 = flow(7, p.co2, (k, i) => `<g transform="translate(${f(376 - k * 150)} ${f(70 + seeded(i + 2) * 60 + Math.sin(k * 8) * 4)})" opacity="${f(1 - k * .6)}"><circle r="4" fill="#94a3b8"/><circle cx="-5" r="2.6" fill="#f87171"/><circle cx="5" r="2.6" fill="#f87171"/></g>`);
      const oxygen = flow(8, m.rate, (k, i) => `<g transform="translate(${f(214 + seeded(i + 6) * 30 + k * 60)} ${f(96 - k * 78)})" opacity="${f(1 - k * .7)}"><circle r="3.2" fill="none" stroke="#7dd3fc" stroke-width="1.6"/><circle cx="6" r="3.2" fill="none" stroke="#7dd3fc" stroke-width="1.6"/></g>`);
      const drops = flow(6, p.water, (k, i) => `<circle cx="${f(200 + Math.sin(i * 2.4) * 22 * (1 - k))}" cy="${f(206 - k * 46)}" r="2.6" fill="#38bdf8"/>`);
      const blade = (side, y, size) => `<path d="M200 ${y}q${side * 44 * size} ${-26 * size} ${side * 62 * size} ${-4 * size}q${-side * 22 * size} ${22 * size} ${-side * 62 * size} ${4 * size}z" fill="${green}"/>`;
      return `${sky('#0c4a6e', '#164e63')}<path d="M8 168h384v32a12 12 0 0 1-12 12H20a12 12 0 0 1-12-12z" fill="#78350f"/>
        <circle cx="46" cy="42" r="${f(16 + p.light / 100 * 8)}" fill="#fde047" opacity="${f(.35 + p.light / 100 * .65)}"/>${rays}${drops}
        <g transform="rotate(${f(sway)} 200 168)"><path d="M200 168V${f(168 - 86 * leaf)}" stroke="#15803d" stroke-width="6" stroke-linecap="round"/>${blade(-1, 150, leaf)}${blade(1, 132, leaf)}${blade(-1, f(168 - 70 * leaf), leaf * .8)}${blade(1, f(168 - 84 * leaf), leaf * .7)}</g>
        ${co2}${oxygen}
        ${label(372, 60, 'gás carbônico', { size: 8.5, anchor: 'end', color: '#cbd5e1' })}${label(290, 24, 'oxigênio', { size: 8.5, color: '#7dd3fc' })}${label(200, 204, 'água pelas raízes', { size: 8.5, color: '#bae6fd' })}
        <rect x="318" y="150" width="62" height="10" rx="5" fill="#000" opacity=".3"/><rect x="318" y="150" width="${f(62 * rate)}" height="10" rx="5" fill="#fde047"/>${label(349, 144, `açúcar ${m.rate}%`, { size: 9.5, weight: 700, color: '#fde047' })}`;
    },
    text: m => m.rate === 0 ? `Sem ${m.limiting} a planta não faz fotossíntese` : `Produção de açúcar e oxigênio em ${m.rate}%. O que está limitando é ${m.limiting === 'água' ? 'a' : m.limiting === 'luz' ? 'a' : 'o'} ${m.limiting}`
  },
  // -------------------------------------------------------------- Matemática
  balance: {
    name: 'Balança de equações · descubra o x', subject: 'Matemática', aria: 'Balança de dois pratos com caixas x e pesos',
    note: 'Resolver a equação é achar o valor de x que deixa os dois pratos com o mesmo peso.',
    controls: [['range', 'a', 'Quantas caixas x', 1, 6, 3, 1], ['range', 'b', 'Pesos soltos no prato esquerdo', 0, 12, 4, 1], ['range', 'total', 'Peso no prato direito', 1, 60, 19, 1], ['range', 'x', 'Seu palpite para x', 0, 12, 2, 1]],
    ambient: true,
    compute: p => ({ ...p, ...equationInfo(p.a, p.b, p.total, p.x) }),
    draw(p, m, t) {
      const difference = clamp((m.total - m.left) / 12, -1, 1), tilt = m.balanced ? Math.sin(t * 2) * 1.2 : difference * 11, rad = tilt * Math.PI / 180;
      const pan = side => { const x = 200 + side * 118 * Math.cos(rad), y = 70 + side * 118 * Math.sin(rad); return [x, y]; }, [lx, ly] = pan(-1), [rx, ry] = pan(1);
      const boxes = Array.from({ length: m.a }, (_, i) => `<g transform="translate(${f(lx - 50 + (i % 3) * 24)} ${f(ly + 44 - Math.floor(i / 3) * 24)})"><rect width="21" height="21" rx="4" fill="#a78bfa"/>${label(10.5, 15, 'x', { size: 12, weight: 800, color: '#1e1b4b' })}</g>`).join('');
      const units = Array.from({ length: m.b }, (_, i) => `<circle cx="${f(lx + 30 + (i % 3) * 11)}" cy="${f(ly + 60 - Math.floor(i / 3) * 11)}" r="4.6" fill="#fbbf24"/>`).join('');
      const weight = `<path d="M${f(rx - 22)} ${f(ly * 0 + ry + 66)}l6-30h32l6 30z" fill="#fbbf24"/>${label(rx, ry + 58, String(m.total), { size: 14, weight: 800, color: '#451a03' })}`;
      const dish = (x, y) => `<path d="M200 70" /><path d="M${f(x)} ${f(y)}l-34 66M${f(x)} ${f(y)}l34 66" stroke="currentColor" opacity=".45"/><path d="M${f(x - 56)} ${f(y + 66)}h112q-6 12-56 12t-56-12z" fill="#64748b"/>`;
      return `<path d="M200 70V186M160 190h80" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/><circle cx="200" cy="70" r="7" fill="#e2e8f0"/>
        <path d="M${f(lx)} ${f(ly)}L${f(rx)} ${f(ry)}" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>${dish(lx, ly)}${dish(rx, ry)}${boxes}${units}${weight}
        ${label(200, 28, `${m.a}x + ${m.b} = ${m.total}`, { size: 20, weight: 800, color: '#fde047' })}
        ${label(200, 46, `com x = ${m.x}: ${m.a} × ${m.x} + ${m.b} = ${m.left}`, { size: 10.5, color: m.balanced ? '#86efac' : '#e2e8f0' })}
        ${label(200, 212, m.balanced ? `EQUILÍBRIO: x = ${m.x}` : m.left > m.total ? 'esquerda pesada demais: diminua x' : 'esquerda leve demais: aumente x', { size: 11, weight: 800, color: m.balanced ? '#86efac' : '#fca5a5' })}`;
    },
    text: m => m.balanced ? `${m.a}x + ${m.b} = ${m.total} → x = ${m.x}. Os dois pratos pesam ${m.total}` : `Com x = ${m.x} o prato esquerdo pesa ${m.left} e o direito ${m.total}. ${Number.isInteger(m.solution) && m.solution >= 0 && m.solution <= 12 ? 'Continue ajustando o palpite' : 'Com estes números x não é inteiro: mude os pesos'}`
  },
  // --------------------------------------------------------------- Geografia
  seasons: {
    name: 'Estações do ano · inclinação da Terra', subject: 'Geografia', aria: 'Terra girando em torno do Sol com o eixo inclinado',
    note: 'As estações existem porque o eixo da Terra é inclinado: ora o Sul, ora o Norte recebe o Sol mais de frente.',
    controls: [['range', 'month', 'Mês do ano', 1, 12, 1, 1], ['range', 'tilt', 'Inclinação do eixo (°)', 0, 45, 23.5, .5]],
    drive: { param: 'month', min: 1, max: 12, speed: 1.2, step: 1 },
    compute: p => ({ ...p, ...seasonsInfo(p.month, p.tilt) }),
    draw(p, m, t) {
      // Janeiro à direita do Sol; a Terra anda no sentido anti-horário.
      const ex = 132 + Math.cos(m.angle) * 92, ey = 112 - Math.sin(m.angle) * 62, glow = 30 + Math.sin(t * 3) * 2;
      const stars = Array.from({ length: 26 }, (_, i) => `<circle cx="${f(14 + seeded(i) * 372)}" cy="${f(14 + seeded(i + 50) * 192)}" r="${f(.5 + seeded(i + 9))}" fill="#fff" opacity="${f(.3 + .5 * wave(t * .4 + seeded(i) * 2))}"/>`).join('');
      // O hemisfério Sul aponta para o Sol em janeiro: o eixo fica sempre inclinado para o mesmo lado.
      const earth = (cx, cy, radius, big) => `<g transform="translate(${f(cx)} ${f(cy)})"><g transform="rotate(${f(m.tilt)})"><circle r="${radius}" fill="#38bdf8"/><path d="M${-radius * .5} ${-radius * .3}q${radius * .4} ${-radius * .5} ${radius * .7} ${-radius * .1}t${-radius * .2} ${radius * .5}zM${-radius * .1} ${radius * .2}q${radius * .5} ${-radius * .1} ${radius * .4} ${radius * .5}t${-radius * .5} ${-radius * .1}z" fill="#22c55e"/><path d="M0 ${-radius - (big ? 12 : 5)}V${radius + (big ? 12 : 5)}" stroke="#fde047" stroke-width="${big ? 2 : 1.2}"/><path d="M${-radius} 0h${radius * 2}" stroke="#fff" stroke-dasharray="3 3" opacity=".6"/></g></g>`;
      const sunSide = Math.cos(m.angle) >= 0 ? -1 : 1;
      return `<rect x="8" y="8" width="384" height="204" rx="12" fill="#0b1026"/>${stars}
        <ellipse cx="132" cy="112" rx="92" ry="62" fill="none" stroke="#fff" stroke-dasharray="3 6" opacity=".3"/>
        <circle cx="132" cy="112" r="${f(glow)}" fill="#fde047" opacity=".18"/><circle cx="132" cy="112" r="20" fill="#fde047"/>
        ${earth(ex, ey, 10, false)}${label(ex, ey + 26, monthNames[m.month - 1], { size: 9, weight: 700 })}
        ${[['jan', 0], ['abr', Math.PI / 2], ['jul', Math.PI], ['out', Math.PI * 1.5]].map(([name, angle]) => label(132 + Math.cos(angle) * 108, 116 - Math.sin(angle) * 78, name, { size: 8, opacity: .55 })).join('')}
        ${earth(322, 78, 30, true)}${arrow(322 + sunSide * 62, 78, 322 + sunSide * 40, 78, '#fde047', 2)}${label(322 + sunSide * 52, 68, 'Sol', { size: 8, color: '#fde047' })}
        ${label(322, 150, `Sul: ${m.south}`, { size: 12, weight: 800, color: '#fde047' })}${label(322, 166, `Norte: ${m.north}`, { size: 10, opacity: .85 })}
        ${label(322, 186, `São Paulo: ${num(m.daylight)} h de luz`, { size: 9, color: '#7dd3fc' })}${label(322, 200, `eixo inclinado ${String(m.tilt).replace('.', ',')}°`, { size: 8.5, opacity: .7 })}`;
    },
    text: m => m.tilt < 1 ? 'Com o eixo reto (0°) não haveria estações: todo dia teria 12 horas de luz' : `Em ${monthNames[m.month - 1]} é ${m.south.toLowerCase()} no hemisfério Sul e ${m.north.toLowerCase()} no Norte. Em São Paulo o dia tem ${num(m.daylight)} horas de luz`
  },
  moon: {
    name: 'Fases da Lua', subject: 'Geografia', aria: 'Lua girando em torno da Terra e sua aparência no céu',
    note: 'A Lua sempre tem metade iluminada pelo Sol. A fase é o quanto dessa metade conseguimos ver da Terra.',
    controls: [['range', 'day', 'Dia do ciclo lunar', 0, 29, 7, 1]],
    drive: { param: 'day', min: 0, max: 29, speed: 3, step: 1 },
    compute: p => ({ ...p, ...moonInfo(p.day) }),
    draw(p, m, t) {
      const angle = m.phase * 2 * Math.PI, mx = 126 - Math.cos(angle) * 74, my = 112 - Math.sin(angle) * 74;
      const stars = Array.from({ length: 30 }, (_, i) => `<circle cx="${f(14 + seeded(i) * 372)}" cy="${f(14 + seeded(i + 50) * 192)}" r="${f(.5 + seeded(i + 9))}" fill="#fff" opacity="${f(.3 + .5 * wave(t * .4 + seeded(i) * 2))}"/>`).join('');
      // Vista da Terra: a borda iluminada é uma elipse que encolhe e muda de lado.
      const R = 46, cx = 316, cy = 92, k = Math.cos(angle), sweep = m.waxing ? 1 : 0;
      const lit = `M${cx} ${cy - R}A${R} ${R} 0 0 ${sweep} ${cx} ${cy + R}A${f(Math.abs(k) * R)} ${R} 0 0 ${(k > 0) === m.waxing ? 0 : 1} ${cx} ${cy - R}Z`;
      return `<rect x="8" y="8" width="384" height="204" rx="12" fill="#0b1026"/>${stars}
        ${[-30, 0, 30].map(dy => arrow(14, 112 + dy, 34, 112 + dy, '#fde047', 1.6)).join('')}${label(24, 70, 'Sol', { size: 8, color: '#fde047' })}
        <circle cx="126" cy="112" r="74" fill="none" stroke="#fff" stroke-dasharray="3 6" opacity=".3"/>
        <circle cx="126" cy="112" r="17" fill="#38bdf8"/><path d="M118 104q8-6 14 2t-6 10-8-12z" fill="#22c55e"/>${label(126, 144, 'Terra', { size: 8, opacity: .7 })}
        <circle cx="${f(mx)}" cy="${f(my)}" r="9" fill="#334155"/><path d="M${f(mx)} ${f(my - 9)}A9 9 0 0 0 ${f(mx)} ${f(my + 9)}Z" fill="#f1f5f9"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="#1e293b"/><path d="${lit}" fill="#f8fafc"/><circle cx="${cx - 12}" cy="${cy - 10}" r="7" fill="#000" opacity=".07"/><circle cx="${cx + 14}" cy="${cy + 14}" r="10" fill="#000" opacity=".06"/>
        ${label(cx, 30, 'vista da Terra', { size: 9, opacity: .7 })}${label(cx, 162, m.name, { size: 14, weight: 800, color: '#fde047' })}
        ${label(cx, 180, `${Math.round(m.lit * 100)}% iluminada · dia ${Math.round(m.day)}`, { size: 10 })}${label(cx, 196, m.waxing ? 'crescendo' : 'diminuindo', { size: 9, opacity: .7 })}`;
    },
    text: m => `Dia ${Math.round(m.day)} do ciclo: ${m.name.toLowerCase()}, com ${Math.round(m.lit * 100)}% da face visível iluminada. O ciclo completo leva 29,5 dias`
  },
  solar: {
    name: 'Sistema Solar · órbitas', subject: 'Geografia', aria: 'Planetas girando em torno do Sol',
    note: 'Quanto mais longe do Sol, maior o caminho e mais devagar o planeta anda: o ano dele fica mais comprido.',
    controls: [['select', 'planet', 'Planeta', ['mars', 'mercury', 'venus', 'earth', 'jupiter', 'saturn', 'uranus', 'neptune'].map(id => [id, planets[id][0]])], ['range', 'age', 'Sua idade na Terra (anos)', 5, 80, 12, 1]],
    ambient: true,
    compute: p => ({ ...p, ...planetInfo(p.planet, p.age) }),
    draw(p, m, t) {
      const stars = Array.from({ length: 24 }, (_, i) => `<circle cx="${f(14 + seeded(i) * 372)}" cy="${f(14 + seeded(i + 50) * 192)}" r="${f(.5 + seeded(i + 9))}" fill="#fff" opacity=".5"/>`).join('');
      // Distâncias fora de escala (em raiz) para caber; a velocidade segue o período real.
      const bodies = Object.entries(planets).map(([id, [name, , period, color, size]], i) => {
        const rx = 22 + i * 14.5, ry = rx * .62, angle = t * 2.2 * 365 / period + i * 1.3, x = 126 + Math.cos(angle) * rx, y = 112 - Math.sin(angle) * ry, active = id === m.id;
        return `<ellipse cx="126" cy="112" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${active ? color : '#fff'}" stroke-width="${active ? 1.4 : .6}" opacity="${active ? .9 : .22}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(size * (active ? .75 : .5))}" fill="${color}"/>${id === 'saturn' ? `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(size * .9)}" ry="${f(size * .22)}" fill="none" stroke="${color}" stroke-width="1"/>` : ''}${active ? label(x, y - size - 3, name, { size: 9, weight: 700, color }) : ''}`;
      }).join('');
      const [, , , color, size] = planets[m.id];
      return `<rect x="8" y="8" width="384" height="204" rx="12" fill="#0b1026"/>${stars}<circle cx="126" cy="112" r="11" fill="#fde047"/>${bodies}
        <circle cx="322" cy="50" r="${f(10 + size * 1.6)}" fill="${color}"/>${m.id === 'saturn' ? `<ellipse cx="322" cy="50" rx="${f(18 + size * 2.4)}" ry="6" fill="none" stroke="${color}" stroke-width="2.5"/>` : ''}
        ${label(322, 96, m.name.toUpperCase(), { size: 14, weight: 800, color })}
        ${label(322, 114, `${m.distance.toLocaleString('pt-BR')} milhões de km do Sol`, { size: 8.5 })}
        ${label(322, 128, `ano de ${m.period.toLocaleString('pt-BR')} dias terrestres`, { size: 8.5 })}
        ${label(322, 142, `a luz do Sol leva ${m.lightMinutes < 100 ? num(m.lightMinutes) + ' min' : num(m.lightMinutes / 60) + ' h'}`, { size: 8.5 })}
        ${label(322, 170, `${m.localAge < 1 ? num(m.localAge, 2) : num(m.localAge)} anos`, { size: 20, weight: 800, color: '#fde047' })}${label(322, 186, `sua idade em ${m.name}`, { size: 9, opacity: .8 })}`;
    },
    text: m => `${m.name} fica a ${m.distance.toLocaleString('pt-BR')} milhões de km do Sol e leva ${m.period.toLocaleString('pt-BR')} dias para dar uma volta. Quem tem ${m.age} anos na Terra teria ${m.localAge < 1 ? num(m.localAge, 2) : num(m.localAge)} lá`
  },
  // -------------------------------------------------------------- Tecnologia
  pixels: {
    name: 'Pixels · como a tela forma imagens', subject: 'Tecnologia', aria: 'Imagem formada por quadradinhos coloridos',
    note: 'Toda imagem digital é uma grade de quadradinhos (pixels). Mais pixels e mais cores dão mais detalhe e arquivos maiores.',
    controls: [['range', 'size', 'Pixels por lado', 4, 32, 12, 1], ['select', 'colors', 'Cores disponíveis', ['full', '64', '8', '2'].map(id => [id, pixelColors[id][0]])]],
    compute: p => ({ ...p, ...pixelInfo(p.size, p.colors) }),
    draw(p, m) {
      const cell = 184 / m.side, step = 255 / (m.levels - 1);
      const tone = rgb => m.key === '2' ? ((rgb[0] * .3 + rgb[1] * .59 + rgb[2] * .11) > 150 ? [255, 255, 255] : [15, 23, 42]) : m.key === 'full' ? rgb.map(Math.round) : rgb.map(value => Math.round(Math.round(value / step) * step));
      let grid = '';
      for (let row = 0; row < m.side; row++) for (let col = 0; col < m.side; col++) grid += `<rect x="${f(18 + col * cell)}" y="${f(18 + row * cell)}" width="${f(cell + .4)}" height="${f(cell + .4)}" fill="rgb(${tone(pictureAt((col + .5) / m.side, (row + .5) / m.side)).join(',')})"/>`;
      const lines = m.side <= 16 ? Array.from({ length: m.side + 1 }, (_, i) => `<path d="M${f(18 + i * cell)} 18v184M18 ${f(18 + i * cell)}h184" stroke="#0f172a" stroke-width=".5" opacity=".5"/>`).join('') : '';
      const size = m.bytes < 1024 ? `${Math.round(m.bytes)} bytes` : `${num(m.bytes / 1024)} kB`;
      return `${grid}${lines}<rect x="18" y="18" width="184" height="184" fill="none" stroke="currentColor" opacity=".5"/>
        ${label(300, 48, `${m.side} × ${m.side}`, { size: 26, weight: 800, color: '#fde047' })}${label(300, 66, `${m.pixels.toLocaleString('pt-BR')} pixels`, { size: 11 })}
        ${label(300, 104, `${m.bits} bit${m.bits > 1 ? 's' : ''} por pixel`, { size: 12, weight: 700, color: '#7dd3fc' })}
        ${label(300, 142, size, { size: 20, weight: 800, color: '#86efac' })}${label(300, 158, 'tamanho sem compressão', { size: 9, opacity: .75 })}
        ${label(300, 188, 'Uma foto de celular tem', { size: 8.5, opacity: .7 })}${label(300, 200, 'mais de 12 milhões de pixels', { size: 8.5, opacity: .7 })}`;
    },
    text: m => `${m.side} × ${m.side} = ${m.pixels.toLocaleString('pt-BR')} pixels, cada um com ${m.bits} bit${m.bits > 1 ? 's' : ''}: a imagem ocupa ${m.bytes < 1024 ? Math.round(m.bytes) + ' bytes' : num(m.bytes / 1024) + ' kB'}`
  }
};
