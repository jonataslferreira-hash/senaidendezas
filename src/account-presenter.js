import { createUuid } from './uuid.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commands=new Set(['previous','next-slide','next-stage','quiz','start-quiz','reveal','next-question','back-lesson','finish','poll','close-poll']);
export function remoteConnectionMessage(state,error,online=true){
 const reason=String(error?.message||'');
 if(!online)return 'Você está sem internet. O controle reconecta quando a conexão voltar.';
 if(/jwt|token.*expir|invalid.*token/i.test(reason))return 'A sessão do controle expirou. Entre novamente na sua conta.';
 if(/unauthorized|permission|not authorized|rls|forbidden/i.test(reason))return 'O servidor recusou a autorização do controle. Tente reconectar; se persistir, confira a sessão da conta e as permissões do controle remoto.';
 if(state==='TIMED_OUT')return 'A conexão do controle demorou para responder. Tentando reconectar…';
 return 'A conexão do controle foi interrompida. Tentando reconectar…';
}
export class AccountPresenter{
 constructor(studio){this.studio=studio;this.device=createUuid();this.sessions=[];this.epoch=0;this.open='';this.status='';studio.root.addEventListener('account-changed',()=>this.connect());studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-remote-action]');if(b)this.action(b).catch(error=>{this.status=error.message;this.paint();});});queueMicrotask(()=>this.connect());}
 async connect(force=false){
  const owner=this.studio.account.user?.id;
  if(!force&&owner&&owner===this.owner&&(this.channel||this.connecting))return;
  const changed=owner!==this.owner,previous=this.channel,epoch=++this.epoch;
  this.owner=owner;this.channel=null;this.ready=false;this.connecting=Boolean(owner);this.status='';this.sessions=[];if(changed)this.open='';this.paint();
  try{
   if(previous)await this.studio.account.client.removeChannel(previous);
   if(epoch!==this.epoch||!owner)return;
   // Bootstrap the current session before authorizing a private channel. The SDK
   // continues to refresh its token and retry interrupted subscriptions.
   await this.studio.account.client.realtime.setAuth();
   if(epoch!==this.epoch)return;
   this.channel=this.studio.account.client.channel('sl-live:'+owner,{config:{private:true,broadcast:{ack:true},presence:{key:this.device}}})
    .on('presence',{event:'sync'},()=>{if(epoch!==this.epoch)return;this.sessions=Object.values(this.channel.presenceState()).flat().filter(p=>p.role==='presenter'&&p.device!==this.device&&/^\d{6}$/.test(p.code||'')).slice(0,10);this.paint();})
    .on('broadcast',{event:'control'},({payload})=>{if(epoch!==this.epoch||!this.local||payload?.target!==this.device||!commands.has(payload.action))return;this.studio.callbacks.remoteAction?.(payload.action);})
    .subscribe((state,error)=>{if(epoch!==this.epoch)return;if(state==='SUBSCRIBED'){this.ready=true;this.failures=0;clearTimeout(this.retryTimer);this.track();this.status='';}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)){this.ready=false;this.dropped(state,error,epoch);}this.paint();});
  }catch(error){if(epoch===this.epoch)this.dropped('CHANNEL_ERROR',error,epoch);}
  finally{if(epoch===this.epoch){this.connecting=false;this.paint();}}
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
 setPresentation(value){const key=JSON.stringify(value);if(key===this.last)return;this.last=key;this.local=value;this.track();}
 track(){if(!this.channel||!this.ready)return;if(this.local)this.channel.track({...this.local,role:'presenter',device:this.device}).catch(()=>{});else this.channel.untrack().catch(()=>{});}
 retryMarkup(){return this.status&&!this.ready?`<div class="remote-connection-status"><p role="status">${esc(this.status)}</p><button type="button" class="studio-btn quiet" data-remote-action="reconnect">Reconectar controle</button></div>`:'';}
 markup(){return this.retryMarkup()+(this.sessions.length?`<section class="account-live-sessions"><h2>Apresentação em andamento</h2>${this.sessions.map(p=>`<article><div><strong>${esc(p.title)}</strong><small>Slide ${Number(p.slide)+1} de ${Number(p.total)} · sala ${esc(p.code)}</small></div><button class="studio-btn accent" type="button" data-remote-action="open" data-device="${esc(p.device)}">Usar este aparelho como controle</button></article>`).join('')}</section>`:'');}
 roomButton(code){if(!this.ready)return '';const session=this.sessions.find(p=>p.code===code);return session?`<button type="button" class="btn secondary small" data-remote-action="open" data-device="${esc(session.device)}">Controlar slide</button>`:'';}
 dialog(){if(!this.open)return '';const p=this.sessions.find(s=>s.device===this.open),available=Boolean(p&&this.ready);return `<dialog class="group-dialog remote-dialog" aria-label="Controle da apresentação"><button class="group-close" type="button" data-remote-action="close" aria-label="Fechar controle">×</button><h2>${esc(p?.title||'Apresentação desconectada')}</h2><p>${p?'Slide '+(Number(p.slide)+1)+' de '+Number(p.total):'Aguarde o computador reconectar.'}</p>${p?.note?`<details class="remote-notes"><summary>Roteiro</summary><p>${esc(p.note)}</p></details>`:''}<div class="remote-main"><button class="studio-btn quiet" data-remote-action="previous" ${available?'':'disabled'}>← Anterior</button><button class="studio-btn accent" data-remote-action="next-slide" ${available?'':'disabled'}>Próximo →</button></div><div class="remote-extra">${[['quiz','Abrir lobby'],['start-quiz','Iniciar quiz'],['reveal','Revelar resposta'],['next-question','Próxima pergunta'],['poll','Abrir enquete'],['close-poll','Encerrar enquete'],['back-lesson','Voltar aos slides'],['finish','Encerrar atividade']].map(([a,t])=>`<button class="studio-btn quiet" data-remote-action="${a}" ${available?'':'disabled'}>${t}</button>`).join('')}</div><p role="status">${this.ready?esc(this.status):''}</p>${this.retryMarkup()}</dialog>`;}
 paint(){const slot=this.studio.root.querySelector('[data-live-sessions]');if(slot)slot.innerHTML=this.markup();for(const button of this.studio.root.querySelectorAll('[data-room-controller]'))button.innerHTML=this.roomButton(button.dataset.roomCode);const dialogs=this.studio.root.querySelector('[data-remote-dialog]');if(dialogs){dialogs.innerHTML=this.dialog();const dialog=dialogs.querySelector('dialog');if(dialog){dialog.showModal();dialog.addEventListener('cancel',()=>{this.open='';});}}}
 async action(button){const action=button.dataset.remoteAction;if(action==='reconnect'){await this.connect(true);return;}if(action==='open'){this.open=button.dataset.device;this.paint();return;}if(action==='close'){this.open='';this.paint();return;}if(!this.ready||!commands.has(action)||!this.sessions.some(s=>s.device===this.open))return;const result=await this.channel.send({type:'broadcast',event:'control',payload:{target:this.open,action}});if(result!=='ok')throw Error('O comando não foi confirmado. Confira a conexão.');}
}
