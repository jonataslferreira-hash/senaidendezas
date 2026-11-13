export const simulationGroups = [
  ['Física', [
    ['projectile', 'Lançamento de projéteis'],
    ['pendulum', 'Pêndulo'],
    ['circuit', 'Circuito · Lei de Ohm'],
    ['waves', 'Ondas e frequência']
  ]],
  ['Química', [
    ['neutralization', 'Ácido e base · pH'],
    ['states', 'Estados da matéria']
  ]],
  ['Biologia', [
    ['osmosis', 'Osmose celular'],
    ['ecosystem', 'Crescimento populacional']
  ]],
  ['Matemática', [
    ['quadratic', 'Função quadrática'],
    ['trigonometry', 'Ciclo trigonométrico']
  ]],
  ['Geografia', [
    ['seasons', 'Estações e inclinação axial']
  ]],
  ['História', [
    ['eras', 'Linha do tempo histórica']
  ]],
  ['Português', [
    ['narrative', 'Arco narrativo']
  ]],
  ['Artes', [
    ['colormix', 'Mistura de cores RGB']
  ]],
  ['Tecnologia', [
    ['logicgates', 'Portas lógicas digitais']
  ]]
];

export const simulationNames = Object.fromEntries(
  simulationGroups.flatMap(([, items]) => items)
);

export const simulationSubjects = Object.fromEntries(
  simulationGroups.flatMap(([subject, items]) => items.map(([id]) => [id, subject]))
);

export const simulationIds = Object.keys(simulationNames);

export function projectile(v, angle, g = 9.81) {
  const a = angle * Math.PI / 180;
  return { range: v * v * Math.sin(2 * a) / g, height: (v * Math.sin(a)) ** 2 / (2 * g), time: 2 * v * Math.sin(a) / g };
}

export function mixturePH(acidVolume, baseVolume, c = .01) {
  const excess = c * (acidVolume - baseVolume) / Math.max(1, acidVolume + baseVolume);
  const root = Math.sqrt(excess * excess + 4e-14);
  const h = excess >= 0 ? (excess + root) / 2 : 2e-14 / (root - excess);
  return Math.max(0, Math.min(14, -Math.log10(h)));
}

export function waveProperties(frequency, speed = 340) {
  const f = Math.max(.1, Number(frequency) || 1);
  const v = Math.max(1, Number(speed) || 340);
  return { wavelength: v / f, period: 1 / f };
}

export const matterSubstances = {
  water: { name: 'Água (H₂O)', melt: 0, boil: 100 },
  ethanol: { name: 'Etanol (C₂H₅OH)', melt: -114, boil: 78 },
  mercury: { name: 'Mercúrio (Hg)', melt: -39, boil: 357 }
};

export function matterState(temperature, substance = 'water') {
  const info = matterSubstances[substance] || matterSubstances.water;
  const temp = Number(temperature) || 0;
  const state = temp < info.melt ? 'Sólido' : temp < info.boil ? 'Líquido' : 'Gasoso';
  const span = Math.max(1, info.boil - info.melt);
  const kinetic = temp < info.melt ? .15 : temp < info.boil ? .35 + .35 * ((temp - info.melt) / span) : .85 + Math.min(.65, (temp - info.boil) / 200);
  return { state, kinetic, ...info };
}

export function osmosisState(outsideSolute, insideSolute = 300) {
  const diff = (Number(outsideSolute) || 0) - (Number(insideSolute) || 300);
  if (Math.abs(diff) <= 20) return { tonicity: 'Isotônica', scale: 1, flow: 'Equilíbrio dinâmico de água' };
  if (diff < 0) return { tonicity: 'Hipotônica', scale: Math.min(1.28, 1 + Math.abs(diff) / 900), flow: 'Água entra na célula' };
  return { tonicity: 'Hipertônica', scale: Math.max(.68, 1 - diff / 950), flow: 'Água sai da célula' };
}

export function logisticPopulation(time, rate = .45, capacity = 500, initial = 20) {
  const k = Math.max(1, Number(capacity) || 500);
  const n0 = Math.max(1, Math.min(k, Number(initial) || 20));
  const r = Math.max(.01, Number(rate) || .45);
  const t = Math.max(0, Number(time) || 0);
  return k / (1 + ((k - n0) / n0) * Math.exp(-r * t));
}

export function quadraticMetrics(a, b, c) {
  const ca = Number(a) || 0, cb = Number(b) || 0, cc = Number(c) || 0;
  if (Math.abs(ca) < 1e-9) {
    const root = Math.abs(cb) > 1e-9 ? [-cc / cb] : [];
    return { linear: true, delta: null, xv: null, yv: null, roots: root };
  }
  const delta = cb * cb - 4 * ca * cc;
  const xv = -cb / (2 * ca);
  const yv = ca * xv * xv + cb * xv + cc;
  const roots = delta > 1e-9
    ? [(-cb - Math.sqrt(delta)) / (2 * ca), (-cb + Math.sqrt(delta)) / (2 * ca)].sort((x, y) => x - y)
    : Math.abs(delta) <= 1e-9 ? [xv] : [];
  return { linear: false, delta, xv, yv, roots };
}

