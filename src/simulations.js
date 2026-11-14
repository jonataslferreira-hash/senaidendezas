import { labSims } from './sim-lab.js';
import { moreSims } from './sim-lab-2.js';
import { benchSims } from './sim-lab-3.js';
export { labSims, conjugate, conjugationVerbs, conjugationTenses, conjugationPersons, fractionInfo, timezoneInfo, binaryInfo, densityInfo, pythagorasInfo, photosynthesisInfo, warmingInfo } from './sim-lab.js';
export { mixInfo, hookeInfo, microscopeInfo } from './sim-lab-3.js';
export { seesawInfo, phInfo, matterInfo, heartInfo, contagionInfo, equationInfo, moonInfo, pixelInfo, refractionInfo, reactionInfo, planetInfo, seasonsInfo } from './sim-lab-2.js';

// Experimentos trocados por outros mais próximos do laboratório da escola.
for (const old of ['osmosis', 'ecosystem', 'pythagoras', 'greenhouse', 'binary']) delete labSims[old];
Object.assign(labSims, moreSims, benchSims);

export const simulationGroups = [
  ['Física', [
    ['projectile', 'Lançamento de projéteis'],
    ['pendulum', 'Pêndulo'],
    ['circuit', 'Circuito · Lei de Ohm'],
    ['waves', 'Ondas e frequência'],
    ['lever', labSims.lever.name],
    ['motion', labSims.motion.name],
    ['refraction', labSims.refraction.name],
    ['hooke', labSims.hooke.name]
  ]],
  ['Química', [
    ['neutralization', labSims.neutralization.name],
    ['states', labSims.states.name],
    ['density', labSims.density.name],
    ['reaction', labSims.reaction.name],
    ['mixing', labSims.mixing.name]
  ]],
  ['Biologia', [
    ['heart', labSims.heart.name],
    ['contagion', labSims.contagion.name],
    ['genetics', labSims.genetics.name],
    ['photosynthesis', labSims.photosynthesis.name],
    ['microscope', labSims.microscope.name]
  ]],
  ['Matemática', [
    ['quadratic', labSims.quadratic.name],
    ['trigonometry', 'Ciclo trigonométrico'],
    ['fractions', labSims.fractions.name],
    ['interest', labSims.interest.name],
    ['balance', labSims.balance.name]
  ]],
  ['Geografia', [
    ['seasons', labSims.seasons.name],
    ['moon', labSims.moon.name],
    ['solar', labSims.solar.name],
    ['timezones', labSims.timezones.name]
  ]],
  ['Português', [
    ['conjugation', labSims.conjugation.name]
  ]],
  ['Artes', [
    ['colormix', labSims.colormix.name]
  ]],
  ['Tecnologia', [
    ['pixels', labSims.pixels.name]
  ]]
];

export const simulationNames = Object.fromEntries(
  simulationGroups.flatMap(([, items]) => items)
);

export const simulationSubjects = Object.fromEntries(
  simulationGroups.flatMap(([subject, items]) => items.map(([id]) => [id, subject]))
);

export const simulationIds = Object.keys(simulationNames);

// Experimentos antigos que foram refeitos: slides salvos com o identificador
// anterior abrem o experimento novo da mesma disciplina.
export const simulationAliases = { eras: 'timezones', cipher: 'timezones', timeline: 'timezones', narrative: 'conjugation', textlab: 'conjugation', probability: 'fractions', logicgates: 'pixels', binary: 'pixels', osmosis: 'heart', ecosystem: 'contagion', pythagoras: 'balance', greenhouse: 'seasons' };
export const resolveSimulation = type => Object.hasOwn(simulationNames, type) ? type : simulationAliases[type] || 'projectile';

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

// Cifra de César: cada letra anda `shift` casas no alfabeto. Acentos são
// removidos antes (o alfabeto romano tinha só as letras básicas).
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

export function leverBalance(loadArm = 60, loadMass = 20, effortArm = 30, effort = 40) {
  const la = Math.max(1, Number(loadArm) || 1), lm = Math.max(0, Number(loadMass) || 0);
  const ea = Math.max(1, Number(effortArm) || 1), ef = Math.max(0, Number(effort) || 0);
  const loadTorque = lm * la, effortTorque = ef * ea;
  const required = loadTorque / ea;
  // A viga tomba para o lado com mais torque; o ângulo mostra o desequilíbrio.
  const imbalance = (effortTorque - loadTorque) / Math.max(1, loadTorque || 1);
  const tilt = Math.max(-16, Math.min(16, imbalance * 20));
  return { loadTorque, effortTorque, required, effort: ef, tilt, balanced: Math.abs(effortTorque - loadTorque) < 1 };
}

export function mendelCross(first = 'Aa', second = 'Aa') {
  const pick = (genotype, index) => String(genotype || 'Aa')[index] || 'a';
  const alleles = [[pick(first, 0), pick(second, 0)], [pick(first, 0), pick(second, 1)], [pick(first, 1), pick(second, 0)], [pick(first, 1), pick(second, 1)]]
    .map(([a, b]) => (a === 'A' && b === 'A' ? 'AA' : (a === 'A' || b === 'A') ? 'Aa' : 'aa'));
  const dominant = alleles.filter(item => item !== 'aa').length;
  const recessive = alleles.length - dominant;
  return { alleles, dominant, recessive, dominantRate: dominant / alleles.length };
}

