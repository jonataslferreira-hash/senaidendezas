import { mp3Duration } from './audio-duration.js';

export const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
export const MAX_AUDIO_INPUT_BYTES = 60 * 1024 * 1024;
export const TARGET_COMPRESSED_BYTES = 7.5 * 1024 * 1024;

const EXT_TO_MIME = {
  mp3: 'mpeg',
  wav: 'wav',
  ogg: 'ogg',
  oga: 'ogg',
  opus: 'opus',
  m4a: 'mp4',
  mp4: 'mp4',
  aac: 'aac',
  webm: 'webm',
  weba: 'webm',
  flac: 'flac',
  aif: 'aiff',
  aiff: 'aiff',
  '3gp': '3gpp',
  '3gpp': '3gpp',
  amr: 'amr',
  wma: 'x-ms-wma',
  caf: 'x-caf'
};

export const AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.ogg,.oga,.opus,.m4a,.mp4,.aac,.webm,.weba,.flac,.aif,.aiff,.3gp,.wma';

const DATA_AUDIO_RE = /^data:audio\/(mpeg|mp3|wav|x-wav|ogg|opus|mp4|x-m4a|aac|webm|flac|x-flac|aiff|x-aiff|3gpp|amr|x-ms-wma|x-caf|basic);base64,[A-Za-z0-9+/=\r\n]+$/i;

export function detectAudioSubtype(file) {
  if (!file) return '';
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  if (EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  const mime = String(file.type || '').toLowerCase().split(';')[0].trim();
  if (mime.startsWith('audio/')) {
    const sub = mime.slice(6);
    if (/^(mpeg|mp3|wav|x-wav|ogg|opus|mp4|x-m4a|aac|webm|flac|x-flac|aiff|x-aiff|3gpp|amr|x-ms-wma|x-caf)$/.test(sub)) {
      return sub === 'x-wav' ? 'wav' : sub === 'x-m4a' ? 'mp4' : sub === 'x-flac' ? 'flac' : sub === 'x-aiff' ? 'aiff' : sub;
    }
    return 'mpeg';
  }
  return '';
}

export function isSupportedAudioFile(file) {
  return Boolean(detectAudioSubtype(file));
}

// Aplica volume, velocidade e efeito slowed (quando rate < 1, reduz o tom junto sem esticar artificialmente).
// Slowed + reverb de verdade: acelera/desacelera a música inteira e passa o áudio
// por uma reverberação longa (o efeito que todo mundo usa). O grafo fica em
// cache por elemento — trocar de música não reconstrói a cada play.
const audioGraphs = new WeakMap();
export function audioGraph(player) {
  if (!player || typeof player !== 'object') return null;
  let graph = audioGraphs.get(player);
  if (graph) return graph;
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(player);
    const dry = ctx.createGain(), wet = ctx.createGain(), convolver = ctx.createConvolver(), master = ctx.createGain();
    // Impulso sintético: sala grande com cauda de ~2.6 s (reverb de slowed).
    const seconds = 2.6, rate = ctx.sampleRate, length = Math.floor(rate * seconds), impulse = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
    convolver.buffer = impulse;
    dry.gain.value = 1; wet.gain.value = 0; master.gain.value = 1;
    source.connect(dry).connect(master);
    source.connect(convolver).connect(wet).connect(master);
    master.connect(ctx.destination);
    graph = { ctx, dry, wet, master, source };
    audioGraphs.set(player, graph);
  } catch { graph = null; }
  return graph;
}
// Liga/desliga o reverb e devolve o volume combinado do grafo.
export function applyReverb(player, wet = 0, volume = 1) {
  const graph = audioGraph(player);
  if (graph) {
    try {
      if (graph.ctx.state === 'suspended') graph.ctx.resume().catch(() => {});
      graph.wet.gain.value = Math.max(0, Math.min(1, wet));
      graph.master.gain.value = Math.max(0, Math.min(1, volume));
    } catch { /* sem Web Audio: segue só com o elemento */ }
  }
  return Boolean(graph);
}

