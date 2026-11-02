import {mobileChoice} from './slide-display.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const qrCorners = { tl: 'Superior esquerdo', tr: 'Superior direito', bl: 'Inferior esquerdo', br: 'Inferior direito' };
export function loadPresenterSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('sl-presenter-settings-v1'));
    return { qrVisible: saved?.qrVisible === true, qrCorner: Object.hasOwn(qrCorners, saved?.qrCorner) ? saved.qrCorner : 'br' };
  } catch { return { qrVisible: false, qrCorner: 'br' }; }
}
export function savePresenterSettings(settings) {
  try { localStorage.setItem('sl-presenter-settings-v1', JSON.stringify(settings)); } catch { /* works for this presentation even when persistence is unavailable */ }
}
export function presentationTools({ host, demo, state, settings, imageText, readOnly = false, compact = false }) {
  if (!host || state?.phase !== 'lesson') return '';
  return `<section class="presentation-toolbar" aria-label="Controles da apresentação">
    ${compact ? '' : `<div class="presentation-navigation"><button class="icon-btn bordered" data-action="previous" aria-label="Voltar slide" ${state.slide === 0 ? 'disabled' : ''}>←</button><span>${state.slide + 1} / ${state.lesson.slides.length}</span><button class="icon-btn bordered" data-action="next-slide" aria-label="Avançar slide" ${state.slide + 1 === state.lesson.slides.length ? 'disabled' : ''}>→</button></div>`}
    ${compact ? '' : `<button class="btn secondary small" data-action="fullscreen" aria-label="Modo apresentação">⛶ <span class="enter-fullscreen-label">Tela cheia</span><span class="leave-fullscreen-label">Sair da tela cheia</span></button>`}
    ${state.lesson.slides[state.slide].poll ? '<button class="btn secondary small" data-action="poll">▥ Abrir enquete</button>' : ''}
    ${readOnly ? '' : '<button class="btn secondary small" data-action="edit-current-slide">✎ Editar slide</button>'}
    ${state.totalQuestions ? '<button class="btn secondary small presentation-quiz" data-action="quiz">Iniciar quiz</button>' : state.slide + 1 === state.lesson.slides.length ? '<button class="btn secondary small presentation-quiz" data-action="finish">Encerrar aula</button>' : ''}
    ${state.lesson.slides[state.slide].kind === 'image' ? `<button class="btn secondary small image-text-button" data-action="image-text" aria-pressed="${imageText}">${imageText ? 'Ocultar texto' : 'Mostrar texto'}</button>` : ''}
    ${demo ? '' : `<label class="presenter-qr-toggle"><input type="checkbox" id="pinned-qr-enabled" ${settings.qrVisible ? 'checked' : ''} ${demo ? 'disabled' : ''}> QR Code ${demo ? '<small>(na sala ao vivo)</small>' : ''}</label>
    <label class="sr-only" for="pinned-qr-corner">Canto do QR Code</label><select id="pinned-qr-corner" aria-label="Canto do QR Code" ${demo ? 'disabled' : ''}>${Object.entries(qrCorners).map(([key, label]) => `<option value="${key}" ${settings.qrCorner === key ? 'selected' : ''}>${label}</option>`).join('')}</select>`}

  </section>`;
}
export function pinnedInvite({ host, demo, state, settings }) {
  if (!host || demo || !settings.qrVisible || state?.phase !== 'lesson') return '';
  return `<button class="pinned-room-qr qr-${settings.qrCorner}" data-action="share" aria-label="Ampliar convite da sala"><span>SALA <strong>${escape(state.code.slice(0, 3))} ${escape(state.code.slice(3))}</strong></span><img data-pinned-qr width="136" height="136" alt="QR Code para entrar nesta sala"><small>Aponte a câmera</small></button>`;
}
function field(label, key, value, area = false) {
  return `<div class="editor-field"><label for="live-${key}">${label}</label>${area ? `<textarea id="live-${key}" data-live-field="${key}">${escape(value)}</textarea>` : `<input id="live-${key}" data-live-field="${key}" value="${escape(value)}">`}</div>`;
}
export function liveEditDialog(slide, error = '') {
  if (!slide) return '';
  return `<div class="modal-backdrop live-edit-backdrop"><form id="live-edit-form" class="live-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="live-edit-title"><header><span class="studio-kicker">AJUSTE SEM SAIR DA APRESENTAÇÃO</span><h2 id="live-edit-title">Editar slide atual</h2><button type="button" class="icon-btn" data-action="cancel-edit-slide" aria-label="Fechar edição">×</button></header><div class="live-edit-fields">
    ${field('Título do slide', 'title', slide.title)}${mobileChoice(slide,{live:true})}
    ${slide.kind === 'canvas' ? `<p class="imported-notice">Edite os textos aqui. Para mover e redimensionar elementos, use o editor visual na biblioteca.</p>${slide.elements.filter(e => e.type === 'text').map((e, i) => `<div class="editor-field"><label for="live-element-${i}">Texto ${i + 1}</label><textarea id="live-element-${i}" data-live-element="${escape(e.id)}">${escape(e.text)}</textarea></div>`).join('')}` : slide.kind === 'document' ? '<p class="imported-notice">Esta página veio de PDF/PPTX. Você pode editar título, perguntas e notas. Para mudar o desenho, altere o arquivo original e importe novamente.</p>' : `${field('Etiqueta', 'tag', slide.tag)}${field('Introdução', 'intro', slide.intro, true)}${field('Ideias principais', 'points', slide.points.join('\n'), true)}${field('Destaque', 'callout', slide.callout, true)}`}
    ${slide.kind === 'model' ? `<div class="editor-field"><label for="live-model">Modelo 3D do slide</label><select id="live-model" data-live-field="model">${[['ssd', 'SSD SATA'], ['hdd', 'HDD'], ['nvme', 'SSD NVMe'], ...(slide.customModel ? [['custom', 'Meu modelo enviado']] : [])].map(([value, label]) => `<option value="${value}" ${slide.model === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div>` : ''}
    ${slide.kind === 'image' ? `${field('Link HTTPS da imagem', 'image', slide.image.startsWith('data:') ? '' : slide.image)}<label class="upload-image" for="live-image-file">Carregar outra imagem</label><input type="file" id="live-image-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>${field('Descrição da imagem', 'imageAlt', slide.imageAlt)}` : ''}
    ${field('Pergunta de discussão', 'prompt', slide.prompt, true)}${field('Explicação da discussão', 'answer', slide.answer, true)}${field('Notas só para o professor', 'note', slide.note, true)}
    ${error ? `<p class="studio-warning" role="alert">${escape(error)}</p>` : ''}
    </div><footer><span>Ao salvar, a turma recebe a atualização e a aula fica salva na biblioteca.</span><button type="button" class="btn secondary small" data-action="cancel-edit-slide">Cancelar</button><button class="btn primary small" type="submit">Salvar slide</button></footer></form></div>`;
}