export function trigValues(degrees) {
  const deg = ((Number(degrees) || 0) % 360 + 360) % 360;
  const rad = deg * Math.PI / 180;
  const sin = Math.sin(rad), cos = Math.cos(rad);
  const quadrant = deg === 0 || deg === 90 || deg === 180 || deg === 270
    ? 'Eixo'
    : deg < 90 ? '1º Q' : deg < 180 ? '2º Q' : deg < 270 ? '3º Q' : '4º Q';
  return { deg, rad, sin, cos, quadrant };
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function seasonInfo(month = 12, tilt = 23.5) {
  const m = Math.max(1, Math.min(12, Math.round(Number(month) || 12)));
  const axial = Math.max(0, Math.min(45, Number(tilt) ?? 23.5));
  const declination = -axial * Math.cos(2 * Math.PI * (m % 12) / 12);
  const south = m === 12 || m <= 2 ? 'Verão' : m <= 5 ? 'Outono' : m <= 8 ? 'Inverno' : 'Primavera';
  const north = m === 12 || m <= 2 ? 'Inverno' : m <= 5 ? 'Primavera' : m <= 8 ? 'Verão' : 'Outono';
  return { month: m, monthName: MONTH_NAMES[m - 1], declination, south, north };
}

export function historicalEra(year = 1500) {
  const y = Math.max(-3000, Math.min(2026, Math.round(Number(year) ?? 1500)));
  if (y < 476) {
    const milestone = y < -2500 ? 'Escrita cuneiforme e pirâmides' : y < -500 ? 'Pólis gregas e filosofia' : 'Império Romano';
    return { year: y, label: y < 0 ? `${Math.abs(y)} a.C.` : `${y} d.C.`, era: 'Idade Antiga', span: '3000 a.C. – 476 d.C.', milestone };
  }
  if (y < 1453) {
    const milestone = y < 1000 ? 'Feudalismo e reinos medievais' : 'Universidades e rotas comerciais';
    return { year: y, label: `${y} d.C.`, era: 'Idade Média', span: '476 – 1453', milestone };
  }
  if (y < 1789) {
    const milestone = y < 1600 ? 'Renascimento e navegações' : 'Revolução Científica e Iluminismo';
    return { year: y, label: `${y} d.C.`, era: 'Idade Moderna', span: '1453 – 1789', milestone };
  }
  const milestone = y < 1900 ? 'Revolução Industrial' : y < 1990 ? 'Século XX e corrida espacial' : 'Era digital e IA';
  return { year: y, label: `${y} d.C.`, era: 'Idade Contemporânea', span: '1789 – presente', milestone };
}

export function narrativeStage(progress = 60, intensity = 3) {
  const p = Math.max(0, Math.min(100, Number(progress) || 0));
  const peak = Math.max(1, Math.min(5, Number(intensity) || 3));
  let tension;
  if (p <= 60) tension = (0.18 + 0.82 * Math.pow(p / 60, 1.35)) * (peak / 5);
  else tension = (1 - 0.78 * Math.pow((p - 60) / 40, 1.15)) * (peak / 5);
  const phase = p < 18 ? 'Exposição' : p < 52 ? 'Conflito crescente' : p < 68 ? 'Clímax' : p < 86 ? 'Queda da ação' : 'Desfecho';
  return { progress: p, phase, tension: Math.round(tension * 100) };
}

const hexByte = n => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, '0').toUpperCase();
const linearChannel = c => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export function colorMixInfo(r = 80, g = 175, b = 235) {
  const cr = Math.max(0, Math.min(255, Math.round(Number(r) || 0)));
  const cg = Math.max(0, Math.min(255, Math.round(Number(g) || 0)));
  const cb = Math.max(0, Math.min(255, Math.round(Number(b) || 0)));
  const hex = `#${hexByte(cr)}${hexByte(cg)}${hexByte(cb)}`;
  const complement = `#${hexByte(255 - cr)}${hexByte(255 - cg)}${hexByte(255 - cb)}`;
  const lum = 0.2126 * linearChannel(cr) + 0.7152 * linearChannel(cg) + 0.0722 * linearChannel(cb);
  const contrastWhite = 1.05 / (lum + 0.05);
  const contrastBlack = (lum + 0.05) / 0.05;
  return { hex, complement, lum, contrastWhite, contrastBlack };
}

export function evaluateGate(gate = 'AND', a = 1, b = 0) {
  const va = a ? 1 : 0, vb = b ? 1 : 0;
  const g = String(gate || 'AND').toUpperCase();
  const out = g === 'OR' ? (va | vb) : g === 'XOR' ? (va ^ vb) : g === 'NAND' ? ((va & vb) ? 0 : 1) : g === 'NOR' ? ((va | vb) ? 0 : 1) : (va & vb);
  return { gate: g, a: va, b: vb, out };
}

const range = (key, label, min, max, value, step = 1) => `<label>${label} <output data-value="${key}">${value}</output><input aria-label="${label}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" data-param="${key}"></label>`;
const selectControl = (key, label, options) => `<label>${label}<select aria-label="${label}" data-sim-select="${key}">${options.map(([v, name]) => `<option value="${v}">${name}</option>`).join('')}</select></label>`;