export function diceProbability(dice = 2, target = 7) {
  const count = Math.max(1, Math.min(3, Math.round(Number(dice) || 1)));
  const sum = Math.max(count, Math.min(count * 6, Math.round(Number(target) || count)));
  let hits = 0, total = 0;
  const roll = (left, acc) => {
    if (!left) { total++; if (acc === sum) hits++; return; }
    for (let face = 1; face <= 6; face++) roll(left - 1, acc + face);
  };
  roll(count, 0);
  return { dice: count, target: sum, hits, total, probability: hits / total };
}

export function compoundInterest(principal = 1000, rate = 1, months = 12) {
  const p = Math.max(0, Number(principal) || 0), r = Math.max(0, Math.min(100, Number(rate) || 0)) / 100, n = Math.max(0, Math.min(360, Math.round(Number(months) || 0)));
  const amount = p * (1 + r) ** n;
  return { principal: p, amount, interest: amount - p, months: n };
}

export function greenhouseBalance(energy = 340, absorbed = 70) {
  const incoming = Math.max(0, Number(energy) || 0);
  const trapped = Math.max(0, Math.min(100, Number(absorbed) || 0)) / 100;
  const reflected = incoming * (1 - trapped) * .3;
  // 30% de retenção é a referência do equilíbrio pré-industrial (14 °C).
  const warming = trapped - .3;
  const temperature = 14 + warming * 12 + (incoming - 340) / 340 * 3;
  return { reflected, temperature, warming, seaLevel: 0.2 + Math.max(0, temperature - 14) * 0.45 };
}

const range = (key, label, min, max, value, step = 1) => `<label>${label} <output data-value="${key}">${value}</output><input aria-label="${label}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" data-param="${key}"><span class="simulation-adj"><button type="button" data-sim-step="${key}" data-step="-1" aria-label="Diminuir ${label}" title="Diminuir">−</button><button type="button" data-sim-step="${key}" data-step="1" aria-label="Aumentar ${label}" title="Aumentar">+</button></span></label>`;
const selectControl = (key, label, options) => `<label>${label}<select aria-label="${label}" data-sim-select="${key}">${options.map(([v, name]) => `<option value="${v}">${name}</option>`).join('')}</select></label>`;
const textControl = (key, label, value, max = 160) => `<label class="simulation-text">${label}<textarea aria-label="${label}" data-sim-text="${key}" maxlength="${max}" rows="2" spellcheck="false">${value}</textarea></label>`;

