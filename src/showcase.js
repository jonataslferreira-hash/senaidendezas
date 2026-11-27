import { prefersReducedMotion } from './motion-preference.js';
import { slides, defaultQuestions } from './content.js';

export const deviceArt = () => `<svg class="illustrated-drive" viewBox="0 0 220 150" fill="none" aria-hidden="true"><g class="drive-lower"><path d="M26 60 133 20l62 42-106 48z" fill="#8060ba"/><path d="m26 60 63 50v17L26 77z" fill="#634494"/><path d="m89 110 106-48v17l-106 48z" fill="#a88adb"/></g><g class="drive-upper"><path d="M26 43 133 3l62 42-106 48z" fill="#eadcff" stroke="#a98acd" stroke-width="2"/><ellipse cx="111" cy="47" rx="49" ry="24" transform="rotate(-18 111 47)" fill="#c8b0ef"/><ellipse cx="111" cy="47" rx="32" ry="15" transform="rotate(-18 111 47)" fill="#f7f1ff"/><ellipse cx="111" cy="47" rx="8" ry="4" fill="#8c68bb"/><path d="m53 62 37-5 33-29" stroke="#7952ae" stroke-width="7" stroke-linecap="round"/><circle cx="53" cy="62" r="6" fill="#bd9ce9"/></g><g fill="#eec67a"><path d="m103 113 6-3v8l-6 3z"/><path d="m114 108 6-3v8l-6 3z"/><path d="m125 103 6-3v8l-6 3z"/></g></svg>`;