export function applyAudioPlayback(player, track) {
  if (!player || !track) return;
  const rate = Math.max(0.5, Math.min(2, Number(track.rate) || 1));
  const slowed = rate < 0.999;
  player.volume = Math.max(0, Math.min(1, Number.isFinite(Number(track.volume)) ? Number(track.volume) : 0.45));
  player.defaultPlaybackRate = rate;
  player.playbackRate = rate;
  // Efeito slowed: reverb junto (na música inteira, do começo ao fim).
  if (slowed) applyReverb(player, Math.max(0.18, Math.min(0.55, (1 - rate) * 2.2)), player.volume);
  else applyReverb(player, 0, player.volume);
  player.preservesPitch = !slowed;
  player.mozPreservesPitch = !slowed;
  player.webkitPreservesPitch = !slowed;
  player.loop = Boolean(track.loop);
}

export function validateAudio(value) {
  if (!value) return null;
  const assetId = typeof value.assetId === 'string' && /^asset-[a-f0-9-]{36}$/.test(value.assetId) ? value.assetId : '';
  if (value.assetId && !assetId) throw Error('Referência de áudio inválida.');
  const data = typeof value.data === 'string' ? value.data : '';
  if (data && !DATA_AUDIO_RE.test(data)) {
    throw Error('Use MP3, WAV, OGG, OPUS, M4A, AAC, FLAC ou WebM.');
  }
  if (data && data.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 128) {
    throw Error('O arquivo de áudio excedeu o limite suportado após compressão (16 MB).');
  }
  if (!data && !assetId) throw Error('O arquivo de áudio está ausente.');
  const trigger = value.trigger === 'background' || /^element:[a-zA-Z0-9_-]{1,100}$/.test(value.trigger || '') ? value.trigger : 'auto';
  const continueSlides = Number(value.continueSlides);
  return {
    ...(trigger === 'auto' ? {} : { trigger }),
    duration: Math.max(0, Math.min(14400, Number(value.duration) || 0)),
    name: String(value.name || 'Minha trilha').slice(0, 160),
    data,
    ...(assetId ? { assetId } : {}),
    volume: Number.isFinite(Number(value.volume)) ? Math.max(0, Math.min(1, Number(value.volume))) : 0.45,
    loop: value.loop !== false,
    rate: Math.max(0.5, Math.min(2, Number(value.rate) || 1)),
    ...(value.continueAcrossSlides === true ? { continueAcrossSlides: true } : {}),
    ...(Number.isInteger(continueSlides) && continueSlides >= 2 && continueSlides <= 80 ? { continueSlides } : {})
  };
}

// Reamostra e empacota PCM WAV mono leve para manter arquivos pesados (< 7.5 MB) compatíveis em qualquer navegador.
export function encodeCompactWav(samples, sourceRate, targetBytes = TARGET_COMPRESSED_BYTES) {
  const duration = samples.length / Math.max(1, sourceRate);
  const presets = [
    [24000, 16],
    [22050, 16],
    [16000, 16],
    [16000, 8],
    [12000, 8],
    [11025, 8],
    [8000, 8]
  ];
  let chosen = presets[presets.length - 1];
  for (const [sr, bits] of presets) {
    const rate = Math.min(sourceRate, sr);
    const estimated = 44 + Math.ceil(duration * rate) * (bits / 8);
    if (estimated <= targetBytes) {
      chosen = [rate, bits];
      break;
    }
  }
  const [targetRate, bits] = chosen;
  const outLength = Math.max(1, Math.min(Math.floor((targetBytes - 44) / (bits / 8)), Math.round(duration * targetRate)));
  const ratio = samples.length / outLength;
  const bytesPerSample = bits / 8;
  const dataSize = outLength * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, Math.round(targetRate), true);
  view.setUint32(28, Math.round(targetRate) * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, bits, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = samples[idx] || 0;
    const s1 = samples[Math.min(samples.length - 1, idx + 1)] || s0;
    const sample = Math.max(-1, Math.min(1, s0 + (s1 - s0) * frac));
    if (bits === 16) {
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    } else {
      view.setUint8(offset, Math.max(0, Math.min(255, Math.round((sample + 1) * 127.5))));
      offset += 1;
    }
  }
  return { bytes: new Uint8Array(buffer), subtype: 'wav', duration: outLength / targetRate };
}

