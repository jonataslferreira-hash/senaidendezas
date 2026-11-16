// Tour de boas-vindas do Storage Lab, guiado pela Kuro (mascote inspirada
// em Kuromi). Destaca o elemento real da tela com o balão acompanhando,
// toca uma trilha baixinha e descreve cada aba — só o essencial.
// A escolha de ver (ou pular) o tour fica salva: não enche o saco de novo.
// (O CSS do tour é importado pelo app.js — aqui o módulo fica puro para testes.)

export const TOUR_STORAGE_KEY = 'sl-tour';

export function shouldOfferTour(storage = localStorage) {
  try { return !storage.getItem(TOUR_STORAGE_KEY); } catch { return false; }
}

export function markTourSeen(storage = localStorage, value = 'done') {
  try { storage.setItem(TOUR_STORAGE_KEY, value); } catch { /* modo privado */ }
}

const wait = ms => new Promise(done => setTimeout(done, ms));

export const tourSteps = [
  { id: 'welcome', title: 'Oi! Eu sou a Kuro 💜', target: null,
    text: 'Que tal um rapidinho? Eu te mostro o essencial do Storage Lab — em poucos minutos você já cria sua primeira aula interativa.' },
  { id: 'library', title: 'Biblioteca de aulas', target: '[data-library-grid]',
    text: 'Aqui ficam suas aulas. Em cada cartão você pode editar, apresentar, duplicar ou exportar.' },
  { id: 'create', title: 'Criar ou importar', target: '.create-import-card',
    text: 'Comece uma apresentação do zero — ou importe o PDF/PPTX que você já tem.' },
  { id: 'storage-ai', title: 'Storage AI', target: '.storage-ai-primary',
    text: 'Escreve o tema e a inteligência artificial monta os slides pra você. Depois é só ajustar do seu jeito.' },
  { id: 'catalog', title: 'Catálogo', target: 'button[data-studio-action="open-templates"]',
    text: 'Modelos prontos de ciências pra começar com estilo: só escolher, personalizar e apresentar.' },
  { id: 'join', title: 'Entrar em uma sala', target: '#join-form', nav: 'join',
    text: 'Pra participar de uma aula ao vivo: digita o código que o professor passar e entra pelo celular.' },
  { id: 'shared', title: 'Compartilhados', target: '.shared-library', nav: 'shared',
    text: 'Monte aulas em equipe: todo mundo edita junto, ao vivo, na mesma aula.' },
  { id: 'editor', title: 'O editor visual', target: '.designer-stage-wrap', editor: true,
    enter: studio => { const card = studio.root.querySelector('.lesson-card .card-edit'); card?.click(); },
    text: 'Aqui você monta o slide: texto, imagem, formas, modelos 3D e simulações — tudo arrastando com o mouse ou o dedo.' },
  { id: 'inspector', title: 'Painel de propriedades', target: '#designer-inspector',
    text: 'Selecionou um elemento? As opções dele ficam aqui. Nas abas de cima você alterna entre slides, perguntas e etapas.' },
  { id: 'present', title: 'Hora do show!', target: 'button[data-studio-action="present-draft"]',
    text: 'Clique em Apresentar pra gerar o código da sala: a turma entra pelo celular e responde ao vivo. Aqui a playlist do editor assume, então eu fico quietinha…' },
  { id: 'bye', title: 'É isso! 💜', target: null,
    text: 'Agora é com você. Se quiser rever esse tour depois, é só clicar em “Rever tour” na biblioteca. Bora criar!' },
];

