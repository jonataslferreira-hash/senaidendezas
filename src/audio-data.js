import {mp3Duration} from './audio-duration.js';
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export function validateAudio(value) {
  if (!value) return null;
  const assetId = typeof value.assetId === 'string' && /^asset-[a-f0-9-]{36}$/.test(value.assetId) ? value.assetId : '';
  if (value.assetId && !assetId) throw Error('Referência de áudio inválida.');
  const data = typeof value.data === 'string' ? value.data : '';
  if (data && (!/^data:audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|aac|webm);base64,[A-Za-z0-9+/=\r\n]+$/i.test(data) || data.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 100)) throw Error('Use MP3, WAV, OGG, M4A, AAC ou WebM de até 8 MB.');
  if (!data && !assetId) throw Error('O arquivo de áudio está ausente.');
  const trigger = value.trigger === 'background' || /^element:[a-zA-Z0-9_-]{1,100}$/.test(value.trigger || '') ? value.trigger : 'auto';
  const continueSlides=Number(value.continueSlides);
  return {...(trigger==='auto'?{}:{trigger}),duration:Math.max(0,Math.min(14400,Number(value.duration)||0)), name: String(value.name || 'Minha trilha').slice(0, 160), data, ...(assetId ? { assetId } : {}), volume: Number.isFinite(Number(value.volume)) ? Math.max(0, Math.min(1, Number(value.volume))) : .45, loop: value.loop !== false, rate: Math.max(.5, Math.min(2, Number(value.rate) || 1)), ...(value.continueAcrossSlides === true ? {continueAcrossSlides:true} : {}), ...(Number.isInteger(continueSlides)&&continueSlides>=2&&continueSlides<=80?{continueSlides}:{}) };
}
export async function readAudio(file) {
  if (!file || file.size === 0 || file.size > MAX_AUDIO_BYTES) throw Error('Escolha um áudio de até 8 MB.');
  const type = ({ mp3: 'mpeg', wav: 'wav', ogg: 'ogg', m4a: 'mp4', aac: 'aac', webm: 'webm' })[file.name.split('.').pop().toLowerCase()];
  if (!type) throw Error('Use MP3, WAV, OGG, M4A, AAC ou WebM.');
  // Decode once to reject renamed files and unsupported audio before saving.
  const url = URL.createObjectURL(file), audio = new Audio();let duration=Number(file.recordedSeconds)||0;
  try {
    if(!file.recordedSeconds)await new Promise((resolve, reject) => { const timeout = setTimeout(() => { audio.src = ''; reject(Error('O áudio demorou para abrir. Tente outro arquivo.')); }, 12000); audio.onloadedmetadata = () => {if(Number.isFinite(audio.duration))duration=audio.duration; clearTimeout(timeout); resolve(); }; audio.onerror = () => { clearTimeout(timeout); reject(Error('Este áudio não abriu no navegador. Tente exportar como MP3.')); }; audio.preload = 'metadata'; audio.src = url; });
  } finally { audio.src = ''; URL.revokeObjectURL(url); }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  if(type==='mpeg'&&!duration)duration=mp3Duration(bytes);
  return validateAudio({duration, name: file.name, data: `data:audio/${type};base64,${btoa(binary)}`, volume: .45, loop: !file.recordedSeconds });
}
