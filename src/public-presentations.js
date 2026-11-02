import { r2ApiUrl } from './cloud-files.js';
import { packLesson,unpackLesson } from './file-codec.js';
import { validateLesson } from './lessons.js';
import { hydrateLesson } from './assets.js';
import { canvasFromSlide } from './canvas-data.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validPublicToken=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value||'');
const MAX_PORTABLE_BYTES=18000;
export function portablePresentation(buffer){
  if(buffer.byteLength>MAX_PORTABLE_BYTES)throw Error('Esta aula tem arquivos grandes. Para compartilhar por link, publique a atualização do Worker (cloudflare/wrangler.toml) e tente novamente.');
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export async function loadPublicPresentation(token){
  if(token==='portable'){
    const encoded=new URLSearchParams(location.hash.slice(1)).get('deck')||'';
    if(!/^[A-Za-z0-9_-]+$/.test(encoded)||encoded.length>24000)throw Error('O link portátil está incompleto ou é inválido.');
    try{return validateLesson(await unpackLesson(new Blob([Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))])));}catch{throw Error('Não foi possível abrir esta cópia. Peça um novo link de apresentação.');}
  }

  if(!validPublicToken(token))throw Error('Link de apresentação inválido.');
  if(!r2ApiUrl)throw Error('O compartilhamento de apresentações ainda não está configurado.');
  const response=await fetch(r2ApiUrl+'/presentations/'+token,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(response.status===404?'Esta apresentação não está disponível. O link pode ter sido revogado.':'Não foi possível carregar a apresentação. Tente novamente.');
  return validateLesson(await unpackLesson(await response.blob()));
}
export class PresentationSharing {
  constructor(studio){this.studio=studio;this.open=false;this.busy=false;this.message='';this.link='';
    studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-publish-action]');if(b&&!this.busy)this.action(b.dataset.publishAction).catch(error=>{this.message=error.message;this.busy=false;studio.callbacks.render();});});
    studio.root.addEventListener('account-changed',()=>{this.open=false;this.link='';this.token='';});
  }
  show(){if(!this.studio.account.user){this.studio.account.show('login');return;}this.open=true;this.message='';this.lessonId=this.studio.draft.id;this.uid=this.studio.account.user.id;this.link='';this.token='';this.mode='cloud';try{const saved=JSON.parse(localStorage.getItem('sl-public-presentation:'+this.uid+':'+this.lessonId)||'null');if(saved&&(validPublicToken(saved.token)||(saved.token==='portable'&&saved.mode==='portable'))){this.token=saved.token;this.link=saved.link;this.mode=saved.mode||'cloud';}}catch{}this.studio.callbacks.render();}
  markup(){if(!this.open)return '';return `<dialog class="group-dialog publish-dialog" data-publish-dialog aria-labelledby="publish-title"><button type="button" class="group-close" data-publish-action="close" aria-label="Fechar compartilhamento">×</button><span class="publish-icon" aria-hidden="true">↗</span><h2 id="publish-title">Compartilhar apresentação</h2><p>Quem tiver o link poderá apresentar uma cópia dos slides e do quiz, sem login. O link não permite editar sua aula e não inclui suas notas.</p>${this.link?`<label for="presentation-link">Link da apresentação</label><input id="presentation-link" readonly value="${esc(this.link)}"><div class="publish-actions"><button type="button" class="studio-btn accent" data-publish-action="copy">Copiar link</button><a class="studio-btn quiet" href="${esc(this.link)}" target="_blank" rel="noopener">Abrir apresentação</a><button type="button" class="studio-btn quiet" data-publish-action="revoke">${this.mode==='portable'?'Remover link deste navegador':'Desativar link'}</button></div>`:`<button type="button" class="studio-btn accent" data-publish-action="create" ${this.busy?'disabled':''}>${this.busy?'Preparando…':'Criar link de apresentação'}</button>`}${this.mode==='portable'?'<p class="publish-portable-note">Cópia portátil: não depende do servidor. Quem tiver o link continuará com acesso; remover daqui não revoga cópias já enviadas.</p>':''}<p role="status" class="publish-message">${esc(this.message)}</p></dialog>`;}
  mount(){const dialog=this.studio.root.querySelector('[data-publish-dialog]');if(dialog&&!dialog.open){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();if(!this.busy){this.open=false;this.studio.callbacks.render();}});}}
  async request(path,options){const {data}=await this.studio.account.client.auth.getSession();if(!data.session)throw Error('Entre na conta para compartilhar uma aula.');if(!r2ApiUrl)throw Error('O compartilhamento precisa ser ativado no Worker.');const response=await fetch(r2ApiUrl+path,{...options,signal:AbortSignal.timeout(30000),headers:{...options?.headers,Authorization:'Bearer '+data.session.access_token}});if(!response.ok){const error=Error(response.status===404?'O servidor de compartilhamento precisa de atualização.':'Não foi possível compartilhar a apresentação. Confira a conexão e a conta.');error.status=response.status;throw error;}return response;}
  async action(action){
    if(action==='close'){this.open=false;this.studio.callbacks.render();return;}
    if(action==='copy'){try{await navigator.clipboard.writeText(this.link);this.message='Link copiado.';}catch{this.message='Copie o link no campo acima.';}this.studio.callbacks.render();return;}
    if(action==='revoke'){if(this.mode!=='portable')await this.request('/presentations/'+this.token,{method:'DELETE'});this.link='';this.token='';try{localStorage.removeItem('sl-public-presentation:'+this.uid+':'+this.lessonId);}catch{}this.message=this.mode==='portable'?'Link removido deste navegador. Cópias enviadas continuam funcionando.':'Link desativado.';this.mode='cloud';this.studio.callbacks.render();return;}
    if(action==='create'){
      const uid=this.studio.account.user?.id;this.busy=true;this.message='';this.studio.callbacks.render();
      if(this.studio.groups.live)await this.studio.groups.live.persist();
      const lesson=validateLesson(await hydrateLesson(this.studio.draft,true));lesson.slides=lesson.slides.map(s=>({...canvasFromSlide(s),note:''}));
      const packed=await packLesson(lesson),blob=new Blob([packed.buffer],{type:packed.compressed?'application/gzip':'application/json'});
      if(this.studio.account.user?.id!==uid)throw Error('A conta mudou. Abra o compartilhamento novamente.');
      let result,portable='';this.mode='cloud';
      try{const response=await this.request('/presentations',{method:'POST',body:blob,headers:{'Content-Type':blob.type}});result=await response.json();if(!validPublicToken(result.token))throw Error('O servidor retornou um link inválido.');}
      catch(error){if(error.status!==404)throw error;portable=portablePresentation(packed.buffer);result={token:'portable'};this.mode='portable';}
      this.token=result.token;const local=/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname);let base;try{base=localStorage.getItem('sl-public-url');}catch{}
      const url=new URL(base||(local?'https://jonataslferreira-hash.github.io/senaidendezas/':location.origin+location.pathname));url.search='';url.hash='';url.searchParams.set('presentation',result.token);if(portable)url.hash='deck='+portable;this.link=url.href;
      try{localStorage.setItem('sl-public-presentation:'+this.uid+':'+this.lessonId,JSON.stringify({token:this.token,link:this.link,mode:this.mode}));}catch{}
      this.busy=false;this.studio.callbacks.render();
    }
  }
}
