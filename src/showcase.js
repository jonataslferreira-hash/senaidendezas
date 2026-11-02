export const deviceArt = () => `<svg class="illustrated-drive" viewBox="0 0 220 150" fill="none" aria-hidden="true"><g class="drive-lower"><path d="M26 60 133 20l62 42-106 48z" fill="#8060ba"/><path d="m26 60 63 50v17L26 77z" fill="#634494"/><path d="m89 110 106-48v17l-106 48z" fill="#a88adb"/></g><g class="drive-upper"><path d="M26 43 133 3l62 42-106 48z" fill="#eadcff" stroke="#a98acd" stroke-width="2"/><ellipse cx="111" cy="47" rx="49" ry="24" transform="rotate(-18 111 47)" fill="#c8b0ef"/><ellipse cx="111" cy="47" rx="32" ry="15" transform="rotate(-18 111 47)" fill="#f7f1ff"/><ellipse cx="111" cy="47" rx="8" ry="4" fill="#8c68bb"/><path d="m53 62 37-5 33-29" stroke="#7952ae" stroke-width="7" stroke-linecap="round"/><circle cx="53" cy="62" r="6" fill="#bd9ce9"/></g><g fill="#eec67a"><path d="m103 113 6-3v8l-6 3z"/><path d="m114 108 6-3v8l-6 3z"/><path d="m125 103 6-3v8l-6 3z"/></g></svg>`;
export function showcaseMarkup() {
  return `<section class="studio-feature experience-feature"><div class="experience-copy"><span class="feature-label"><span></span> UMA AULA QUE TODO MUNDO SENTE</span><h2>Sua ideia merece<br><em>ganhar vida.</em></h2><p>Crie no computador. Conecte a turma pelo celular.<br>Transforme cada slide em uma descoberta.</p><div class="experience-actions"><button class="studio-btn accent" data-studio-action="new">Começar uma aula <span>↗</span></button><button class="tour-replay" data-showcase-play aria-label="Reproduzir demonstração">↻ Ver em movimento</button></div><div class="experience-tags"><span>▤ Seus slides</span><span>◇ Modelos para explorar</span><span>✦ Turma conectada</span></div></div><div class="experience-demo" data-showcase data-step="0" role="region" aria-label="Demonstração interativa do Storage Lab"><span class="demo-sticker sticker-star" aria-hidden="true">✦</span><span class="demo-sticker sticker-orbit" aria-hidden="true">✳</span><div class="showcase-connection" aria-hidden="true"><svg viewBox="0 0 440 290"><path d="M130 140c150-100 220-20 200 45S190 280 140 220"/></svg></div><div class="demo-board"><div class="demo-board-top"><span><i></i> DEMONSTRAÇÃO</span><span>storage<span>lab.</span></span></div><div data-showcase-board></div><div class="demo-board-bottom"><span>UMA IDEIA. MUITAS DESCOBERTAS.</span><span data-showcase-counter>01 / 03</span></div></div><div class="demo-phone phone-fox" aria-hidden="true"><span class="phone-speaker"></span><small>MINHA DESCOBERTA</small><span class="demo-avatar">🦊</span><strong>Luna</strong><span class="phone-status" data-phone-status>Pronta para aprender</span><div class="phone-mini-options"><i></i><i></i></div></div><div class="demo-phone phone-robot" aria-hidden="true"><span class="phone-speaker"></span><small>EU FAÇO PARTE</small><span class="demo-avatar">🤖</span><strong>Alex</strong><span class="phone-status" data-phone-status>Pronto para aprender</span><div class="phone-mini-options"><i></i><i></i></div></div><div class="demo-score" aria-hidden="true">✦ <strong>+1.000</strong><span>Uma descoberta!</span></div><nav class="showcase-steps" aria-label="Etapas da demonstração">${['Crie', 'Conecte', 'Interaja'].map((name, i) => `<button data-showcase-step="${i}" aria-pressed="${i === 0}"><span>0${i + 1}</span>${name}</button>`).join('')}</nav><p class="showcase-caption" data-showcase-caption aria-live="polite">Uma prévia para você experimentar.</p></div></section>`;
}
const stages = [
  () => `<div class="demo-board-stage stage-create"><span class="board-eyebrow">01 · A IDEIA É SUA</span><h3>Onde vivem<br>as suas ideias?</h3><button class="demo-device-button" data-showcase-explore aria-label="Abrir ou fechar o modelo da demonstração">${deviceArt()}<span>Toque para abrir o modelo ↗</span></button><div class="board-editor-tools"><span>T</span><span>▧</span><span>◇</span><i></i></div></div>`,
  () => `<div class="demo-board-stage stage-connect"><span class="board-eyebrow">02 · TODO MUNDO JUNTO</span><div class="connection-avatars" aria-hidden="true"><span>🦊</span><span>✦</span><span>🤖</span></div><h3>Um convite.<br>Toda a turma.</h3><p>Seu slide chega aos celulares.<br>A descoberta fica ainda melhor.</p><button data-showcase-step="2" class="demo-connect-button">Explorar juntos ↗</button></div>`,
  () => `<div class="demo-board-stage stage-play"><span class="board-eyebrow">03 · SUA VEZ DE DESCOBRIR</span><h3>Qual não tem<br>partes móveis?</h3><div class="demo-answers"><button data-showcase-answer="0"><b>A</b>HDD</button><button data-showcase-answer="1"><b>B</b>SSD</button></div><p role="status" data-demo-answer-status>Toque em uma resposta para experimentar.</p></div>`
];
export class Showcase {
  constructor(root) {
    this.root = root; this.step = 0; this.timers = []; this.hasPlayed = false;
    root.addEventListener('click', event => {
      if (event.target.closest('[data-account-action]')) this.stop();
      const button = event.target.closest('[data-showcase-step],[data-showcase-play],[data-showcase-answer],[data-showcase-explore]');
      if (!button) return;
      if (button.hasAttribute('data-showcase-play')) { if (this.node?.dataset.playing === 'true') this.stop(); else this.play(); }
      else if (button.hasAttribute('data-showcase-step')) { this.stop(); this.setStep(Number(button.dataset.showcaseStep)); }
      else if (button.hasAttribute('data-showcase-answer')) this.answer(Number(button.dataset.showcaseAnswer));
      else { this.stop(); const opened = this.node?.classList.toggle('device-open'); button.setAttribute('aria-pressed', String(opened)); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
    document.addEventListener('motion-preference-changed', () => { if (this.reduced()) this.stop(); });
  }
  reduced() { return document.documentElement.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches; }
  stop() { this.timers.forEach(clearTimeout); this.timers = []; if (this.node) this.node.dataset.playing = 'false'; const button = this.root.querySelector('[data-showcase-play]'); if (button) { button.textContent = '↻ Ver em movimento'; button.setAttribute('aria-label', 'Reproduzir demonstração'); } }
  mount() {
    const node = this.root.querySelector('[data-showcase]');
    if (node === this.node) return;
    this.stop(); this.observer?.disconnect(); this.node = node;
    if (!node) return;
    this.setStep(this.step);
    this.observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (!entry.isIntersecting || entry.intersectionRatio < .2) this.stop();
      else if (entry.intersectionRatio >= .55 && !this.hasPlayed && !this.reduced() && !document.hidden) this.play();
    }, { threshold: [0, .2, .55] }); this.observer.observe(node);
  }
  setStep(step) {
    if (!this.node || !stages[step]) return;
    this.step = step; this.node.dataset.step = String(step); this.node.classList.remove('demo-correct', 'demo-wrong', 'device-open');
    this.node.querySelector('[data-showcase-board]').innerHTML = stages[step]();
    this.node.querySelector('[data-showcase-counter]').textContent = `0${step + 1} / 03`;
    for (const b of this.node.querySelectorAll('.showcase-steps button')) b.setAttribute('aria-pressed', String(Number(b.dataset.showcaseStep) === step));
    for (const status of this.node.querySelectorAll('[data-phone-status]')) status.textContent = ['Pronto para aprender', 'Conectou à aula! ✓', 'Sua vez de participar'][step];
    this.node.querySelector('[data-showcase-caption]').textContent = ['Sua ideia começa no editor.', 'O mesmo slide, em todas as telas.', 'Aprender também é experimentar.'][step];
  }
  play() {
    this.stop(); this.hasPlayed = true; this.setStep(0);
    if (!this.node || this.reduced() || document.hidden) return;
    this.node.dataset.playing = 'true';
    const button = this.root.querySelector('[data-showcase-play]'); if (button) { button.textContent = '■ Parar animação'; button.setAttribute('aria-label', 'Parar demonstração'); }
    this.timers = [setTimeout(() => this.setStep(1), 2300), setTimeout(() => this.setStep(2), 4600), setTimeout(() => this.answer(1, false), 5900), setTimeout(() => this.stop(), 7600)];
  }
  answer(choice, stop = true) {
    if (stop) this.stop(); if (!this.node || this.step !== 2) return;
    this.node.classList.toggle('demo-correct', choice === 1); this.node.classList.toggle('demo-wrong', choice !== 1);
    for (const button of this.node.querySelectorAll('[data-showcase-answer]')) button.setAttribute('aria-pressed', String(Number(button.dataset.showcaseAnswer) === choice));
    this.node.querySelector('[data-demo-answer-status]').textContent = choice === 1 ? 'Boa! O SSD guarda dados sem peças móveis. ✦' : 'Quase! Experimente o SSD para descobrir.';
  }
}
