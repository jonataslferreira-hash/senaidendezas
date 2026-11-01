import { LessonLibrary, newLesson, newSlide, newQuestion, clone, validateLesson, imageURL, difficulties, MAX_LESSON_BYTES } from './lessons.js';

import { archiveImportedPages, fillAssetImages, hydrateLesson, removePageAssets } from './assets.js';
const assetImage = (slide, cls = '') => `<img class="${cls}" ${slide.image ? `src="${esc(slide.image)}"` : `data-asset-id="${esc(slide.assetId)}"`} alt="${esc(slide.imageAlt || slide.title)}">`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const glyph = (name) => ({ grid: '▦', add: '+', arrow: '↗', slides: '▤', quiz: '✦', play: '▷', edit: '✎', copy: '⧉', more: '···', back: '←', up: '↑', down: '↓', close: '×', download: '↓', image: '▧', model: '◇', text: 'T' }[name] || name);
const button = (action, label, cls = '', attributes = '') => `<button type="button" class="studio-btn ${cls}" data-studio-action="${action}" ${attributes}>${label}</button>`;
const field = (label, key, value, scope, { textarea = false, hint = '', type = 'text', attributes = '' } = {}) => {
  const id = scope + '-' + key;
  return `<div class="editor-field"><label for="${id}">${label}</label>${textarea ? `<textarea id="${id}" data-scope="${scope}" data-field="${key}" ${attributes}>${esc(value)}</textarea>` : `<input id="${id}" type="${type}" data-scope="${scope}" data-field="${key}" value="${esc(value)}" ${attributes}>`}${hint ? `<small>${hint}</small>` : ''}</div>`;
};
const kindLabel = kind => ({ text: 'Texto', image: 'Imagem', model: 'Modelo 3D', document: 'Slide importado' }[kind]);

