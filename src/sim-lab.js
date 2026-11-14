// Experimentos do laboratório descritos como dados: cada um diz quais controles
// tem, como calcula (compute), como desenha a cena em SVG 400×220 (draw) e que
// frase mostra no resultado (text). O motor em simulations.js cuida do resto.

const num = (value, digits = 1) => Number(value).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const short = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const label = (x, y, text, { size = 11, anchor = 'middle', color = 'currentColor', weight = 400, opacity = 1 } = {}) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}" opacity="${opacity}">${text}</text>`;
const arrow = (x1, y1, x2, y2, color, width = 2.5) => {
  const angle = Math.atan2(y2 - y1, x2 - x1), head = 7;
  const a = [x2 - head * Math.cos(angle - .45), y2 - head * Math.sin(angle - .45)], b = [x2 - head * Math.cos(angle + .45), y2 - head * Math.sin(angle + .45)];
  return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none"/><path d="M${x2.toFixed(1)} ${y2.toFixed(1)}L${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}Z" fill="${color}"/>`;
};
// Sequência pseudoaleatória fixa: a cena não "pula" a cada repintura.
const seeded = index => { const value = Math.sin(index * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
const wave = value => Math.abs((((value % 2) + 2) % 2) - 1);

// ---------------------------------------------------------------- Conjugação
export const conjugationVerbs = ['cantar', 'estudar', 'vender', 'aprender', 'partir', 'dividir'];
export const conjugationTenses = {
  presente: 'Presente', perfeito: 'Pretérito perfeito', imperfeito: 'Pretérito imperfeito',
  maisqueperfeito: 'Pretérito mais-que-perfeito', futuro: 'Futuro do presente', futuropreterito: 'Futuro do pretérito'
};
const conjugationEndings = {
  ar: { presente: ['o', 'as', 'a', 'amos', 'ais', 'am'], perfeito: ['ei', 'aste', 'ou', 'amos', 'astes', 'aram'], imperfeito: ['ava', 'avas', 'ava', 'ávamos', 'áveis', 'avam'], maisqueperfeito: ['ara', 'aras', 'ara', 'áramos', 'áreis', 'aram'] },
  er: { presente: ['o', 'es', 'e', 'emos', 'eis', 'em'], perfeito: ['i', 'este', 'eu', 'emos', 'estes', 'eram'], imperfeito: ['ia', 'ias', 'ia', 'íamos', 'íeis', 'iam'], maisqueperfeito: ['era', 'eras', 'era', 'êramos', 'êreis', 'eram'] },
  ir: { presente: ['o', 'es', 'e', 'imos', 'is', 'em'], perfeito: ['i', 'iste', 'iu', 'imos', 'istes', 'iram'], imperfeito: ['ia', 'ias', 'ia', 'íamos', 'íeis', 'iam'], maisqueperfeito: ['ira', 'iras', 'ira', 'íramos', 'íreis', 'iram'] }
};
const futureEndings = { futuro: ['ei', 'ás', 'á', 'emos', 'eis', 'ão'], futuropreterito: ['ia', 'ias', 'ia', 'íamos', 'íeis', 'iam'] };
export const conjugationPersons = ['eu', 'tu', 'ele/ela', 'nós', 'vós', 'eles/elas'];
export function conjugate(verb = 'cantar', tense = 'presente') {
  const safeVerb = conjugationVerbs.includes(verb) ? verb : 'cantar';
  const safeTense = Object.hasOwn(conjugationTenses, tense) ? tense : 'presente';
  const group = safeVerb.slice(-2), future = Object.hasOwn(futureEndings, safeTense);
  // Nos futuros a terminação entra depois do infinitivo inteiro.
  const stem = future ? safeVerb : safeVerb.slice(0, -2);
  const endings = future ? futureEndings[safeTense] : conjugationEndings[group][safeTense];
  return {
    verb: safeVerb, tense: safeTense, tenseName: conjugationTenses[safeTense], stem,
    group: group === 'ar' ? '1ª conjugação (-ar)' : group === 'er' ? '2ª conjugação (-er)' : '3ª conjugação (-ir)',
    endings, forms: endings.map(ending => stem + ending)
  };
}
const verbComplement = { cantar: 'no coral', estudar: 'para a prova', vender: 'frutas na feira', aprender: 'uma língua nova', partir: 'bem cedo', dividir: 'o lanche' };
const tenseOpening = { presente: 'Hoje', perfeito: 'Ontem', imperfeito: 'Antigamente', maisqueperfeito: 'Antes disso,', futuro: 'Amanhã', futuropreterito: 'Se pudesse,' };
const tenseMoment = { presente: 1, perfeito: 0, imperfeito: 0, maisqueperfeito: 0, futuro: 2, futuropreterito: 2 };

// ------------------------------------------------------------------- Cálculos
export function fractionInfo(numerator = 3, denominator = 4) {
  const d = clamp(Math.round(Number(denominator) || 1), 1, 12), n = clamp(Math.round(Number(numerator) || 0), 0, 12);
  const gcd = (a, b) => b ? gcd(b, a % b) : a, divisor = gcd(n, d) || 1;
  return { numerator: n, denominator: d, value: n / d, percent: n / d * 100, simpleNumerator: n / divisor, simpleDenominator: d / divisor,
    kind: n === 0 ? 'nula' : n % d === 0 ? 'aparente (número inteiro)' : n < d ? 'própria (menor que 1)' : 'imprópria (maior que 1)' };
}
export const timezoneCities = {
  london: ['Londres', 0], lisbon: ['Lisboa', 0], tokyo: ['Tóquio', 9], newyork: ['Nova York', -5], losangeles: ['Los Angeles', -8], manaus: ['Manaus', -4],
  noronha: ['Fernando de Noronha', -2], cairo: ['Cairo', 2], delhi: ['Nova Délhi', 5.5], sydney: ['Sydney', 10]
};
export function timezoneInfo(hour = 12, city = 'tokyo') {
  const [name, offset] = timezoneCities[city] || timezoneCities.tokyo, base = clamp(Math.round(Number(hour) || 0), 0, 23);
  const difference = offset + 3, raw = base + difference, local = ((raw % 24) + 24) % 24;
  const clock = value => `${String(Math.floor(value)).padStart(2, '0')}:${value % 1 ? '30' : '00'}`;
  return { name, offset, base, difference, local, dayShift: Math.floor(raw / 24), baseClock: clock(base), localClock: clock(local) };
}
export function binaryInfo(value = 13) {
  const decimal = clamp(Math.round(Number(value) || 0), 0, 255), bits = decimal.toString(2).padStart(8, '0');
  return { decimal, bits, parts: [...bits].map((bit, index) => bit === '1' ? 2 ** (7 - index) : 0).filter(Boolean) };
}
export const densityLiquids = { water: ['Água', 1, '#38bdf8'], oil: ['Óleo de cozinha', .92, '#facc15'], alcohol: ['Álcool', .79, '#a5f3fc'], honey: ['Mel', 1.42, '#f59e0b'], mercury: ['Mercúrio', 13.6, '#cbd5e1'] };
export function densityInfo(mass = 200, volume = 250, liquid = 'water') {
  const m = Math.max(1, Number(mass) || 1), v = Math.max(1, Number(volume) || 1), [liquidName, liquidDensity, color] = densityLiquids[liquid] || densityLiquids.water;
  const density = m / v;
  return { mass: m, volume: v, liquid: densityLiquids[liquid] ? liquid : 'water', liquidName, liquidDensity, color, density, floats: density < liquidDensity, submerged: clamp(density / liquidDensity, 0, 1) };
}
export function pythagorasInfo(a = 3, b = 4) {
  const x = clamp(Math.round(Number(a) || 1), 1, 12), y = clamp(Math.round(Number(b) || 1), 1, 12), square = x * x + y * y, c = Math.sqrt(square);
  return { a: x, b: y, square, c, exact: Number.isInteger(c) };
}
export function photosynthesisInfo(light = 80, co2 = 60, water = 70) {
  const factors = [['luz', clamp(Number(light) || 0, 0, 100)], ['gás carbônico', clamp(Number(co2) || 0, 0, 100)], ['água', clamp(Number(water) || 0, 0, 100)]];
  const limiting = factors.reduce((low, item) => item[1] < low[1] ? item : low);
  return { light: factors[0][1], co2: factors[1][1], water: factors[2][1], rate: limiting[1], limiting: limiting[0] };
}
export function warmingInfo(co2 = 420, albedo = 30) {
  const ppm = clamp(Number(co2) || 280, 180, 800), reflected = clamp(Number(albedo) || 30, 20, 40);
  // Modelo didático: cerca de 3 °C a cada vez que o CO₂ dobra em relação a 1850 (280 ppm).
  const temperature = 13.8 + 3 * Math.log2(ppm / 280) + (30 - reflected) * .35;
  return { co2: ppm, albedo: reflected, temperature, warming: temperature - 13.8, trapped: clamp(.3 + (ppm - 180) / 620 * .6, 0, 1) };
}
const namedColors = [['preto', 0, 0, 0], ['branco', 255, 255, 255], ['cinza', 128, 128, 128], ['vermelho', 255, 0, 0], ['verde', 0, 200, 0], ['azul', 0, 0, 255], ['amarelo', 255, 255, 0], ['ciano', 0, 255, 255], ['magenta', 255, 0, 255], ['laranja', 255, 140, 0], ['roxo', 130, 40, 200], ['rosa', 255, 150, 190], ['marrom', 120, 70, 30], ['azul-claro', 110, 180, 255], ['verde-claro', 150, 255, 150]];
const substances = { water: ['Água', 0, 100], ethanol: ['Etanol (álcool)', -114, 78], mercury: ['Mercúrio', -39, 357] };

// ---------------------------------------------------------------- Experimentos
export const labSims = {
  lever: {
    name: 'Alavanca · gangorra', subject: 'Física', aria: 'Alavanca com carga e força',
    note: 'A alavanca equilibra quando peso × distância é igual dos dois lados do apoio.',
    controls: [['range', 'loadMass', 'Peso da carga (kg)', 5, 60, 20, 1], ['range', 'loadArm', 'Distância da carga ao apoio (cm)', 10, 100, 50, 5], ['range', 'effort', 'Força aplicada (kgf)', 0, 60, 10, 1], ['range', 'effortArm', 'Distância da força ao apoio (cm)', 10, 100, 100, 5]],
    compute(p) {
      const loadTorque = p.loadMass * p.loadArm, effortTorque = p.effort * p.effortArm, diff = effortTorque - loadTorque;
      const balanced = Math.abs(diff) <= Math.max(1, loadTorque * .02);
      return { ...p, loadTorque, effortTorque, balanced, tilt: balanced ? 0 : clamp(diff / Math.max(loadTorque, effortTorque, 1) * 14, -14, 14), required: loadTorque / p.effortArm };
    },
    draw(p, m) {
      const loadX = 200 - p.loadArm * 1.6, effortX = 200 + p.effortArm * 1.6, size = 18 + p.loadMass * .35;
      const ticks = Array.from({ length: 11 }, (_, i) => `<path d="M${40 + i * 32} 152v5" stroke="#0f172a" stroke-width="1.5" opacity=".5"/>`).join('');
      return `${label(100, 20, `carga: ${p.loadMass} × ${p.loadArm} = ${m.loadTorque}`, { color: '#fb7185', weight: 700 })}${label(300, 20, `força: ${p.effort} × ${p.effortArm} = ${m.effortTorque}`, { color: '#4ade80', weight: 700 })}
        ${label(200, 40, m.balanced ? 'EQUILÍBRIO ✓' : m.tilt < 0 ? 'A carga é mais forte' : 'A força é mais forte', { size: 13, weight: 800, color: m.balanced ? '#fde047' : 'currentColor' })}
        <g transform="rotate(${m.tilt.toFixed(2)} 200 150)"><rect x="30" y="144" width="340" height="9" rx="4.5" fill="#cbd5e1"/>${ticks}
        <rect x="${(loadX - size / 2).toFixed(1)}" y="${(144 - size).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="4" fill="#fb7185"/>${label(loadX, 144 - size - 5, `${p.loadMass} kg`, { size: 10, weight: 700, color: '#fb7185' })}
        ${p.effort > 0 ? arrow(effortX, 144 - 22 - p.effort * .6, effortX, 141, '#4ade80', 4) : ''}${label(effortX, 144 - 28 - p.effort * .6, `${p.effort} kgf`, { size: 10, weight: 700, color: '#4ade80' })}</g>
        <path d="M200 153 178 190h44Z" fill="#94a3b8"/><path d="M24 190h352" stroke="currentColor" opacity=".3"/>${label(200, 206, 'apoio', { size: 9, opacity: .7 })}`;
    },
    text: m => m.balanced ? `Equilíbrio: ${m.loadMass} kg × ${m.loadArm} cm = ${m.effort} kgf × ${m.effortArm} cm` : `Para equilibrar a ${m.effortArm} cm do apoio são precisos ${short(m.required)} kgf (você aplicou ${m.effort})`,
    challenge: { label: 'Desafio', prompt: 'Equilibre uma carga de 40 kg usando só 10 kgf', test: r => r.loadMass === 40 && r.effort === 10 && r.balanced, hint: 'Aproxime a carga do apoio e afaste a força: 40 × 25 = 10 × 100.' }
  },
  motion: {
    name: 'Movimento uniforme · velocidade', subject: 'Física', aria: 'Carro em movimento uniforme e gráfico de posição',
    note: 'No movimento uniforme a velocidade não muda: a distância cresce igual a cada segundo.',
    controls: [['range', 'speed', 'Velocidade (m/s)', 1, 30, 10, 1], ['range', 'time', 'Tempo (s)', 0, 20, 5, .5]],
    drive: { param: 'time', min: 0, max: 20, speed: 4, step: .5 },
    compute: p => ({ ...p, distance: p.speed * p.time }),
    draw(p, m) {
      const carX = 30 + m.distance / 600 * 340, gx = t => 50 + t / 20 * 320, gy = s => 200 - s / 600 * 100;
      return `<path d="M30 62h340" stroke="currentColor" stroke-width="2" opacity=".5"/>${[0, 100, 200, 300, 400, 500, 600].map(s => `<path d="M${30 + s / 600 * 340} 62v6" stroke="currentColor" opacity=".5"/>${label(30 + s / 600 * 340, 80, s + ' m', { size: 8, opacity: .7 })}`).join('')}
        <g transform="translate(${carX.toFixed(1)} 0)"><rect x="-17" y="40" width="34" height="13" rx="4" fill="#38bdf8"/><rect x="-9" y="32" width="18" height="10" rx="3" fill="#7dd3fc"/><circle cx="-9" cy="55" r="5" fill="#0f172a" stroke="#e2e8f0"/><circle cx="9" cy="55" r="5" fill="#0f172a" stroke="#e2e8f0"/></g>
        ${label(carX, 24, `${short(m.distance)} m`, { weight: 700, color: '#fde047' })}
        <path d="M50 96V200H374" fill="none" stroke="currentColor" opacity=".4" stroke-width="1.5"/>${label(46, 104, 'posição (m)', { size: 8, anchor: 'start', opacity: .7 })}${label(372, 213, 'tempo (s)', { size: 8, anchor: 'end', opacity: .7 })}
        ${[5, 10, 15, 20].map(t => label(gx(t), 211, String(t), { size: 8, opacity: .6 })).join('')}
        <path d="M${gx(0)} ${gy(0)}L${gx(20)} ${gy(p.speed * 20).toFixed(1)}" stroke="#a78bfa" stroke-width="2.5" fill="none"/>
        <path d="M${gx(p.time).toFixed(1)} 200V${gy(m.distance).toFixed(1)}H50" stroke="#fde047" stroke-dasharray="3 3" fill="none" opacity=".7"/><circle cx="${gx(p.time).toFixed(1)}" cy="${gy(m.distance).toFixed(1)}" r="5" fill="#fde047"/>`;
    },
    text: m => `distância = velocidade × tempo = ${m.speed} × ${short(m.time)} = ${short(m.distance)} m`,
    challenge: { label: 'Desafio', prompt: 'Percorra exatamente 120 m em 8 s', test: r => r.time === 8 && r.distance === 120, hint: 'velocidade = distância ÷ tempo = 120 ÷ 8.' }
  },
  states: {
    name: 'Estados da matéria', subject: 'Química', aria: 'Partículas de uma substância em um recipiente',
    note: 'Quanto mais quente, mais as partículas se agitam e se afastam: sólido → líquido → gás.',
    controls: [['select', 'substance', 'Substância', Object.entries(substances).map(([id, item]) => [id, item[0]])], ['range', 'temperature', 'Temperatura (°C)', -150, 400, 25, 5]],
    ambient: true,
    compute(p) {
      const [name, melt, boil] = substances[p.substance] || substances.water;
      const state = p.temperature < melt ? 'sólido' : p.temperature < boil ? 'líquido' : 'gasoso';
      return { ...p, name, melt, boil, state, energy: clamp((p.temperature + 150) / 550, 0, 1) };
    },
    draw(p, m, t) {
      const color = m.state === 'sólido' ? '#bae6fd' : m.state === 'líquido' ? '#38bdf8' : '#fca5a5', speed = .4 + m.energy * 2.2;
      const dots = Array.from({ length: 24 }, (_, i) => {
        let x, y;
        if (m.state === 'sólido') { x = 82 + (i % 6) * 22 + Math.sin(t * 9 + i) * (.6 + m.energy * 2); y = 118 + Math.floor(i / 6) * 22 + Math.cos(t * 8 + i * 2) * (.6 + m.energy * 2); }
        else if (m.state === 'líquido') { x = 58 + wave(seeded(i) * 2 + t * speed * .12 * (i % 2 ? 1 : -1)) * 158; y = 132 + wave(seeded(i + 40) * 2 + t * speed * .1) * 52; }
        else { x = 58 + wave(seeded(i) * 2 + t * speed * .35 * (i % 2 ? 1 : -1)) * 158; y = 40 + wave(seeded(i + 40) * 2 + t * speed * .3) * 146; }
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${color}" opacity=".9"/>`;
      }).join('');
      const ty = value => 192 - (clamp(value, -150, 400) + 150) / 550 * 160;
      return `${label(137, 22, m.state.toUpperCase(), { size: 14, weight: 800, color })}<path d="M46 30V196H228V30" fill="none" stroke="currentColor" stroke-width="3" opacity=".55" stroke-linejoin="round"/>${dots}
        <rect x="292" y="30" width="14" height="164" rx="7" fill="currentColor" opacity=".12"/><rect x="292" y="${ty(p.temperature).toFixed(1)}" width="14" height="${(194 - ty(p.temperature)).toFixed(1)}" rx="7" fill="#f87171"/>
        ${[['funde', m.melt], ['ferve', m.boil]].map(([name, value]) => `<path d="M286 ${ty(value).toFixed(1)}h26" stroke="#fde047" stroke-width="1.5"/>${label(316, ty(value) + 3, `${name} a ${value} °C`, { size: 9, anchor: 'start', color: '#fde047' })}`).join('')}
        ${label(280, ty(p.temperature) + 4, `${p.temperature} °C`, { size: 11, anchor: 'end', weight: 700 })}`;
    },
    text: m => `${m.name} a ${m.temperature} °C está no estado ${m.state} · funde a ${m.melt} °C e ferve a ${m.boil} °C`,
    challenge: { label: 'Desafio', prompt: 'Transforme o etanol em gás sem passar de 100 °C', test: r => r.substance === 'ethanol' && r.state === 'gasoso' && r.temperature <= 100, hint: 'O etanol ferve a 78 °C, antes da água.' }
  },
  density: {
    name: 'Densidade · flutua ou afunda?', subject: 'Química', aria: 'Bloco dentro de um recipiente com líquido',
    note: 'Densidade = massa ÷ volume. Quem é menos denso que o líquido flutua.',
    controls: [['range', 'mass', 'Massa do bloco (g)', 10, 1000, 200, 10], ['range', 'volume', 'Volume do bloco (cm³)', 10, 500, 250, 10], ['select', 'liquid', 'Líquido', Object.entries(densityLiquids).map(([id, item]) => [id, `${item[0]} (${short(item[1])} g/cm³)`])]],
    compute: p => densityInfo(p.mass, p.volume, p.liquid),
    draw(p, m) {
      const side = 30 + Math.cbrt(m.volume) * 6, top = m.floats ? 84 - side * (1 - m.submerged) : 194 - side, tone = clamp(m.density / 3, 0, 1);
      const fill = `rgb(${Math.round(214 - tone * 120)},${Math.round(170 - tone * 80)},${Math.round(110 - tone * 20)})`;
      return `<rect x="52" y="84" width="196" height="110" fill="${m.color}" opacity=".45"/><path d="M50 30V196H250V30" fill="none" stroke="currentColor" stroke-width="3" opacity=".55" stroke-linejoin="round"/><path d="M52 84h196" stroke="${m.color}" stroke-width="2"/>
        <rect x="${(150 - side / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${side.toFixed(1)}" height="${side.toFixed(1)}" rx="5" fill="${fill}" stroke="#0f172a" stroke-opacity=".4"/>${label(150, top + side / 2 + 4, `${num(m.density, 2)}`, { size: 11, weight: 700, color: '#111827' })}
        ${label(325, 40, 'd = m ÷ V', { size: 12, weight: 700 })}${label(325, 62, `${m.mass} ÷ ${m.volume}`, { size: 11, opacity: .8 })}${label(325, 86, `${num(m.density, 2)} g/cm³`, { size: 15, weight: 800, color: '#fde047' })}
        ${label(325, 116, `${m.liquidName}: ${short(m.liquidDensity)} g/cm³`, { size: 10, opacity: .8 })}${label(325, 150, m.floats ? 'FLUTUA' : 'AFUNDA', { size: 18, weight: 800, color: m.floats ? '#4ade80' : '#fb7185' })}
        ${m.floats ? label(325, 170, `${Math.round(m.submerged * 100)}% dentro do líquido`, { size: 10, opacity: .8 }) : ''}`;
    },
    text: m => `densidade = ${m.mass} g ÷ ${m.volume} cm³ = ${num(m.density, 2)} g/cm³ · ${m.floats ? 'menor' : 'maior'} que ${m.liquidName.toLowerCase()} (${short(m.liquidDensity)}): ${m.floats ? 'flutua' : 'afunda'}`,
    challenge: { label: 'Desafio', prompt: 'Faça um bloco de 300 g flutuar na água', test: r => r.mass === 300 && r.liquid === 'water' && r.floats, hint: 'Aumente o volume até a densidade ficar abaixo de 1 g/cm³.' }
  },
  osmosis: {
    name: 'Osmose · a célula e o sal', subject: 'Biologia', aria: 'Célula mergulhada em água com sal',
    note: 'A água atravessa a membrana indo para o lado com mais sal, até equilibrar.',
    controls: [['range', 'outside', 'Sal na água de fora (%)', 0, 3, 2, .1]],
    compute(p) {
      const diff = p.outside - .9, state = Math.abs(diff) < .05 ? 'isotônico' : diff < 0 ? 'hipotônico' : 'hipertônico';
      return { ...p, diff, state, scale: clamp(1 - diff * .28, .55, 1.28) };
    },
    draw(p, m) {
      const radius = 50 * m.scale, salt = Math.round(p.outside * 16), dots = [];
      for (let i = 0, placed = 0; placed < salt && i < 400; i++) {
        const x = 44 + seeded(i) * 192, y = 40 + seeded(i + 500) * 146;
        if (Math.hypot(x - 140, y - 112) < radius + 8) continue;
        dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#f8fafc"/>`); placed++;
      }
      const inner = Array.from({ length: 8 }, (_, i) => `<circle cx="${(140 + Math.cos(i * .8) * radius * .55).toFixed(1)}" cy="${(112 + Math.sin(i * .8) * radius * .55).toFixed(1)}" r="3" fill="#f8fafc"/>`).join('');
      const flows = m.state === 'isotônico' ? '' : [0, 1, 2, 3].map(i => {
        const angle = i * Math.PI / 2 + .6, far = radius + 30, near = radius + 6, [from, to] = m.state === 'hipotônico' ? [far, near] : [near, far];
        return arrow(140 + Math.cos(angle) * from, 112 + Math.sin(angle) * from, 140 + Math.cos(angle) * to, 112 + Math.sin(angle) * to, '#7dd3fc', 3);
      }).join('');
      const info = { isotônico: ['EQUILÍBRIO', 'Mesma quantidade de sal', 'dentro e fora: a célula', 'mantém o tamanho.'], hipotônico: ['A ÁGUA ENTRA', 'Fora tem menos sal:', 'a célula incha' + (p.outside <= .2 ? ' e pode' : '.'), p.outside <= .2 ? 'até estourar.' : ''], hipertônico: ['A ÁGUA SAI', 'Fora tem mais sal:', 'a célula perde água', 'e murcha.'] }[m.state];
      return `<rect x="38" y="34" width="204" height="160" fill="#0ea5e9" opacity=".22"/><path d="M36 28V196H244V28" fill="none" stroke="currentColor" stroke-width="3" opacity=".55" stroke-linejoin="round"/>${dots.join('')}
        <circle cx="140" cy="112" r="${radius.toFixed(1)}" fill="#fb7185" fill-opacity=".35" stroke="#fb7185" stroke-width="3"/>${inner}${flows}
        ${label(322, 46, info[0], { size: 13, weight: 800, color: m.state === 'isotônico' ? '#fde047' : '#7dd3fc' })}${info.slice(1).map((line, i) => label(322, 70 + i * 15, line, { size: 10, opacity: .85 })).join('')}
        ${label(322, 150, `fora: ${num(p.outside)}% de sal`, { size: 10, weight: 700 })}${label(322, 166, 'dentro: 0,9% de sal', { size: 10, weight: 700 })}${label(322, 190, '• = sal   → = água', { size: 9, opacity: .65 })}`;
    },
    text: m => `Meio ${m.state} (${num(m.outside)}% de sal fora, 0,9% dentro): ${m.state === 'isotônico' ? 'a célula fica como está' : m.state === 'hipotônico' ? 'a água entra e a célula incha' : 'a água sai e a célula murcha'}`,
    challenge: { label: 'Desafio', prompt: 'Deixe a célula em equilíbrio com o meio', test: r => r.state === 'isotônico', hint: 'O soro fisiológico tem 0,9% de sal, igual ao interior da célula.' }
  },
  ecosystem: {
    name: 'Crescimento populacional', subject: 'Biologia', aria: 'Gráfico do crescimento de uma população',
    note: 'A população cresce rápido enquanto há recursos e para quando o ambiente chega ao limite.',
    controls: [['range', 'rate', 'Ritmo de reprodução', .1, 1.2, .45, .05], ['range', 'capacity', 'Limite do ambiente (indivíduos)', 100, 1000, 500, 50], ['range', 'time', 'Dia', 0, 30, 10, .5]],
    drive: { param: 'time', min: 0, max: 30, speed: 5, step: .5 },
    compute(p) {
      const at = t => p.capacity / (1 + (p.capacity - 20) / 20 * Math.exp(-p.rate * t)), population = at(p.time);
      return { ...p, at, population, phase: population < p.capacity * .15 ? 'começo lento' : population < p.capacity * .9 ? 'crescimento acelerado' : 'estável no limite' };
    },
    draw(p, m) {
      const top = p.capacity * 1.18, gx = t => 48 + t / 30 * 326, gy = n => 186 - n / top * 150;
      const curve = Array.from({ length: 61 }, (_, i) => `${i ? 'L' : 'M'}${gx(i / 2).toFixed(1)} ${gy(m.at(i / 2)).toFixed(1)}`).join('');
      return `<path d="M48 26V186H378" fill="none" stroke="currentColor" opacity=".4" stroke-width="1.5"/>${[0, 10, 20, 30].map(t => label(gx(t), 200, String(t), { size: 9, opacity: .65 })).join('')}${label(378, 212, 'dias', { size: 9, anchor: 'end', opacity: .7 })}
        <path d="M48 ${gy(p.capacity).toFixed(1)}H378" stroke="#fbbf24" stroke-dasharray="6 5" stroke-width="1.5"/>${label(376, gy(p.capacity) - 6, `limite do ambiente: ${p.capacity}`, { size: 9, anchor: 'end', color: '#fbbf24' })}
        <path d="${curve}" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="round"/>
        <path d="M${gx(p.time).toFixed(1)} 186V${gy(m.population).toFixed(1)}" stroke="#fde047" stroke-dasharray="3 3" opacity=".7"/><circle cx="${gx(p.time).toFixed(1)}" cy="${gy(m.population).toFixed(1)}" r="6" fill="#fde047"/>
        ${label(clamp(gx(p.time), 90, 330), gy(m.population) - 12, `${Math.round(m.population)} indivíduos`, { size: 11, weight: 700, color: '#fde047' })}`;
    },
    text: m => `Dia ${short(m.time)}: ${Math.round(m.population)} indivíduos · ${m.phase} · limite do ambiente ${m.capacity}`,
    challenge: { label: 'Desafio', prompt: 'Chegue a 90% do limite antes do dia 12', test: r => r.time <= 12 && r.population >= r.capacity * .9, hint: 'Aumente o ritmo de reprodução.' }
  },
  genetics: {
    name: 'Genética · ervilhas de Mendel', subject: 'Biologia', aria: 'Quadro de cruzamento das ervilhas',
    note: 'A (amarela) é dominante: basta um A para a ervilha ser amarela. Só “aa” nasce verde.',
    controls: [['select', 'mother', 'Planta mãe', [['Aa', 'Aa · amarela (carrega o verde)'], ['AA', 'AA · amarela pura'], ['aa', 'aa · verde']]], ['select', 'father', 'Planta pai', [['Aa', 'Aa · amarela (carrega o verde)'], ['AA', 'AA · amarela pura'], ['aa', 'aa · verde']]]],
    compute(p) {
      const safe = value => ['AA', 'Aa', 'aa'].includes(value) ? value : 'Aa', mother = safe(p.mother), father = safe(p.father);
      const cells = [0, 1].flatMap(row => [0, 1].map(col => [mother[row], father[col]].sort().join('')));
      const yellow = cells.filter(cell => cell !== 'aa').length, count = type => cells.filter(cell => cell === type).length;
      return { mother, father, cells, yellow, green: 4 - yellow, AA: count('AA'), Aa: count('Aa'), aa: count('aa') };
    },
    draw(p, m) {
      const pea = (x, y, type, r = 21) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${type === 'aa' ? '#4ade80' : '#facc15'}"/>${label(x, y + 4, type, { size: r > 15 ? 13 : 0, weight: 800, color: '#1f2937' })}`;
      const cells = m.cells.map((type, i) => { const x = 104 + (i % 2) * 64, y = 96 + Math.floor(i / 2) * 64; return `<rect x="${x - 30}" y="${y - 30}" width="60" height="60" rx="10" fill="currentColor" opacity=".08"/>${pea(x, y, type)}`; }).join('');
      return `${label(136, 22, 'pai', { size: 10, opacity: .7 })}${[0, 1].map(i => label(104 + i * 64, 50, m.father[i], { size: 18, weight: 800, color: '#7dd3fc' })).join('')}
        ${label(28, 132, 'mãe', { size: 10, opacity: .7 })}${[0, 1].map(i => label(58, 102 + i * 64, m.mother[i], { size: 18, weight: 800, color: '#f9a8d4' })).join('')}${cells}
        ${label(306, 40, 'A cada 4 ervilhas:', { size: 12, weight: 700 })}${m.cells.slice().sort().map((type, i) => pea(258 + i * 32, 70, type, 12)).join('')}
        ${label(306, 116, `${m.yellow} amarela${m.yellow === 1 ? '' : 's'} · ${m.yellow * 25}%`, { size: 14, weight: 800, color: '#facc15' })}${label(306, 142, `${m.green} verde${m.green === 1 ? '' : 's'} · ${m.green * 25}%`, { size: 14, weight: 800, color: '#4ade80' })}
        ${label(306, 176, 'A = amarela (manda)', { size: 10, opacity: .8 })}${label(306, 192, 'a = verde (só aparece em aa)', { size: 10, opacity: .8 })}`;
    },
    text: m => `${m.mother} × ${m.father}: ${m.yellow * 25}% amarelas e ${m.green * 25}% verdes · combinações: ${m.AA} AA, ${m.Aa} Aa, ${m.aa} aa`,
    challenge: { label: 'Desafio', prompt: 'Consiga metade das ervilhas verdes', test: r => r.green === 2, hint: 'Cruze uma planta verde (aa) com uma amarela que carrega o verde (Aa).' }
  },
  photosynthesis: {
    name: 'Fotossíntese', subject: 'Biologia', aria: 'Planta fazendo fotossíntese',
    note: 'A planta usa luz, água e gás carbônico para produzir açúcar e liberar oxigênio.',
    controls: [['range', 'light', 'Luz do Sol (%)', 0, 100, 80, 5], ['range', 'co2', 'Gás carbônico no ar (%)', 0, 100, 60, 5], ['range', 'water', 'Água no solo (%)', 0, 100, 70, 5]],
    ambient: true,
    compute: p => photosynthesisInfo(p.light, p.co2, p.water),
    draw(p, m, t) {
      const green = `rgb(${Math.round(120 - m.rate * .8)},${Math.round(120 + m.rate * 1.1)},${Math.round(70 + m.rate * .2)})`;
      const rays = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${(52 + Math.cos(a) * 26).toFixed(1)} ${(44 + Math.sin(a) * 26).toFixed(1)}L${(52 + Math.cos(a) * 36).toFixed(1)} ${(44 + Math.sin(a) * 36).toFixed(1)}" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>`; }).join('');
      const bubbles = Array.from({ length: Math.round(m.rate / 10) }, (_, i) => { const life = ((t * .35 + seeded(i)) % 1); return `<circle cx="${(232 + seeded(i + 9) * 46 + Math.sin(t * 2 + i) * 4).toFixed(1)}" cy="${(120 - life * 96).toFixed(1)}" r="${(3 + seeded(i + 3) * 3).toFixed(1)}" fill="none" stroke="#7dd3fc" stroke-width="1.5" opacity="${(1 - life).toFixed(2)}"/>`; }).join('');
      const drops = Array.from({ length: Math.round(p.water / 12) }, (_, i) => `<circle cx="${(150 + i * 13).toFixed(1)}" cy="${(198 + (i % 2) * 7).toFixed(1)}" r="3.2" fill="#38bdf8"/>`).join('');
      return `<g opacity="${(.2 + m.light / 125).toFixed(2)}"><circle cx="52" cy="44" r="20" fill="#fbbf24"/>${rays}${arrow(80, 62, 150, 104, '#fde047', 2.5)}</g>${label(110, 70, 'luz', { size: 9, color: '#fde047' })}
        <path d="M24 188h352" stroke="#a16207" stroke-width="3"/><path d="M200 188V96" stroke="${green}" stroke-width="6" stroke-linecap="round"/>
        <ellipse cx="170" cy="118" rx="32" ry="14" fill="${green}" transform="rotate(-24 170 118)"/><ellipse cx="230" cy="112" rx="32" ry="14" fill="${green}" transform="rotate(24 230 112)"/><ellipse cx="200" cy="88" rx="16" ry="26" fill="${green}"/>
        <g opacity="${(.25 + m.co2 / 135).toFixed(2)}">${arrow(86, 132, 142, 124, '#cbd5e1', 2.5)}</g>${label(84, 148, 'gás carbônico', { size: 9, opacity: .8 })}${drops}${label(200, 216, 'água', { size: 9, color: '#38bdf8' })}
        ${bubbles}${label(262, 20, 'oxigênio', { size: 9, color: '#7dd3fc' })}
        <rect x="336" y="40" width="22" height="130" rx="6" fill="currentColor" opacity=".12"/><rect x="336" y="${(170 - m.rate * 1.3).toFixed(1)}" width="22" height="${(m.rate * 1.3).toFixed(1)}" rx="6" fill="#facc15"/>${label(347, 30, `${m.rate}%`, { size: 12, weight: 800, color: '#facc15' })}${label(347, 186, 'açúcar', { size: 9, opacity: .8 })}`;
    },
    text: m => m.rate ? `Produção de açúcar e oxigênio: ${m.rate}% · o que está faltando mais: ${m.limiting}` : `Sem ${m.limiting} a fotossíntese para`,
    challenge: { label: 'Desafio', prompt: 'Chegue a 100% de produção', test: r => r.rate === 100, hint: 'A produção acompanha sempre o ingrediente que está em menor quantidade.' }
  },
  quadratic: {
    name: 'Função quadrática · parábola', subject: 'Matemática', aria: 'Gráfico da função quadrática',
    note: 'y = ax² + bx + c. O sinal de “a” decide se a parábola abre para cima ou para baixo.',
    controls: [['range', 'a', 'a (abertura)', -3, 3, 1, .5], ['range', 'b', 'b', -6, 6, -2, .5], ['range', 'c', 'c (onde corta o eixo y)', -8, 8, -3, .5]],
    compute(p) {
      const { a, b, c } = p, delta = b * b - 4 * a * c;
      if (!a) return { ...p, delta: null, linear: true, roots: b ? [-c / b] : [], vertex: null };
      const roots = delta < 0 ? [] : delta === 0 ? [-b / (2 * a)] : [(-b - Math.sqrt(delta)) / (2 * a), (-b + Math.sqrt(delta)) / (2 * a)].sort((x, y) => x - y);
      return { ...p, delta, linear: false, roots, vertex: [-b / (2 * a), c - b * b / (4 * a)] };
    },
    draw(p, m) {
      const gx = x => 200 + x * 21, gy = y => 110 - y * 10.5, value = x => p.a * x * x + p.b * x + p.c;
      const grid = [-8, -6, -4, -2, 2, 4, 6, 8].map(n => `<path d="M${gx(n)} 15V205M32 ${gy(n)}H368" stroke="currentColor" opacity=".08"/>${label(gx(n), 122, String(n), { size: 7, opacity: .5 })}${label(194, gy(n) + 3, String(n), { size: 7, anchor: 'end', opacity: .5 })}`).join('');
      let path = '', pen = false;
      for (let x = -8; x <= 8.001; x += .1) { const y = value(x); if (Math.abs(y) > 9.2) { pen = false; continue; } path += `${pen ? 'L' : 'M'}${gx(x).toFixed(1)} ${gy(y).toFixed(1)}`; pen = true; }
      const sign = n => n < 0 ? `− ${short(-n)}` : `+ ${short(n)}`, inside = (x, y) => Math.abs(x) <= 8 && Math.abs(y) <= 9.2;
      const roots = m.roots.filter(x => Math.abs(x) <= 8).map(x => `<circle cx="${gx(x).toFixed(1)}" cy="110" r="5" fill="#fde047"/>${label(gx(x), 102, short(x), { size: 9, weight: 700, color: '#fde047' })}`).join('');
      const vertex = m.vertex && inside(...m.vertex) ? `<path d="M${gx(m.vertex[0]).toFixed(1)} 15V205" stroke="#f472b6" stroke-dasharray="4 4" opacity=".6"/><circle cx="${gx(m.vertex[0]).toFixed(1)}" cy="${gy(m.vertex[1]).toFixed(1)}" r="5" fill="#f472b6"/>${label(gx(m.vertex[0]) + 8, gy(m.vertex[1]) + (p.a > 0 ? 14 : -8), `vértice (${short(m.vertex[0])}; ${short(m.vertex[1])})`, { size: 9, anchor: 'start', weight: 700, color: '#f472b6' })}` : '';
      return `${grid}<path d="M32 110H368M200 15V205" stroke="currentColor" opacity=".45" stroke-width="1.5"/><path d="${path}" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round"/>${vertex}${roots}
        ${label(38, 28, `y = ${short(p.a)}x² ${sign(p.b)}x ${sign(p.c)}`, { size: 12, anchor: 'start', weight: 700 })}`;
    },
    text: m => m.linear ? 'Com a = 0 não há parábola: o gráfico vira uma reta' : `Δ = ${short(m.delta)} · ${m.roots.length === 2 ? `corta o eixo x em ${short(m.roots[0])} e ${short(m.roots[1])}` : m.roots.length ? `toca o eixo x só em ${short(m.roots[0])}` : 'não corta o eixo x'} · vértice (${short(m.vertex[0])}; ${short(m.vertex[1])}) · abre para ${m.a > 0 ? 'cima' : 'baixo'}`,
    challenge: { label: 'Desafio', prompt: 'Faça a parábola tocar o eixo x em um único ponto', test: r => !r.linear && r.delta === 0, hint: 'Isso acontece quando Δ = b² − 4ac = 0. Tente a = 1, b = −2, c = 1.' }
  },
  fractions: {
    name: 'Frações · partes do inteiro', subject: 'Matemática', aria: 'Fração representada em círculos divididos',
    note: 'O denominador diz em quantas partes o inteiro foi dividido; o numerador, quantas foram pegas.',
    controls: [['range', 'numerator', 'Numerador (partes pintadas)', 0, 12, 3, 1], ['range', 'denominator', 'Denominador (partes do inteiro)', 1, 12, 4, 1]],
    compute: p => fractionInfo(p.numerator, p.denominator),
    draw(p, m) {
      const pies = Math.max(1, Math.ceil(m.numerator / m.denominator)), cols = pies <= 1 ? 1 : pies <= 4 ? 2 : pies <= 9 ? 3 : 4, rows = Math.ceil(pies / cols);
      const r = Math.min(220 / cols, 184 / rows) / 2 - 4, d = m.denominator;
      const drawn = Array.from({ length: pies }, (_, pie) => {
        const cx = 20 + 220 / cols * (pie % cols + .5), cy = 16 + 184 / rows * (Math.floor(pie / cols) + .5), filled = clamp(m.numerator - pie * d, 0, d);
        if (d === 1) return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${filled ? '#a78bfa' : 'none'}" stroke="currentColor" stroke-opacity=".6" stroke-width="1.5"/>`;
        return Array.from({ length: d }, (_, i) => {
          const a0 = i / d * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / d * Math.PI * 2 - Math.PI / 2;
          return `<path d="M${cx.toFixed(1)} ${cy.toFixed(1)}L${(cx + Math.cos(a0) * r).toFixed(1)} ${(cy + Math.sin(a0) * r).toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + Math.cos(a1) * r).toFixed(1)} ${(cy + Math.sin(a1) * r).toFixed(1)}Z" fill="${i < filled ? '#a78bfa' : 'none'}" stroke="currentColor" stroke-opacity=".6" stroke-width="1.5"/>`;
        }).join('');
      }).join('');
      const simpler = m.simpleDenominator !== m.denominator ? `${m.simpleNumerator}${m.simpleDenominator === 1 ? '' : '/' + m.simpleDenominator}` : '';
      return `${drawn}${label(320, 62, String(m.numerator), { size: 36, weight: 800, color: '#c4b5fd' })}<path d="M292 72h56" stroke="currentColor" stroke-width="3"/>${label(320, 108, String(m.denominator), { size: 36, weight: 800 })}
        ${label(320, 140, `= ${short(m.value)}`, { size: 14, weight: 700 })}${label(320, 162, `= ${short(m.percent)}%`, { size: 14, weight: 700, color: '#fde047' })}${simpler ? label(320, 186, `simplificando: ${simpler}`, { size: 10, opacity: .85 }) : ''}`;
    },
    text: m => `${m.numerator}/${m.denominator} = ${short(m.value)} = ${short(m.percent)}% · fração ${m.kind}${m.simpleDenominator !== m.denominator ? ` · simplificada: ${m.simpleNumerator}${m.simpleDenominator === 1 ? '' : '/' + m.simpleDenominator}` : ''}`,
    challenge: { label: 'Desafio', prompt: 'Represente 50% usando oitavos', test: r => r.denominator === 8 && r.numerator === 4, hint: 'Metade de 8 partes.' }
  },
  interest: {
    name: 'Juros compostos', subject: 'Matemática', aria: 'Gráfico de crescimento do dinheiro com juros',
    note: 'Nos juros compostos, os juros de cada mês também rendem juros nos meses seguintes.',
    controls: [['range', 'principal', 'Valor inicial (R$)', 100, 5000, 1000, 100], ['range', 'rate', 'Juros por mês (%)', 0, 10, 2, .5], ['range', 'months', 'Meses', 1, 60, 24, 1]],
    compute(p) {
      const amount = p.principal * (1 + p.rate / 100) ** p.months, simple = p.principal * (1 + p.rate / 100 * p.months);
      return { ...p, amount, simple, interest: amount - p.principal };
    },
    draw(p, m) {
      const bars = Math.min(p.months, 12), slot = 320 / (bars + 1), gy = value => 184 - value / m.amount * 140;
      const points = [];
      const drawn = Array.from({ length: bars + 1 }, (_, i) => {
        const month = Math.round(i * p.months / bars), value = p.principal * (1 + p.rate / 100) ** month, x = 52 + i * slot;
        points.push(`${i ? 'L' : 'M'}${(x + slot * .35).toFixed(1)} ${gy(p.principal * (1 + p.rate / 100 * month)).toFixed(1)}`);
        return `<rect x="${x.toFixed(1)}" y="${gy(p.principal).toFixed(1)}" width="${(slot * .7).toFixed(1)}" height="${(184 - gy(p.principal)).toFixed(1)}" fill="#38bdf8"/><rect x="${x.toFixed(1)}" y="${gy(value).toFixed(1)}" width="${(slot * .7).toFixed(1)}" height="${Math.max(0, gy(p.principal) - gy(value)).toFixed(1)}" fill="#facc15"/>${label(x + slot * .35, 197, String(month), { size: 8, opacity: .65 })}`;
      }).join('');
      return `<path d="M46 30V184H380" fill="none" stroke="currentColor" opacity=".35" stroke-width="1.5"/>${drawn}<path d="${points.join('')}" fill="none" stroke="#f472b6" stroke-width="2" stroke-dasharray="5 4"/>
        ${label(378, 210, 'meses', { size: 9, anchor: 'end', opacity: .7 })}${label(52, 22, '■ valor inicial', { size: 9, anchor: 'start', color: '#38bdf8' })}${label(128, 22, '■ juros', { size: 9, anchor: 'start', color: '#facc15' })}${label(172, 22, '- - juros simples', { size: 9, anchor: 'start', color: '#f472b6' })}
        ${label(378, 36, money(m.amount), { size: 13, anchor: 'end', weight: 800, color: '#fde047' })}`;
    },
    text: m => `${money(m.principal)} a ${short(m.rate)}% ao mês por ${m.months} meses vira ${money(m.amount)} · juros ${money(m.interest)} · com juros simples seria ${money(m.simple)}`,
    challenge: { label: 'Desafio', prompt: 'Dobre o dinheiro em até 24 meses', test: r => r.months <= 24 && r.amount >= r.principal * 2, hint: 'Com 3% ao mês o valor dobra em cerca de 24 meses.' }
  },
  pythagoras: {
    name: 'Teorema de Pitágoras', subject: 'Matemática', aria: 'Triângulo retângulo com um quadrado em cada lado',
    note: 'No triângulo retângulo, a área do quadrado maior é a soma das áreas dos outros dois.',
    controls: [['range', 'a', 'Cateto a', 1, 12, 3, 1], ['range', 'b', 'Cateto b', 1, 12, 4, 1]],
    compute: p => pythagorasInfo(p.a, p.b),
    draw(p, m) {
      const u = Math.min(226 / (2 * m.a + m.b), 196 / (m.a + 2 * m.b)), ox = 18 + m.a * u, oy = 12 + (m.a + m.b) * u, A = [ox, oy - m.a * u], B = [ox + m.b * u, oy], n = [m.a * u, -m.b * u];
      const pts = list => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), size = text => clamp(u * 1.4, 7, 12) * (text.length > 8 ? .8 : 1);
      const tag = (x, y, text, color) => label(x, y + 4, text, { size: size(text), weight: 700, color });
      return `<rect x="${(ox - m.a * u).toFixed(1)}" y="${A[1].toFixed(1)}" width="${(m.a * u).toFixed(1)}" height="${(m.a * u).toFixed(1)}" fill="#fb7185" fill-opacity=".45" stroke="#fb7185"/>${tag(ox - m.a * u / 2, oy - m.a * u / 2, `a² = ${m.a * m.a}`, '#fecdd3')}
        <rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${(m.b * u).toFixed(1)}" height="${(m.b * u).toFixed(1)}" fill="#38bdf8" fill-opacity=".45" stroke="#38bdf8"/>${tag(ox + m.b * u / 2, oy + m.b * u / 2, `b² = ${m.b * m.b}`, '#bae6fd')}
        <polygon points="${pts([A, B, [B[0] + n[0], B[1] + n[1]], [A[0] + n[0], A[1] + n[1]]])}" fill="#facc15" fill-opacity=".4" stroke="#facc15"/>${tag((A[0] + B[0] + n[0]) / 2, (A[1] + B[1] + n[1]) / 2, `c² = ${m.square}`, '#fef08a')}
        <polygon points="${pts([[ox, oy], A, B])}" fill="#0f172a" stroke="currentColor" stroke-width="2"/><path d="M${ox.toFixed(1)} ${(oy - 7).toFixed(1)}h7v7" fill="none" stroke="currentColor"/>
        ${label(325, 40, 'a² + b² = c²', { size: 14, weight: 800 })}${label(325, 70, `${m.a}² + ${m.b}² = c²`, { size: 12, opacity: .85 })}${label(325, 92, `${m.a * m.a} + ${m.b * m.b} = ${m.square}`, { size: 12, opacity: .85 })}
        ${label(325, 128, `c = √${m.square}`, { size: 13, weight: 700 })}${label(325, 156, `c ${m.exact ? '=' : '≈'} ${short(m.c)}`, { size: 18, weight: 800, color: '#fde047' })}`;
    },
    text: m => `c = √(${m.a}² + ${m.b}²) = √${m.square} ${m.exact ? '=' : '≈'} ${short(m.c)}`,
    challenge: { label: 'Desafio', prompt: 'Monte um triângulo com hipotenusa exatamente 13', test: r => r.c === 13, hint: 'Procure dois números cujos quadrados somem 169: 25 + 144.' }
  },
  greenhouse: {
    name: 'Efeito estufa e clima', subject: 'Geografia', aria: 'Luz do Sol, atmosfera e calor retido na Terra',
    note: 'Os gases do efeito estufa seguram parte do calor que a Terra devolveria ao espaço.',
    controls: [['range', 'co2', 'Gás carbônico no ar (ppm)', 180, 800, 420, 10], ['range', 'albedo', 'Luz refletida por gelo e nuvens (%)', 20, 40, 30, 1]],
    compute: p => warmingInfo(p.co2, p.albedo),
    draw(p, m) {
      const gas = Array.from({ length: Math.round(m.co2 / 22) }, (_, i) => `<circle cx="${(30 + seeded(i) * 270).toFixed(1)}" cy="${(64 + seeded(i + 70) * 44).toFixed(1)}" r="3.5" fill="#cbd5e1" opacity=".8"/>`).join('');
      const returned = Math.round(m.trapped * 5), heat = Array.from({ length: 5 }, (_, i) => {
        const x = 110 + i * 38;
        return i < returned ? `${arrow(x, 176, x, 96, '#f87171')}${arrow(x + 9, 100, x + 9, 170, '#f87171')}` : arrow(x, 176, x, 20, '#f87171');
      }).join('');
      const ty = 186 - clamp((m.temperature - 8) / 16, 0, 1) * 150;
      return `<rect x="16" y="58" width="290" height="56" rx="10" fill="#94a3b8" opacity=".14"/>${label(26, 54, 'atmosfera', { size: 8, anchor: 'start', opacity: .6 })}${gas}
        <circle cx="42" cy="30" r="17" fill="#fbbf24"/>${arrow(56, 42, 84, 174, '#fde047', 3)}${arrow(70, 120, 46, 70, '#f8fafc', 2)}${label(30, 132, `${m.albedo}% refletida`, { size: 8, anchor: 'start', opacity: .8 })}
        <rect x="16" y="180" width="290" height="26" rx="6" fill="#166534"/>${label(160, 197, 'superfície da Terra', { size: 9, color: '#dcfce7' })}${heat}${label(198, 14, 'calor que escapa', { size: 8, color: '#fca5a5' })}
        <rect x="336" y="36" width="14" height="152" rx="7" fill="currentColor" opacity=".12"/><rect x="336" y="${ty.toFixed(1)}" width="14" height="${(188 - ty).toFixed(1)}" rx="7" fill="#f87171"/>
        ${label(343, 26, `${num(m.temperature)} °C`, { size: 13, weight: 800, color: '#fde047' })}${label(343, 204, `${m.warming >= 0 ? '+' : '−'}${num(Math.abs(m.warming))} °C`, { size: 11, weight: 700, color: m.warming > 1.5 ? '#f87171' : '#4ade80' })}${label(343, 216, 'desde 1850', { size: 8, opacity: .7 })}`;
    },
    text: m => `Com ${m.co2} ppm de gás carbônico a temperatura média fica perto de ${num(m.temperature)} °C (${m.warming >= 0 ? '+' : '−'}${num(Math.abs(m.warming))} °C em relação a 1850)`,
    challenge: { label: 'Desafio', prompt: 'Mantenha o aquecimento em até 1,5 °C sem mexer na reflexão', test: r => r.albedo === 30 && r.warming > 0 && r.warming <= 1.5, hint: 'Reduza o gás carbônico: em 1850 havia 280 ppm.' }
  },
  timezones: {
    name: 'Fusos horários', subject: 'Geografia', aria: 'Faixa de fusos horários e relógios de duas cidades',
    note: 'A Terra gira 15° por hora: cada fuso para leste está uma hora adiantado.',
    controls: [['range', 'hour', 'Hora em Brasília', 0, 23, 12, 1], ['select', 'city', 'Outra cidade', Object.entries(timezoneCities).map(([id, item]) => [id, `${item[0]} (UTC${item[1] >= 0 ? '+' : '−'}${short(Math.abs(item[1]))})`])]],
    compute: p => timezoneInfo(p.hour, p.city),
    draw(p, m) {
      const zx = offset => 20 + (offset + 12) * 15;
      const strip = Array.from({ length: 24 }, (_, i) => {
        const offset = i - 12, local = (((m.base + 3 + offset) % 24) + 24) % 24, day = local >= 6 && local < 18;
        return `<rect x="${zx(offset)}" y="24" width="15" height="34" fill="${day ? '#7dd3fc' : '#1e293b'}" stroke="#0f172a" stroke-width=".5"/>${i % 3 === 0 ? label(zx(offset) + 7.5, 20, `${local}h`, { size: 7, opacity: .7 }) : ''}`;
      }).join('');
      const pin = (offset, name, color, dy) => `<path d="M${(zx(offset) + 7.5).toFixed(1)} 22v40" stroke="${color}" stroke-width="3" stroke-linecap="round"/>${label(clamp(zx(offset) + 7.5, 50, 350), 74 + dy, name, { size: 9, weight: 700, color })}`;
      const clock = (cx, time, color, name, digital) => {
        const hourAngle = (time % 12) / 12 * Math.PI * 2 - Math.PI / 2, minuteAngle = (time % 1) * Math.PI * 2 - Math.PI / 2, night = time < 6 || time >= 18;
        return `<circle cx="${cx}" cy="140" r="34" fill="${night ? '#1e293b' : '#e0f2fe'}" stroke="${color}" stroke-width="3"/>${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<circle cx="${(cx + Math.cos(a) * 28).toFixed(1)}" cy="${(140 + Math.sin(a) * 28).toFixed(1)}" r="1.4" fill="${night ? '#e2e8f0' : '#0f172a'}"/>`; }).join('')}
          <path d="M${cx} 140L${(cx + Math.cos(hourAngle) * 17).toFixed(1)} ${(140 + Math.sin(hourAngle) * 17).toFixed(1)}" stroke="${night ? '#f8fafc' : '#0f172a'}" stroke-width="3.5" stroke-linecap="round"/><path d="M${cx} 140L${(cx + Math.cos(minuteAngle) * 25).toFixed(1)} ${(140 + Math.sin(minuteAngle) * 25).toFixed(1)}" stroke="${night ? '#f8fafc' : '#0f172a'}" stroke-width="2" stroke-linecap="round"/>
          ${label(cx, 192, name, { size: 10, weight: 700, color })}${label(cx, 208, digital, { size: 13, weight: 800 })}`;
      };
      const ahead = m.difference === 0 ? 'mesma hora' : `${short(Math.abs(m.difference))} h ${m.difference > 0 ? 'adiantada' : 'atrasada'}`;
      return `${strip}${pin(-3, 'Brasília', '#4ade80', 0)}${pin(m.offset, m.name, '#f472b6', Math.abs(m.offset + 3) < 5 ? 12 : 0)}
        ${clock(104, m.base, '#4ade80', 'Brasília', m.baseClock)}${clock(296, m.local, '#f472b6', m.name, m.localClock + (m.dayShift > 0 ? ' (amanhã)' : m.dayShift < 0 ? ' (ontem)' : ''))}
        ${m.difference ? arrow(150, 140, 250, 140, 'currentColor', 1.5) : ''}${label(200, 132, ahead, { size: 10, weight: 700 })}`;
    },
    text: m => `Quando são ${m.baseClock} em Brasília, são ${m.localClock}${m.dayShift > 0 ? ' do dia seguinte' : m.dayShift < 0 ? ' do dia anterior' : ''} em ${m.name} (${m.difference === 0 ? 'mesmo horário' : `${short(Math.abs(m.difference))} h ${m.difference > 0 ? 'à frente' : 'atrás'}`})`,
    challenge: { label: 'Desafio', prompt: 'Descubra a hora de Brasília para ser meia-noite em Tóquio', test: r => r.name === 'Tóquio' && r.local === 0, hint: 'Tóquio está 12 horas à frente de Brasília.' }
  },
  conjugation: {
    name: 'Conjugação verbal · tempos e pessoas', subject: 'Português', aria: 'Tabela de conjugação do verbo',
    note: 'Nos verbos regulares o radical fica igual; só a terminação muda com a pessoa e o tempo.',
    controls: [['select', 'verb', 'Verbo', conjugationVerbs.map(verb => [verb, verb])], ['select', 'tense', 'Tempo (modo indicativo)', Object.entries(conjugationTenses)], ['select', 'person', 'Pessoa em destaque', conjugationPersons.map((person, i) => [String(i), person])]],
    compute(p) {
      const info = conjugate(p.verb, p.tense), person = clamp(Math.round(Number(p.person) || 0), 0, 5), pronoun = ['Eu', 'Tu', 'Ela', 'Nós', 'Vós', 'Eles'][person];
      const sentence = `${tenseOpening[info.tense]} ${pronoun.toLowerCase()} ${info.forms[person]} ${verbComplement[info.verb]}.`;
      return { ...info, person, sentence };
    },
    draw(p, m) {
      const moment = tenseMoment[m.tense];
      const axis = ['passado', 'presente', 'futuro'].map((name, i) => `<circle cx="${250 + i * 56}" cy="24" r="${i === moment ? 7 : 4}" fill="${i === moment ? '#fde047' : 'currentColor'}" opacity="${i === moment ? 1 : .4}"/>${label(250 + i * 56, 42, name, { size: 8, weight: i === moment ? 700 : 400, color: i === moment ? '#fde047' : 'currentColor', opacity: i === moment ? 1 : .6 })}`).join('');
      const rows = m.forms.map((form, i) => {
        const x = 20 + (i > 2 ? 184 : 0), y = 56 + (i % 3) * 40, active = i === m.person;
        return `<rect x="${x}" y="${y}" width="176" height="34" rx="9" fill="${active ? '#a78bfa' : 'currentColor'}" opacity="${active ? .35 : .07}"/>${active ? `<rect x="${x}" y="${y}" width="176" height="34" rx="9" fill="none" stroke="#c4b5fd" stroke-width="1.5"/>` : ''}
          ${label(x + 12, y + 21, conjugationPersons[i], { size: 10, anchor: 'start', opacity: .7 })}<text x="${x + 164}" y="${y + 22}" text-anchor="end" font-size="15" font-weight="700" fill="currentColor">${m.stem}<tspan fill="#fde047">${m.endings[i]}</tspan></text>`;
      }).join('');
      return `<text x="20" y="30" font-size="17" font-weight="800" fill="currentColor">${m.verb.slice(0, -2).toUpperCase()}<tspan fill="#fde047">${m.verb.slice(-2).toUpperCase()}</tspan></text>${label(20, 44, m.tenseName, { size: 9, anchor: 'start', opacity: .75 })}
        <path d="M244 24h124" stroke="currentColor" opacity=".3"/>${axis}${rows}${label(200, 196, `“${m.sentence}”`, { size: 12, weight: 700 })}${label(200, 212, 'radical + terminação', { size: 8, opacity: .6 })}`;
    },
    text: m => `${m.group} · ${conjugationPersons[m.person]}: ${m.stem} + ${m.endings[m.person]} = ${m.forms[m.person]}`,
    challenge: { label: 'Desafio', prompt: 'Encontre a forma “nós venderemos”', test: r => r.forms[3] === 'venderemos', hint: 'A ação ainda vai acontecer: escolha o verbo vender e um tempo do futuro.' }
  },
  colormix: {
    name: 'Mistura de cores RGB', subject: 'Artes', aria: 'Três luzes coloridas se misturando',
    note: 'Telas misturam luz vermelha, verde e azul. As três juntas no máximo formam o branco.',
    controls: [['range', 'r', 'Vermelho (R)', 0, 255, 80, 5], ['range', 'g', 'Verde (G)', 0, 255, 175, 5], ['range', 'b', 'Azul (B)', 0, 255, 235, 5]],
    compute(p) {
      const [r, g, b] = [p.r, p.g, p.b].map(value => clamp(Math.round(Number(value) || 0), 0, 255));
      const hex = '#' + [r, g, b].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
      const near = namedColors.reduce((best, item) => { const distance = Math.hypot(r - item[1], g - item[2], b - item[3]); return distance < best[1] ? [item[0], distance] : best; }, ['', Infinity])[0];
      return { r, g, b, hex, near, light: r * .299 + g * .587 + b * .114 > 150 };
    },
    draw(p, m) {
      return `<g style="isolation:isolate"><rect x="20" y="16" width="216" height="188" rx="14" fill="#000"/>
        <circle cx="100" cy="88" r="54" fill="rgb(${m.r},0,0)" style="mix-blend-mode:screen"/><circle cx="156" cy="88" r="54" fill="rgb(0,${m.g},0)" style="mix-blend-mode:screen"/><circle cx="128" cy="136" r="54" fill="rgb(0,0,${m.b})" style="mix-blend-mode:screen"/></g>
        ${label(66, 60, 'R', { size: 12, weight: 800, color: '#fff' })}${label(190, 60, 'G', { size: 12, weight: 800, color: '#fff' })}${label(128, 186, 'B', { size: 12, weight: 800, color: '#fff' })}
        <rect x="256" y="20" width="124" height="96" rx="14" fill="rgb(${m.r},${m.g},${m.b})" stroke="currentColor" stroke-opacity=".3"/>${label(318, 74, m.hex, { size: 15, weight: 800, color: m.light ? '#111827' : '#f8fafc' })}
        ${label(318, 140, m.near, { size: 15, weight: 800 })}${label(318, 156, 'cor mais parecida', { size: 8, opacity: .65 })}
        ${[['R', m.r, '#f87171'], ['G', m.g, '#4ade80'], ['B', m.b, '#60a5fa']].map(([name, value, color], i) => `${label(262, 180 + i * 13, name, { size: 9, weight: 700, color })}<rect x="272" y="${173 + i * 13}" width="${(value / 255 * 100).toFixed(1)}" height="7" rx="3.5" fill="${color}"/>`).join('')}`;
    },
    text: m => `${m.hex} · vermelho ${Math.round(m.r / 2.55)}%, verde ${Math.round(m.g / 2.55)}%, azul ${Math.round(m.b / 2.55)}% · parece ${m.near}`,
    challenge: { label: 'Desafio', prompt: 'Faça amarelo misturando só duas luzes', test: r => r.r >= 230 && r.g >= 230 && r.b <= 30, hint: 'Luz vermelha + luz verde = amarelo.' }
  },
  binary: {
    name: 'Números binários · bits', subject: 'Tecnologia', aria: 'Oito lâmpadas representando um número em binário',
    note: 'Cada bit vale o dobro do vizinho da direita: 1, 2, 4, 8… Lâmpada acesa = 1, apagada = 0.',
    controls: [['range', 'value', 'Número decimal', 0, 255, 13, 1]],
    drive: { param: 'value', min: 0, max: 256, speed: 3, step: 1 },
    compute: p => binaryInfo(p.value),
    draw(p, m) {
      const lamps = [...m.bits].map((bit, i) => {
        const x = 46 + i * 44, on = bit === '1';
        return `${label(x, 62, String(2 ** (7 - i)), { size: 10, opacity: on ? 1 : .5, weight: on ? 700 : 400 })}${on ? `<circle cx="${x}" cy="94" r="24" fill="#fde047" opacity=".25"/>` : ''}<circle cx="${x}" cy="94" r="17" fill="${on ? '#fde047' : '#334155'}" stroke="${on ? '#fef9c3' : '#64748b'}" stroke-width="2"/>${label(x, 140, bit, { size: 20, weight: 800, color: on ? '#fde047' : 'currentColor', opacity: on ? 1 : .5 })}`;
      }).join('');
      return `${label(200, 34, `${m.decimal} em decimal`, { size: 15, weight: 800 })}${lamps}${label(200, 178, m.parts.length ? `${m.parts.join(' + ')} = ${m.decimal}` : 'todas apagadas = 0', { size: 13, weight: 700, color: '#fde047' })}${label(200, 200, `binário: ${m.bits}`, { size: 11, opacity: .8 })}`;
    },
    text: m => `${m.decimal} em binário é ${m.bits}${m.parts.length ? ` · ${m.parts.join(' + ')} = ${m.decimal}` : ''}`,
    challenge: { label: 'Desafio', prompt: 'Acenda só as lâmpadas 32 e 1', test: r => r.decimal === 33, hint: '32 + 1.' }
  }
};
