// Controle remoto da apresentação: outro aparelho da mesma conta (o celular do
// professor) passa slides, comanda quiz/enquete e mexe no experimento do slide.
//
// Conexão: os comandos viajam pelo canal em tempo real da conta e, quando os dois
// lados estão no mesmo navegador, também por um canal local (BroadcastChannel),
// que não depende da internet. Cada comando tem um número: se a confirmação não
// chegar, ele é reenviado, e o computador ignora os repetidos.
import { createUuid } from './uuid.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commands=new Set(['previous','next-slide','next-stage','quiz','start-quiz','reveal','next-question','back-lesson','finish','poll','close-poll','sim']);
const GRACE=15000; // uma sessão só some depois deste tempo sem sinal (a presença oscila)
export function remoteConnectionMessage(state,error,online=true){
 const reason=String(error?.message||'');
 if(!online)return 'Você está sem internet. O controle reconecta quando a conexão voltar.';
 if(/jwt|token.*expir|invalid.*token/i.test(reason))return 'A sessão do controle expirou. Entre novamente na sua conta.';
 if(/unauthorized|permission|not authorized|rls|forbidden/i.test(reason))return 'O servidor recusou a autorização do controle. Tente reconectar; se persistir, confira a sessão da conta e as permissões do controle remoto.';
 if(state==='TIMED_OUT')return 'A conexão do controle demorou para responder. Tentando reconectar…';
 return 'A conexão do controle foi interrompida. Tentando reconectar…';
}
// Dados que identificam a apresentação (não mudam a cada slide, para a presença não oscilar).
const identity=value=>value?{code:value.code,title:value.title,total:value.total}:null;
export class AccountPresenter{
 constructor(studio){
  this.studio=studio;this.device=createUuid();this.sessions=[];this.epoch=0;this.open='';this.status='';
  studio.root.addEventListener('account-changed',()=>this.connect());
  studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-remote-action]');if(b)this.action(b).catch(error=>{this.status=error.message;this.paint();});});
  studio.root.addEventListener('input',e=>{const field=e.target.closest('[data-remote-field]');if(field)this.fieldChanged(field);});
  studio.root.addEventListener('change',e=>{const field=e.target.closest('[data-remote-field]');if(field)this.fieldChanged(field,true);});
  setInterval(()=>this.tick(),2500);
  queueMicrotask(()=>this.connect());
 }
 state(){this.seen||=new Map();this.statuses||=new Map();this.handled||=[];this.waiting||=new Map();return this;}
 async connect(force=false){
  this.state();
  const owner=this.studio.account.user?.id;
  if(!force&&owner&&owner===this.owner&&(this.channel||this.connecting))return;
  const changed=owner!==this.owner,previous=this.channel,epoch=++this.epoch;
  this.owner=owner;this.channel=null;this.ready=false;this.connecting=Boolean(owner);this.status='';if(changed){this.open='';this.seen.clear();this.statuses.clear();this.sessions=[];this.openBus(owner);}this.paint();
  try{
   if(previous)await this.studio.account.client.removeChannel(previous);
   if(epoch!==this.epoch||!owner)return;
   // Bootstrap the current session before authorizing a private channel. The SDK
   // continues to refresh its token and retry interrupted subscriptions.
   await this.studio.account.client.realtime.setAuth();
   if(epoch!==this.epoch)return;
   this.channel=this.studio.account.client.channel('sl-live:'+owner,{config:{private:true,broadcast:{ack:false},presence:{key:this.device}}})
    .on('presence',{event:'sync'},()=>{if(epoch!==this.epoch)return;for(const p of Object.values(this.channel.presenceState()).flat())this.sawPresenter(p);this.refresh();})
    .on('broadcast',{event:'remote'},({payload})=>{if(epoch===this.epoch)this.receive(payload);})
    .subscribe((state,error)=>{if(epoch!==this.epoch)return;if(state==='SUBSCRIBED'){this.ready=true;this.failures=0;clearTimeout(this.retryTimer);this.tracked='';this.track();this.status='';if(this.open)this.send({kind:'hello',target:this.open});}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)){this.ready=false;this.dropped(state,error,epoch);}this.paint();});
  }catch(error){if(epoch===this.epoch)this.dropped('CHANNEL_ERROR',error,epoch);}
  finally{if(epoch===this.epoch){this.connecting=false;this.paint();}}
 }
 // Canal local entre abas do mesmo navegador: funciona mesmo com a internet ruim.
 openBus(owner){
  try{this.bus?.close();}catch{/* já fechado */}
  this.bus=null;
  if(!owner||typeof BroadcastChannel==='undefined')return;
  try{this.bus=new BroadcastChannel('sl-live:'+owner);this.bus.onmessage=event=>this.receive(event.data);this.bus.unref?.();}catch{this.bus=null;}
 }
 send(payload){
  const message={...payload,from:this.device};
  try{this.bus?.postMessage(message);}catch{/* canal local indisponível */}
  if(this.channel&&this.ready)Promise.resolve(this.channel.send({type:'broadcast',event:'remote',payload:message})).catch(()=>{});
 }
 sawPresenter(p){
  this.state();
  if(!p||p.role!=='presenter'||p.device===this.device||typeof p.device!=='string'||!/^\d{6}$/.test(p.code||''))return;
  this.seen.set(p.device,{device:p.device,code:p.code,title:String(p.title||'').slice(0,200),total:Number(p.total)||0,last:Date.now()});
 }
 receive(message){
  this.state();
  if(!message||typeof message!=='object'||message.from===this.device)return;
  if(message.kind==='presence'){this.sawPresenter({...message,role:'presenter',device:message.from});this.refresh();return;}
  if(message.kind==='gone'){this.seen.delete(message.from);this.statuses.delete(message.from);this.refresh();return;}
  if(message.kind==='status'){
   // Quem apresenta conta em que slide está e quais experimentos há nele.
   if(typeof message.from!=='string')return;
   if(message.identity)this.sawPresenter({...message.identity,role:'presenter',device:message.from});
   const known=this.seen.get(message.from);if(known)known.last=Date.now();
   this.statuses.set(message.from,message.status||{});this.refresh();return;
  }
  if(message.kind==='ack'){if(message.target===this.device){this.waiting.get(message.id)?.done();}return;}
  if(!this.local||message.target!==this.device)return;
  if(message.kind==='hello'){this.announce(true);return;}
  if(message.kind==='control'&&commands.has(message.action)){
   this.send({kind:'ack',target:message.from,id:message.id});
   if(this.handled.includes(message.id))return;
   this.handled.push(message.id);if(this.handled.length>80)this.handled.shift();
   this.studio.callbacks.remoteAction?.(message.action,message.value);
  }
 }
 // Lista de apresentações visíveis, tolerando falhas curtas de sinal.
 refresh(){
  this.state();const now=Date.now();
  for(const [device,p] of this.seen)if(now-p.last>GRACE){this.seen.delete(device);this.statuses.delete(device);}
  this.sessions=[...this.seen.values()].map(p=>({...p,...(this.statuses.get(p.device)||{})})).slice(0,10);
  this.paint();
 }
 tick(){
  if(!this.owner)return;
  if(this.local)this.announce();
  if(this.open)this.send({kind:'hello',target:this.open});
  if(this.seen?.size)this.refresh();
 }
 // Quedas do controle remoto são comuns (por exemplo ao sair de uma
 // apresentação) e se resolvem sozinhas: reconecta em silêncio e só avisa na
 // tela depois de várias tentativas seguidas sem sucesso.
 dropped(state,error,epoch){
  this.failures=(this.failures||0)+1;
  const message=remoteConnectionMessage(state,error,navigator.onLine);
  const fatal=/sessão do controle expirou/.test(message);
  this.status=this.failures>=5||fatal?message:'';
  clearTimeout(this.retryTimer);
  if(fatal||!navigator.onLine)return;
  this.retryTimer=setTimeout(()=>{if(epoch===this.epoch&&!this.ready&&this.owner){const kept=this.failures;this.connect(true).finally(()=>{this.failures=Math.max(this.failures||0,kept);});}},Math.min(30000,1500*2**Math.min(this.failures,5)));
 }
 // Chamado pela apresentação a cada mudança de tela.
 setPresentation(value){
  const key=JSON.stringify(value);if(key===this.last)return;
  const was=this.local;this.last=key;this.local=value;
  if(!value&&was)this.send({kind:'gone'});
  this.track();this.announce(true);
 }
 track(){
  if(!this.channel||!this.ready)return;
  const key=JSON.stringify(identity(this.local));
  if(key===this.tracked)return;
  this.tracked=key;
  if(this.local)this.channel.track({...identity(this.local),role:'presenter',device:this.device}).catch(()=>{});else this.channel.untrack().catch(()=>{});
 }
 announce(full=false){
  if(!this.local)return;
  const {code,title,total,...status}=this.local;
  if(full)this.send({kind:'status',identity:{code,title,total},status});else this.send({kind:'presence',code,title,total});
 }
 // Comando com confirmação: reenvia até três vezes antes de avisar.
 command(action,value){
  this.state();
  const id=createUuid(),target=this.open,message={kind:'control',target,action,value,id};
  return new Promise(resolve=>{
   let tries=0;
   const finish=ok=>{clearInterval(timer);this.waiting.delete(id);resolve(ok);};
   const attempt=()=>{if(++tries>4){finish(false);return;}this.send(message);};
   const timer=setInterval(attempt,650);
   this.waiting.set(id,{done:()=>finish(true)});attempt();
  });
 }
 available(){const p=this.sessions.find(s=>s.device===this.open);return p&&(this.ready||this.bus)?p:null;}
 // O aviso só interessa a quem está usando o controle neste aparelho.
 retryMarkup(){return this.status&&!this.ready&&this.open?`<div class="remote-connection-status"><p role="status">${esc(this.status)}</p><button type="button" class="studio-btn quiet" data-remote-action="reconnect">Reconectar controle</button></div>`:'';}
 markup(){return this.retryMarkup()+(this.sessions.length?`<section class="account-live-sessions"><h2>Apresentação em andamento</h2>${this.sessions.map(p=>`<article><div><strong>${esc(p.title)}</strong><small>${Number.isInteger(p.slide)?'Slide '+(p.slide+1)+' de '+Number(p.total)+' · ':''}sala ${esc(p.code)}</small></div><button class="studio-btn accent" type="button" data-remote-action="open" data-device="${esc(p.device)}">Usar este aparelho como controle</button></article>`).join('')}</section>`:'');}
 roomButton(code){const session=this.sessions.find(p=>p.code===code);return session?`<button type="button" class="btn secondary small" data-remote-action="open" data-device="${esc(session.device)}">Controlar slide</button>`:'';}
 simsMarkup(p,off){
  const sims=Array.isArray(p?.sims)?p.sims:[];
  if(!sims.length)return '<p class="remote-empty">Este slide não tem experimento. Passe para um slide com experimento e ele aparece aqui.</p>';
  return sims.map((sim,s)=>`<section class="remote-sim"><h3>${esc(sim.name)}</h3>${(sim.fields||[]).map(f=>{
   const at=`data-remote-field data-sim="${s}" data-field="${Number(f.i)}" ${off}`;
   if(f.k==='range')return `<label class="remote-range"><span>${esc(f.label)} <output>${esc(f.value)}</output></span><div><button type="button" data-remote-action="sim-step" data-step="-1" data-sim="${s}" data-field="${Number(f.i)}" aria-label="Diminuir ${esc(f.label)}" ${off}>−</button><input type="range" min="${esc(f.min)}" max="${esc(f.max)}" step="${esc(f.step)}" value="${esc(f.value)}" aria-label="${esc(f.label)}" ${at}><button type="button" data-remote-action="sim-step" data-step="1" data-sim="${s}" data-field="${Number(f.i)}" aria-label="Aumentar ${esc(f.label)}" ${off}>+</button></div></label>`;
   if(f.k==='select')return `<label class="remote-select"><span>${esc(f.label)}</span><select aria-label="${esc(f.label)}" ${at}>${(f.options||[]).map(([value,name])=>`<option value="${esc(value)}" ${String(value)===String(f.value)?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;
   if(f.k==='toggle')return `<button type="button" class="studio-btn quiet remote-toggle" data-remote-action="sim-toggle" data-sim="${s}" data-field="${Number(f.i)}" data-value="${f.value==='1'?'1':'0'}" aria-pressed="${f.value==='1'}" ${off}>${esc(f.label)}</button>`;
   return `<label class="remote-select"><span>${esc(f.label)}</span><input type="text" maxlength="160" value="${esc(f.value)}" ${at}></label>`;
  }).join('')}${(sim.acts||[]).length?`<div class="remote-acts">${sim.acts.map(act=>`<button type="button" class="studio-btn quiet" data-remote-action="sim-act" data-sim="${s}" data-act="${Number(act.a)}" ${off}>${esc(act.label)}</button>`).join('')}</div>`:''}${sim.play?`<button type="button" class="studio-btn accent remote-play" data-remote-action="sim-play" data-sim="${s}" ${off}>${esc(sim.play)}</button>`:''}</section>`).join('');
 }
 dialog(){
  if(!this.open)return '';
  const p=this.sessions.find(s=>s.device===this.open),available=Boolean(this.available()),off=available?'':'disabled';
  const hasSlide=p&&Number.isInteger(p.slide),lesson=!p?.phase||p.phase==='lesson',simCount=Array.isArray(p?.sims)?p.sims.length:0;
  const button=(action,label,kind='quiet')=>`<button class="studio-btn ${kind}" data-remote-action="${action}" ${off}>${label}</button>`;
  const head=`<button class="group-close" type="button" data-remote-action="close" aria-label="Fechar controle">×</button><header class="remote-head"><span class="remote-dot" data-on="${available}" title="${available?'Conectado':'Sem sinal'}"></span><div><h2>${esc(p?.title||'Apresentação desconectada')}</h2><p>${p?(hasSlide?'Slide '+(p.slide+1)+' de '+Number(p.total):'Conectando…')+' · sala '+esc(p.code):'Aguarde o computador reconectar.'}</p></div></header>`;
  const foot=`<p class="remote-status" role="status">${esc(this.notice||'')}</p>${this.retryMarkup()}`;
  if(this.simOpen)return `<dialog class="group-dialog remote-dialog remote-v2" data-view="sims" aria-label="Controle do experimento">${head}<button class="studio-btn quiet remote-back" type="button" data-remote-action="sims-close">← Voltar ao controle</button><div class="remote-sims">${this.simsMarkup(p,off)}</div><div class="remote-main remote-main-small">${button('previous','← Anterior')}${button('next-slide','Próximo →','accent')}</div>${foot}</dialog>`;
  return `<dialog class="group-dialog remote-dialog remote-v2" aria-label="Controle da apresentação">${head}
   <div class="remote-main">${button('previous','<i aria-hidden="true">←</i><span>Anterior</span>')}${button('next-slide','<span>Próximo</span><i aria-hidden="true">→</i>','accent')}</div>
   <button class="studio-btn quiet remote-sim-open" type="button" data-remote-action="sims-open" ${off}><span>🧪 Mexer no experimento</span><small>${simCount?(simCount===1?'1 experimento neste slide':simCount+' experimentos neste slide'):'Nenhum neste slide'}</small></button>
   ${p?.note?`<details class="remote-notes"><summary>Roteiro deste slide</summary><p>${esc(p.note)}</p></details>`:''}
   <section class="remote-group" data-active="${!lesson}"><h3>Quiz</h3><div>${button('quiz','Abrir lobby')}${button('start-quiz','Iniciar quiz')}${button('reveal','Revelar resposta')}${button('next-question','Próxima pergunta')}</div></section>
   <section class="remote-group"><h3>Enquete</h3><div>${button('poll','Abrir enquete')}${button('close-poll','Encerrar enquete')}</div></section>
   <section class="remote-group"><h3>Atividade</h3><div>${button('back-lesson','Voltar aos slides')}${button('finish','Encerrar atividade')}</div></section>${foot}</dialog>`;
 }
 // A janela só é redesenhada quando algo visível muda: redesenhar a cada sinal
 // fazia botões e controles deslizantes "escaparem" do dedo.
 paint(){
  const root=this.studio.root;
  const slot=root.querySelector('[data-live-sessions]');
  if(slot){const html=this.markup();if(slot.__html!==html){slot.__html=html;slot.innerHTML=html;}}
  for(const button of root.querySelectorAll('[data-room-controller]')){const html=this.roomButton(button.dataset.roomCode);if(button.__html!==html){button.__html=html;button.innerHTML=html;}}
  const dialogs=root.querySelector('[data-remote-dialog]');
  if(!dialogs)return;
  if(this.dragging&&dialogs.firstElementChild)return;
  const html=this.dialog();
  if(dialogs.__html===html&&(dialogs.firstElementChild||!html))return;
  const scroll=dialogs.querySelector('dialog')?.scrollTop||0,focus=document.activeElement?.closest?.('[data-remote-dialog]')?document.activeElement.dataset.remoteAction:'';
  dialogs.__html=html;dialogs.innerHTML=html;
  const dialog=dialogs.querySelector('dialog');
  if(dialog){dialog.showModal();dialog.scrollTop=scroll;dialog.addEventListener('cancel',()=>{this.open='';this.simOpen=false;});if(focus)dialog.querySelector(`[data-remote-action="${focus}"]:not([disabled])`)?.focus();}
 }
 // Controle deslizante: envia enquanto arrasta (no máximo ~12 vezes por segundo).
 fieldChanged(field,final=false){
  const sim=Number(field.dataset.sim),index=Number(field.dataset.field),value=field.value;
  const output=field.closest('.remote-range')?.querySelector('output');if(output)output.textContent=value;
  this.dragging=!final&&field.type==='range';
  clearTimeout(this.dragTimer);if(this.dragging)this.dragTimer=setTimeout(()=>{this.dragging=false;},1500);
  const push=()=>{this.fieldTimer=0;this.send({kind:'control',target:this.open,action:'sim',value:{sim,field:index,value:this.fieldValue},id:createUuid()});};
  this.fieldValue=value;
  if(final){clearTimeout(this.fieldTimer);push();}else if(!this.fieldTimer)this.fieldTimer=setTimeout(push,80);
 }
 async action(button){
  const action=button.dataset.remoteAction;
  if(action==='reconnect'){await this.connect(true);return;}
  if(action==='open'){this.open=button.dataset.device;this.simOpen=false;this.notice='';this.send({kind:'hello',target:this.open});this.paint();return;}
  if(action==='close'){this.open='';this.simOpen=false;this.paint();return;}
  if(action==='sims-open'||action==='sims-close'){this.simOpen=action==='sims-open';this.send({kind:'hello',target:this.open});this.paint();return;}
  if(!this.available())return;
  const sim=Number(button.dataset.sim);
  let name=action,value;
  if(action==='sim-play'){name='sim';value={sim,play:true};}
  else if(action==='sim-act'){name='sim';value={sim,act:Number(button.dataset.act)};}
  else if(action==='sim-toggle'){const next=button.dataset.value==='1'?'0':'1';button.dataset.value=next;button.setAttribute('aria-pressed',String(next==='1'));name='sim';value={sim,field:Number(button.dataset.field),value:next};}
  else if(action==='sim-step'){
   const input=button.parentElement.querySelector('input[type=range]');if(!input)return;
   if(Number(button.dataset.step)>0)input.stepUp();else input.stepDown();
   this.fieldChanged(input,true);return;
  }
  if(!commands.has(name))return;
  navigator.vibrate?.(12);
  const ok=await this.command(name,value);
  const notice=ok?'':'O computador não respondeu. Confira se a apresentação continua aberta.';
  if(notice!==this.notice){this.notice=notice;this.paint();}
 }
}
