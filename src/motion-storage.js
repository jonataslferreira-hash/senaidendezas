// Preferência de animação salva no navegador: vale com ou sem conta.
export const MOTION_KEY = 'sl-motion';
export function localMotion() {
  try { const value = localStorage.getItem(MOTION_KEY); return ['normal', 'reduced'].includes(value) ? value : 'system'; } catch { return 'system'; }
}
export function writeLocalMotion(value) {
  try { if (['normal', 'reduced'].includes(value)) localStorage.setItem(MOTION_KEY, value); else localStorage.removeItem(MOTION_KEY); } catch { /* modo privado */ }
  document.documentElement.dataset.motion = localMotion();
  document.dispatchEvent(new Event('motion-preference-changed'));
}
