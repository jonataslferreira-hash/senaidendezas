// Catálogo central dos 15 modelos 3D nativos do Storage Lab,
// focados nas disciplinas de Ciências e Tecnologia (sem dependência de Three.js).

export const BUILTIN_MODELS = [
  // Tecnologia (4 modelos — 3 remakes de armazenamento + Processador CPU)
  { id: 'ssd', name: 'SSD SATA 2,5"', shortName: 'SSD SATA', subject: 'Tecnologia', defaultPart: 'nand' },
  { id: 'hdd', name: 'Disco Rígido (HDD)', shortName: 'HDD', subject: 'Tecnologia', defaultPart: 'platter' },
  { id: 'nvme', name: 'SSD M.2 NVMe', shortName: 'SSD NVMe', subject: 'Tecnologia', defaultPart: 'controller' },
  { id: 'cpu', name: 'Processador (CPU)', shortName: 'CPU 3D', subject: 'Tecnologia', defaultPart: 'cpu_die' },
  // Física (3 modelos)
  { id: 'circuit', name: 'Circuito Elétrico (Lei de Ohm)', shortName: 'Circuito 3D', subject: 'Física', defaultPart: 'bulb' },
  { id: 'prism', name: 'Prisma Óptico e Dispersão', shortName: 'Prisma Óptico', subject: 'Física', defaultPart: 'prism' },
  { id: 'motor', name: 'Motor Elétrico DC', shortName: 'Motor Elétrico', subject: 'Física', defaultPart: 'motor_coil' },
  // Química (3 modelos)
  { id: 'atom', name: 'Átomo (Modelo de Bohr)', shortName: 'Átomo 3D', subject: 'Química', defaultPart: 'nucleus' },
  { id: 'molecule', name: 'Molécula de Água (H₂O)', shortName: 'Molécula H₂O', subject: 'Química', defaultPart: 'oxygen' },
  { id: 'crystal', name: 'Rede Cristalina (Sal NaCl)', shortName: 'Cristal NaCl', subject: 'Química', defaultPart: 'crystal_na' },
  // Biologia (3 modelos)
  { id: 'cell', name: 'Célula Animal (Corte 3D)', shortName: 'Célula Animal', subject: 'Biologia', defaultPart: 'cell_nucleus' },
  { id: 'dna', name: 'Dupla Hélice de DNA', shortName: 'DNA 3D', subject: 'Biologia', defaultPart: 'dna_bases' },
  { id: 'heart', name: 'Coração Humano (Anatomia)', shortName: 'Coração 3D', subject: 'Biologia', defaultPart: 'heart_ventricles' },
  // Geografia (2 modelos)
  { id: 'earth', name: 'Planeta Terra (Camadas)', shortName: 'Terra 3D', subject: 'Geografia', defaultPart: 'earth_mantle' },
  { id: 'volcano', name: 'Vulcão em Corte Transversal', shortName: 'Vulcão 3D', subject: 'Geografia', defaultPart: 'volcano_chamber' }
];

export const BUILTIN_MODEL_IDS = BUILTIN_MODELS.map(m => m.id);
const MODEL_BY_ID = new Map(BUILTIN_MODELS.map(m => [m.id, m]));

export const HARDWARE_MODEL_IDS = ['ssd', 'hdd', 'nvme'];

export function isBuiltinModel(id) {
  return MODEL_BY_ID.has(id);
}

export function isValidModelId(id) {
  return id === 'custom' || MODEL_BY_ID.has(id);
}

export function modelMeta(id) {
  return MODEL_BY_ID.get(id) || MODEL_BY_ID.get('ssd');
}

export function modelName(id) {
  return MODEL_BY_ID.get(id)?.name || 'Modelo 3D';
}

export function modelShortName(id) {
  return MODEL_BY_ID.get(id)?.shortName || 'Modelo 3D';
}

export function modelSubject(id) {
  return MODEL_BY_ID.get(id)?.subject || 'Tecnologia';
}

// Agrupa os modelos por matéria na ordem do catálogo
export const modelGroups = (() => {
  const groups = [];
  const map = new Map();
  for (const m of BUILTIN_MODELS) {
    if (!map.has(m.subject)) {
      const list = [];
      map.set(m.subject, list);
      groups.push([m.subject, list]);
    }
    map.get(m.subject).push(m);
  }
  return groups;
})();

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Gera <optgroup> agrupado por matéria para qualquer <select> de modelo 3D.
 */
export function modelOptionsMarkup(selected = 'ssd', { includeCustom = true, customLabel = 'Meu modelo enviado' } = {}) {
  const groupsHtml = modelGroups.map(([subject, items]) =>
    `<optgroup label="${esc(subject)}">${items.map(m =>
      `<option value="${m.id}" ${selected === m.id ? 'selected' : ''}>${esc(m.name)}</option>`
    ).join('')}</optgroup>`
  ).join('');
  const customHtml = includeCustom
    ? `<optgroup label="Personalizado"><option value="custom" ${selected === 'custom' ? 'selected' : ''}>${esc(customLabel)}</option></optgroup>`
    : '';
  return groupsHtml + customHtml;
}
