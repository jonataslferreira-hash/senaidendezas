const AUTO_SAVE_KEY = 'sl-auto-save';

export function readAutoSavePreference(user) {
  const meta = user?.user_metadata;
  if (meta && typeof meta.auto_save === 'boolean') return meta.auto_save;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(AUTO_SAVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeAutoSavePreference(enabled) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(AUTO_SAVE_KEY, enabled ? '1' : '0');
  } catch {}
}
