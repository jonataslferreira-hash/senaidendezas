import {createUuid} from './uuid.js';
import {reviewQuestions} from './review.js';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const STORAGE_PREFIX='sl-flashcards-v1:';
const MAX_DECKS=50, MAX_CARDS=100;
const button=(action,label,cls='quiet',extra='')=>`<button type="button" class="studio-btn ${cls}" data-fc-action="${action}" ${extra}>${label}</button>`;

// Somente texto já visível nos slides; notas, imagens, áudio e dados pessoais não são enviados.
export function lessonStudyText(lesson) {
  return (lesson?.slides||[]).filter(s=>!s.game&&!s.poll).slice(0,30).map((s,i)=>{
    const parts=[s.title,s.intro,...(Array.isArray(s.points)?s.points:[]),s.callout,
      ...(s.elements||[]).filter(e=>e.type==='text').map(e=>e.text)].map(v=>clean(v,350)).filter(Boolean);
    return parts.length?`${i+1}. ${[...new Set(parts)].join(' · ')}`:'';
  }).filter(Boolean).join('\n').slice(0,1350);
}
export function cardsFromQuestions(questions,limit=MAX_CARDS) {
  return (Array.isArray(questions)?questions:[]).flatMap(q=>{
    const front=clean(q?.text,700), options=Array.isArray(q?.options)?q.options:[], index=q?.correct;
    if(!front||!Number.isInteger(index)||index<0||index>=options.length)return [];
    const answer=clean(options[index],700), explanation=clean(q.explanation,800);
    if(!answer)return [];
    return [{id:createUuid(),front,back:explanation&&explanation!==answer?`${answer}\n\n${explanation}`:answer}];
  }).slice(0,limit);
}
export function flashcardRequest(topic,lesson,count=6) {
  const amount=Math.max(1,Math.min(10,Math.floor(Number(count))||6));
  const subject=clean(topic,300)||clean(lesson?.title,140);
  if(!subject)throw Error('Escreva um tema ou escolha uma aula.');
  const source=lessonStudyText(lesson);
  const prompt=`Crie apenas atividades para esta aula; não crie slides. Tema: ${subject}.\n${source?'Trechos de texto visíveis da apresentação (não há leitura de imagens):\n'+source:'Não há texto de slides fornecido; use o tema informado.'}\nCrie exatamente ${amount} questões de múltipla escolha sobre conceitos distintos, em português do Brasil, próprias para virar flashcards. Faça perguntas curtas, com 2 a 4 alternativas, índice correto e explicação concisa. O site mostrará apenas a pergunta e a resposta correta. Evite repetir perguntas e não invente detalhes específicos que não estejam no conteúdo fornecido. Retorne JSON com questions.`;
  return {mode:'create',prompt:prompt.slice(0,2400),count:1,activities:{quizzes:1,questions:amount,polls:0}};
}