// Esta é uma simulação local usando conteúdo da aula de exemplo, não uma sala real.
const slide = slides[0], question = defaultQuestions[0];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showcaseMarkup() {
  return `<section class="studio-feature experience-feature">
    <div class="experience-copy"><h2>Sua ideia merece<br><em class="living-title">ganhar vida</em></h2>
      <p>Monte slides, rode quizzes ao vivo e exporte em PowerPoint direto do navegador.</p>
      <div class="experience-actions"><button class="studio-btn accent" data-studio-action="new">Começar uma aula <span>↗</span></button><button class="studio-btn quiet" data-studio-action="open-templates">Explorar catálogo</button></div>
    </div>
    <div class="experience-demo showcase-new" data-showcase data-step="0" role="region" aria-label="Demonstração interativa do Storage Lab">
      <div class="showcase-scene"><div class="showcase-orbit"></div><div class="showcase-orbit showcase-orbit-secondary"></div>
        <div class="showcase-desktop"><div class="showcase-window"><span><i></i><i></i><i></i></span><b>storage lab</b><small>DEMONSTRAÇÃO</small></div><div class="showcase-screen" data-showcase-board></div></div>
        <div class="showcase-phone" aria-label="Prévia do celular do aluno"><div class="showcase-phone-inner"><div class="showcase-notch"></div><div class="showcase-phone-screen" data-showcase-phone></div></div></div>
      </div>
      <nav class="showcase-nav" aria-label="Etapas da demonstração">${['Criar slide','Conectar turma','Responder quiz'].map((label,i)=>`<button type="button" data-showcase-step="${i}" aria-pressed="${i===0}"><span>0${i+1}</span>${label}</button>`).join('')}</nav>
    </div></section>`;
}
const answers = () => question.options.map((option,i)=>`<button type="button" data-showcase-answer="${i}" aria-pressed="false"><b>${'ABCD'[i]}</b><span>${escape(option)}</span></button>`).join('');
const boards = [
  () => `<div class="showcase-card create-card"><div class="showcase-card-bar"><span>EDITOR VISUAL</span><span>Texto&nbsp;&nbsp; Imagem&nbsp;&nbsp; 3D</span></div><div class="showcase-slide"><small>AULA DE EXEMPLO · SLIDE 01</small><h3>${escape(slide.title)}</h3><p>${escape(slide.intro)}</p><div class="showcase-chip">✦ ${escape(slide.callout)}</div></div></div>`,
  () => `<div class="showcase-card room-card"><span class="scene-label">APRESENTAÇÃO AO VIVO</span><h3>Uma aula, várias telas.</h3><p>Compartilhe o código ou o QR Code com a turma.</p><div class="room-example"><small>CÓDIGO DE EXEMPLO</small><strong>482 910</strong><span>↗ &nbsp; Convite da sala</span></div></div>`,
  () => `<div class="showcase-card question-card"><span class="scene-label">QUIZ · PERGUNTA 01</span><h3>${escape(question.text)}</h3><div class="showcase-board-answers">${question.options.map((o,i)=>`<div data-board-answer="${i}"><b>${'ABCD'[i]}</b>${escape(o)}</div>`).join('')}</div><p data-demo-answer-status role="status">Escolha uma resposta no celular.</p></div>`
];
const phones = [
  () => `<div class="phone-demo-label"><span>●</span> ACOMPANHANDO</div><div class="phone-demo-slide"><small>SLIDE 01</small><strong>${escape(slide.title)}</strong><p>${escape(slide.intro)}</p></div><div class="phone-demo-note">Acompanhe a apresentação no seu ritmo.</div>`,
  () => `<div class="phone-demo-label"><span>●</span> SALA DE EXEMPLO</div><div class="phone-welcome"><div class="phone-avatar">L</div><small>VOCÊ ESTÁ NA SALA</small><strong>Olá, Lucas!</strong><p>Acompanhe a aula no seu celular.</p><div>✓ &nbsp; Conectado</div></div>`,
  () => `<div class="phone-demo-label"><span>●</span> QUIZ · 01</div><div class="phone-question"><strong>${escape(question.text)}</strong><div class="phone-answers">${answers()}</div><p data-phone-feedback role="status">Toque em uma alternativa</p></div>`
];
export class Showcase {
  constructor(root) {
    this.root=root;this.step=0;this.timers=[];this.visible=false;this.paused=false;this.fontIndex=0;
    root.addEventListener('click',e=>{const b=e.target.closest('[data-showcase-step],[data-showcase-answer]');if(!b||!this.node?.contains(b))return;
      if(b.hasAttribute('data-showcase-step'))this.setStep(Number(b.dataset.showcaseStep));else this.answer(Number(b.dataset.showcaseAnswer));
      this.paused=true;this.timers.forEach(clearTimeout);this.timers=[];
    });
    root.addEventListener('account-panel-changed',e=>{this.modalOpen=e.detail.open;if(this.modalOpen)this.stop();else if(this.visible)this.play();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();else if(this.visible&&!this.modalOpen)this.play();});
  }
  reduced(){return prefersReducedMotion();}
  stop(){this.timers.forEach(clearTimeout);this.timers=[];clearTimeout(this.fontTimer);clearTimeout(this.fontSwap);if(this.node)this.node.dataset.playing='false';}
  mount(){const node=this.root.querySelector('[data-showcase]');if(node===this.node)return;this.stop();this.observer?.disconnect();this.node=node;this.visible=false;this.paused=false;if(!node)return;this.setStep(this.step);
    this.observer=new IntersectionObserver(([entry])=>{this.visible=entry.isIntersecting&&entry.intersectionRatio>0;if(this.visible&&!this.modalOpen&&!document.hidden)this.play();else this.stop();},{threshold:[0,.01]});this.observer.observe(node.closest('.experience-feature'));
  }
  setStep(step){if(!this.node||!boards[step])return;this.step=step;this.node.dataset.step=String(step);this.node.classList.remove('demo-correct','demo-wrong');
    this.node.querySelector('[data-showcase-board]').innerHTML=boards[step]();this.node.querySelector('[data-showcase-phone]').innerHTML=phones[step]();
    this.node.querySelectorAll('[data-showcase-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.showcaseStep)===step)));
    if(!this.reduced())for(const el of this.node.querySelectorAll('.showcase-card,.showcase-phone-screen'))el.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'});
  }
  play(){if(!this.node||document.hidden||this.modalOpen||this.node.dataset.playing==='true')return;this.node.dataset.playing='true';this.schedule();this.scheduleFont();}
  schedule(){this.timers.forEach(clearTimeout);this.timers=[];if(this.node?.dataset.playing!=='true'||this.paused)return;
    if(this.step===2)this.timers.push(setTimeout(()=>this.answer(question.correct),2400));
    this.timers.push(setTimeout(()=>{this.setStep((this.step+1)%3);this.schedule();},5500));
  }
  scheduleFont() {
    clearTimeout(this.fontTimer);
    const text = this.root.querySelector('.living-title'); if (!text || this.node?.dataset.playing !== 'true') return;
    const phrase = 'ganhar vida', fonts = ['Georgia, serif', '"Trebuchet MS", sans-serif', '"Segoe Print", "Comic Sans MS", cursive', '"Courier New", monospace'];
    if (this.titleNode !== text) {
      this.titleNode = text; this.typeCount = 0; this.erasing = false; this.fontIndex = 0; this.typedOnce = false;
      text.innerHTML = '<span class="living-title-size" aria-hidden="true">ganhar vida</span><span class="living-title-current" aria-hidden="true"></span><span class="sr-only">ganhar vida</span>';
      text.dataset.font = '0'; text.style.fontFamily = fonts[0];
    }
    const current = text.querySelector('.living-title-current'); let delay;
    this.typeCount += this.erasing ? -1 : 1; current.textContent = phrase.slice(0, this.typeCount);
    text.dataset.typing = this.erasing ? 'deleting' : 'typing'; delay = this.erasing ? 30 : 55;
    if (this.typeCount === phrase.length) { this.erasing = true; text.dataset.typing = 'hold'; delay = 4500; }
    else if (this.typeCount === 0) { this.erasing = false; this.fontIndex = (this.fontIndex + 1) % fonts.length; text.style.fontFamily = fonts[this.fontIndex]; text.dataset.font = String(this.fontIndex); delay = 100; }
    this.fontTimer = setTimeout(() => this.scheduleFont(), delay);
  }
  answer(choice){if(!this.node||this.step!==2||!question.options[choice])return;
    const correct=choice===question.correct;this.node.classList.toggle('demo-correct',correct);this.node.classList.toggle('demo-wrong',!correct);
    this.node.querySelectorAll('[data-showcase-answer]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.showcaseAnswer)===choice)));
    this.node.querySelectorAll('[data-board-answer]').forEach(el=>el.classList.toggle('chosen',Number(el.dataset.boardAnswer)===choice));
    this.node.querySelector('[data-demo-answer-status]').textContent=correct?'Resposta correta! '+question.explanation:'Resposta registrada. Tente outra alternativa.';
    this.node.querySelector('[data-phone-feedback]').textContent=correct?'✓ Resposta correta':'Tente outra alternativa';
  }
}