const visuals = {
  projectile: '<svg viewBox="0 0 400 220" aria-label="Visualização da simulação"><path d="M20 190H380" stroke="currentColor" opacity=".25"/><path data-trajectory fill="none" stroke="#a78bfa" stroke-width="3"/><g data-motion><circle cx="30" cy="180" r="12" fill="#a78bfa"/></g></svg>',
  pendulum: '<svg viewBox="0 0 400 220" aria-label="Visualização do pêndulo"><path d="M120 20H280" stroke="currentColor" opacity=".28" stroke-width="4" stroke-linecap="round"/><path data-trajectory fill="none" stroke="#a78bfa" stroke-width="3"/><g data-motion><circle cx="200" cy="170" r="14" fill="#7bbba1"/></g></svg>',
  neutralization: '<svg viewBox="0 0 400 220" aria-label="Solução e indicador de pH"><path d="M120 30v145q0 20 20 20h120q20 0 20-20V30" fill="none" stroke="currentColor" stroke-width="5"/><path data-liquid d="M124 95h152v80q0 16-16 16H140q-16 0-16-16Z" fill="#9d80e7" opacity=".8"/><text x="200" y="70" text-anchor="middle" fill="currentColor" font-size="20">H⁺ + OH⁻ → H₂O</text></svg>',
  circuit: '<svg viewBox="0 0 400 220" aria-label="Circuito elétrico"><path d="M70 110V40h250v140H70v-50" fill="none" stroke="#77b7d5" stroke-width="5"/><path d="M45 110h50m-40 20h30" stroke="currentColor" stroke-width="5"/><circle data-bulb cx="320" cy="110" r="32" fill="#ffe594"/><path d="m300 95 40 30m0-30-40 30" stroke="#835a22" stroke-width="3"/><text x="180" y="30" text-anchor="middle" fill="currentColor" font-size="16">V = R · I</text></svg>',
  waves: '<svg viewBox="0 0 400 220" aria-label="Visualização de onda"><path d="M20 110H380" stroke="currentColor" opacity=".2" stroke-dasharray="5 5"/><path data-wave fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/><line data-amp x1="80" y1="110" x2="80" y2="70" stroke="#f472b6" stroke-width="2.5"/><text x="200" y="24" text-anchor="middle" fill="currentColor" font-size="14" opacity=".8">λ = v / f</text></svg>',
  states: '<svg viewBox="0 0 400 220" aria-label="Partículas da matéria"><rect x="75" y="24" width="250" height="172" rx="14" fill="#ffffff08" stroke="currentColor" stroke-width="3" opacity=".8"/><g data-particles></g></svg>',
  osmosis: '<svg viewBox="0 0 400 220" aria-label="Osmose celular"><rect x="20" y="18" width="360" height="184" rx="18" fill="#60a5fa1a" stroke="currentColor" opacity=".35"/><g data-solutes></g><ellipse data-cell cx="200" cy="110" rx="58" ry="44" fill="#fb7185" fill-opacity=".8" stroke="#fda4af" stroke-width="4"/><g data-arrows stroke="#7dd3fc" stroke-width="3" fill="none" stroke-linecap="round"></g></svg>',
  ecosystem: '<svg viewBox="0 0 400 220" aria-label="Curva logística populacional"><path d="M36 22V190H376" fill="none" stroke="currentColor" opacity=".35" stroke-width="2"/><line data-cap x1="36" y1="42" x2="376" y2="42" stroke="#fbbf24" stroke-dasharray="6 5" stroke-width="2"/><path data-curve fill="none" stroke="#4ade80" stroke-width="3.5"/><circle data-marker cx="180" cy="100" r="7" fill="#fef08a"/></svg>',
  quadratic: '<svg viewBox="0 0 400 220" aria-label="Gráfico da parábola"><path d="M20 110H380M200 16V204" stroke="currentColor" opacity=".28" stroke-width="1.5"/><path data-parabola fill="none" stroke="#c084fc" stroke-width="3"/><g data-points></g></svg>',
  trigonometry: '<svg viewBox="0 0 400 220" aria-label="Ciclo trigonométrico"><path d="M80 110H320M200 18V202" stroke="currentColor" opacity=".25"/><circle cx="200" cy="110" r="74" fill="none" stroke="currentColor" opacity=".4" stroke-width="2"/><line data-cos x1="200" y1="110" x2="252" y2="110" stroke="#38bdf8" stroke-width="4"/><line data-sin x1="252" y1="110" x2="252" y2="58" stroke="#fb7185" stroke-width="4"/><line data-radius x1="200" y1="110" x2="252" y2="58" stroke="#fde047" stroke-width="3"/><circle data-tip cx="252" cy="58" r="6" fill="#fde047"/></svg>',
  seasons: '<svg viewBox="0 0 400 220" aria-label="Sol e inclinação da Terra"><circle cx="72" cy="110" r="34" fill="#fbbf24"/><g stroke="#fde68a" stroke-width="2" opacity=".7"><line x1="116" y1="74" x2="210" y2="74"/><line x1="120" y1="110" x2="210" y2="110"/><line x1="116" y1="146" x2="210" y2="146"/></g><g data-earth transform="translate(275 110)"><circle r="44" fill="#2563eb"/><path data-shade d="M0-44A44 44 0 0 1 0 44Z" fill="#0f172a" opacity=".68"/><g data-tilt><line x1="-44" y1="0" x2="44" y2="0" stroke="#4ade80" stroke-width="2" stroke-dasharray="4 3"/><line x1="0" y1="-56" x2="0" y2="56" stroke="#f8fafc" stroke-width="2.5"/></g></g></svg>',
  eras: '<svg viewBox="0 0 400 220" aria-label="Linha do tempo das eras"><g data-eras-bars></g><line x1="28" y1="138" x2="372" y2="138" stroke="currentColor" opacity=".35" stroke-width="2"/><g data-era-pin><line x1="200" y1="54" x2="200" y2="142" stroke="#fde047" stroke-width="3"/><circle cx="200" cy="50" r="7" fill="#fde047"/></g></svg>',
  narrative: '<svg viewBox="0 0 400 220" aria-label="Pirâmide de Freytag"><path d="M26 184H374" stroke="currentColor" opacity=".25"/><path data-arc fill="none" stroke="#f472b6" stroke-width="3.5" stroke-linejoin="round"/><circle data-story-dot cx="220" cy="55" r="8" fill="#fef08a"/><g font-size="10" fill="currentColor" opacity=".7"><text x="36" y="202">Início</text><text x="218" y="202" text-anchor="middle">Clímax</text><text x="366" y="202" text-anchor="end">Desfecho</text></g></svg>',
  colormix: '<svg viewBox="0 0 400 220" aria-label="Mistura aditiva RGB"><rect x="24" y="24" width="175" height="172" rx="16" fill="#0b0e17" stroke="currentColor" opacity=".35"/><circle data-r cx="92" cy="96" r="42" fill="#ff0000" style="mix-blend-mode:screen"/><circle data-g cx="132" cy="96" r="42" fill="#00ff00" style="mix-blend-mode:screen"/><circle data-b cx="112" cy="132" r="42" fill="#0000ff" style="mix-blend-mode:screen"/><rect data-swatch x="220" y="26" width="154" height="114" rx="14" fill="#50afeb" stroke="#ffffff55" stroke-width="2"/><rect data-comp x="220" y="152" width="154" height="44" rx="10" fill="#eb8c50" stroke="#ffffff40"/><text data-contrast-text x="297" y="90" text-anchor="middle" font-size="22" font-weight="700" fill="#0f172a">Aa</text></svg>',
  logicgates: '<svg viewBox="0 0 400 220" aria-label="Porta lógica digital"><path data-wire-a d="M40 82H150" stroke="#64748b" stroke-width="5" stroke-linecap="round"/><path data-wire-b d="M40 138H150" stroke="#64748b" stroke-width="5" stroke-linecap="round"/><path data-wire-out d="M250 110H340" stroke="#64748b" stroke-width="5" stroke-linecap="round"/><rect x="150" y="58" width="100" height="104" rx="16" fill="#1e293b" stroke="#94a3b8" stroke-width="3"/><text data-gate-label x="200" y="117" text-anchor="middle" fill="#f8fafc" font-size="22" font-weight="700">AND</text><circle data-led cx="352" cy="110" r="18" fill="#334155" stroke="#94a3b8" stroke-width="3"/></svg>'
};

