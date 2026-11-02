import { prefersReducedMotion } from './motion-preference.js';
export class PageMotion {
  constructor() { this.lastKey = ''; this.players = new Set(); }
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
