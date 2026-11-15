// Espelha o que o professor faz em experimentos e modelos 3D na tela dos alunos.
// Só vale em slides marcados como "Só eu controlo" (slide.interaction === 'teacher').
// O professor lê o estado da própria tela algumas vezes por segundo; quando algo
// muda, envia um pacote pequeno e cada aluno aplica os mesmos valores.

const round = value => Math.round(value * 1000) / 1000;
const widgets = root => [...(root?.querySelectorAll('.simulation-widget[data-simulation]:not(.custom-sim):not(.simulation-thumbnail)') || [])];
const fieldsOf = node => [...node.querySelectorAll('[data-param],[data-sim-select],[data-sim-text],[data-sim-toggle]')];
const readField = field => field.dataset.simToggle !== undefined ? field.dataset.value || '0' : field.value;

// 'teacher' = experimento e modelo 3D; 'sims' = só o experimento; 'models' = só o modelo 3D.
export const teacherControls = slide => ['teacher', 'sims', 'models'].includes(slide?.interaction) ? slide.interaction : '';
const scopeOf = slide => ({ sims: teacherControls(slide) !== 'models', models: teacherControls(slide) !== 'sims' });

function cameraOf(viewer) {
  if (!viewer?.camera || !viewer.controls) return null;
  const p = viewer.camera.position, t = viewer.controls.target;
  return [p.x, p.y, p.z, t.x, t.y, t.z].map(round);
}
function setCamera(viewer, values) {
  if (!viewer?.camera || !viewer.controls || !Array.isArray(values) || values.length !== 6 || !values.every(Number.isFinite)) return;
  const now = cameraOf(viewer);
  if (now && now.every((value, index) => Math.abs(value - values[index]) < .002)) return;
  viewer.camera.position.set(values[0], values[1], values[2]);
  viewer.controls.target.set(values[3], values[4], values[5]);
  viewer.controls.update();
  viewer.invalidate?.();
}

export function captureInteraction(root, { canvasModels, viewer, slide } = {}) {
  const scope = scopeOf(slide);
  const sims = !scope.sims ? [] : widgets(root).map(node => ({
    type: node.dataset.simulation,
    values: fieldsOf(node).map(readField),
    playing: node.querySelector('[data-sim-play]')?.getAttribute('aria-pressed') === 'true'
  }));
  const cameras = {};
  if (!scope.models) return { sims };
  for (const [id, item] of canvasModels?.viewers || []) { const camera = cameraOf(item); if (camera) cameras[id] = camera; }
  if (root?.querySelector('#viewer-slot')) { const camera = cameraOf(viewer); if (camera) cameras.main = camera; }
  return { sims, cameras, exploded: [...(canvasModels?.exploded || [])] };
}

export function applyInteraction(root, payload, { canvasModels, viewer, slide } = {}) {
  if (!payload || typeof payload !== 'object') return;
  const nodes = widgets(root), scope = scopeOf(slide);
  (scope.sims && Array.isArray(payload.sims) ? payload.sims : []).slice(0, 12).forEach((sim, index) => {
    const node = nodes[index];
    if (!node || node.dataset.simulation !== sim?.type || !Array.isArray(sim.values)) return;
    let changed = false;
    fieldsOf(node).forEach((field, position) => {
      const value = String(sim.values[position] ?? '').slice(0, 80);
      if (sim.values[position] === undefined || readField(field) === value) return;
      if (field.dataset.simToggle !== undefined) {
        field.dataset.value = value === '1' ? '1' : '0';
        field.setAttribute('aria-pressed', String(value === '1'));
        field.textContent = `Entrada ${field.dataset.simToggle.toUpperCase()}: ${field.dataset.value}`;
      } else field.value = value;
      changed = true;
    });
    if (changed) node.dispatchEvent(new Event('input', { bubbles: true }));
    const play = node.querySelector('[data-sim-play]');
    if (play && (play.getAttribute('aria-pressed') === 'true') !== Boolean(sim.playing)) play.click();
  });
  if (!scope.models) return;
  const cameras = payload.cameras && typeof payload.cameras === 'object' ? payload.cameras : {};
  for (const [id, item] of canvasModels?.viewers || []) if (cameras[id]) setCamera(item, cameras[id]);
  if (cameras.main && root?.querySelector('#viewer-slot')) setCamera(viewer, cameras.main);
  if (canvasModels && slide && Array.isArray(payload.exploded)) {
    const wanted = new Set(payload.exploded.map(String));
    for (const id of canvasModels.viewers.keys()) if (canvasModels.exploded.has(id) !== wanted.has(id)) canvasModels.toggle(id, slide);
  }
}

