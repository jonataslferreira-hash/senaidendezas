import { prefersReducedMotion } from './motion-preference.js';
export const deviceArt = () => `<svg class="illustrated-drive" viewBox="0 0 220 150" fill="none" aria-hidden="true"><g class="drive-lower"><path d="M26 60 133 20l62 42-106 48z" fill="#8060ba"/><path d="m26 60 63 50v17L26 77z" fill="#634494"/><path d="m89 110 106-48v17l-106 48z" fill="#a88adb"/></g><g class="drive-upper"><path d="M26 43 133 3l62 42-106 48z" fill="#eadcff" stroke="#a98acd" stroke-width="2"/><ellipse cx="111" cy="47" rx="49" ry="24" transform="rotate(-18 111 47)" fill="#c8b0ef"/><ellipse cx="111" cy="47" rx="32" ry="15" transform="rotate(-18 111 47)" fill="#f7f1ff"/><ellipse cx="111" cy="47" rx="8" ry="4" fill="#8c68bb"/><path d="m53 62 37-5 33-29" stroke="#7952ae" stroke-width="7" stroke-linecap="round"/><circle cx="53" cy="62" r="6" fill="#bd9ce9"/></g><g fill="#eec67a"><path d="m103 113 6-3v8l-6 3z"/><path d="m114 108 6-3v8l-6 3z"/><path d="m125 103 6-3v8l-6 3z"/></g></svg>`;
export function showcaseMarkup() {
  return `<section class="studio-feature experience-feature"><div class="experience-copy"><h2>Sua ideia merece<br><em class="living-title">ganhar vida</em></h2><p>Crie sua próxima grande aula no computador ou no celular.</p><div class="experience-actions"><button class="studio-btn accent" data-studio-action="new">Começar uma aula <span>↗</span></button></div></div><div class="experience-demo" data-showcase data-step="0" role="region" aria-label="Demonstração interativa do Storage Lab"><span class="demo-sticker sticker-star" aria-hidden="true">✦</span><span class="demo-sticker sticker-orbit" aria-hidden="true">✳</span><div class="showcase-connection" aria-hidden="true"><svg viewBox="0 0 440 290"><path d="M130 140c150-100 220-20 200 45S190 280 140 220"/></svg></div><div class="demo-board"><div class="demo-board-top"><span><i></i> DEMONSTRAÇÃO</span><span>storage<span>lab.</span></span></div><div data-showcase-board></div><div class="demo-board-bottom"><span>UMA IDEIA. MUITAS DESCOBERTAS.</span><span data-showcase-counter>01 / 03</span></div></div><div class="demo-phone phone-fox" aria-hidden="true"><span class="phone-speaker"></span><small>MINHA DESCOBERTA</small><span class="demo-avatar">🦊</span><strong>Luna</strong><span class="phone-status" data-phone-status>Pronta para aprender</span><div class="phone-mini-options"><i></i><i></i></div></div><div class="demo-phone phone-robot" aria-hidden="true"><span class="phone-speaker"></span><small>EU FAÇO PARTE</small><span class="demo-avatar">🤖</span><strong>Alex</strong><span class="phone-status" data-phone-status>Pronto para aprender</span><div class="phone-mini-options"><i></i><i></i></div></div><div class="demo-score" aria-hidden="true">✦ <strong>+1.000</strong><span>Uma descoberta!</span></div><nav class="showcase-steps" aria-label="Etapas da demonstração">${['Crie', 'Conecte', 'Interaja'].map((name, i) => `<button data-showcase-step="${i}" aria-pressed="${i === 0}"><span>0${i + 1}</span>${name}</button>`).join('')}</nav></div></section>`;
}
const stages = [
  () => `<div class="demo-board-stage stage-create"><span class="board-eyebrow">Criar slide</span><h3>Uma ideia.<br>Novas descobertas.</h3><button class="demo-device-button" data-showcase-explore aria-label="Explorar a criação da demonstração"><span class="idea-canvas" aria-hidden="true"><i>✦</i><i>Olá, turma!</i><i>▤</i></span><span>Toque para explorar a criação ↗</span></button><div class="board-editor-tools"><span>T</span><span>▧</span><span>◇</span><i></i></div></div>`,
  () => `<div class="demo-board-stage stage-connect"><span class="board-eyebrow">Convidar turma</span><div class="connection-avatars" aria-hidden="true"><span>🦊</span><span>✦</span><span>🤖</span></div><h3>Um convite.<br>Toda a turma.</h3><p>Seu slide chega aos celulares.<br>A descoberta fica ainda melhor.</p><button data-showcase-step="2" class="demo-connect-button">Explorar juntos ↗</button></div>`,
  () => `<div class="demo-board-stage stage-play"><span class="board-eyebrow">Quiz interativo</span><h3>Qual não tem<br>partes móveis?</h3><div class="demo-answers"><button data-showcase-answer="0"><b>A</b>HDD</button><button data-showcase-answer="1"><b>B</b>SSD</button></div><p role="status" data-demo-answer-status>Toque em uma resposta para experimentar.</p></div>`
];
export class Showcase {
  constructor(root) {
    this.root=root;this.step=0;this.timers=[];this.paused=false;this.visible=false;this.fontIndex=0;
    root.addEventListener('click',event=>{
      const b=event.target.closest('[data-showcase-step],[data-showcase-play],[data-showcase-answer],[data-showcase-explore]');if(!b)return;
      if(b.hasAttribute('data-showcase-play')){this.paused=this.node?.dataset.playing==='true';if(this.paused)this.stop();else this.play();}
      else if(b.hasAttribute('data-showcase-step')){this.setStep(Number(b.dataset.showcaseStep));this.schedule();}
      else if(b.hasAttribute('data-showcase-answer'))this.answer(Number(b.dataset.showcaseAnswer));
      else{const opened=this.node?.classList.toggle('device-open');b.setAttribute('aria-pressed',String(opened));this.schedule();}
    });
    root.addEventListener('account-panel-changed',e=>{this.modalOpen=e.detail.open;if(this.modalOpen)this.stop();else if(this.visible&&!this.paused)this.play();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();else if(this.visible&&!this.paused&&!this.modalOpen)this.play();});
  }
  reduced(){return prefersReducedMotion();}
  stop(){
    this.timers.forEach(clearTimeout);this.timers=[];clearTimeout(this.fontTimer);clearTimeout(this.fontSwap);
    this.root.querySelector('.living-title')?.classList.remove('font-changing');
    if(this.node)this.node.dataset.playing='false';const b=this.root.querySelector('[data-showcase-play]');if(b){b.textContent='▶ Reproduzir';b.setAttribute('aria-label','Reproduzir demonstração');}
  }
  mount(){
    const node=this.root.querySelector('[data-showcase]');if(node===this.node)return;
    this.stop();this.observer?.disconnect();this.node=node;this.visible=false;if(!node)return;
    this.paused=false;this.setStep(this.step);
    const feature=node.closest('.experience-feature');
    this.observer=new IntersectionObserver(entries=>{const entry=entries[0];this.visible=entry.isIntersecting&&entry.intersectionRatio>0;if(this.visible&&!this.paused&&!this.modalOpen&&!document.hidden)this.play();else if(!this.visible)this.stop();},{threshold:[0,.01]});this.observer.observe(feature);
  }
  setStep(step){
    if(!this.node||!stages[step])return;
    const board=this.node.querySelector('[data-showcase-board]');
    for(const ghost of board.querySelectorAll('.stage-leaving'))ghost.remove();
    const old=board.firstElementChild;
    this.step=step;this.node.dataset.step=String(step);this.node.classList.remove('demo-correct','demo-wrong','device-open');
    const template=document.createElement('template');template.innerHTML=stages[step]();const next=template.content.firstElementChild;
    if(old){
      old.classList.add('stage-leaving');old.setAttribute('aria-hidden','true');old.inert=true;
      for(const element of [old,...old.querySelectorAll('*')])for(const attr of [...element.attributes])if(attr.name.startsWith('data-'))element.removeAttribute(attr.name);
    }
    board.append(next);
    const reduced=this.reduced(),duration=reduced?220:550,exitDuration=reduced?100:190,easing='cubic-bezier(.22,1,.36,1)';
    if(old){const outgoing=old.animate(reduced?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translate3d(0,0,0) scale(1)'},{opacity:0,transform:'translate3d(-38px,-8px,0) scale(.94)'}],{duration:exitDuration,easing,fill:'forwards'});outgoing.finished.then(()=>old.remove()).catch(()=>old.remove());}
    next.animate(reduced?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translate3d(48px,16px,0) scale(.94)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration,delay:old?exitDuration:0,easing,fill:'backwards'});
    if(!reduced)for(const [i,child]of [...next.children].entries())child.animate([{opacity:0,translate:'0 14px'},{opacity:1,translate:'0 0'}],{duration:450,delay:(old?exitDuration:0)+40+i*50,easing,fill:'backwards'});
    this.node.querySelector('[data-showcase-counter]').textContent=`0${step+1} / 03`;
    for(const b of this.node.querySelectorAll('.showcase-steps button'))b.setAttribute('aria-pressed',String(Number(b.dataset.showcaseStep)===step));
    for(const status of this.node.querySelectorAll('[data-phone-status]'))status.textContent=['Pronto para aprender','Conectou à aula! ✓','Sua vez de participar'][step];
  }
  play(){if(!this.node||document.hidden||this.modalOpen||this.node.dataset.playing==='true')return;this.node.dataset.playing='true';const b=this.root.querySelector('[data-showcase-play]');if(b){b.textContent='Ⅱ Pausar';b.setAttribute('aria-label','Parar demonstração');}this.schedule();this.scheduleFont();}
  schedule(){this.timers.forEach(clearTimeout);this.timers=[];if(this.node?.dataset.playing!=='true')return;if(this.step===2)this.timers.push(setTimeout(()=>this.answer(1,false),2200));this.timers.push(setTimeout(()=>{this.setStep((this.step+1)%3);this.schedule();},4200));}
  scheduleFont(){
    clearTimeout(this.fontTimer);
    const text=this.root.querySelector('.living-title');if(!text||this.node?.dataset.playing!=='true')return;
    const phrase='ganhar vida',fonts=['Georgia, serif','"Trebuchet MS", sans-serif','"Segoe Print", "Comic Sans MS", cursive','"Courier New", monospace'];
    if(this.titleNode!==text){
      this.titleNode=text;this.typeCount=0;this.erasing=false;this.fontIndex=0;this.typedOnce=false;
      text.innerHTML='<span class="living-title-size" aria-hidden="true">ganhar vida</span><span class="living-title-current" aria-hidden="true"></span><span class="sr-only">ganhar vida</span>';
      text.dataset.font='0';text.style.fontFamily=fonts[0];
    }
    const current=text.querySelector('.living-title-current');let delay;
    this.typeCount+=this.erasing?-1:1;current.textContent=phrase.slice(0,this.typeCount);text.dataset.typing=this.erasing?'deleting':'typing';delay=this.erasing?30:55;
    if(this.typeCount===phrase.length){this.erasing=true;text.dataset.typing='hold';delay=4500;}
    else if(this.typeCount===0){this.erasing=false;this.fontIndex=(this.fontIndex+1)%fonts.length;text.style.fontFamily=fonts[this.fontIndex];text.dataset.font=String(this.fontIndex);delay=100;}
    this.fontTimer=setTimeout(()=>this.scheduleFont(),delay);
  }

  answer(choice,reset=true){if(reset)this.schedule();if(!this.node||this.step!==2)return;this.node.classList.toggle('demo-correct',choice===1);this.node.classList.toggle('demo-wrong',choice!==1);for(const b of this.node.querySelectorAll('[data-showcase-answer]'))b.setAttribute('aria-pressed',String(Number(b.dataset.showcaseAnswer)===choice));this.node.querySelector('[data-demo-answer-status]').textContent=choice===1?'Boa! O SSD guarda dados sem peças móveis. ✦':'Quase! Experimente o SSD para descobrir.';}
}