const controlsFor = {
  projectile: () => range('speed', 'Velocidade (m/s)', 1, 30, 12) + range('angle', 'Ângulo (°)', 5, 85, 45) + range('gravity', 'Gravidade (m/s²)', 1.6, 20, 9.81, .01),
  pendulum: () => range('length', 'Comprimento (m)', .2, 3, 1, .1) + range('gravity', 'Gravidade (m/s²)', 1.6, 20, 9.81, .01),
  neutralization: () => range('acid', 'Ácido virtual (mL)', 0, 100, 50) + range('base', 'Base virtual (mL)', 0, 100, 25),
  circuit: () => range('voltage', 'Tensão (V)', 0, 24, 9, .5) + range('resistance', 'Resistência (Ω)', 10, 1000, 100, 10),
  waves: () => range('frequency', 'Frequência (Hz)', .5, 8, 2, .5) + range('amplitude', 'Amplitude (px)', 12, 65, 36) + range('speed', 'Velocidade (m/s)', 100, 600, 340, 10),
  states: () => selectControl('substance', 'Substância', Object.entries(matterSubstances).map(([id, item]) => [id, item.name])) + range('temperature', 'Temperatura (°C)', -150, 400, 25, 1),
  osmosis: () => range('outside', 'Soluto externo (mOsm/L)', 50, 600, 180, 10) + range('inside', 'Soluto interno (mOsm/L)', 150, 450, 300, 10),
  ecosystem: () => range('rate', 'Taxa de crescimento (r)', .1, 1.2, .45, .05) + range('capacity', 'Capacidade suporte (K)', 100, 1000, 500, 20) + range('time', 'Tempo (dias)', 0, 20, 10, .5),
  quadratic: () => range('a', 'Coeficiente a', -3, 3, 1, .5) + range('b', 'Coeficiente b', -6, 6, -2, .5) + range('c', 'Termo c', -5, 5, -3, .5),
  trigonometry: () => range('angle', 'Ângulo (°)', 0, 360, 45, 1),
  seasons: () => range('month', 'Mês do ano', 1, 12, 12, 1) + range('tilt', 'Inclinação axial (°)', 0, 45, 23.5, .5),
  eras: () => range('year', 'Ano histórico', -3000, 2026, 1500, 10),
  narrative: () => range('progress', 'Progresso (%)', 0, 100, 60, 1) + range('intensity', 'Intensidade dramática', 1, 5, 3, .5),
  colormix: () => range('r', 'Vermelho (R)', 0, 255, 80, 1) + range('g', 'Verde (G)', 0, 255, 175, 1) + range('b', 'Azul (B)', 0, 255, 235, 1),
  logicgates: () => selectControl('gate', 'Porta lógica', [['AND', 'AND (E)'], ['OR', 'OR (OU)'], ['XOR', 'XOR (OU exclusivo)'], ['NAND', 'NAND'], ['NOR', 'NOR']])
    + '<div class="simulation-toggles"><button type="button" data-sim-toggle="a" data-value="1" aria-pressed="true">Entrada A: 1</button><button type="button" data-sim-toggle="b" data-value="0" aria-pressed="false">Entrada B: 0</button></div>'
};