// Professor: observa a própria tela e envia só quando algo mudou.
export class InteractionBroadcaster {
  constructor(send) { this.send = send; this.timer = 0; this.last = ''; this.key = ''; }
  watch(key, capture) {
    if (this.key === key && this.timer) return;
    this.stop(); this.key = key;
    const tick = () => {
      let payload; try { payload = capture(); } catch { return; }
      const text = JSON.stringify(payload);
      if (text === this.last || text.length > 3500) return;
      this.last = text; this.send(payload);
    };
    this.timer = setInterval(tick, 110);
  }
  stop() { clearInterval(this.timer); this.timer = 0; this.last = ''; this.key = ''; }
}

// ---- Controle remoto: descreve os experimentos do slide para o celular do
// professor desenhar os mesmos controles, e aplica o que ele mexer por lá.
const short = (value, max = 60) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export function describeSims(root) {
  return widgets(root).slice(0, 4).map(node => ({
    name: short(node.querySelector('header strong')?.textContent || 'Experimento'),
    play: short(node.querySelector('[data-sim-play]')?.textContent || '', 24),
    acts: [...node.querySelectorAll('[data-lab-act]')].slice(0, 12).map((button, a) => ({ a, label: short(button.textContent, 30) })),
    fields: fieldsOf(node).map((field, i) => {
      if (field.type === 'hidden') return null;
      const label = short(field.getAttribute('aria-label') || field.textContent);
      if (field.dataset.simToggle !== undefined) return { i, k: 'toggle', label: short(field.textContent), value: field.dataset.value || '0' };
      if (field.tagName === 'SELECT') return { i, k: 'select', label, value: field.value, options: [...field.options].slice(0, 30).map(option => [option.value, short(option.textContent, 40)]) };
      if (field.type === 'range') return { i, k: 'range', label, value: field.value, min: field.min, max: field.max, step: field.step || '1' };
      return { i, k: 'text', label, value: short(field.value, 160) };
    }).filter(Boolean).slice(0, 16)
  }));
}
export function applySimCommand(root, command) {
  const node = widgets(root)[Number(command?.sim)];
  if (!node) return false;
  if (command.play) { node.querySelector('[data-sim-play]')?.click(); return true; }
  if (Number.isInteger(command.act)) { node.querySelectorAll('[data-lab-act]')[command.act]?.click(); return true; }
  const field = fieldsOf(node)[Number(command.field)];
  if (!field || field.type === 'hidden') return false;
  const value = String(command.value ?? '').slice(0, 160);
  if (field.dataset.simToggle !== undefined) { if ((field.dataset.value || '0') !== (value === '1' ? '1' : '0')) field.click(); return true; }
  if (field.tagName === 'SELECT' && ![...field.options].some(option => option.value === value)) return false;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

// ---- Controle remoto: modelos 3D. O celular vira um "touchpad" que gira o modelo.
export function orbitCamera(viewer, { dx = 0, dy = 0, zoom = 1 } = {}) {
  if (!viewer?.camera || !viewer.controls) return false;
  const p = viewer.camera.position, t = viewer.controls.target;
  let x = p.x - t.x, y = p.y - t.y, z = p.z - t.z;
  const radius = Math.hypot(x, y, z) || 1;
  const theta = Math.atan2(x, z) - (Number(dx) || 0);
  const phi = Math.max(.08, Math.min(Math.PI - .08, Math.acos(Math.max(-1, Math.min(1, y / radius))) - (Number(dy) || 0)));
  const next = Math.max(.2, Math.min(400, radius * Math.max(.5, Math.min(2, Number(zoom) || 1))));
  x = next * Math.sin(phi) * Math.sin(theta); y = next * Math.cos(phi); z = next * Math.sin(phi) * Math.cos(theta);
  p.set(t.x + x, t.y + y, t.z + z);
  viewer.controls.update?.(); viewer.invalidate?.();
  return true;
}
const modelTitles = { hdd: 'HD', ssd: 'SSD', nvme: 'NVMe', custom: 'Modelo 3D' };
export function describeModels(root, { canvasModels, slide } = {}) {
  const list = [];
  for (const id of canvasModels?.viewers?.keys() || []) {
    const element = slide?.elements?.find(item => item.id === id);
    list.push({ id, name: short(element?.modelLabel || modelTitles[element?.model] || 'Modelo 3D', 40), explode: Boolean(element && element.model !== 'custom'), exploded: canvasModels.exploded.has(id) });
  }
  if (root?.querySelector('#viewer-slot')) list.push({ id: 'main', name: 'Modelo 3D', explode: false, exploded: false });
  return list.slice(0, 4);
}
export function applyModelCommand(command, { canvasModels, viewer, slide } = {}) {
  const id = String(command?.model ?? '');
  const target = id === 'main' ? viewer : canvasModels?.viewers?.get(id);
  if (!target) return false;
  if (command.explode) { if (id === 'main' || !slide) return false; canvasModels.toggle(id, slide); return true; }
  return orbitCamera(target, { dx: command.dx, dy: command.dy, zoom: command.zoom });
}