export class Studio {
  constructor(root, callbacks) {
    this.root = root; this.callbacks = callbacks;
    this.view = 'library'; this.tab = 'slides'; this.index = 0; this.questionIndex = 0;
    this.dirty = false; this.launching = false; this.dialog = null;
    this.importDialog = false; this.importing = null; this.importError = '';
    try { this.library = new LessonLibrary(); }
    catch {
      this.library = Object.create(LessonLibrary.prototype);
      this.library.lessons = []; this.library.warning = 'O armazenamento do navegador está indisponível. Permita o armazenamento para salvar aulas.';
    }
    root.addEventListener('click', e => {
      const target = e.target.closest('[data-studio-action]');
      if (target && !target.disabled) this.action(target.dataset.studioAction, target).catch(err => callbacks.toast(err.message));
    });
    root.addEventListener('input', e => this.change(e.target));
    root.addEventListener('change', e => {
      if (e.target.id === 'import-slides-file') this.importSlideFile(e.target.files[0]);
      else if (e.target.id === 'import-lesson-file') this.importFile(e.target.files[0]).catch(err => callbacks.toast(err.message));
      else if (e.target.id === 'slide-image-file') this.uploadImage(e.target.files[0]).catch(err => callbacks.toast(err.message));
      else this.change(e.target);
    });
    window.addEventListener('beforeunload', e => { if (this.dirty) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.dialog) { this.dialog = null; callbacks.render(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && this.view === 'editor' && this.root.querySelector('.studio-editor')) {
        e.preventDefault();
        try { this.save(); callbacks.render(); callbacks.toast('Aula salva neste navegador.'); } catch (error) { callbacks.toast(error.message); }
      }
    });
  }
  shell(content) {
    return `<div class="studio-shell"><aside class="studio-rail"><button class="studio-wordmark" data-studio-action="library" aria-label="Storage Lab, biblioteca"><span class="studio-logo">s<span>l</span>.</span><span>storage<span>lab.</span></span></button><div class="rail-label">SEU ESPAÇO DE ENSINO</div><nav>${button('library', '<span>▦</span> Biblioteca de aulas', this.view !== 'join' ? 'rail-link active' : 'rail-link')}${button('join', '<span>↗</span> Entrar em uma sala', this.view === 'join' ? 'rail-link active' : 'rail-link')}</nav><div class="rail-note"><span class="local-dot"></span><strong>Seu espaço, suas ideias.</strong><p>As aulas ficam neste navegador. Exporte uma cópia para levar com você.</p></div><div class="rail-bottom">CRIAR. ENSINAR. CONECTAR.</div></aside><div class="studio-body"><header class="studio-header"><span class="studio-breadcrumb">Meu espaço <span>/</span> ${this.view === 'editor' ? 'Editor de aula' : this.view === 'join' ? 'Participar' : 'Biblioteca'}</span><span class="studio-profile">P<span>Professor</span></span></header>${content}</div></div>${this.dialogMarkup()}${this.importMarkup()}`;
  }
  markup() {
    if (this.view === 'editor') return this.editor();
    if (this.view === 'join') return this.shell(`<main class="studio-join"><div><span class="studio-kicker">APRENDER É PARTICIPAR</span><h1>Sua próxima descoberta<br>começa <em>aqui.</em></h1><p>Use o código compartilhado pelo professor ou aponte a câmera para o QR Code da apresentação.</p><div class="join-illustration" aria-hidden="true">✦ <span>↗</span> ◇</div></div>${this.callbacks.joinForm()}</main>`);
    return this.libraryMarkup();
  }
  libraryMarkup() {
    const lessons = this.library.lessons;
    return this.shell(`<main class="studio-library"><section class="library-heading"><div><span class="studio-kicker">IDEIAS QUE GANHAM VIDA</span><h1>Sua próxima grande <em>aula.</em></h1><p>Crie o conteúdo. Convide a turma. Descubram juntos.</p></div><div class="library-top-actions">${button('upload-slides', '↑ Importar slides', 'quiet')}${button('import', '↓ JSON', 'quiet')}${button('new', '+ Nova aula', 'accent')}</div></section>
      ${this.library.warning ? `<p class="studio-warning" role="alert">${esc(this.library.warning)}</p>` : ''}
      <section class="studio-feature"><div><span class="feature-label"><span></span> DA SUA TELA PARA AS MÃOS DA TURMA</span><h2>Ensinar pode ser<br>uma experiência.</h2><p>Slides, imagens, modelos 3D e desafios.<br>Uma aula conduzida por você, explorada por todos.</p><div class="feature-chips"><span>▤ Slides ao vivo</span><span>◇ Exploração 3D</span><span>✦ Quiz em equipe</span></div></div><div class="feature-art" aria-hidden="true"><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span><span class="art-card card-one">▤<small>SUA IDEIA</small><i></i><i></i></span><span class="art-card card-two">✦<small>A DESCOBERTA</small><b>+1.000</b></span><span class="art-spark">✧</span><span class="art-dot"></span></div></section>
      <section class="library-section"><div class="library-section-title"><h2>Minha biblioteca <span>${lessons.length}</span></h2><span>Salvas neste navegador</span></div><div class="lesson-card-grid">${lessons.map(l => this.lessonCard(l)).join('')}<button class="new-lesson-card" data-studio-action="new"><span>+</span><strong>Uma ideia nova?</strong><small>Comece uma aula do zero</small></button></div></section><footer class="studio-footer"><span>Feito para conectar quem ensina e quem aprende.</span>${button('restore-demo', 'Adicionar exemplo HDD e SSD', 'link')}</footer><input type="file" id="import-lesson-file" accept=".json,application/json" hidden><input type="file" id="import-slides-file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" hidden></main>`);
  }
  lessonCard(l) {
    const demo = l.id === 'hdd-ssd-demo';
    const model = l.slides.some(s => s.kind === 'model');
    const cover = l.slides.find(s => s.kind === 'document');
    return `<article class="lesson-card"><div class="lesson-card-art ${model ? 'hardware-art' : 'ideas-art'}"><span class="lesson-category">${cover ? (cover.sourceType || 'SLIDES').toUpperCase() + ' IMPORTADO' : demo ? 'AULA DEMONSTRATIVA' : 'SUA CRIAÇÃO'}</span>${cover ? assetImage(cover, 'imported-cover') : ''}<div aria-hidden="true" ${cover ? 'hidden' : ''}>${model ? '◇' : 'Aa'}<span>${model ? 'EXPLORE POR DENTRO' : 'UMA IDEIA. MUITAS DESCOBERTAS.'}</span></div><span class="card-art-number">${String(l.slides.length).padStart(2, '0')}</span></div><div class="lesson-card-content"><h3>${esc(l.title || 'Aula sem título')}</h3><p>${esc(l.description || 'Dê forma à sua próxima descoberta.')}</p><div class="lesson-card-meta"><span>▤ ${l.slides.length} slides</span><span>✦ ${l.questions.length} perguntas</span></div><div class="lesson-card-primary">${button('edit', 'Editar aula ↗', 'card-edit', `data-id="${esc(l.id)}" aria-label="Editar aula: ${esc(l.title)}"`)}${button('present', '▷ Apresentar', 'card-present studio-launch', `data-id="${esc(l.id)}" ${this.launching ? 'disabled' : ''}`)}</div><div class="lesson-card-secondary">${button('preview', demo ? 'Explorar a aula' : 'Prévia', 'link', `data-id="${esc(l.id)}"`)}<details class="lesson-menu"><summary aria-label="Mais opções: ${esc(l.title)}">···</summary><div>${button('rename', 'Renomear', '', `data-id="${esc(l.id)}"`)}${button('duplicate', 'Duplicar', '', `data-id="${esc(l.id)}"`)}${button('export', 'Exportar JSON', '', `data-id="${esc(l.id)}"`)}${button('delete', 'Excluir aula', 'danger-text', `data-id="${esc(l.id)}"`)}</div></details></div></div></article>`;
  }
  editor() {
    const l = this.draft;
    return this.shell(`<main class="studio-editor"><div class="editor-heading"><div>${button('library', '← Biblioteca', 'link')}<span class="save-state ${this.dirty ? 'unsaved' : ''}" role="status">${this.dirty ? 'Alterações não salvas' : 'Salvo neste navegador'}</span></div><div class="editor-top-actions">${button('export-draft', '↓ JSON', 'quiet')}${button('save', 'Salvar aula', 'quiet')}${button('preview-draft', '▷ Prévia', 'quiet')}${button('present-draft', 'Apresentar ↗', 'accent studio-launch', this.launching ? 'disabled' : '')}</div></div><div class="editor-lesson-meta">${field('Título da aula', 'title', l.title, 'lesson', { attributes: 'maxlength="140"' })}${field('Descrição', 'description', l.description, 'lesson', { attributes: 'maxlength="500" placeholder="Tema, turma ou objetivo da aula"' })}</div><div class="editor-tabs" role="tablist" aria-label="Conteúdo da aula"><button role="tab" aria-selected="${this.tab === 'slides'}" data-studio-action="tab-slides">▤ Slides <span>${l.slides.length}</span></button><button role="tab" aria-selected="${this.tab === 'quiz'}" data-studio-action="tab-quiz">✦ Quiz <span>${l.questions.length}</span></button></div><div class="editor-workspace"><aside class="editor-outline"><div class="outline-heading"><span>${this.tab === 'slides' ? 'SEQUÊNCIA DA AULA' : 'DESAFIO FINAL'}</span>${button(this.tab === 'slides' ? 'add-slide' : 'add-question', '+', 'outline-add', `aria-label="${this.tab === 'slides' ? 'Adicionar slide' : 'Adicionar pergunta'}"`)}</div><div class="outline-items">${(this.tab === 'slides' ? l.slides : l.questions).map((item, i) => `<button class="outline-item ${i === (this.tab === 'slides' ? this.index : this.questionIndex) ? 'active' : ''}" data-studio-action="${this.tab === 'slides' ? 'select-slide' : 'select-question'}" data-index="${i}"><span>${String(i + 1).padStart(2, '0')}</span><div><strong ${i === (this.tab === 'slides' ? this.index : this.questionIndex) ? 'data-current-label' : ''}>${esc((this.tab === 'slides' ? item.title : item.text) || 'Sem título')}</strong><small>${this.tab === 'slides' ? kindLabel(item.kind) : esc(item.difficulty) + ' · ' + item.seconds + ' s'}</small></div></button>`).join('')}</div></aside><section class="editor-form-area">${this.tab === 'slides' ? this.slideEditor() : this.quizEditor()}</section><aside class="editor-preview-area"><span class="studio-kicker">UM OLHAR DA TURMA</span><div id="editor-mini-preview">${this.previewMarkup()}</div><p>A prévia completa mostra a apresentação e permite testar o quiz.</p>${button('preview-draft', 'Abrir prévia ↗', 'quiet')}</aside></div></main>`);
  }
  itemToolbar(type, i, total) {
    return `<div class="item-toolbar"><span>${type === 'slide' ? 'SLIDE' : 'PERGUNTA'} ${String(i + 1).padStart(2, '0')}</span><div>${button('move-' + type + '-up', '↑', 'square', `aria-label="Mover ${type === 'slide' ? 'slide' : 'pergunta'} para cima" ${i === 0 ? 'disabled' : ''}`)}${button('move-' + type + '-down', '↓', 'square', `aria-label="Mover ${type === 'slide' ? 'slide' : 'pergunta'} para baixo" ${i >= total - 1 ? 'disabled' : ''}`)}${button('duplicate-' + type, '⧉', 'square', `aria-label="Duplicar ${type === 'slide' ? 'slide' : 'pergunta'}"`)}${button('delete-' + type, 'Excluir', 'link danger-text')}</div></div>`;
  }
  slideEditor() {
    const s = this.draft.slides[this.index];
    if (s.kind === 'document') return this.documentEditor(s);
    return `${this.itemToolbar('slide', this.index, this.draft.slides.length)}<div class="editor-field"><label for="slide-kind">Formato do slide</label><select id="slide-kind" data-scope="slide" data-field="kind">${[['text', 'Texto e ideias'], ['image', 'Imagem e explicação'], ['model', 'Modelo 3D interativo']].map(([v, label]) => `<option value="${v}" ${s.kind === v ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
      ${field('Título do slide', 'title', s.title, 'slide', { attributes: 'maxlength="200"' })}${field('Etiqueta', 'tag', s.tag, 'slide', { attributes: 'maxlength="160" placeholder="Ex.: O ponto de partida"' })}${field('Introdução', 'intro', s.intro, 'slide', { textarea: true })}${field('Ideias principais', 'points', s.points.join('\n'), 'slide', { textarea: true, hint: 'Uma ideia por linha. Até 12 tópicos.' })}
      ${s.kind === 'model' ? `<div class="editor-field"><label for="slide-model">Modelo para explorar</label><select id="slide-model" data-scope="slide" data-field="model">${[['ssd', 'SSD SATA'], ['hdd', 'HDD'], ['nvme', 'SSD M.2 NVMe']].map(([v, label]) => `<option value="${v}" ${s.model === v ? 'selected' : ''}>${label}</option>`).join('')}</select><small>A biblioteca inicial contém três modelos didáticos de armazenamento.</small></div>` : ''}
      ${s.kind === 'image' ? `<div class="image-editor">${field('Link da imagem', 'image', s.image.startsWith('data:') ? '' : s.image, 'slide', { type: 'url', attributes: 'placeholder="https://..."', hint: s.image.startsWith('data:') ? 'Imagem incorporada ao arquivo da aula.' : 'Use um link HTTPS ou carregue uma imagem abaixo.' })}<label class="upload-image" for="slide-image-file">↑ Carregar imagem do computador</label><input id="slide-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>${field('Descrição da imagem', 'imageAlt', s.imageAlt, 'slide', { attributes: 'maxlength="500"', hint: 'Descreva o que a turma deve observar. Também ajuda quem usa leitor de tela.' })}${s.image ? button('clear-image', 'Remover imagem', 'link') : ''}</div>` : ''}
      ${field('Destaque', 'callout', s.callout, 'slide', { textarea: true })}${s.comparison ? button('clear-comparison', 'Remover comparação HDD × SSD deste slide', 'link') : ''}<details class="editor-details" ${s.prompt ? 'open' : ''}><summary>↗ Pergunta para discutir com a turma</summary>${field('Pergunta de discussão', 'prompt', s.prompt, 'slide', { textarea: true })}${field('Explicação da discussão', 'answer', s.answer, 'slide', { textarea: true })}</details><details class="editor-details"><summary>▤ Roteiro do apresentador</summary>${field('Notas só para o professor', 'note', s.note, 'slide', { textarea: true, hint: 'As notas não são enviadas aos celulares dos alunos.' })}</details>`;
  }
  quizEditor() {
    if (!this.draft.questions.length) return `<div class="editor-empty"><span>✦</span><h2>O aprendizado vira desafio.</h2><p>Crie perguntas com alternativas, tempo e dificuldade. O quiz é opcional: você também pode encerrar a aula sem ele.</p>${button('add-question', '+ Criar primeira pergunta', 'accent')}</div>`;
    const q = this.draft.questions[this.questionIndex];
    return `${this.itemToolbar('question', this.questionIndex, this.draft.questions.length)}${field('Pergunta', 'text', q.text, 'question', { textarea: true })}<div class="editor-field"><label for="question-option-count">Número de alternativas</label><select id="question-option-count" data-scope="question" data-field="optionCount">${[2, 3, 4].map(n => `<option value="${n}" ${q.options.length === n ? 'selected' : ''}>${n} alternativas</option>`).join('')}</select></div><fieldset class="quiz-options-editor"><legend>Alternativas <small>Marque a resposta correta</small></legend>${q.options.map((option, i) => `<div><input type="radio" name="correct-answer" id="correct-${i}" data-scope="question" data-field="correct" value="${i}" aria-label="Alternativa correta: ${'ABCD'[i]}" ${q.correct === i ? 'checked' : ''}><label for="option-${i}">${'ABCD'[i]}</label><input id="option-${i}" data-scope="question" data-option="${i}" value="${esc(option)}" aria-label="Alternativa ${'ABCD'[i]}" maxlength="500"></div>`).join('')}</fieldset><div class="editor-field-row"><div class="editor-field"><label for="question-difficulty">Dificuldade</label><select id="question-difficulty" data-scope="question" data-field="difficulty">${Object.keys(difficulties).map(d => `<option ${q.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select><small id="difficulty-points">Até ${difficulties[q.difficulty].toLocaleString('pt-BR')} pontos</small></div>${field('Tempo (segundos)', 'seconds', q.seconds, 'question', { type: 'number', attributes: 'min="5" max="300" step="1"', hint: 'Entre 5 e 300 segundos.' })}</div>${field('Explicação da resposta', 'explanation', q.explanation, 'question', { textarea: true, hint: 'Aparece depois que o professor revela a resposta ou o tempo termina.' })}`;
  }
  previewMarkup() {
    if (this.tab === 'quiz') {
      const q = this.draft.questions[this.questionIndex];
      return q ? `<div class="mini-slide"><span>✦ QUIZ · ${esc(q.seconds)} s</span><h3>${esc(q.text || 'Sua pergunta')}</h3><div class="mini-answers">${q.options.map((o, i) => `<p><b>${'ABCD'[i]}</b>${esc(o)}</p>`).join('')}</div></div>` : '<div class="mini-slide"><span>✦ SEU QUIZ</span><h3>A próxima descoberta começa com uma pergunta.</h3></div>';
    }
    const s = this.draft.slides[this.index];
    if (s.kind === 'document') return `<div class="mini-slide mini-imported"><span>${esc(s.sourceType.toUpperCase())} · ${esc(s.title)}</span>${assetImage(s)}</div>`;
    let media = '';
    try { if (s.kind === 'image' && s.image) media = `<img src="${esc(imageURL(s.image))}" alt="${esc(s.imageAlt)}">`; } catch { media = '<p>Adicione uma imagem válida.</p>'; }
    return `<div class="mini-slide"><span>${esc(s.tag || 'SUA AULA')}</span><h3>${esc(s.title || 'Título do slide')}</h3>${media}${s.kind === 'model' ? `<div class="mini-model">◇<small>${{ ssd: 'SSD SATA', hdd: 'HDD', nvme: 'SSD NVMe' }[s.model]}</small></div>` : ''}<p>${esc(s.intro)}</p><ul>${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>${s.prompt ? `<blockquote>${esc(s.prompt)}</blockquote>` : ''}</div>`;
  }
  dialogMarkup() {
    if (!this.dialog) return '';
    const l = this.library.lessons.find(l => l.id === this.dialog.id);
    if (!l) return '';
    const deleting = this.dialog.type === 'delete';
    return `<div class="modal-backdrop"><section class="studio-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-dialog-title"><h2 id="studio-dialog-title">${deleting ? 'Excluir esta aula?' : 'Renomear aula'}</h2><p>${deleting ? `“${esc(l.title)}” será removida deste navegador. Você pode exportar um JSON antes de excluir.` : 'Um bom título já começa a contar a história.'}</p>${!deleting ? '<label for="rename-lesson">Novo nome</label><input id="rename-lesson" maxlength="140" value="' + esc(l.title) + '">' : ''}<div>${button('cancel-dialog', 'Cancelar', 'quiet')}${button(deleting ? 'confirm-delete' : 'confirm-rename', deleting ? 'Excluir aula' : 'Salvar nome', deleting ? 'danger' : 'accent')}</div></section></div>`;
  }
  change(input) {
    if (this.view !== 'editor' || !input.dataset.scope) return;
    const scope = input.dataset.scope, key = input.dataset.field;
    const item = scope === 'lesson' ? this.draft : scope === 'slide' ? this.draft.slides[this.index] : this.draft.questions[this.questionIndex];
    if (input.type === 'radio' && !input.checked) return;
    if (key === 'optionCount') {
      const count = Number(input.value);
      item.options = Array.from({ length: count }, (_, i) => item.options[i] ?? 'Alternativa ' + 'ABCD'[i]);
      item.correct = Math.min(item.correct, count - 1);
    } else if (input.dataset.option !== undefined) item.options[Number(input.dataset.option)] = input.value;
    else item[key] = key === 'points' ? input.value.split('\n').filter(p => p.trim()).slice(0, 12) : ['seconds', 'correct'].includes(key) ? Number(input.value) : input.value;
    if (key === 'difficulty') item.base = difficulties[item.difficulty];
    this.markDirty();
    if (key === 'kind' || key === 'optionCount') this.callbacks.render();
    else {
      const preview = document.querySelector('#editor-mini-preview');
      if (preview) { preview.innerHTML = this.previewMarkup(); fillAssetImages(preview); }
      const label = document.querySelector('[data-current-label]');
      if (label && scope !== 'lesson') label.textContent = (this.tab === 'slides' ? item.title : item.text) || 'Sem título';
      if (key === 'difficulty') document.querySelector('#difficulty-points').textContent = 'Até ' + item.base.toLocaleString('pt-BR') + ' pontos';
    }
  }
  markDirty() {
    this.dirty = true;
    const status = document.querySelector('.save-state');
    if (status) { status.textContent = 'Alterações não salvas'; status.classList.add('unsaved'); }
  }
  save() {
    if (!this.draft) return;
    this.draft = this.library.save(this.draft); this.dirty = false;
  }
  open(id) {
    this.draft = clone(this.library.lessons.find(l => l.id === id));
    this.index = 0; this.questionIndex = 0; this.tab = 'slides'; this.dirty = false; this.view = 'editor';
  }
  async launch(lesson, preview) {
    if (this.launching) return;
    this.launching = true; this.callbacks.render();
    try {
      const validated = validateLesson(await hydrateLesson(lesson));
      await (preview ? this.callbacks.preview(validated) : this.callbacks.present(validated));
    }
    finally { this.launching = false; this.callbacks.render(); }
  }
  async download(lesson) {
    const content = validateLesson(await hydrateLesson(lesson, true), { draft: true });
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = (content.title || 'aula').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async importFile(file) {
    if (!file) return;
    if (file.size > MAX_LESSON_BYTES * 2) throw Error('O arquivo é grande demais. Use uma aula de até 48 MB.');
    let input;
    try { input = JSON.parse(await file.text()); } catch { throw Error('Não foi possível ler o JSON. Escolha um arquivo exportado pela plataforma.'); }
    const parsed = validateLesson(input, { draft: true });
    if (parsed.slides.some(s => s.assetId && !s.image)) throw Error('Este JSON não contém todas as imagens. Exporte novamente a aula no navegador original.');
    const archived = await archiveImportedPages(parsed);
    let lesson;
    try { lesson = this.library.import(archived.lesson); }
    catch (error) { await removePageAssets(archived.ids).catch(() => {}); throw error; }
    this.open(lesson.id); this.callbacks.render(); this.callbacks.toast('Aula importada. Uma nova cópia foi criada na biblioteca.');
  }
  async uploadImage(file) {
    if (!file) return;
    const draft = this.draft, slide = draft.slides[this.index];
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1_400_000) throw Error('Escolha PNG, JPEG, WebP ou GIF de até 1,4 MB.');
    const result = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Não foi possível carregar a imagem.')); reader.readAsDataURL(file); });
    if (this.draft !== draft || !draft.slides.includes(slide)) return;
    slide.image = imageURL(result); this.markDirty(); this.callbacks.render();
  }
  afterRender() { fillAssetImages(this.root); }
  documentEditor(slide) {
    return `${this.itemToolbar('slide', this.index, this.draft.slides.length)}
      <div class="imported-notice"><span>${esc((slide.sourceType || 'ARQUIVO').toUpperCase())} IMPORTADO</span><p>A página preserva o visual do arquivo. Você pode reordenar, duplicar ou excluir páginas e acrescentar slides, perguntas e notas. Para editar o desenho original, altere o arquivo e importe novamente.</p>${slide.sourceType === 'pptx' ? '<p>Revise a prévia: animações e vídeos não são importados, e fontes ou elementos complexos podem mudar. Para maior fidelidade, exporte o PowerPoint como PDF.</p>' : ''}</div>
      ${field('Título do slide', 'title', slide.title, 'slide', { attributes: 'maxlength="200"' })}
      <div class="imported-page-preview">${assetImage(slide)}</div>
      ${field('Pergunta de discussão', 'prompt', slide.prompt, 'slide', { textarea: true })}
      ${field('Explicação da discussão', 'answer', slide.answer, 'slide', { textarea: true })}
      ${field('Notas só para o professor', 'note', slide.note, 'slide', { textarea: true })}`;
  }
  importMarkup() {
    if (!this.importDialog) return '';
    const job = this.importing;
    return `<div class="modal-backdrop"><section class="studio-dialog import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><span class="studio-kicker">SUAS AULAS TAMBÉM CABEM AQUI</span><h2 id="import-title">Traga seus slides.</h2><p>Importe um PDF ou PowerPoint (.pptx). Cada página vira um slide para apresentar em tela cheia e acompanhar pelo celular.</p>${job ? `<div class="import-status"><strong>${esc(job.name)}</strong><p id="import-read-status" role="status">Abrindo o arquivo…</p><progress id="import-progress" max="1" aria-label="Progresso da importação"></progress></div>` : `${button('choose-slides', '↑ Escolher PDF ou PPTX', 'accent import-choose')}<p class="import-limits">Até 25 MB e 80 páginas. O arquivo é processado neste navegador.</p><p class="import-hint">PPTX: a importação é estática. Fontes, gráficos e outros elementos podem variar. Confira a prévia; para maior fidelidade, prefira PDF. Outros formatos podem ser exportados como PDF antes de importar.</p>`}
      ${this.importError ? `<p class="studio-warning" role="alert">${esc(this.importError)}</p>` : ''}<div>${button('cancel-import', job ? 'Cancelar importação' : 'Fechar', 'quiet')}</div></section></div>`;
  }
  async importSlideFile(file) {
    if (!file || this.importing) return;
    const controller = new AbortController();
    this.importing = { controller, name: file.name }; this.importDialog = true; this.importError = '';
    this.callbacks.render();
    let ids = [], committed = false;
    try {
      const { importSlides } = await import('./import-slides.js');
      const lesson = await importSlides(file, { signal: controller.signal, progress: (done, total) => {
        const status = document.querySelector('#import-read-status'), progress = document.querySelector('#import-progress');
        if (status) status.textContent = total ? 'Preparando slide ' + Math.min(done + 1, total) + ' de ' + total : 'Abrindo o arquivo…';
        if (progress && total) { progress.max = total; progress.value = done; }
      } });
      controller.signal.throwIfAborted();
      const archived = await archiveImportedPages(validateLesson(lesson));
      ids = archived.ids; controller.signal.throwIfAborted();
      const saved = this.library.save(archived.lesson); committed = true;
      this.open(saved.id); this.importDialog = false;
      this.callbacks.toast(saved.slides.length + ' slides importados. Confira a prévia antes de apresentar.');
    } catch (error) {
      if (controller.signal.aborted) { this.importDialog = false; this.callbacks.toast('Importação cancelada.'); }
      else { this.importError = error.message || 'Não foi possível importar o arquivo. Tente exportá-lo como PDF.'; }
    } finally {
      if (!committed) await removePageAssets(ids).catch(() => {});
      this.importing = null; this.callbacks.render();
    }
  }
  async action(action, target) {
    if (this.importing && action !== 'cancel-import') return;
    const id = target.dataset.id;
    const lookup = () => this.library.lessons.find(l => l.id === id);
    if (['library', 'join'].includes(action)) {
      if (this.dirty) this.save();
      this.view = action; this.callbacks.render(); return;
    }
    if (action === 'upload-slides') { this.importDialog = true; this.importError = ''; }
    else if (action === 'choose-slides') { document.querySelector('#import-slides-file').click(); return; }
    else if (action === 'cancel-import') {
      if (this.importing) this.importing.controller.abort();
      else this.importDialog = false;
    }
    else if (action === 'new') { const l = this.library.save(newLesson()); this.open(l.id); }
    else if (action === 'restore-demo') { const l = this.library.restoreDemo(); this.open(l.id); }
    else if (action === 'edit') this.open(id);
    else if (action === 'save') { this.save(); this.callbacks.toast('Aula salva neste navegador.'); }
    else if (action === 'duplicate') { this.library.duplicate(id); this.callbacks.toast('Cópia adicionada à biblioteca.'); }
    else if (action === 'rename' || action === 'delete') this.dialog = { type: action, id };
    else if (action === 'cancel-dialog') this.dialog = null;
    else if (action === 'confirm-delete') {
      const deleted = this.library.lessons.find(l => l.id === this.dialog.id);
      this.library.remove(this.dialog.id); this.dialog = null;
      const retained = new Set(this.library.lessons.flatMap(l => l.slides.map(s => s.assetId)));
      await removePageAssets(deleted.slides.map(s => s.assetId).filter(id => id && !retained.has(id))).catch(() => {});
    }
    else if (action === 'confirm-rename') {
      const name = document.querySelector('#rename-lesson').value.trim();
      if (!name) throw Error('Digite o novo nome da aula.');
      const l = this.library.lessons.find(l => l.id === this.dialog.id); this.library.save({ ...l, title: name }); this.dialog = null;
    }
    else if (action === 'import') { document.querySelector('#import-lesson-file').click(); return; }
    else if (action === 'export') { await this.download(lookup()); return; }
    else if (action === 'export-draft') { await this.download(this.draft); return; }
    else if (['preview', 'present'].includes(action)) { await this.launch(lookup(), action === 'preview'); return; }
    else if (['preview-draft', 'present-draft'].includes(action)) { this.save(); await this.launch(this.draft, action === 'preview-draft'); return; }
    else if (action.startsWith('tab-')) this.tab = action.slice(4);
    else if (action === 'select-slide') this.index = Number(target.dataset.index);
    else if (action === 'select-question') this.questionIndex = Number(target.dataset.index);
    else if (action === 'clear-comparison') { this.draft.slides[this.index].comparison = false; this.markDirty(); }
    else if (action === 'clear-image') { this.draft.slides[this.index].image = ''; this.markDirty(); }
    else {
      const isSlide = action.includes('slide'), list = isSlide ? this.draft.slides : this.draft.questions, indexKey = isSlide ? 'index' : 'questionIndex', i = this[indexKey];
      if (action.startsWith('add-') || action.startsWith('duplicate-')) {
        if (list.length >= (isSlide ? 80 : 50)) throw Error('Você chegou ao limite de ' + (isSlide ? '80 slides.' : '50 perguntas.'));
        const item = action.startsWith('add-') ? (isSlide ? newSlide() : newQuestion()) : { ...clone(list[i]), id: crypto.randomUUID() };
        const next = action.startsWith('add-') ? list.length : i + 1;
        list.splice(next, 0, item); this[indexKey] = next;
      } else if (action.startsWith('delete-')) {
        if (isSlide && list.length === 1) throw Error('Mantenha pelo menos um slide na aula.');
        list.splice(i, 1); this[indexKey] = Math.max(0, Math.min(i, list.length - 1));
      } else if (action.startsWith('move-')) {
        const next = i + (action.endsWith('up') ? -1 : 1);
        if (next < 0 || next >= list.length) return;
        [list[i], list[next]] = [list[next], list[i]]; this[indexKey] = next;
      } else return;
      this.markDirty();
    }
    this.callbacks.render();
    if (this.dialog) document.querySelector('#rename-lesson, .studio-dialog button')?.focus();
  }
}