const visuals = {
  projectile: '<svg viewBox="0 0 400 220" aria-label="Visualização da simulação"><path d="M20 190H380" stroke="currentColor" opacity=".25"/><path data-trajectory fill="none" stroke="#a78bfa" stroke-width="3"/><g data-motion><circle cx="30" cy="180" r="12" fill="#a78bfa"/></g></svg>',
  pendulum: '<svg viewBox="0 0 400 220" aria-label="Visualização do pêndulo"><path d="M120 20H280" stroke="currentColor" opacity=".28" stroke-width="4" stroke-linecap="round"/><path data-trajectory fill="none" stroke="#a78bfa" stroke-width="3"/><g data-motion><circle cx="200" cy="170" r="14" fill="#7bbba1"/></g></svg>',
  neutralization: '<svg viewBox="0 0 400 220" aria-label="Solução e indicador de pH"><path d="M120 30v145q0 20 20 20h120q20 0 20-20V30" fill="none" stroke="currentColor" stroke-width="5"/><path data-liquid d="M124 95h152v80q0 16-16 16H140q-16 0-16-16Z" fill="#9d80e7" opacity=".8"/><text x="200" y="70" text-anchor="middle" fill="currentColor" font-size="20">H⁺ + OH⁻ → H₂O</text></svg>',
  circuit: '<svg viewBox="0 0 400 220" aria-label="Circuito elétrico"><path d="M70 110V40h250v140H70v-50" fill="none" stroke="#77b7d5" stroke-width="5"/><path d="M45 110h50m-40 20h30" stroke="currentColor" stroke-width="5"/><g data-electrons></g><circle data-bulb cx="320" cy="110" r="32" fill="#ffe594"/><path d="m300 95 40 30m0-30-40 30" stroke="#835a22" stroke-width="3"/><text x="180" y="30" text-anchor="middle" fill="currentColor" font-size="16">V = R · I</text></svg>',
  waves: '<svg viewBox="0 0 400 220" aria-label="Visualização de onda"><path d="M20 110H380" stroke="currentColor" opacity=".2" stroke-dasharray="5 5"/><path data-wave fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/><line data-amp x1="80" y1="110" x2="80" y2="70" stroke="#f472b6" stroke-width="2.5"/><text x="200" y="24" text-anchor="middle" fill="currentColor" font-size="14" opacity=".8">λ = v / f</text></svg>',
  states: '<svg viewBox="0 0 400 220" aria-label="Partículas da matéria"><rect x="75" y="24" width="250" height="172" rx="14" fill="#ffffff08" stroke="currentColor" stroke-width="3" opacity=".8"/><g data-particles></g></svg>',
  osmosis: '<svg viewBox="0 0 400 220" aria-label="Osmose celular"><rect x="20" y="18" width="360" height="184" rx="18" fill="#60a5fa1a" stroke="currentColor" opacity=".35"/><g data-solutes></g><ellipse data-cell cx="200" cy="110" rx="58" ry="44" fill="#fb7185" fill-opacity=".8" stroke="#fda4af" stroke-width="4"/><g data-arrows stroke="#7dd3fc" stroke-width="3" fill="none" stroke-linecap="round"></g></svg>',
  ecosystem: '<svg viewBox="0 0 400 220" aria-label="Curva logística populacional"><path d="M36 22V190H376" fill="none" stroke="currentColor" opacity=".35" stroke-width="2"/><line data-cap x1="36" y1="42" x2="376" y2="42" stroke="#fbbf24" stroke-dasharray="6 5" stroke-width="2"/><path data-curve fill="none" stroke="#4ade80" stroke-width="3.5"/><circle data-marker cx="180" cy="100" r="7" fill="#fef08a"/></svg>',
  quadratic: '<svg viewBox="0 0 400 220" aria-label="Gráfico da parábola"><path d="M20 110H380M200 16V204" stroke="currentColor" opacity=".28" stroke-width="1.5"/><path data-parabola fill="none" stroke="#c084fc" stroke-width="3"/><g data-points></g></svg>',
  trigonometry: '<svg viewBox="0 0 400 220" aria-label="Ciclo trigonométrico"><path d="M80 110H320M200 18V202" stroke="currentColor" opacity=".25"/><circle cx="200" cy="110" r="74" fill="none" stroke="currentColor" opacity=".4" stroke-width="2"/><line data-cos x1="200" y1="110" x2="252" y2="110" stroke="#38bdf8" stroke-width="4"/><line data-sin x1="252" y1="110" x2="252" y2="58" stroke="#fb7185" stroke-width="4"/><line data-radius x1="200" y1="110" x2="252" y2="58" stroke="#fde047" stroke-width="3"/><circle data-tip cx="252" cy="58" r="6" fill="#fde047"/></svg>',
  seasons: '<svg viewBox="0 0 400 220" aria-label="Sol e inclinação da Terra"><circle cx="72" cy="110" r="34" fill="#fbbf24"/><g stroke="#fde68a" stroke-width="2" opacity=".7"><line x1="116" y1="74" x2="210" y2="74"/><line x1="120" y1="110" x2="210" y2="110"/><line x1="116" y1="146" x2="210" y2="146"/></g><g data-earth transform="translate(275 110)"><circle r="44" fill="#2563eb"/><path data-shade d="M0-44A44 44 0 0 1 0 44Z" fill="#0f172a" opacity=".68"/><g data-tilt><line x1="-44" y1="0" x2="44" y2="0" stroke="#4ade80" stroke-width="2" stroke-dasharray="4 3"/><line x1="0" y1="-56" x2="0" y2="56" stroke="#f8fafc" stroke-width="2.5"/></g></g></svg>',
  lever: '<svg viewBox="0 0 400 220" aria-label="Alavanca com carga e esforço"><path d="M200 186 170 214h60Z" fill="currentColor" opacity=".55"/><g data-beam><rect x="46" y="172" width="308" height="14" rx="7" fill="#94a3b8"/><rect data-load x="96" y="132" width="46" height="40" rx="6" fill="#fb7185"/><circle data-effort cx="316" cy="150" r="18" fill="#4ade80"/></g><path d="M46 200h308" stroke="currentColor" opacity=".18"/></svg>',
  genetics: '<svg viewBox="0 0 400 220" aria-label="Cruzamento de Mendel"><g data-punnett></g><g data-phenotypes></g></svg>',
  probability: '<svg viewBox="0 0 400 220" aria-label="Probabilidade de dados"><g data-die-sets></g><path d="M36 190H376" stroke="currentColor" opacity=".25"/><g data-bars></g></svg>',
  interest: '<svg viewBox="0 0 400 220" aria-label="Curva de juros compostos"><path d="M36 30V190H376" fill="none" stroke="currentColor" opacity=".3" stroke-width="2"/><path data-growth fill="none" stroke="#a78bfa" stroke-width="3.5"/><path data-linear fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="6 5"/><circle data-end cx="370" cy="60" r="6" fill="#fde047"/></svg>',
  greenhouse: '<svg viewBox="0 0 400 220" aria-label="Efeito estufa"><circle cx="58" cy="34" r="20" fill="#fbbf24"/><path d="M58 62v42" stroke="#fbbf24" stroke-width="4"/><path d="M30 70l56 26M86 70 30 96" stroke="#fde68a" stroke-width="2.5" opacity=".8"/><path d="M20 190h360" stroke="currentColor" opacity=".25"/><path d="M120 190a80 80 0 0 1 160 0" fill="#38bdf81a" stroke="#38bdf8" stroke-width="3"/><path data-heat d="M150 176c14-16 34-10 34-26s-20-14-20-28" fill="none" stroke="#fb7185" stroke-width="3" stroke-linecap="round"/><path data-heat2 d="M220 176c14-16 34-10 34-26s-20-14-20-28" fill="none" stroke="#fb7185" stroke-width="3" stroke-linecap="round"/><g data-co2></g></svg>',
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
  colormix: () => range('r', 'Vermelho (R)', 0, 255, 80, 1) + range('g', 'Verde (G)', 0, 255, 175, 1) + range('b', 'Azul (B)', 0, 255, 235, 1),
  lever: () => range('loadMass', 'Carga (kg)', 0, 60, 20) + range('loadArm', 'Braço da carga (cm)', 10, 120, 60) + range('effortArm', 'Braço do esforço (cm)', 10, 120, 60) + range('effort', 'Força aplicada (kg)', 0, 80, 20),
  genetics: () => selectControl('first', 'Genitor 1', [['AA', 'AA · homozigoto dominante'], ['Aa', 'Aa · heterozigoto'], ['aa', 'aa · homozigoto recessivo']])
    + selectControl('second', 'Genitor 2', [['AA', 'AA · homozigoto dominante'], ['Aa', 'Aa · heterozigoto'], ['aa', 'aa · homozigoto recessivo']]),
  probability: () => range('dice', 'Quantidade de dados', 1, 3, 2) + range('target', 'Soma desejada', 1, 18, 7),
  interest: () => range('principal', 'Capital inicial (R$)', 0, 10000, 1000, 50) + range('rate', 'Juros ao mês (%)', 0, 10, 1, .1) + range('months', 'Meses', 0, 120, 12),
  greenhouse: () => range('energy', 'Energia solar recebida (W/m²)', 100, 500, 340, 5) + range('absorbed', 'Gases retidos (%)', 0, 100, 70),
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
  colormix: 'Síntese aditiva de luz RGB, cor complementar e contraste WCAG.',
  lever: 'Equilíbrio: carga × braço da carga = esforço × braço do esforço.',
  genetics: '1ª Lei de Mendel: segregação dos alelos na formação dos gametas.',
  probability: 'Espaço amostral finito: casos favoráveis divididos por casos possíveis.',
  interest: 'Montante M = C · (1 + i)ⁿ comparado ao crescimento linear.',
  greenhouse: 'Balanço radiativo simplificado: parte da energia fica retida na atmosfera.',
  logicgates: 'Álgebra booleana aplicada a circuitos digitais.'
};