const notes = {
  projectile: 'Modelo sem resistência do ar.',
  pendulum: 'Pequenas oscilações: T = 2π√(L/g).',
  neutralization: 'Soluções virtuais de ácido/base fortes, 0,01 mol/L, 25 °C.',
  circuit: 'Circuito ideal: corrente e potência variam com V e R.',
  waves: 'Relação fundamental da ondulatória: v = λ · f.',
  states: 'Mudanças de fase conforme pontos de fusão e ebulição.',
  osmosis: 'Movimento da água do meio menos concentrado ao mais concentrado.',
  ecosystem: 'Modelo logístico de Verhulst limitado por recursos do ambiente.',
  quadratic: 'f(x) = ax² + bx + c, discriminante Δ e vértice da parábola.',
  trigonometry: 'Círculo de raio unitário: sen²θ + cos²θ = 1.',
  seasons: 'A inclinação do eixo terrestre define a incidência solar nos hemisférios.',
  eras: 'Escala proporcional entre 3000 a.C. e a atualidade.',
  narrative: 'Estrutura clássica de cinco etapas dramáticas.',
  colormix: 'Síntese aditiva de luz RGB, cor complementar e contraste WCAG.',
  logicgates: 'Álgebra booleana aplicada a circuitos digitais.'
};

const playable = new Set(['projectile', 'pendulum', 'waves', 'states', 'trigonometry', 'seasons', 'ecosystem']);

export function simulationMarkup(type = 'projectile') {
  const safeType = Object.hasOwn(simulationNames, type) ? type : 'projectile';
  const subject = simulationSubjects[safeType] || 'LAB';
  const visual = visuals[safeType] || visuals.projectile;
  const controls = (controlsFor[safeType] || controlsFor.projectile)();
  return `<section class="simulation-widget" data-simulation="${safeType}"><header><strong>${simulationNames[safeType]}</strong><span>${subject.toUpperCase()}</span></header>${visual}<div class="simulation-controls">${controls}</div><output class="simulation-result" aria-live="polite"></output>${playable.has(safeType) ? '<button type="button" data-sim-play>▶ Experimentar</button>' : ''}<small>${notes[safeType] || ''}</small></section>`;
}