function mixToMono(audioBuffer) {
  const channels = audioBuffer.numberOfChannels || 1;
  const len = audioBuffer.length;
  if (channels === 1) return audioBuffer.getChannelData(0);
  const mono = new Float32Array(len);
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += data[i] / channels;
  }
  return mono;
}

async function decodeAndCompress(rawBytes, targetBytes = TARGET_COMPRESSED_BYTES) {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    const copy = rawBytes.slice().buffer;
    const decoded = await ctx.decodeAudioData(copy);
    const mono = mixToMono(decoded);
    return encodeCompactWav(mono, decoded.sampleRate, targetBytes);
  } finally {
    ctx.close?.().catch?.(() => {});
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export async function readAudio(file) {
  if (!file || file.size === 0) throw Error('Selecione um arquivo de áudio válido.');
  if (file.size > MAX_AUDIO_INPUT_BYTES) throw Error('Escolha um áudio de até 60 MB.');
  const detected = detectAudioSubtype(file);
  if (!detected) throw Error('Formato de áudio não reconhecido. Use MP3, WAV, OGG, OPUS, M4A, AAC, FLAC, AIFF ou WebM.');

  let duration = Number(file.recordedSeconds) || 0;
  let canPlayNative = Boolean(file.recordedSeconds);
  if (!canPlayNative && typeof Audio !== 'undefined' && typeof URL?.createObjectURL === 'function') {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { audio.src = ''; reject(Error('timeout')); }, 12000);
        audio.onloadedmetadata = () => {
          if (Number.isFinite(audio.duration)) duration = audio.duration;
          clearTimeout(timeout);
          canPlayNative = true;
          resolve();
        };
        audio.onerror = () => { clearTimeout(timeout); reject(Error('unsupported')); };
        audio.preload = 'metadata';
        audio.src = url;
      });
    } catch {
      canPlayNative = false;
    } finally {
      audio.src = '';
      URL.revokeObjectURL(url);
    }
  }

  let bytes = new Uint8Array(await file.arrayBuffer());
  let subtype = detected;
  const heavyUncompressed = ['wav', 'flac', 'aiff'].includes(detected) && bytes.length > 4 * 1024 * 1024;
  const needsCompress = bytes.length > TARGET_COMPRESSED_BYTES || heavyUncompressed || !canPlayNative;

  if (needsCompress) {
    const compressed = await decodeAndCompress(bytes, TARGET_COMPRESSED_BYTES).catch(() => null);
    if (compressed && (!canPlayNative || compressed.bytes.length < bytes.length || bytes.length > MAX_AUDIO_BYTES)) {
      bytes = compressed.bytes;
      subtype = compressed.subtype;
      if (!duration) duration = compressed.duration;
      canPlayNative = true;
    }
  }

  if (!canPlayNative) {
    throw Error('Este formato não pôde ser decodificado pelo navegador. Tente MP3, WAV, OGG, M4A, FLAC ou WebM.');
  }
  if (bytes.length > MAX_AUDIO_BYTES) {
    throw Error('Não foi possível comprimir este áudio abaixo de 16 MB. Tente uma faixa mais curta ou em MP3.');
  }

  if (subtype === 'mpeg' && !duration) duration = mp3Duration(bytes);
  return validateAudio({
    duration,
    name: file.name,
    data: `data:audio/${subtype};base64,${bytesToBase64(bytes)}`,
    volume: 0.45,
    loop: !file.recordedSeconds
  });
}