const playable = new Set(['projectile', 'pendulum', 'circuit', 'waves', 'states', 'trigonometry', 'seasons', 'ecosystem']);
// Animações "de ambiente" começam sozinhas: o experimento já aparece vivo.
const ambient = new Set(['pendulum', 'circuit', 'waves', 'states']);
// Nestas a animação conduz um controle; mexer nele recomeça a partir do novo valor.
const restartOnInput = new Set(['projectile', 'trigonometry', 'seasons', 'ecosystem']);
const defaultParams = {
  projectile: { speed: 12, angle: 45, gravity: 9.81 },
  pendulum: { length: 1, gravity: 9.81 },
  neutralization: { acid: 50, base: 25 },
  circuit: { voltage: 9, resistance: 100 },
  waves: { frequency: 2, amplitude: 36, speed: 340 },
  states: { substance: 'water', temperature: 25 },
  osmosis: { outside: 180, inside: 300 },
  ecosystem: { rate: .45, capacity: 500, time: 10 },
  quadratic: { a: 1, b: -2, c: -3 },
  trigonometry: { angle: 45 },
  seasons: { month: 12, tilt: 23.5 },
  colormix: { r: 80, g: 175, b: 235 },
  lever: { loadMass: 20, loadArm: 60, effortArm: 60, effort: 10 },
  genetics: { first: 'Aa', second: 'Aa' },
  probability: { dice: 2, target: 7 },
  interest: { principal: 1000, rate: 1, months: 12 },
  greenhouse: { energy: 340, absorbed: 70 },
  logicgates: { gate: 'AND', a: 1, b: 0 }
};

// Experimentos descritos em sim-lab.js entram nas mesmas tabelas do motor.
const labVisual = sim => `<svg viewBox="0 0 400 220" aria-label="${sim.aria}"><g data-lab-scene></g></svg>`;
for (const [id, sim] of Object.entries(labSims)) {
  visuals[id] = labVisual(sim);
  controlsFor[id] = () => sim.controls.map(([kind, key, label, ...rest]) => kind === 'select' ? selectControl(key, label, rest[0])
    : kind === 'hidden' ? `<input type="hidden" data-param="${key}" value="${rest[0]}">`
    : kind === 'buttons' ? `<div class="simulation-actions" role="group" aria-label="${label}"><span>${label}</span>${rest[0].map(([action, name]) => `<button type="button" data-lab-act="${action}">${name}</button>`).join('')}</div>`
    : range(key, label, rest[0], rest[1], rest[2], rest[3] ?? 1)).join('');
  notes[id] = sim.note;
  defaultParams[id] = Object.fromEntries(sim.controls.filter(([kind]) => kind !== 'buttons').map(([kind, key, , ...rest]) => [key, kind === 'select' ? rest[0][0][0] : kind === 'hidden' ? rest[0] : rest[2]]));
  if (sim.drive || sim.ambient) playable.add(id);
  if (sim.ambient) ambient.add(id); else ambient.delete(id);
  if (sim.drive) restartOnInput.add(id); else restartOnInput.delete(id);
}
for (const table of [visuals, controlsFor, notes, defaultParams]) for (const old of ['timeline', 'probability', 'logicgates']) delete table[old];

function paintLab(node, p, time = 0) {
  const sim = labSims[node.dataset.simulation], metrics = sim.compute(p), scene = node.querySelector('[data-lab-scene]');
  if (scene) scene.innerHTML = sim.draw(p, metrics, time);
  const result = node.querySelector('.simulation-result');
  if (result) result.textContent = sim.text(metrics, p);
  return metrics;
}