export class SiteTour {
  constructor(studio) {
    this.studio = studio;
    this.step = -1;
    this.nodes = null;
    this.voiceOn = true;
    this.music = null;
    this.voice = null;
    this.raf = 0;
    this.onReflow = () => { if (this.raf) cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => { this.raf = 0; this.position(); }); };
    this.onKey = event => {
      if (!this.nodes) return;
      if (event.key === 'Escape') this.stop('skipped');
      else if (event.key === 'ArrowRight' && this.step > 0) this.next();
    };
  }

  offer() { this.start(0, true); }
  start(at = 1, offering = false) {
    this.teardown();
    this.offering = offering;
    this.build();
    this.showStep(Number.isInteger(at) ? at : 1);
  }

  build() {
    const wrap = document.createElement('div');
    wrap.className = 'site-tour';
    wrap.innerHTML = `
      <div class="tour-backdrop" data-tour-backdrop></div>
      <div class="tour-highlight" data-tour-highlight></div>
      <div class="tour-bubble" role="dialog" aria-label="Tour do Storage Lab" data-tour-bubble>
        <div class="tour-mascot-row">
          <img class="tour-mascot" src="/tour-mascot.png" alt="" width="56" height="56">
          <div class="tour-heading"><strong data-tour-title></strong><span class="tour-guide">Kuro · guia do Storage Lab</span></div>
          <button type="button" class="tour-sound" data-tour-sound aria-label="Ativar ou silenciar a voz" title="Ativar ou silenciar a voz">🔊</button>
        </div>
        <p data-tour-text></p>
        <div class="tour-progress" data-tour-dots></div>
        <div class="tour-buttons">
          <button type="button" class="tour-skip" data-tour-skip>Pular tour</button>
          <button type="button" class="tour-next" data-tour-next>Próximo</button>
        </div>
      </div>`;
    document.body.append(wrap);
    this.nodes = wrap;
    wrap.querySelector('[data-tour-skip]').addEventListener('click', () => this.stop('skipped'));
    wrap.querySelector('[data-tour-next]').addEventListener('click', () => this.next());
    wrap.querySelector('[data-tour-sound]').addEventListener('click', event => {
      this.voiceOn = !this.voiceOn;
      event.currentTarget.textContent = this.voiceOn ? '🔊' : '🔇';
      if (!this.voiceOn) this.stopVoice();
    });
    window.addEventListener('resize', this.onReflow, { passive: true });
    window.addEventListener('scroll', this.onReflow, { passive: true, capture: true });
    document.addEventListener('keydown', this.onKey);
    this.startMusic();
  }

  async showStep(index) {
    const steps = tourSteps;
    if (index >= steps.length) { this.stop('done'); return; }
    const step = steps[index];
    this.step = index;
    // Navegação da etapa (troca de aba/abrir editor) antes de destacar.
    if (step.nav) {
      const link = this.studio.root.querySelector(`button[data-studio-action="${step.nav}"]`);
      if (link) { link.click(); await wait(120); }
    }
    if (step.enter) { step.enter(this.studio); await wait(260); }
    if (step.editor) this.stopMusic(); // no editor, a playlist da aula assume
    this.nodes.querySelector('[data-tour-title]').textContent = step.title;
    this.nodes.querySelector('[data-tour-text]').textContent = step.text;
    const next = this.nodes.querySelector('[data-tour-next]');
    next.textContent = index === 0 ? 'Começar tour' : index === steps.length - 1 ? 'Concluir' : 'Próximo';
    this.nodes.querySelector('[data-tour-skip]').textContent = index === 0 ? 'Agora não' : 'Pular tour';
    const dots = this.nodes.querySelector('[data-tour-dots]');
    dots.innerHTML = steps.map((_, i) => `<i class="${i === index ? 'on' : ''}" aria-label="Etapa ${i + 1} de ${steps.length}"></i>`).join('');
    const target = step.target ? this.studio.root.querySelector(step.target) : null;
    this.target = target && target.offsetWidth ? target : null;
    if (step.target && !this.target && index < steps.length - 1) { this.showStep(index + 1); return; } // elemento não encontrado: pula etapa
    if (this.target && this.target.scrollIntoView) { this.target.scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(60); }
    this.nodes.classList.toggle('has-target', Boolean(this.target));
    this.position();
    this.speak(index);
  }

  position() {
    if (!this.nodes) return;
    const highlight = this.nodes.querySelector('[data-tour-highlight]');
    const bubble = this.nodes.querySelector('[data-tour-bubble]');
    const mobile = matchMedia('(max-width: 740px)').matches;
    if (!this.target) { highlight.style.display = 'none'; bubble.classList.toggle('sheet', mobile); return; }
    const pad = 8;
    const rect = this.target.getBoundingClientRect();
    highlight.style.display = 'block';
    Object.assign(highlight.style, {
      left: Math.max(6, rect.left - pad) + 'px', top: Math.max(6, rect.top - pad) + 'px',
      width: Math.min(innerWidth - 12, rect.width + pad * 2) + 'px', height: Math.min(innerHeight - 12, rect.height + pad * 2) + 'px',
    });
    if (mobile) { bubble.classList.add('sheet'); return; }
    bubble.classList.remove('sheet');
    const space = rect.top > innerHeight * .55 ? 'above' : 'below';
    bubble.classList.toggle('above', space === 'above');
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - 170), innerWidth - 352);
    bubble.style.left = left + 'px';
    bubble.style.top = space === 'above' ? Math.max(12, rect.top - 16 - 210) + 'px' : Math.min(innerHeight - 230, rect.bottom + 16) + 'px';
  }

  next() {
    if (this.step === tourSteps.length - 1) { this.stop('done'); return; }
    if (this.step === 0) this.startMusic(); // "Começar tour" é o gesto que libera o áudio
    this.showStep(this.step + 1);
  }

  startMusic() {
    if (this.music) return;
    try {
      const audio = new Audio('/tour-theme.mp3');
      audio.loop = true;
      audio.volume = 0.2;      // baixinho de fundo
      audio.playbackRate = 0.92; // em slow, como pedido
      audio.play().then(() => { this.music = audio; }).catch(() => {});
    } catch { /* sem trilha: o tour segue mudo */ }
  }
  stopMusic() { if (this.music) { this.music.pause(); } }
  speak(index) {
    this.stopVoice();
    if (!this.voiceOn) return;
    try {
      const clip = new Audio(`/tour/step-${String(index + 1).padStart(2, '0')}.mp3`);
      clip.volume = 0.9;
      clip.play().catch(() => {});
      this.voice = clip;
    } catch { /* sem voz nesta etapa */ }
  }
  stopVoice() { if (this.voice) { this.voice.pause(); this.voice = null; } }

  stop(reason = 'done') {
    markTourSeen(undefined, reason);
    this.teardown();
  }
  teardown() {
    this.stopVoice();
    this.stopMusic();
    this.music = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('resize', this.onReflow);
    window.removeEventListener('scroll', this.onReflow, { capture: true });
    document.removeEventListener('keydown', this.onKey);
    this.nodes?.remove();
    this.nodes = null;
    this.target = null;
    this.step = -1;
  }
}
