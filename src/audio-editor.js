import { esc } from './canvas-view.js';
import { AUDIO_ACCEPT } from './audio-data.js';

const formatDuration = seconds => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const formatRate = rate => `${Number(rate || 1).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1').replace('.', ',')}×`;

const SPEED_PRESETS = [
  [0.75, '0,75×'],
  [0.85, '0,85×'],
  [1, '1×'],
  [1.25, '1,25×'],
  [1.5, '1,5×']
];

export function audioEditor(audio, scope, elements = [], { expanded = false } = {}) {
  const trigger = audio?.trigger || 'auto';
  const choices = [
    ['auto', 'Assim que o slide abrir'],
    ['background', 'Ao clicar no fundo do slide'],
    ...elements.map((e, i) => [
      'element:' + e.id,
      (i + 1) + ' · ' + (e.type === 'text' ? e.text.trim().slice(0, 34) || 'Texto' : { image: 'Imagem', shape: 'Forma', model: 'Modelo 3D', simulation: 'Simulação', video: 'Vídeo' }[e.type] || 'Elemento')
    ])
  ];
  if (!choices.some(([id]) => id === trigger)) choices.push([trigger, 'Elemento removido']);

  const rate = Math.max(0.5, Math.min(2, Number(audio?.rate) || 1));
  const slowed = rate < 0.999;
  const volPct = Math.round((Number.isFinite(Number(audio?.volume)) ? Number(audio.volume) : 0.45) * 100);
  const dur = formatDuration(audio?.duration);
  const speedTag = slowed ? 'Slowed · tom grave' : rate > 1.001 ? 'Acelerado' : 'Normal';

  const triggerField = scope === 'slide'
    ? `<label class="audio-field"><span>Quando tocar</span><select data-slide-audio-trigger>${choices.map(([id, label]) =>
        `<option value="${esc(id)}" ${id === trigger ? 'selected' : ''}>${esc(label)}</option>`
      ).join('')}</select></label>`
    : '';

  const actionsRow = `<div class="audio-source-actions">
    <label class="audio-upload-label audio-source-btn is-primary"><span>↑ ${audio ? 'Trocar' : 'Enviar áudio'}</span><input type="file" title="" data-audio-upload="${scope}" accept="${AUDIO_ACCEPT}"></label>
    <button type="button" class="audio-source-btn" data-record-audio="${scope}">● Gravar</button>
  </div>`;

  const formatNote = `<small class="audio-format-hint">MP3, WAV, OGG, M4A, FLAC, OPUS, WebM e mais · arquivos acima de 8 MB são comprimidos automaticamente.</small>`;

  const loadedBody = audio ? `<div class="audio-loaded-card">
    <div class="audio-track-header">
      <span class="audio-track-badge" aria-hidden="true">♫</span>
      <div class="audio-track-meta">
        <strong class="audio-name" title="${esc(audio.name)}">${esc(audio.name)}</strong>
        ${dur ? `<small class="audio-duration">${dur}</small>` : ''}
      </div>
      <button type="button" class="audio-remove-btn" data-studio-action="remove-audio" data-audio-scope="${scope}" aria-label="Remover áudio" title="Remover áudio">×</button>
    </div>
    <audio class="audio-player-el" controls preload="metadata" data-audio-preview="${scope}" ${audio.data ? `src="${esc(audio.data)}"` : `data-audio-asset="${esc(audio.assetId)}"`}></audio>
    <div class="audio-slider-block">
      <div class="audio-slider-head"><span>Volume</span><output data-audio-vol-label="${scope}">${volPct}%</output></div>
      <input type="range" min="0" max="1" step="0.01" value="${audio.volume}" data-audio-volume="${scope}" aria-label="Volume ${scope.startsWith('quiz') ? 'do quiz' : 'do slide'}">
    </div>
    ${scope.startsWith('quiz') ? '' : `<div class="audio-slider-block audio-speed-block" data-slowed="${slowed}">
      <div class="audio-slider-head">
        <span>Velocidade</span>
        <span class="audio-speed-meta"><em class="audio-speed-tag" data-audio-speed-tag="${scope}">${speedTag}</em><output data-audio-rate-label="${scope}">${formatRate(rate)}</output></span>
      </div>
      <div class="audio-speed-chips" role="group" aria-label="Velocidades rápidas">${SPEED_PRESETS.map(([val, label]) =>
        `<button type="button" class="audio-speed-chip${Math.abs(rate - val) < 0.01 ? ' active' : ''}" data-audio-rate-preset="${val}" data-audio-scope="${scope}" aria-pressed="${Math.abs(rate - val) < 0.01}">${label}</button>`
      ).join('')}</div>
      <input type="range" min="0.5" max="1.75" step="0.05" value="${rate}" data-audio-rate="${scope}" aria-label="Velocidade do áudio">
    </div>`}
    ${triggerField}
    <div class="audio-toggles">
      <label class="audio-loop"><input type="checkbox" data-audio-loop="${scope}" ${audio.loop ? 'checked' : ''}><span>Repetir em loop</span></label>
      ${scope.startsWith('quiz') ? '' : `<label class="audio-loop"><input type="checkbox" data-audio-continue="${scope}" ${audio.continueAcrossSlides ? 'checked' : ''}><span>Continuar nos próximos slides</span></label>`}
    </div>
  </div>` : `<div class="audio-empty-state">
    <span class="audio-empty-icon" aria-hidden="true">♫</span>
    <p>Adicione uma música, efeito sonoro ou narração para tocar neste ${scope === 'slide' ? 'slide' : 'elemento'}.</p>
  </div>`;

  const body = `${loadedBody}${actionsRow}${formatNote}`;
  if (expanded) return `<div class="audio-editor audio-editor-v2 inspector-audio" aria-label="Áudio do slide">${body}</div>`;
  if (!scope.startsWith('quiz')) return `<details class="audio-editor audio-editor-v2 inspector-audio" ${audio ? 'open' : ''}><summary data-slide-audio-open>♫ ${scope === 'slide' ? 'Áudio do slide' : 'Áudio do elemento'}</summary>${body}</details>`;
  return `<details class="audio-editor audio-editor-v2" ${audio ? 'open' : ''}><summary>♫ ${scope === 'quiz-lobby' ? 'Meu áudio do lobby' : scope === 'quiz-question' ? 'Meu áudio das perguntas' : 'Música do lobby e quiz'}</summary>${body}</details>`;
}