export function simulationMarkup(type = 'projectile', { interactive = true } = {}) {
  const safeType = resolveSimulation(type);
  const subject = simulationSubjects[safeType] || 'LAB';
  const visual = visuals[safeType] || visuals.projectile;
  if (!interactive) {
    return `<section class="simulation-widget simulation-thumbnail" data-simulation="${safeType}"><header><strong>${simulationNames[safeType]}</strong><span>${subject.toUpperCase()}</span></header>${visual}<span class="simulation-result"></span><small>${notes[safeType] || ''}</small></section>`;
  }
  const controls = (controlsFor[safeType] || controlsFor.projectile)();
  return `<section class="simulation-widget" data-simulation="${safeType}"><header><strong>${simulationNames[safeType]}</strong><span>${subject.toUpperCase()}</span></header>${visual}<div class="simulation-controls">${controls}</div><output class="simulation-result" aria-live="polite"></output>${playable.has(safeType) ? `<button type="button" data-sim-play>${safeType === 'projectile' ? '▶ Lançar' : '▶ Animar'}</button>` : ''}<small>${notes[safeType] || ''}</small></section>`;
}

function readSimulationValues(node) {
  return {
    ...(defaultParams[node.dataset.simulation] || {}),
    ...Object.fromEntries([...node.querySelectorAll('[data-param]')].map(n => [n.dataset.param, Number(n.value)])),
    ...Object.fromEntries([...node.querySelectorAll('[data-sim-select]')].map(n => [n.dataset.simSelect, n.value])),
    ...Object.fromEntries([...node.querySelectorAll('[data-sim-text]')].map(n => [n.dataset.simText, n.value])),
    ...Object.fromEntries([...node.querySelectorAll('[data-sim-toggle]')].map(n => [n.dataset.simToggle, Number(n.dataset.value)]))
  };
}

function paintParticles(node, phase, kinetic) {
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
}

// Elétrons percorrem o fio retangular do circuito; quanto maior a corrente,
// mais cargas aparecem e mais depressa elas andam.
function paintElectrons(node, travelled, current) {
  const host = node.querySelector('[data-electrons]');
  if (!host) return;
  const count = current > 0 ? Math.max(4, Math.min(18, Math.round(4 + current * 60))) : 0;
  const at = distance => {
    const d = ((distance % 780) + 780) % 780;
    if (d < 250) return [70 + d, 40];
    if (d < 390) return [320, 40 + d - 250];
    if (d < 640) return [320 - (d - 390), 180];
    return [70, 180 - (d - 640)];
  };
  host.innerHTML = Array.from({ length: count }, (_, i) => {
    const [x, y] = at(travelled + i * 780 / count);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#fde047"/>`;
  }).join('');
}

