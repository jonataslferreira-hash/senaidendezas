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

// O sistema operacional pode desligar animações (Windows: "Mostrar animações
// no Windows" / "Efeitos de animação"). Nesse caso o site todo fica parado e a
// pessoa acha que o site quebrou. Aqui detectamos isso para oferecer o botão.
export function systemReduced() {
  try { return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches); } catch { return false; }
}
export function motionWasChosen() { return localMotion() !== 'system'; }