export class Simulations {
  constructor() { this.items = new Map(); }
  mount(root) {
    for (const [node, item] of this.items) {
      if (!root?.contains(node)) { cancelAnimationFrame(item.frame); this.items.delete(node); }
    }
    for (const node of root?.querySelectorAll('[data-simulation]') || []) {
      if (this.items.has(node)) continue;
      const item = { node, running: false, frame: 0 };
      this.items.set(node, item);
      const values = () => ({
        ...Object.fromEntries([...node.querySelectorAll('[data-param]')].map(n => [n.dataset.param, Number(n.value)])),
        ...Object.fromEntries([...node.querySelectorAll('[data-sim-select]')].map(n => [n.dataset.simSelect, n.value])),
        ...Object.fromEntries([...node.querySelectorAll('[data-sim-toggle]')].map(n => [n.dataset.simToggle, Number(n.dataset.value)]))
      });

      const paintParticles = (phase, kinetic) => {
        const host = node.querySelector('[data-particles]');
        if (!host) return;
        const dots = [];
        for (let i = 0; i < 12; i++) {
          let x, y;
          if (kinetic < .25) {
            const col = i % 4, row = Math.floor(i / 4);
            x = 148 + col * 34 + Math.sin(phase * 14 + i) * 2.5;
            y = 115 + row * 25 + Math.cos(phase * 13 + i * 2) * 2.5;
          } else if (kinetic < .8) {
            const col = i % 4, row = Math.floor(i / 4);
            x = 118 + col * 52 + Math.sin(phase * 3 + i * 1.4) * 18;
            y = 132 + row * 20 + Math.cos(phase * 3.6 + i) * 9;
          } else {
            x = 100 + ((i * 59 + phase * 110 * (1 + (i % 3) * .35)) % 200);
            y = 42 + ((i * 47 + Math.abs(Math.sin(phase * (1.8 + (i % 4) * .3) + i)) * 130) % 136);
          }
          dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${kinetic < .25 ? '#93c5fd' : kinetic < .8 ? '#38bdf8' : '#fb923c'}"/>`);
        }
        host.innerHTML = dots.join('');
      };

      const paintWave = (p, shift = 0) => {
        const prop = waveProperties(p.frequency, p.speed);
        const pts = Array.from({ length: 65 }, (_, i) => {
          const x = 20 + (i / 64) * 360;
          const y = 110 - p.amplitude * Math.sin((i / 64) * p.frequency * Math.PI * 2 - shift);
          return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(' ');
        node.querySelector('[data-wave]')?.setAttribute('d', pts);
        node.querySelector('[data-amp]')?.setAttribute('y2', String(110 - p.amplitude));
        return prop;
      };

      const update = () => {
        cancelAnimationFrame(item.frame);
        item.running = false;
        node.querySelector('[data-sim-play]')?.removeAttribute('aria-pressed');
        const p = values(), type = node.dataset.simulation;
        for (const field of node.querySelectorAll('[data-param]')) {
          const out = node.querySelector(`[data-value="${field.dataset.param}"]`);
          if (out) out.textContent = field.value;
        }
        const resultEl = node.querySelector('.simulation-result');

        if (type === 'projectile') {
          const result = projectile(p.speed, p.angle, p.gravity);
          resultEl.textContent = `Alcance ${result.range.toFixed(1)} m · Altura ${result.height.toFixed(1)} m · Voo ${result.time.toFixed(1)} s`;
          const path = Array.from({ length: 51 }, (_, i) => {
            const t = result.time * i / 50;
            const x = p.speed * Math.cos(p.angle * Math.PI / 180) * t;
            const y = p.speed * Math.sin(p.angle * Math.PI / 180) * t - p.gravity * t * t / 2;
            return `${i ? 'L' : 'M'}${30 + x / Math.max(1, result.range) * 340} ${180 - y / Math.max(1, result.height) * 140}`;
          }).join(' ');
          node.querySelector('[data-trajectory]').setAttribute('d', path);
          node.querySelector('[data-motion]').setAttribute('transform', '');
        }
        else if (type === 'pendulum') {
          const period = 2 * Math.PI * Math.sqrt(p.length / p.gravity);
          resultEl.textContent = `Período ${period.toFixed(2)} s`;
          node.querySelector('[data-trajectory]').setAttribute('d', 'M200 20 L200 170');
          node.querySelector('[data-motion]').innerHTML = '<circle cx="200" cy="170" r="14" fill="#7bbba1"/>';
          node.querySelector('[data-motion]').setAttribute('transform', '');
          node.querySelector('[data-trajectory]').setAttribute('transform', '');
        }
        else if (type === 'neutralization') {
          const ph = mixturePH(p.acid, p.base);
          resultEl.textContent = `pH ${ph.toFixed(2)} · ${ph < 6.99 ? 'Ácido' : ph > 7.01 ? 'Básico' : 'Neutro'}`;
          node.querySelector('[data-liquid]').setAttribute('fill', `hsl(${ph * 19} 65% 60%)`);
        }
        else if (type === 'circuit') {
          const current = p.voltage / p.resistance, power = p.voltage * current;
          resultEl.textContent = `Corrente ${(current * 1000).toFixed(1)} mA · Potência ${power.toFixed(2)} W`;
          node.querySelector('[data-bulb]').setAttribute('opacity', String(.2 + Math.min(.8, power / 4)));
        }
        else if (type === 'waves') {
          const prop = paintWave(p, 0);
          resultEl.textContent = `λ = ${prop.wavelength.toFixed(1)} m · Período T = ${prop.period.toFixed(2)} s`;
        }
        else if (type === 'states') {
          const info = matterState(p.temperature, p.substance);
          paintParticles(0, info.kinetic);
          resultEl.textContent = `${info.state} · Fusão ${info.melt} °C · Ebulição ${info.boil} °C`;
        }
        else if (type === 'osmosis') {
          const os = osmosisState(p.outside, p.inside);
          const cell = node.querySelector('[data-cell]');
          cell?.setAttribute('rx', (58 * os.scale).toFixed(1));
          cell?.setAttribute('ry', (44 * os.scale).toFixed(1));
          const solutes = node.querySelector('[data-solutes]');
          if (solutes) {
            const count = Math.round((p.outside / 600) * 20);
            solutes.innerHTML = Array.from({ length: count }, (_, i) => {
              const angle = i * 2.39996, r = 95 + (i % 4) * 14;
              const x = Math.max(34, Math.min(366, 200 + Math.cos(angle) * r * 1.45));
              const y = Math.max(30, Math.min(190, 110 + Math.sin(angle) * r * .72));
              return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#fef08a" opacity=".85"/>`;
            }).join('');
          }
          const arrows = node.querySelector('[data-arrows]');
          if (arrows) {
            arrows.innerHTML = os.tonicity === 'Isotônica' ? '' : os.tonicity === 'Hipotônica'
              ? '<path d="M55 110h42m-9-8 9 8-9 8M345 110h-42m9-8-9 8 9 8"/>'
              : '<path d="M105 110H63m9-8-9 8 9 8M295 110h42m-9-8 9 8-9 8"/>';
          }
          resultEl.textContent = `Solução ${os.tonicity} · ${os.flow}`;
        }
        else if (type === 'ecosystem') {
          const pts = Array.from({ length: 41 }, (_, i) => {
            const t = i * .5, n = logisticPopulation(t, p.rate, p.capacity, 20);
            const x = 36 + (t / 20) * 336, y = 190 - (n / p.capacity) * 148;
            return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
          }).join(' ');
          node.querySelector('[data-curve]')?.setAttribute('d', pts);
          const nowN = logisticPopulation(p.time, p.rate, p.capacity, 20);
          const mx = 36 + (p.time / 20) * 336, my = 190 - (nowN / p.capacity) * 148;
          node.querySelector('[data-marker]')?.setAttribute('cx', mx.toFixed(1));
          node.querySelector('[data-marker]')?.setAttribute('cy', my.toFixed(1));
          resultEl.textContent = `N(${p.time}) = ${Math.round(nowN)} indivíduos · K = ${p.capacity}`;
        }
        else if (type === 'quadratic') {
          const m = quadraticMetrics(p.a, p.b, p.c);
          const pts = Array.from({ length: 65 }, (_, i) => {
            const x = -8 + (i / 64) * 16;
            const y = p.a * x * x + p.b * x + p.c;
            const px = 200 + x * 22, py = Math.max(-40, Math.min(260, 110 - y * 10));
            return `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
          }).join(' ');
          node.querySelector('[data-parabola]')?.setAttribute('d', pts);
          const marks = [];
          if (!m.linear) marks.push(`<circle cx="${(200 + m.xv * 22).toFixed(1)}" cy="${Math.max(10, Math.min(210, 110 - m.yv * 10)).toFixed(1)}" r="5" fill="#fde047"/>`);
          for (const r of m.roots) marks.push(`<circle cx="${(200 + r * 22).toFixed(1)}" cy="110" r="5" fill="#4ade80"/>`);
          node.querySelector('[data-points]').innerHTML = marks.join('');
          resultEl.textContent = m.linear
            ? `Reta (${p.b}x + ${p.c >= 0 ? p.c : `(${p.c})`}) · Raiz: ${m.roots.length ? m.roots[0].toFixed(1) : 'nenhuma'}`
            : `Δ = ${m.delta.toFixed(1)} · Vértice (${m.xv.toFixed(1)}, ${m.yv.toFixed(1)}) · ${m.roots.length ? 'Raízes: ' + m.roots.map(r => r.toFixed(1)).join(' e ') : 'Sem raízes reais'}`;
        }
        else if (type === 'trigonometry') {
          const t = trigValues(p.angle);
          const cx = 200 + 74 * t.cos, cy = 110 - 74 * t.sin;
          node.querySelector('[data-cos]')?.setAttribute('x2', cx.toFixed(1));
          node.querySelector('[data-sin]')?.setAttribute('x1', cx.toFixed(1));
          node.querySelector('[data-sin]')?.setAttribute('x2', cx.toFixed(1));
          node.querySelector('[data-sin]')?.setAttribute('y2', cy.toFixed(1));
          node.querySelector('[data-radius]')?.setAttribute('x2', cx.toFixed(1));
          node.querySelector('[data-radius]')?.setAttribute('y2', cy.toFixed(1));
          node.querySelector('[data-tip]')?.setAttribute('cx', cx.toFixed(1));
          node.querySelector('[data-tip]')?.setAttribute('cy', cy.toFixed(1));
          resultEl.textContent = `sen(${t.deg}°) = ${t.sin.toFixed(2)} · cos(${t.deg}°) = ${t.cos.toFixed(2)} · ${t.quadrant}`;
        }
        else if (type === 'seasons') {
          const s = seasonInfo(p.month, p.tilt);
          const tiltRot = p.tilt * Math.cos(2 * Math.PI * (s.month % 12) / 12);
          node.querySelector('[data-tilt]')?.setAttribute('transform', `rotate(${tiltRot.toFixed(1)})`);
          resultEl.textContent = `${s.monthName} · Sul: ${s.south} · Norte: ${s.north} · Declinação ${s.declination.toFixed(1)}°`;
        }
        else if (type === 'eras') {
          const info = historicalEra(p.year);
          const eras = [
            [-3000, 476, '#f59e0b', 'Antiga'],
            [476, 1453, '#38bdf8', 'Média'],
            [1453, 1789, '#a78bfa', 'Moderna'],
            [1789, 2026, '#4ade80', 'Contemp.']
          ];
          const bars = node.querySelector('[data-eras-bars]');
          if (bars) {
            bars.innerHTML = eras.map(([start, end, color, name]) => {
              const x1 = 28 + ((start + 3000) / 5026) * 344, x2 = 28 + ((end + 3000) / 5026) * 344;
              return `<rect x="${x1.toFixed(1)}" y="86" width="${Math.max(4, x2 - x1).toFixed(1)}" height="28" rx="4" fill="${color}" opacity=".85"/><text x="${((x1 + x2) / 2).toFixed(1)}" y="132" text-anchor="middle" font-size="9" fill="currentColor">${name}</text>`;
            }).join('');
          }
          const px = 28 + ((info.year + 3000) / 5026) * 344;
          node.querySelector('[data-era-pin]')?.setAttribute('transform', `translate(${(px - 200).toFixed(1)} 0)`);
          resultEl.textContent = `${info.label} · ${info.era} · ${info.milestone}`;
        }
        else if (type === 'narrative') {
          const st = narrativeStage(p.progress, p.intensity);
          const pts = Array.from({ length: 51 }, (_, i) => {
            const pr = i * 2, val = narrativeStage(pr, p.intensity).tension;
            return `${i ? 'L' : 'M'}${(26 + pr * 3.48).toFixed(1)} ${(184 - val * 1.45).toFixed(1)}`;
          }).join(' ');
          node.querySelector('[data-arc]')?.setAttribute('d', pts);
          node.querySelector('[data-story-dot]')?.setAttribute('cx', (26 + p.progress * 3.48).toFixed(1));
          node.querySelector('[data-story-dot]')?.setAttribute('cy', (184 - st.tension * 1.45).toFixed(1));
          resultEl.textContent = `${st.phase} (${st.progress}%) · Tensão ${st.tension}%`;
        }
        else if (type === 'colormix') {
          const c = colorMixInfo(p.r, p.g, p.b);
          node.querySelector('[data-r]')?.setAttribute('fill', `rgb(${p.r},0,0)`);
          node.querySelector('[data-g]')?.setAttribute('fill', `rgb(0,${p.g},0)`);
          node.querySelector('[data-b]')?.setAttribute('fill', `rgb(0,0,${p.b})`);
          node.querySelector('[data-swatch]')?.setAttribute('fill', c.hex);
          node.querySelector('[data-comp]')?.setAttribute('fill', c.complement);
          const txt = node.querySelector('[data-contrast-text]');
          if (txt) txt.setAttribute('fill', c.contrastBlack >= c.contrastWhite ? '#0f172a' : '#f8fafc');
          resultEl.textContent = `${c.hex} · Compl. ${c.complement} · Contraste ${Math.max(c.contrastBlack, c.contrastWhite).toFixed(1)}:1`;
        }
        else if (type === 'logicgates') {
          const res = evaluateGate(p.gate, p.a, p.b);
          const wireColor = v => v ? '#4ade80' : '#64748b';
          node.querySelector('[data-wire-a]')?.setAttribute('stroke', wireColor(res.a));
          node.querySelector('[data-wire-b]')?.setAttribute('stroke', wireColor(res.b));
          node.querySelector('[data-wire-out]')?.setAttribute('stroke', wireColor(res.out));
          node.querySelector('[data-gate-label]').textContent = res.gate;
          node.querySelector('[data-led]')?.setAttribute('fill', res.out ? '#4ade80' : '#334155');
          resultEl.textContent = `A(${res.a}) ${res.gate} B(${res.b}) = Saída ${res.out}`;
        }
      };

      node.addEventListener('input', update);
      node.addEventListener('change', update);
      node.addEventListener('click', event => {
        const toggle = event.target.closest('[data-sim-toggle]');
        if (toggle) {
          const next = toggle.dataset.value === '1' ? '0' : '1';
          toggle.dataset.value = next;
          toggle.setAttribute('aria-pressed', String(next === '1'));
          toggle.textContent = `Entrada ${toggle.dataset.simToggle.toUpperCase()}: ${next}`;
          update();
          return;
        }
        if (!event.target.closest('[data-sim-play]')) return;
        if (item.running) { update(); return; }
        item.running = true;
        node.querySelector('[data-sim-play]')?.setAttribute('aria-pressed', 'true');
        const p = values(), started = performance.now(), type = node.dataset.simulation;
        const projResult = projectile(p.speed || 12, p.angle || 45, p.gravity || 9.81);
        const frame = () => {
          if (!node.isConnected || document.hidden || !item.running) { item.running = false; return; }
          const seconds = (performance.now() - started) / 1000;
          if (type === 'pendulum') {
            const angle = Math.sin(seconds * 2 * Math.PI / (2 * Math.PI * Math.sqrt(p.length / p.gravity))) * 22;
            node.querySelector('[data-motion]')?.setAttribute('transform', `rotate(${angle} 200 20)`);
            node.querySelector('[data-trajectory]')?.setAttribute('transform', `rotate(${angle} 200 20)`);
          } else if (type === 'projectile') {
            const t = Math.min(projResult.time, seconds);
            const x = p.speed * Math.cos(p.angle * Math.PI / 180) * t;
            const y = p.speed * Math.sin(p.angle * Math.PI / 180) * t - p.gravity * t * t / 2;
            node.querySelector('[data-motion]')?.setAttribute('transform', `translate(${x / Math.max(1, projResult.range) * 340} ${-y / Math.max(1, projResult.height) * 140})`);
            if (t >= projResult.time) { item.running = false; node.querySelector('[data-sim-play]')?.removeAttribute('aria-pressed'); return; }
          } else if (type === 'waves') {
            paintWave(p, seconds * 5.2);
          } else if (type === 'states') {
            const info = matterState(p.temperature, p.substance);
            paintParticles(seconds, info.kinetic);
          } else if (type === 'trigonometry') {
            const input = node.querySelector('[data-param="angle"]');
            if (input) {
              const nextDeg = Math.round((p.angle + seconds * 65) % 360);
              input.value = String(nextDeg);
              const out = node.querySelector('[data-value="angle"]');
              if (out) out.textContent = String(nextDeg);
              const t = trigValues(nextDeg);
              const cx = 200 + 74 * t.cos, cy = 110 - 74 * t.sin;
              node.querySelector('[data-cos]')?.setAttribute('x2', cx.toFixed(1));
              node.querySelector('[data-sin]')?.setAttribute('x1', cx.toFixed(1));
              node.querySelector('[data-sin]')?.setAttribute('x2', cx.toFixed(1));
              node.querySelector('[data-sin]')?.setAttribute('y2', cy.toFixed(1));
              node.querySelector('[data-radius]')?.setAttribute('x2', cx.toFixed(1));
              node.querySelector('[data-radius]')?.setAttribute('y2', cy.toFixed(1));
              node.querySelector('[data-tip]')?.setAttribute('cx', cx.toFixed(1));
              node.querySelector('[data-tip]')?.setAttribute('cy', cy.toFixed(1));
              node.querySelector('.simulation-result').textContent = `sen(${t.deg}°) = ${t.sin.toFixed(2)} · cos(${t.deg}°) = ${t.cos.toFixed(2)} · ${t.quadrant}`;
            }
          } else if (type === 'seasons') {
            const input = node.querySelector('[data-param="month"]');
            if (input) {
              const m = ((Math.round(p.month) - 1 + Math.floor(seconds * 1.8)) % 12) + 1;
              input.value = String(m);
              const out = node.querySelector('[data-value="month"]');
              if (out) out.textContent = String(m);
              const s = seasonInfo(m, p.tilt);
              const tiltRot = p.tilt * Math.cos(2 * Math.PI * (s.month % 12) / 12);
              node.querySelector('[data-tilt]')?.setAttribute('transform', `rotate(${tiltRot.toFixed(1)})`);
              node.querySelector('.simulation-result').textContent = `${s.monthName} · Sul: ${s.south} · Norte: ${s.north} · Declinação ${s.declination.toFixed(1)}°`;
            }
          } else if (type === 'ecosystem') {
            const input = node.querySelector('[data-param="time"]');
            if (input) {
              const nextT = Math.min(20, (seconds * 4) % 20.5);
              const rounded = Math.round(nextT * 2) / 2;
              input.value = String(rounded);
              const out = node.querySelector('[data-value="time"]');
              if (out) out.textContent = String(rounded);
              const nowN = logisticPopulation(rounded, p.rate, p.capacity, 20);
              node.querySelector('[data-marker]')?.setAttribute('cx', (36 + (rounded / 20) * 336).toFixed(1));
              node.querySelector('[data-marker]')?.setAttribute('cy', (190 - (nowN / p.capacity) * 148).toFixed(1));
              node.querySelector('.simulation-result').textContent = `N(${rounded}) = ${Math.round(nowN)} indivíduos · K = ${p.capacity}`;
            }
          }
          item.frame = requestAnimationFrame(frame);
        };
        item.frame = requestAnimationFrame(frame);
      });
      update();
    }
  }
}
