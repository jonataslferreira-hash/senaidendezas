export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export function validateAudio(value) {
  if (!value) return null;
  const assetId = typeof value.assetId === 'string' && /^asset-[a-f0-9-]{36}$/.test(value.assetId) ? value.assetId : '';
  if (value.assetId && !assetId) throw Error('Referência de áudio inválida.');
  const data = typeof value.data === 'string' ? value.data : '';
  if (data && (!/^data:audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|aac|webm);base64,[A-Za-z0-9+/=\r\n]+$/i.test(data) || data.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 100)) throw Error('Use MP3, WAV, OGG, M4A, AAC ou WebM de até 8 MB.');
  if (!data && !assetId) throw Error('O arquivo de áudio está ausente.');
  return { name: String(value.name || 'Minha trilha').slice(0, 160), data, ...(assetId ? { assetId } : {}), volume: Number.isFinite(Number(value.volume)) ? Math.max(0, Math.min(1, Number(value.volume))) : .35, loop: value.loop !== false };
}
export async function readAudio(file) {
  if (!file || file.size === 0 || file.size > MAX_AUDIO_BYTES) throw Error('Escolha um áudio de até 8 MB.');
  const type = ({ mp3: 'mpeg', wav: 'wav', ogg: 'ogg', m4a: 'mp4', aac: 'aac', webm: 'webm' })[file.name.split('.').pop().toLowerCase()];
  if (!type) throw Error('Use MP3, WAV, OGG, M4A, AAC ou WebM.');
  // Decode once to reject renamed files and unsupported audio before saving.
  const url = URL.createObjectURL(file), audio = new Audio();
  try {
    await new Promise((resolve, reject) => { const timeout = setTimeout(() => { audio.src = ''; reject(Error('O áudio demorou para abrir. Tente outro arquivo.')); }, 12000); audio.onloadedmetadata = () => { clearTimeout(timeout); resolve(); }; audio.onerror = () => { clearTimeout(timeout); reject(Error('Este áudio não abriu no navegador. Tente exportar como MP3.')); }; audio.preload = 'metadata'; audio.src = url; });
  } finally { audio.src = ''; URL.revokeObjectURL(url); }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return validateAudio({ name: file.name, data: `data:audio/${type};base64,${btoa(binary)}`, volume: .35, loop: true });
}
