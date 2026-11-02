const key = 'sl-appearance';
export function applyAppearance(mode) {
  const value = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
  document.documentElement.dataset.appearance = value === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value;
  document.documentElement.dataset.appearanceChoice = value;
  try { localStorage.setItem(key, value); } catch { /* preference still applies to this visit */ }
}
export function appearancePicker() {
  const mode = document.documentElement.dataset.appearanceChoice || 'system';
  return `<label class="appearance-picker"><span class="sr-only">Aparência do site</span><select data-appearance aria-label="Aparência do site">${[['light', '☀ Claro'], ['dark', '☾ Escuro'], ['system', '◐ Sistema']].map(([value, label]) => `<option value="${value}" ${value === mode ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
}
let initial = 'system'; try { initial = localStorage.getItem(key) || initial; } catch { /* unavailable */ }
applyAppearance(initial);
document.addEventListener('change', event => { if (event.target.matches('[data-appearance]')) { applyAppearance(event.target.value); for (const picker of document.querySelectorAll('[data-appearance]')) picker.value = event.target.value; } });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (document.documentElement.dataset.appearanceChoice === 'system') applyAppearance('system'); });