export class Flashcards {
  constructor(studio,storage=globalThis.localStorage) {
    this.studio=studio;this.storage=storage;this.uid=studio.account.user?.id||'guest';this.screen='list';this.index=0;this.flipped=false;this.busy=false;this.version=0;
    this.load();
    const root=studio.root;
    root.addEventListener('account-changed',()=>this.accountChanged());
    root.addEventListener('click',event=>{
      const target=event.target.closest('[data-fc-action]');
      if(!target||target.disabled)return;
      this.action(target.dataset.fcAction,target).catch(error=>{this.message=error.message||'Não foi possível concluir.';this.render();});
    });
    root.addEventListener('submit',event=>{
      if(!event.target.matches('[data-fc-form]'))return;
      event.preventDefault();this.submit(event.target,event.submitter).catch(error=>{this.message=error.message||'Não foi possível concluir.';this.render();});
    });
  }
  render(){if(this.studio.view==='flashcards')this.studio.callbacks.render();}
  load(){
    this.decks=[];this.storageError='';
    try{
      const raw=this.storage.getItem(STORAGE_PREFIX+this.uid);if(raw===null)return;
      const decks=JSON.parse(raw);
      if(!Array.isArray(decks)||decks.length>MAX_DECKS||decks.some(d=>!d||typeof d.id!=='string'||typeof d.title!=='string'||!Array.isArray(d.cards)||d.cards.length>MAX_CARDS||d.cards.some(c=>!c||typeof c.id!=='string'||typeof c.front!=='string'||typeof c.back!=='string')))throw Error();
      this.decks=decks;
    }catch{this.storageError='Não foi possível ler os flashcards deste navegador. Seus dados foram preservados.';}
  }
  accountChanged(){
    const next=this.studio.account.user?.id||'guest';if(next===this.uid)return;
    const preservePrompt=this.uid==='guest'&&next!=='guest'&&this.screen==='ai'&&!this.busy;
    this.version++;this.controller?.abort();this.busy=false;this.uid=next;this.screen=preservePrompt?'ai':'list';this.deckId='';this.message=preservePrompt?'Conta conectada. Confira seu pedido e toque em gerar.':'';this.load();this.render();
  }
  save(decks){
    if(this.storageError)throw Error(this.storageError);
    if(decks.length>MAX_DECKS||decks.some(d=>d.cards.length>MAX_CARDS))throw Error('Limite de 50 conjuntos e 100 cartões por conjunto.');
    try{this.storage.setItem(STORAGE_PREFIX+this.uid,JSON.stringify(decks));}catch{throw Error('Não foi possível salvar os flashcards neste navegador. Verifique o espaço disponível.');}
    this.decks=decks;
  }
  get deck(){return this.decks.find(d=>d.id===this.deckId);}
  updateDeck(deck){this.save(this.decks.map(d=>d.id===deck.id?deck:d));}
  async action(action,target){
    if(this.busy&&action!=='cancel-ai')return;
    this.message='';
    if(action==='new'){this.screen='new';this.form={title:'',front:'',back:''};}
    else if(action==='ai'){this.screen='ai';this.form={topic:'',lessonId:'',count:'6'};}
    else if(action==='cancel-ai'){this.version++;this.controller?.abort();this.busy=false;this.screen='list';}
    else if(action==='list'){this.screen='list';this.deckId='';}
    else if(action==='open'){if(!this.decks.some(d=>d.id===target.dataset.id))return;this.deckId=target.dataset.id;this.index=0;this.flipped=false;this.screen='study';}
    else if(action==='flip'){
      this.flipped=!this.flipped;
      const card=this.studio.root.querySelector('.fc-card');
      if(card){
        card.classList.toggle('is-flipped',this.flipped);
        card.setAttribute('aria-label',this.flipped?'Mostrar frente':'Mostrar resposta');
        card.querySelector('.fc-face-front')?.setAttribute('aria-hidden',String(this.flipped));
        card.querySelector('.fc-face-back')?.setAttribute('aria-hidden',String(!this.flipped));
        const flipButton=this.studio.root.querySelector('.fc-controls [data-fc-action="flip"]');
        if(flipButton)flipButton.textContent=this.flipped?'Ver pergunta':'Revelar resposta';
        const live=this.studio.root.querySelector('[data-fc-live]');
        const selected=this.deck?.cards[this.index];
        if(live&&selected)live.textContent=(this.flipped?'Resposta: ':'Pergunta: ')+(this.flipped?selected.back:selected.front);
        return;
      }
    }
    else if(action==='prev'||action==='next'){const n=this.deck?.cards.length||0;this.index=Math.max(0,Math.min(n-1,this.index+(action==='next'?1:-1)));this.flipped=false;}
    else if(action==='add'){if(!this.deck)return;this.screen='card';this.editId='';this.form={front:'',back:''};}
    else if(action==='edit'){const card=this.deck?.cards[this.index];if(!card)return;this.screen='card';this.editId=card.id;this.form={front:card.front,back:card.back};}
    else if(action==='cancel-card'){this.screen='study';}
    else if(action==='delete-card'){
      const deck=this.deck,card=deck?.cards[this.index];if(!card||!confirm('Excluir este cartão?'))return;
      const cards=deck.cards.filter(c=>c.id!==card.id);this.updateDeck({...deck,cards});this.index=Math.max(0,Math.min(this.index,cards.length-1));this.flipped=false;
    }
    else if(action==='delete-deck'){
      const deck=this.decks.find(d=>d.id===target.dataset.id);if(!deck||!confirm(`Excluir o conjunto “${deck.title}” e todos os cartões?`))return;
      this.save(this.decks.filter(d=>d.id!==deck.id));if(this.deckId===deck.id){this.deckId='';this.screen='list';}
    }
    const restoreFocus=typeof document!=='undefined'&&document.activeElement===target&&['flip','prev','next'].includes(action);
    const focusSelector=action==='flip'?(target.classList.contains('fc-card')?'.fc-card':'.fc-controls [data-fc-action="flip"]'):`[data-fc-action="${action}"]`;
    this.render();
    if(restoreFocus){const next=this.studio.root.querySelector(focusSelector);(next&&!next.disabled?next:this.studio.root.querySelector('.fc-card'))?.focus({preventScroll:true});}
  }
  async submit(form,submitter){
    if(this.busy)return;
    const values=new FormData(form),kind=form.dataset.fcForm;this.message='';
    if(kind==='new'){
      const title=clean(values.get('title'),120),front=clean(values.get('front'),700),back=clean(values.get('back'),1500);
      this.form={title,front,back};if(!title||!front||!back)throw Error('Preencha o nome, a frente e o verso do cartão.');
      const deck={id:createUuid(),title,cards:[{id:createUuid(),front,back}]};this.save([deck,...this.decks]);this.deckId=deck.id;this.index=0;this.flipped=false;this.screen='study';
    } else if(kind==='card'){
      const front=clean(values.get('front'),700),back=clean(values.get('back'),1500);this.form={front,back};if(!front||!back)throw Error('Preencha a frente e o verso.');
      const deck=this.deck;if(!deck)throw Error('O conjunto não está mais disponível.');
      let cards;
      if(this.editId){if(!deck.cards.some(c=>c.id===this.editId))throw Error('O cartão não está mais disponível.');cards=deck.cards.map(c=>c.id===this.editId?{...c,front,back}:c);}
      else{cards=[...deck.cards,{id:createUuid(),front,back}];this.index=cards.length-1;}
      this.updateDeck({...deck,cards});this.flipped=false;this.screen='study';
    } else if(kind==='ai'){
      const topic=clean(values.get('topic'),300),lessonId=clean(values.get('lesson'),100),count=clean(values.get('count'),2);
      this.form={topic,lessonId,count};
      const lesson=lessonId?this.studio.library.lessons.find(l=>l.id===lessonId):null;
      if(lessonId&&!lesson)throw Error('A aula escolhida não está mais nesta biblioteca.');
      if(submitter?.value==='questions'){
        if(!lesson)throw Error('Escolha uma aula para usar as questões existentes.');
        const cards=cardsFromQuestions(reviewQuestions(lesson));if(!cards.length)throw Error('Esta aula não tem questões completas para transformar em cartões.');
        const deck={id:createUuid(),title:clean(topic,120)||lesson.title,cards};this.save([deck,...this.decks]);this.deckId=deck.id;this.index=0;this.flipped=false;this.screen='study';
      }else{
        if(!this.studio.account.user){this.studio.account.show('login');this.message='Entre na conta para usar o Storage AI e tente novamente.';this.render();return;}
        const request=flashcardRequest(topic,lesson,count),uid=this.uid,version=++this.version;
        this.busy=true;this.controller=new AbortController();this.render();
        try{
          const result=await this.studio.ai.ask(request,AbortSignal.any([this.controller.signal,AbortSignal.timeout(90000)]));
          if(version!==this.version||this.uid!==uid||this.studio.account.user?.id!==uid)return;
          const cards=cardsFromQuestions(result?.questions,request.activities.questions);
          if(!cards.length)throw Error('A IA não retornou cartões válidos. Tente novamente com outro pedido.');
          const deck={id:createUuid(),title:clean(topic,120)||clean(lesson?.title,120),cards};
          this.save([deck,...this.decks]);this.deckId=deck.id;this.index=0;this.flipped=false;this.screen='study';
          this.message=cards.length<request.activities.questions?`A IA retornou ${cards.length} de ${request.activities.questions} cartões. Revise as respostas.`:'Cartões criados com Storage AI. Revise as respostas antes de estudar.';
        }catch(error){if(version===this.version)this.message=error?.name==='TimeoutError'?'A geração demorou demais. Tente novamente.':(error?.message||'Não foi possível gerar os cartões.').replace(/Seu pedido continua na conversa para você tentar de novo depois\./g,'Você pode tentar novamente depois.').replace(/O pedido continua na conversa\./g,'Você pode tentar novamente.').replace(/Seu pedido continua na conversa para você tentar novamente\./g,'Você pode tentar novamente.');}
        finally{if(version===this.version){this.busy=false;this.controller=null;this.render();}}
        return;
      }
    }
    this.render();
  }
  markup(){
    const esc=escapeHTML, notice=this.storageError||this.message;
    const feedback=notice?`<p class="fc-notice" role="${this.storageError?'alert':'status'}">${esc(notice)}</p>`:'';
    const back=button('list','← Todos os conjuntos','quiet fc-back');
    let content;
    if(this.screen==='new'){
      content=`${back}<header class="fc-page-head"><span class="fc-eyebrow">CRIAR CONJUNTO</span><h1>Comece com um cartão.</h1><p>Escreva uma pergunta na frente e a resposta no verso. Você pode adicionar mais cartões depois.</p></header>${feedback}<form class="fc-form" data-fc-form="new"><label>Nome do conjunto<input name="title" maxlength="120" required value="${esc(this.form?.title)}" placeholder="Ex.: Fundamentos de redes"></label><label>Frente<textarea name="front" maxlength="700" rows="3" required placeholder="Escreva uma pergunta">${esc(this.form?.front)}</textarea></label><label>Verso<textarea name="back" maxlength="1500" rows="3" required placeholder="Escreva a resposta">${esc(this.form?.back)}</textarea></label><button class="studio-btn accent" type="submit">Criar conjunto</button></form>`;
    }else if(this.screen==='ai'){
      const lessons=this.studio.library.lessons||[];
      content=`${back}<header class="fc-page-head"><span class="fc-eyebrow">STORAGE AI · FLASHCARDS</span><h1>Crie cartões para estudar.</h1><p>Peça à IA por um tema ou use o texto de uma apresentação da sua biblioteca.</p></header>${feedback}<form class="fc-form" data-fc-form="ai" aria-busy="${this.busy}"><label>Tema <small>Opcional se escolher uma aula</small><input name="topic" maxlength="300" value="${esc(this.form?.topic)}" placeholder="Ex.: componentes de um computador" ${this.busy?'disabled':''}></label><label>Aula deste dispositivo <small>Opcional</small><select name="lesson" ${this.busy?'disabled':''}><option value="">Nenhuma aula selecionada</option>${lessons.map(l=>`<option value="${esc(l.id)}" ${this.form?.lessonId===l.id?'selected':''}>${esc(l.title)}</option>`).join('')}</select></label><label>Quantidade gerada pela IA<select name="count" ${this.busy?'disabled':''}>${[3,5,6,8,10].map(n=>`<option ${Number(this.form?.count)===n?'selected':''} value="${n}">${n} cartões</option>`).join('')}</select></label><p class="fc-form-note">A IA recebe o tema e trechos de texto visíveis dos slides selecionados; imagens e notas não são lidas. Confira as respostas geradas. Para usar a IA, entre na conta.</p><div class="fc-form-actions"><button class="studio-btn accent" type="submit" value="ai" ${this.busy?'disabled':''}>${this.busy?'Gerando cartões…':'✦ Gerar com Storage AI'}</button><button class="studio-btn quiet" type="submit" value="questions" ${this.busy?'disabled':''}>Usar questões da aula</button>${this.busy?button('cancel-ai','Cancelar'):''}</div></form>`;
    }else if(this.screen==='card'&&this.deck){
      content=`${button('cancel-card','← Voltar ao conjunto','quiet fc-back')}<header class="fc-page-head"><span class="fc-eyebrow">${esc(this.deck.title)}</span><h1>${this.editId?'Editar cartão':'Adicionar cartão'}</h1></header>${feedback}<form class="fc-form" data-fc-form="card"><label>Frente<textarea name="front" maxlength="700" rows="3" required>${esc(this.form?.front)}</textarea></label><label>Verso<textarea name="back" maxlength="1500" rows="3" required>${esc(this.form?.back)}</textarea></label><button class="studio-btn accent" type="submit">Salvar cartão</button></form>`;
    }else if(this.screen==='study'&&this.deck){
      const deck=this.deck,cards=deck.cards,card=cards[this.index];
      content=`${back}<header class="fc-study-header"><div><span class="fc-eyebrow">ESTUDO SEM PRESSA</span><h1>${esc(deck.title)}</h1><p>${cards.length} ${cards.length===1?'cartão':'cartões'} · não altera o placar das salas</p></div>${button('add','+ Adicionar cartão','quiet')}</header>${feedback}${card?`<div class="fc-study"><div class="fc-counter" aria-live="polite">CARTÃO ${this.index+1} DE ${cards.length}</div><button type="button" class="fc-card ${this.flipped?'is-flipped':''}" data-fc-action="flip" aria-label="${this.flipped?'Mostrar frente':'Mostrar resposta'}"><span class="fc-card-inner"><span class="fc-face fc-face-front" aria-hidden="${this.flipped}"><span class="fc-card-label">01 / PERGUNTA <i>✦</i></span><span class="fc-card-text">${esc(card.front)}</span><span class="fc-card-hint">↻ Toque para revelar a resposta</span></span><span class="fc-face fc-face-back" aria-hidden="${!this.flipped}"><span class="fc-card-label">02 / RESPOSTA <i>✦</i></span><span class="fc-card-text">${esc(card.back)}</span><span class="fc-card-hint">↻ Toque para ver a pergunta</span></span></span></button><span class="sr-only" data-fc-live aria-live="polite"></span><div class="fc-controls">${button('prev','← Anterior','quiet',this.index===0?'disabled':'')}${button('flip',this.flipped?'Ver pergunta':'Revelar resposta','accent')}${button('next','Próximo →','quiet',this.index===cards.length-1?'disabled':'')}</div><div class="fc-card-actions">${button('edit','Editar cartão')}${button('delete-card','Excluir cartão')}</div></div>`:`<div class="fc-empty"><strong>Este conjunto está vazio.</strong><p>Adicione um cartão para começar.</p>${button('add','+ Adicionar cartão','accent')}</div>`}`;
    }else{
      content=`<header class="fc-hero"><div><span class="fc-eyebrow">SEU ESPAÇO DE ESTUDO</span><h1>Estude no seu ritmo<span>.</span></h1><p>Uma pergunta de cada vez. Vire os cartões, relembre as respostas e pratique quantas vezes quiser.</p><div class="fc-hero-actions">${button('ai','✦ Criar com Storage AI','accent')}${button('new','+ Criar manualmente')}</div></div><div class="fc-hero-art" aria-hidden="true"><span></span><div><small>FRENTE</small><b>O que você quer<br>aprender hoje?</b><i>↻ Vire para descobrir</i></div></div></header>${feedback}<section class="fc-collections"><div class="fc-section-title"><div><h2>Meus conjuntos</h2></div><span>${this.decks.length} ${this.decks.length===1?'conjunto':'conjuntos'}</span></div>${this.decks.length?`<div class="fc-grid">${this.decks.map((deck,i)=>`<article class="fc-deck" style="--fc-index:${i%4}"><div class="fc-deck-top"><span class="fc-deck-icon" aria-hidden="true">▤</span><span>${deck.cards.length} ${deck.cards.length===1?'cartão':'cartões'}</span></div><h3>${esc(deck.title)}</h3><div class="fc-deck-actions">${button('open','Estudar →','accent',`data-id="${esc(deck.id)}" aria-label="Estudar ${esc(deck.title)}"`)}${button('delete-deck','Excluir','quiet',`data-id="${esc(deck.id)}" aria-label="Excluir ${esc(deck.title)}"`)}</div></article>`).join('')}</div>`:`<div class="fc-empty"><span class="fc-empty-icon" aria-hidden="true">▤</span><strong>Seu primeiro conjunto começa aqui.</strong><p>Crie seus cartões ou peça uma ajudinha ao Storage AI.</p>${button('ai','Criar conjunto','quiet')}</div>`}</section>`;
    }
    return `<main class="studio-library flashcards-page">${content}</main>`;
  }
}