function paintWave(node, p, shift = 0) {
  const prop = waveProperties(p.frequency, p.speed);
  const pts = Array.from({ length: 65 }, (_, i) => {
    const x = 20 + (i / 64) * 360;
    const y = 110 - p.amplitude * Math.sin((i / 64) * p.frequency * Math.PI * 2 - shift);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  node.querySelector('[data-wave]')?.setAttribute('d', pts);
  node.querySelector('[data-amp]')?.setAttribute('y2', String(110 - p.amplitude));
  return prop;
}

function paintSimulationNode(node) {
  const p = readSimulationValues(node), type = node.dataset.simulation;
  for (const field of node.querySelectorAll('[data-param]')) {
    const out = node.querySelector(`[data-value="${field.dataset.param}"]`);
    if (out) out.textContent = field.value;
  }
  const resultEl = node.querySelector('.simulation-result');
  if (!resultEl) return;
  let metrics = null;

  if (labSims[type]) metrics = paintLab(node, p, node.labTime || 0);
  else if (type === 'projectile') {
    const result = projectile(p.speed, p.angle, p.gravity);
    metrics = { range: result.range };
    resultEl.textContent = `Alcance ${result.range.toFixed(1)} m · Altura ${result.height.toFixed(1)} m · Voo ${result.time.toFixed(1)} s`;
    const path = Array.from({ length: 51 }, (_, i) => {
      const t = result.time * i / 50;
      const x = p.speed * Math.cos(p.angle * Math.PI / 180) * t;
      const y = p.speed * Math.sin(p.angle * Math.PI / 180) * t - p.gravity * t * t / 2;
      return `${i ? 'L' : 'M'}${30 + x / Math.max(1, result.range) * 340} ${180 - y / Math.max(1, result.height) * 140}`;
    }).join(' ');
    node.querySelector('[data-trajectory]')?.setAttribute('d', path);
    node.querySelector('[data-motion]')?.setAttribute('transform', '');
  }
  else if (type === 'pendulum') {
    const period = 2 * Math.PI * Math.sqrt(p.length / p.gravity);
    resultEl.textContent = `Período ${period.toFixed(2)} s`;
    // O fio desenhado acompanha o comprimento escolhido.
    const bobY = (52 + p.length / 3 * 128).toFixed(1);
    node.querySelector('[data-trajectory]')?.setAttribute('d', 'M200 20 L200 ' + bobY);
    const motion = node.querySelector('[data-motion]');
    if (motion) {
      motion.innerHTML = `<circle cx="200" cy="${bobY}" r="14" fill="#7bbba1"/>`;
      motion.setAttribute('transform', '');
    }
    node.querySelector('[data-trajectory]')?.setAttribute('transform', '');
  }
  else if (type === 'neutralization') {
    const ph = mixturePH(p.acid, p.base);
    metrics = { ph };
    resultEl.textContent = `pH ${ph.toFixed(2)} · ${ph < 6.99 ? 'Ácido' : ph > 7.01 ? 'Básico' : 'Neutro'}`;
    node.querySelector('[data-liquid]')?.setAttribute('fill', `hsl(${ph * 19} 65% 60%)`);
  }
  else if (type === 'circuit') {
    const current = p.voltage / p.resistance, power = p.voltage * current;
    metrics = { current };
    resultEl.textContent = `Corrente ${(current * 1000).toFixed(1)} mA · Potência ${power.toFixed(2)} W`;
    node.querySelector('[data-bulb]')?.setAttribute('opacity', String(.2 + Math.min(.8, power / 4)));
    paintElectrons(node, 0, current);
  }
  else if (type === 'waves') {
    const prop = paintWave(node, p, 0);
    resultEl.textContent = `λ = ${prop.wavelength.toFixed(1)} m · Período T = ${prop.period.toFixed(2)} s`;
  }
  else if (type === 'states') {
    const info = matterState(p.temperature, p.substance);
    paintParticles(node, 0, info.kinetic);
    resultEl.textContent = `${info.state} · Fusão ${info.melt} °C · Ebulição ${info.boil} °C`;
  }
  else if (type === 'osmosis') {
    const os = osmosisState(p.outside, p.inside);
    metrics = { tonicity: os.tonicity };
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
    const ptsHost = node.querySelector('[data-points]');
    if (ptsHost) ptsHost.innerHTML = marks.join('');
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
  else if (type === 'lever') {
    const lv = leverBalance(p.loadArm, p.loadMass, p.effortArm, p.effort);
    metrics = lv;
    const beam = node.querySelector('[data-beam]');
    if (beam) beam.setAttribute('transform', `rotate(${lv.tilt.toFixed(1)} 200 179)`);
    node.querySelector('[data-effort]')?.setAttribute('cx', (46 + Math.min(300, p.effortArm * 2.4)).toFixed(1));
    node.querySelector('[data-effort]')?.setAttribute('fill', lv.balanced ? '#4ade80' : '#facc15');
    node.querySelector('[data-load]')?.setAttribute('x', (200 - Math.min(140, p.loadArm * 1.6) - 23).toFixed(1));
    resultEl.textContent = `Carga ${lv.loadTorque.toFixed(0)} kgf·cm · Esforço ${lv.effortTorque.toFixed(0)} kgf·cm · ${lv.balanced ? 'Equilibrada' : p.effortArm > p.loadArm ? 'Desvantagem' : 'Vantagem mecânica'}`;
  }
  else if (type === 'genetics') {
    const mnd = mendelCross(p.first, p.second);
    metrics = mnd;
    const grid = node.querySelector('[data-punnett]');
    if (grid) {
      const cells = mnd.alleles.map((allele, i) => {
        const x = 112 + (i % 2) * 92, y = 74 + Math.floor(i / 2) * 62;
        const dominant = allele !== 'aa';
        return `<rect x="${x}" y="${y}" width="88" height="58" rx="9" fill="${dominant ? '#4ade8033' : '#fb718533'}" stroke="${dominant ? '#4ade80' : '#fb7185'}" stroke-width="2"/><text x="${x + 44}" y="${y + 36}" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${allele}</text>`;
      }).join('');
      grid.innerHTML = `<text x="112" y="56" font-size="14" fill="currentColor" opacity=".75">${p.first}</text><text x="34" y="110" font-size="14" fill="currentColor" opacity=".75">${p.second}</text>${cells}`;
    }
    const phenotypes = node.querySelector('[data-phenotypes]');
    if (phenotypes) {
      const height = 118 * mnd.dominantRate;
      phenotypes.innerHTML = `<rect x="316" y="${190 - height}" width="30" height="${Math.max(2, height)}" rx="5" fill="#4ade80"/><text x="331" y="${182 - height}" text-anchor="middle" font-size="11" fill="currentColor">${Math.round(mnd.dominantRate * 100)}%</text>`;
    }
    resultEl.textContent = `Dominantes ${mnd.dominant}/4 · Recessivos ${mnd.recessive}/4 · ${Math.round(mnd.dominantRate * 100)}% fenótipo dominante`;
  }
  else if (type === 'probability') {
    const dice = diceProbability(p.dice, p.target);
    metrics = dice;
    const sets = node.querySelector('[data-die-sets]');
    if (sets) sets.innerHTML = Array.from({ length: dice.dice }, (_, i) => `<rect x="${46 + i * 44}" y="26" width="36" height="36" rx="8" fill="currentColor" opacity=".16"/><text x="${64 + i * 44}" y="50" text-anchor="middle" font-size="16" fill="currentColor">🎲</text>`).join('');
    const bars = node.querySelector('[data-bars]');
    if (bars) {
      const min = dice.dice, max = dice.dice * 6, span = max - min;
      bars.innerHTML = Array.from({ length: span + 1 }, (_, i) => {
        const sum = min + i, chance = diceProbability(dice.dice, sum).probability;
        const x = 40 + (i / Math.max(1, span)) * 330, height = chance * 130;
        const active = sum === dice.target;
        return `<rect x="${x.toFixed(1)}" y="${(186 - height).toFixed(1)}" width="${Math.max(3, 320 / (span + 1) - 3).toFixed(1)}" height="${Math.max(1, height).toFixed(1)}" rx="3" fill="${active ? '#fde047' : '#38bdf8'}" opacity="${active ? 1 : .55}"/>`;
      }).join('');
    }
    resultEl.textContent = `${dice.hits} de ${dice.total} combinações dão ${dice.target} · P = ${(dice.probability * 100).toFixed(1)}%`;
  }
  else if (type === 'interest') {
    const money = compoundInterest(p.principal, p.rate, p.months);
    metrics = money;
    const maxAmount = Math.max(1, compoundInterest(p.principal, p.rate, 120).amount);
    const path = Array.from({ length: 61 }, (_, i) => {
      const month = Math.round(i / 60 * p.months);
      const value = compoundInterest(p.principal, p.rate, month).amount;
      return `${i ? 'L' : 'M'}${(36 + month / 120 * 334).toFixed(1)} ${(190 - value / maxAmount * 156).toFixed(1)}`;
    }).join(' ');
    node.querySelector('[data-growth]')?.setAttribute('d', path);
    const linear = Array.from({ length: 61 }, (_, i) => {
      const month = Math.round(i / 60 * p.months);
      const value = p.principal * (1 + p.rate / 100 * month);
      return `${i ? 'L' : 'M'}${(36 + month / 120 * 334).toFixed(1)} ${(190 - value / maxAmount * 156).toFixed(1)}`;
    }).join(' ');
    node.querySelector('[data-linear]')?.setAttribute('d', linear);
    const end = node.querySelector('[data-end]');
    if (end) {
      end.setAttribute('cx', (36 + p.months / 120 * 334).toFixed(1));
      end.setAttribute('cy', (190 - money.amount / maxAmount * 156).toFixed(1));
    }
    resultEl.textContent = `Montante ${money.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} · Juros ${money.interest.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`;
  }
  else if (type === 'greenhouse') {
    const heat = greenhouseBalance(p.energy, p.absorbed);
    metrics = heat;
    const tint = Math.max(0, Math.min(1, (heat.temperature - 4) / 26));
    node.querySelector('[data-heat]')?.setAttribute('opacity', String(.35 + tint * .65));
    node.querySelector('[data-heat2]')?.setAttribute('opacity', String(.25 + tint * .6));
    const co2 = node.querySelector('[data-co2]');
    if (co2) co2.innerHTML = Array.from({ length: Math.round(p.absorbed / 8) }, (_, i) => {
      const angle = i * 2.39996, r = 40 + (i % 5) * 22;
      return `<circle cx="${(200 + Math.cos(angle) * r * 1.5).toFixed(1)}" cy="${(150 + Math.sin(angle) * r * .5).toFixed(1)}" r="4" fill="#fca5a5" opacity=".7"/>`;
    }).join('');
    resultEl.textContent = `Temperatura média ${heat.temperature.toFixed(1)} °C · Refletido ${heat.reflected.toFixed(0)} W/m² · Nível do mar +${heat.seaLevel.toFixed(1)} m`;
  }
  else if (type === 'logicgates') {
    const res = evaluateGate(p.gate, p.a, p.b);
    metrics = { out: res.out };
    const wireColor = v => v ? '#4ade80' : '#64748b';
    node.querySelector('[data-wire-a]')?.setAttribute('stroke', wireColor(res.a));
    node.querySelector('[data-wire-b]')?.setAttribute('stroke', wireColor(res.b));
    node.querySelector('[data-wire-out]')?.setAttribute('stroke', wireColor(res.out));
    const gateLabel = node.querySelector('[data-gate-label]');
    if (gateLabel) gateLabel.textContent = res.gate;
    node.querySelector('[data-led]')?.setAttribute('fill', res.out ? '#4ade80' : '#334155');
    resultEl.textContent = `A(${res.a}) ${res.gate} B(${res.b}) = Saída ${res.out}`;
  }

}

export class Simulations {
  constructor() { this.items = new Map(); }
  dispose() {
    for (const item of this.items.values()) cancelAnimationFrame(item.frame);
    this.items.clear();
  }
  mountStatic(root) {
    for (const node of root?.querySelectorAll('.simulation-thumbnail[data-simulation], [inert] [data-simulation]') || []) {
      paintSimulationNode(node);
    }
  }
  mount(root) {
    for (const [node, item] of this.items) {
      if (!root?.contains(node)) { cancelAnimationFrame(item.frame); this.items.delete(node); }
    }
    for (const node of root?.querySelectorAll('[data-simulation]') || []) {
      if (node.classList.contains('simulation-thumbnail') || node.closest('[inert]')) {
        paintSimulationNode(node);
        continue;
      }
      if (this.items.has(node)) continue;
      const item = { node, running: false, frame: 0 };
      this.items.set(node, item);

      const playButton = () => node.querySelector('[data-sim-play]');
      const setRunning = running => {
        item.running = running;
        const button = playButton();
        if (!button) return;
        if (running) button.setAttribute('aria-pressed', 'true'); else button.removeAttribute('aria-pressed');
        const idle = type === 'projectile' ? '▶ Lançar' : '▶ Animar';
        button.textContent = running ? '⏸ Pausar' : idle;
      };
      const type = node.dataset.simulation;
      const stop = () => { cancelAnimationFrame(item.frame); setRunning(false); paintSimulationNode(node); };
      // Mexer em um controle NÃO para a animação: os valores novos entram no
      // quadro seguinte. Só as animações que conduzem o próprio controle
      // recomeçam do valor escolhido.
      const update = () => {
        paintSimulationNode(node);
        if (!item.running) return;
        item.p = readSimulationValues(node);
        if (restartOnInput.has(type)) item.started = performance.now();
      };
      const start = () => {
        cancelAnimationFrame(item.frame);
        item.p = readSimulationValues(node);
        item.started = performance.now();
        item.travelled = 0; item.last = item.started;
        setRunning(true);
        item.frame = requestAnimationFrame(frame);
      };

      node.addEventListener('input', update);
      node.addEventListener('change', update);
      // Peças clicáveis da cena e botões de ação (ex.: despejar um béquer).
      // Na cena vale o pointerdown: o SVG é redesenhado a cada quadro e o "click" se perderia.
      const act = event => {
        const target = event.target.closest?.('[data-lab-act]'), sim = labSims[type];
        if (!target || !sim?.act || !node.contains(target)) return;
        const inScene = Boolean(target.closest('svg'));
        if (inScene !== (event.type === 'pointerdown')) return;
        const next = sim.act(readSimulationValues(node), target.dataset.labAct, node.labTime || 0);
        if (!next) return;
        for (const [key, value] of Object.entries(next)) { const field = node.querySelector(`[data-param="${key}"]`); if (field) field.value = String(value); }
        update();
      };
      node.addEventListener('pointerdown', act);
      node.addEventListener('click', act);
      node.addEventListener('click', event => {
        const stepper = event.target.closest('[data-sim-step]');
        if (stepper) {
          const field = node.querySelector(`[data-param="${stepper.dataset.simStep}"]`);
          if (field) {
            const step = Number(field.step) || 1, direction = Number(stepper.dataset.step) || 1;
            const next = Math.max(Number(field.min), Math.min(Number(field.max), Number(field.value) + step * direction));
            field.value = String(Math.round(next * 1000) / 1000);
            update();
          }
          return;
        }
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
        if (item.running) { stop(); return; }
        start();
      });
      const frame = () => {
          if (!node.isConnected || !item.running) { item.running = false; return; }
          // Aba em segundo plano: espera sem perder o estado de "tocando".
          if (document.hidden) { item.frame = requestAnimationFrame(frame); return; }
          const now = performance.now(), p = item.p, started = item.started;
          const seconds = (now - started) / 1000, delta = Math.min(.1, (now - (item.last || now)) / 1000);
          item.last = now;
          if (labSims[type]) {
            const sim = labSims[type];
            node.labTime = (node.labTime || 0) + delta;
            if (sim.drive) {
              // A animação conduz um dos controles, em loop, a partir do valor escolhido.
              const drive = sim.drive, input = node.querySelector(`[data-param="${drive.param}"]`), span = drive.max - drive.min;
              const raw = drive.min + ((p[drive.param] - drive.min + seconds * drive.speed) % span);
              const value = Math.min(Number(input?.max ?? drive.max), Math.round(raw / drive.step) * drive.step);
              if (input) input.value = String(value);
              const out = node.querySelector(`[data-value="${drive.param}"]`);
              if (out) out.textContent = String(value);
              paintLab(node, { ...p, [drive.param]: value }, node.labTime);
            } else paintLab(node, p, node.labTime);
          } else if (type === 'pendulum') {
            // Fase acumulada: mudar o comprimento altera o ritmo sem dar salto.
            item.phase = (item.phase || 0) + delta * Math.sqrt(p.gravity / p.length);
            const angle = Math.sin(item.phase) * 24;
            node.querySelector('[data-motion]')?.setAttribute('transform', `rotate(${angle} 200 20)`);
            node.querySelector('[data-trajectory]')?.setAttribute('transform', `rotate(${angle} 200 20)`);
          } else if (type === 'circuit') {
            const current = p.voltage / p.resistance;
            item.travelled = (item.travelled || 0) + delta * (30 + current * 900);
            paintElectrons(node, item.travelled, current);
          } else if (type === 'projectile') {
            const projResult = projectile(p.speed || 12, p.angle || 45, p.gravity || 9.81);
            // Em loop: voa, descansa meio segundo no chão e lança de novo.
            const cycle = projResult.time + .6;
            const t = Math.min(projResult.time, seconds % cycle);
            const x = p.speed * Math.cos(p.angle * Math.PI / 180) * t;
            const y = p.speed * Math.sin(p.angle * Math.PI / 180) * t - p.gravity * t * t / 2;
            node.querySelector('[data-motion]')?.setAttribute('transform', `translate(${x / Math.max(1, projResult.range) * 340} ${-y / Math.max(1, projResult.height) * 140})`);
          } else if (type === 'waves') {
            item.phase = (item.phase || 0) + delta * (2 + p.frequency * 1.6);
            paintWave(node, p, item.phase);
          } else if (type === 'states') {
            const info = matterState(p.temperature, p.substance);
            item.phase = (item.phase || 0) + delta * (.35 + info.kinetic * 1.1);
            paintParticles(node, item.phase, info.kinetic);
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
      paintSimulationNode(node);
      const calm = globalThis.document?.documentElement.dataset.motion === 'reduced' || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (ambient.has(type) && !calm) start();
    }
  }
}
