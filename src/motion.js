import { prefersReducedMotion } from './motion-preference.js';
export class PageMotion {
  constructor() { this.lastKey = ''; this.players = new Set(); }
  captureSlide(root, key, transition) {
    const previousKey = this.slideKey;
    this.slideKey = key;
    if (!key || !previousKey || previousKey === key || transition === 'none' || prefersReducedMotion()) return;
    if (previousKey.slice(0, previousKey.lastIndexOf(':')) !== key.slice(0, key.lastIndexOf(':'))) return;
    const stage = root.querySelector('.document-stage:not(.outgoing-slide)');
    if (!stage) return;
    const snapshot = stage.cloneNode(true);
    snapshot.inert = true;
    snapshot.setAttribute('aria-hidden', 'true');
    snapshot.classList.add('outgoing-slide');
    snapshot.removeAttribute('id');
    for (const node of snapshot.querySelectorAll('[id]')) node.removeAttribute('id');
    const canvases = stage.querySelectorAll('canvas');
    snapshot.querySelectorAll('canvas').forEach((canvas, index) => {
      if (canvas.width && canvas.height) canvas.getContext('2d')?.drawImage(canvases[index], 0, 0);
    });
    return snapshot;
  }
  showOutgoingSlide(root, snapshot) {
    if (!snapshot) return;
    const incoming = root.querySelector('.document-stage');
    if (!incoming) return;
    const parent = incoming.parentElement;
    parent.classList.add('slide-transition-stack');
    incoming.classList.add('incoming-slide');
    const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = incoming;
    Object.assign(snapshot.style, { left: `${offsetLeft}px`, top: `${offsetTop}px`, width: `${offsetWidth}px`, height: `${offsetHeight}px` });
    incoming.after(snapshot);
    const finish = () => {
      snapshot.remove();
      incoming.classList.remove('incoming-slide');
      parent.classList.remove('slide-transition-stack');
    };
    const fallback = setTimeout(finish, 700);
    incoming.addEventListener('animationend', function onEnd(event) {
      if (event.target !== incoming) return;
      incoming.removeEventListener('animationend', onEnd);
      clearTimeout(fallback);
      finish();
    });
  }
  mount(root, { key, kind, slide = 0 }) {
    const changed = this.lastKey !== key, reduced = prefersReducedMotion();
    root.classList.remove('scene-arrive');
    root.dataset.scene = kind;
    if (changed && !reduced) {
      root.dataset.slideDirection = slide < (this.lastSlide || 0) ? 'backward' : 'forward';
      root.classList.add('scene-arrive');
      clearTimeout(this.timer); this.timer = setTimeout(() => root.classList.remove('scene-arrive'), 1000);
    }
    const next = new Set();
    for (const player of root.querySelectorAll('[data-lobby-player]')) {
      const id = player.dataset.lobbyPlayer; next.add(id);
      player.classList.toggle('is-new-player', changed || !this.players.has(id));
    }
    this.players = next; this.lastKey = key; this.lastSlide = slide;
  }
}
