// Tour de boas-vindas do Storage Lab, guiado pela Kuro (mascote inspirada
// em Kuromi). Destaca o elemento real da tela com o balão acompanhando,
// toca uma trilha baixinha e descreve cada aba — só o essencial.
// A escolha de ver (ou pular) o tour fica salva: não enche o saco de novo.
// (O CSS do tour é importado pelo app.js — aqui o módulo fica puro para testes.)

// Trilha do tour, hospedada pelo usuário (catbox) — toca em loop. Enquanto a
// narração fala, ela abaixa o volume e desacelera (duckMusic abaixo).
const TOUR_THEME_URL = 'https://files.catbox.moe/1jds9q.mp3';

// Mascote Kuro em SVG por partes: orelhas, olhos, boca e braço são elementos
// separados, cada um com sua animação (CSS em tour.css). A boca ganha vida
// quando a narração está tocando (classe "talking").
export const kuroMascot = `<svg class="kuro" viewBox="0 0 120 120" aria-hidden="true">
  <ellipse class="kuro-body" cx="60" cy="96" rx="21" ry="15" fill="#ffffff" stroke="#8d6bb8" stroke-width="2.5"/>
  <g class="kuro-arm"><ellipse cx="86" cy="92" rx="6.5" ry="10" fill="#ffffff" stroke="#8d6bb8" stroke-width="2.5"/></g>
  <g class="kuro-head">
    <g class="kuro-ear kuro-ear-l"><rect x="32" y="8" width="15" height="36" rx="7.5" fill="#cdb4f6" stroke="#8d6bb8" stroke-width="2.5"/></g>
    <g class="kuro-ear kuro-ear-r"><rect x="73" y="8" width="15" height="36" rx="7.5" fill="#cdb4f6" stroke="#8d6bb8" stroke-width="2.5"/></g>
    <circle cx="60" cy="58" r="34" fill="#cdb4f6" stroke="#8d6bb8" stroke-width="2.5"/>
    <g class="kuro-skull"><circle cx="60" cy="35" r="6.5" fill="#f5c0dd"/><circle cx="57.4" cy="34.4" r="1.3" fill="#7c5aa8"/><circle cx="62.6" cy="34.4" r="1.3" fill="#7c5aa8"/></g>
    <ellipse cx="60" cy="67" rx="23" ry="19" fill="#ffffff"/>
    <g class="kuro-eyes">
      <ellipse cx="51" cy="64" rx="4.2" ry="5.6" fill="#b9529e"/><circle cx="52.3" cy="62.2" r="1.4" fill="#ffffff"/>
      <ellipse cx="69" cy="64" rx="4.2" ry="5.6" fill="#b9529e"/><circle cx="70.3" cy="62.2" r="1.4" fill="#ffffff"/>
    </g>
    <ellipse cx="42" cy="72" rx="4.5" ry="2.8" fill="#f7c9e4"/><ellipse cx="78" cy="72" rx="4.5" ry="2.8" fill="#f7c9e4"/>
    <g class="kuro-mouth">
      <path class="kuro-smile" d="M52 74 Q60 81 68 74" fill="none" stroke="#a3568f" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M63.5 76.5 l2.8 4.2 l2.8 -4.2 z" fill="#ffffff" stroke="#cfa9e0" stroke-width="1"/>
      <ellipse class="kuro-mouth-open" cx="60" cy="77" rx="5" ry="4" fill="#7c3f6b"/>
    </g>
  </g>
</svg>`;

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
  { id: 'storage-ai', title: 'Storage AI', target: '.studio-rail button[data-studio-action="storage-ai"]',
    text: 'Aqui no canto esquerdo fica o Storage AI: escreve o tema e a inteligência artificial monta os slides pra você. Depois é só ajustar do seu jeito.' },
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
    text: 'Agora é com você! Se quiser rever esse tour depois, ele fica no pé do painel da sua conta, aqui em cima. Bora criar!' },
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
    // O navegador só libera áudio depois de um toque: o primeiro clique em
    // qualquer lugar destrava a trilha se o play inicial foi bloqueado.
    this.onGesture = () => { if (this.music?.paused) this.music.play().catch(() => {}); };
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
          <span class="tour-mascot" aria-hidden="true">${kuroMascot}</span>
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
    document.addEventListener('pointerdown', this.onGesture, { passive: true });
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
    // position() reescreve o className da bolha; limpar e devolver no mesmo
    // quadro força o replay da animação de entrada a cada passo.
    const bubble = this.nodes.querySelector('[data-tour-bubble]');
    const classes = bubble.className;
    bubble.className = ''; void bubble.offsetWidth; bubble.className = classes;
    this.speak(index);
  }

  position() {
    if (!this.nodes) return;
    const highlight = this.nodes.querySelector('[data-tour-highlight]');
    const bubble = this.nodes.querySelector('[data-tour-bubble]');
    const mobile = matchMedia('(max-width: 740px)').matches;
    bubble.style.left = bubble.style.top = '';
    if (!this.target) {
      highlight.style.display = 'none';
      // Sem alvo (boas-vindas/despedida): flutuando no topo do celular,
      // centralizada no desktop.
      bubble.className = mobile ? 'tour-bubble float pos-top' : 'tour-bubble centered';
      return;
    }
    const pad = 8;
    const rect = this.target.getBoundingClientRect();
    highlight.style.display = 'block';
    Object.assign(highlight.style, {
      left: Math.max(6, rect.left - pad) + 'px', top: Math.max(6, rect.top - pad) + 'px',
      width: Math.min(innerWidth - 12, rect.width + pad * 2) + 'px', height: Math.min(innerHeight - 12, rect.height + pad * 2) + 'px',
    });
    if (mobile) {
      // Bolha flutuante compacta no canto OPOSTO ao elemento destacado:
      // a Kuro nunca tampa o que está sendo explicado.
      const below = rect.top < innerHeight * .5;
      const right = rect.left + rect.width / 2 < innerWidth / 2;
      bubble.className = 'tour-bubble float ' + (below ? 'pos-bottom' : 'pos-top') + (right ? ' side-right' : ' side-left');
      return;
    }
    const space = rect.top > innerHeight * .55 ? 'above' : 'below';
    bubble.className = 'tour-bubble' + (space === 'above' ? ' above' : '');
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
      const audio = new Audio(TOUR_THEME_URL);
      audio.loop = true;
      // Referência imediata: se o tour acabar antes do play resolver, o
      // teardown pausa o áudio certo em vez de deixar a música vazar.
      this.music = audio;
      this.duckMusic(false);
      audio.play().catch(() => { /* autoplay bloqueado: o primeiro toque destrava */ });
    } catch { /* sem trilha: o tour segue mudo */ }
  }
  // Enquanto a narração fala, a trilha baixa o volume e desacelera; quando a
  // Kuro cala a boca, a música volta ao ritmo normal.
  duckMusic(ducked) {
    if (!this.music) return;
    this.music.volume = ducked ? 0.07 : 0.22;
    this.music.playbackRate = ducked ? 0.85 : 1;
  }
  stopMusic() { if (this.music) { this.music.pause(); } }
  speak(index) {
    this.stopVoice();
    if (!this.voiceOn) return;
    try {
      // Caminho RELATIVO: o site é publicado com base './' (GitHub Pages em
      // /senaidendezas/) — com barra absoluta a narração dava 404 no deploy.
      const clip = new Audio(`tour/step-${String(index + 1).padStart(2, '0')}.mp3`);
      clip.volume = 0.9;
      this.voice = clip;
      this.duckMusic(true);
      clip.play().then(() => {
        const mascot = this.nodes?.querySelector('.kuro');
        if (!mascot) { this.duckMusic(false); return; }
        mascot.classList.add('talking');
        clip.onended = () => { mascot.classList.remove('talking'); this.duckMusic(false); };
      }).catch(() => this.duckMusic(false));
    } catch { this.duckMusic(false); }
  }
  stopVoice() { if (this.voice) { this.voice.onended = null; this.voice.pause(); this.voice = null; } this.nodes?.querySelector('.kuro')?.classList.remove('talking'); this.duckMusic(false); }

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
    document.removeEventListener('pointerdown', this.onGesture);
    this.nodes?.remove();
    this.nodes = null;
    this.target = null;
    this.step = -1;
  }
}
