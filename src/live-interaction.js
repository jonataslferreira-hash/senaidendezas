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
