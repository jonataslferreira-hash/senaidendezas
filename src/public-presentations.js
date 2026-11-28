import { googleClassroom } from './google-classroom.js';
import { r2ApiUrl } from './cloud-files.js';
import { packLesson,unpackLesson } from './file-codec.js';
import { validateLesson } from './lessons.js';
import { hydrateLesson } from './assets.js';
import { canvasFromSlide } from './canvas-data.js';
import { activityBlocks } from './activity-blocks.js';
import { serviceNetworkMessage } from './service-errors.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validPublicToken=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value||'');
// Código curto do link (?p=K7M2QD): sem letras e números parecidos (0/O, 1/I/L).
export const validPublicCode=value=>/^[A-HJKMNP-Z2-9]{6}$/i.test(value||'');
export async function resolvePublicCode(code){
  if(!r2ApiUrl)throw Error('O compartilhamento de apresentações ainda não está configurado.');
  const response=await fetch(r2ApiUrl+'/presentations/code/'+String(code).toUpperCase(),{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(response.status===404?'Não encontrei uma apresentação com este código. Confira as letras e os números.':'Não foi possível abrir a apresentação. Tente novamente.');
  const {token}=await response.json();if(!validPublicToken(token))throw Error('Link de apresentação inválido.');
  return token;
}
const MAX_PORTABLE_BYTES=18000;
export function portablePresentation(buffer){
  if(buffer.byteLength>MAX_PORTABLE_BYTES)throw Error('Esta aula tem arquivos grandes. Para compartilhar por link, publique a atualização do Worker (cloudflare/wrangler.toml) e tente novamente.');
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function publicDeck(data){return {lesson:validateLesson(data?.publicPresentation===1 ? data.lesson : data),allowCopy:data?.publicPresentation===1 && data.allowCopy===true};}
export async function loadPublicPresentationInfo(token){
  if(token==='portable'){
    const encoded=new URLSearchParams(location.hash.slice(1)).get('deck')||'';
    if(!/^[A-Za-z0-9_-]+$/.test(encoded)||encoded.length>24000)throw Error('O link portátil está incompleto ou é inválido.');
    try{return publicDeck(await unpackLesson(new Blob([Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))])));}catch{throw Error('Não foi possível abrir esta cópia. Peça um novo link de apresentação.');}
  }

  if(!validPublicToken(token))throw Error('Link de apresentação inválido.');
  if(!r2ApiUrl)throw Error('O compartilhamento de apresentações ainda não está configurado.');
  const response=await fetch(r2ApiUrl+'/presentations/'+token,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(response.status===404?'Esta apresentação não está disponível. O link pode ter sido revogado.':'Não foi possível carregar a apresentação. Tente novamente.');
  return publicDeck(await unpackLesson(await response.blob()));
}
export async function loadPublicPresentation(token){return (await loadPublicPresentationInfo(token)).lesson;}
export class PresentationSharing {
  constructor(studio){this.studio=studio;this.open=false;this.busy=false;this.message='';this.link='';
    studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-publish-action]');if(b&&!this.busy)this.action(b.dataset.publishAction).catch(error=>{this.message=error.message;this.problemSlideId=error.lessonSlideId||'';this.busy=false;studio.callbacks.render();});});
    studio.root.addEventListener('account-changed',()=>{this.open=false;this.link='';this.token='';this.code='';});
  }
  show(){if(!this.studio.account.user){this.studio.account.show('login');return;}this.open=true;this.message='';this.problemSlideId='';this.lessonId=this.studio.draft.id;this.uid=this.studio.account.user.id;this.link='';this.token='';this.mode='cloud';this.allowCopy=false;try{const saved=JSON.parse(localStorage.getItem('sl-public-presentation:'+this.uid+':'+this.lessonId)||'null');if(saved&&(validPublicToken(saved.token)||(saved.token==='portable'&&saved.mode==='portable'))){this.token=saved.token;this.link=saved.link;this.mode=saved.mode||'cloud';this.allowCopy=saved.allowCopy===true;this.code=validPublicCode(saved.code)?saved.code:'';if(this.code&&this.mode==='cloud')this.link=this.shortLink();}}catch{}this.studio.callbacks.render();if(this.token&&this.mode==='cloud'&&!this.code)this.upgradeCode();}
  siteUrl(){const local=/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname)||location.hostname.endsWith('.e2b.app');let base;try{if(local)base=localStorage.getItem('sl-public-url');}catch{}const url=new URL(base||(local?'https://jonataslferreira-hash.github.io/senaidendezas/':location.origin+location.pathname));url.search='';url.hash='';return url;}
  save(){try{localStorage.setItem('sl-public-presentation:'+this.uid+':'+this.lessonId,JSON.stringify({token:this.token,link:this.link,mode:this.mode,code:this.code||'',allowCopy:this.allowCopy}));}catch{}}
  // No GitHub Pages o código vai direto no endereço (…/senaidendezas/K7M2QD), como um encurtador;
  // a página 404.html do site encaminha para ?p=. Em outras hospedagens fica ?p=.
  shortLink(){const url=this.siteUrl();if(url.hostname.endsWith('.github.io')){url.pathname=url.pathname.replace(/[^/]*$/,'')+this.code;return url.href;}url.searchParams.set('p',this.code);return url.href;}
  // Links antigos ganham um código curto na primeira vez que a janela abre.
  async upgradeCode(){const token=this.token;try{const response=await this.request('/presentations/'+token+'/code',{method:'POST'}),result=await response.json();if(this.token!==token||!validPublicCode(result.code))return;this.code=result.code;this.link=this.shortLink();this.save();if(this.open)this.studio.callbacks.render();}catch{/* servidor ainda sem códigos curtos: o link longo continua valendo */}}
  markup(){if(!this.open)return '';return `<dialog class="group-dialog publish-dialog" data-publish-dialog aria-labelledby="publish-title"><header class="dialog-title-row"><h2 id="publish-title">Compartilhar apresentação</h2><button type="button" class="group-close" data-publish-action="close" aria-label="Fechar compartilhamento"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header><p>Quem tiver o link poderá apresentar uma cópia dos slides e do quiz, sem login. O link não permite editar sua aula e não inclui suas notas.</p>${this.link?`${this.code?`<div class="publish-code"><span>Código da apresentação</span><strong aria-label="Código ${esc(this.code.split('').join(' '))}">${esc(this.code.slice(0,3))}<i></i>${esc(this.code.slice(3))}</strong><small>Para abrir em outro computador, digite na barra de endereço:</small><code>${esc(this.link.replace(/^https?:\/\//,''))}</code></div>`:''}<div class="publish-qr" data-publish-qr hidden><img alt="QR Code que abre a apresentação"><span>Aponte a câmera do celular para abrir</span></div><label for="presentation-link">${this.code?'Link curto':'Link da apresentação'}</label><input id="presentation-link" readonly value="${esc(this.link)}"><div class="publish-actions"><button type="button" class="studio-btn accent" data-publish-action="copy">Copiar link</button><button type="button" class="studio-btn quiet" data-publish-action="classroom">Google Classroom</button><a class="studio-btn quiet" href="${esc(this.link)}" target="_blank" rel="noopener">Abrir apresentação</a><button type="button" class="studio-btn quiet" data-publish-action="revoke">${this.mode==='portable'?'Remover link deste navegador':'Desativar link'}</button></div><p>${this.allowCopy?'Este link permite salvar uma cópia na conta.':'Este link não oferece a opção de salvar cópia.'}</p>`:`<label class="publish-copy-option"><input type="checkbox" data-publish-copy><span><strong>Permitir salvar uma cópia</strong><small>Pessoas com conta poderão guardar esta apresentação na própria biblioteca.</small></span></label><button type="button" class="studio-btn accent" data-publish-action="create" ${this.busy?'disabled':''}>${this.busy?'Preparando…':'Criar link de apresentação'}</button>`}<div class="publish-file-options"><strong>Enviar arquivo ao Google Classroom</strong><p>Escolha o formato e a turma. O arquivo será enviado ao seu Google Drive e anexado à atividade. Jogos e interações não fazem parte do arquivo.</p><div><button type="button" class="studio-btn quiet" data-publish-action="file-pdf">Enviar PDF</button><button type="button" class="studio-btn quiet" data-publish-action="file-pptx">Enviar PPTX</button></div></div>${this.mode==='portable'?'<p class="publish-portable-note">Cópia portátil: não depende do servidor. Quem tiver o link continuará com acesso; remover daqui não revoga cópias já enviadas.</p>':''}<p role="status" class="publish-message">${esc(this.message)}</p>${this.problemSlideId?'<button type="button" class="studio-btn quiet" data-publish-action="locate">Ir para o item com erro</button>':''}</dialog>`;}
  // QR Code do link, para abrir a apresentação pelo celular sem digitar nada.
  async paintQR(dialog){
    const box=dialog.querySelector('[data-publish-qr]'),link=this.link;if(!box||!link)return;
    try{
      if(this.qr?.link!==link){const {default:QRCode}=await import('qrcode');this.qr={link,src:await QRCode.toDataURL(link,{width:440,margin:2})};}
      if(!box.isConnected||this.link!==link)return;
      box.querySelector('img').src=this.qr.src;box.hidden=false;
    }catch{/* link grande demais para um QR Code: fica só o texto */}
  }
  mount(){const dialog=this.studio.root.querySelector('[data-publish-dialog]');if(dialog)this.paintQR(dialog);if(dialog&&!dialog.open){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();if(!this.busy){this.open=false;this.studio.callbacks.render();}});}}
  async request(path,options){const {data}=await this.studio.account.client.auth.getSession();if(!data.session)throw Error('Entre na conta para compartilhar uma aula.');if(!r2ApiUrl)throw Error('O compartilhamento precisa ser ativado no Worker.');let response;try{response=await fetch(r2ApiUrl+path,{...options,signal:AbortSignal.timeout(30000),headers:{...options?.headers,Authorization:'Bearer '+data.session.access_token}});}catch{throw Error(serviceNetworkMessage('o servidor de compartilhamento'));}if(!response.ok){const error=Error(response.status===404?'O servidor de compartilhamento precisa de atualização.':'Não foi possível compartilhar a apresentação. Confira a conexão e a conta.');error.status=response.status;throw error;}return response;}
  async action(action){
    if(action==='close'){this.open=false;this.studio.callbacks.render();return;}
    if(action==='locate'){
      const slide=this.studio.draft.slides.findIndex(s=>s.id===this.problemSlideId);
      const block=activityBlocks(this.studio.draft).find(b=>b.items.includes(this.problemSlideId));
      if(block)this.studio.selectBlock(block.id);
      if(slide>=0)this.studio.index=slide;
      this.open=false;this.studio.writeRoute();this.studio.callbacks.render();return;
    }
    if(action==='file-pdf'||action==='file-pptx'){
      if(!this.studio.draft.slides.some(slide=>!slide.game&&!slide.poll))throw Error('Adicione um slide comum para exportar. As atividades interativas não são incluídas no arquivo.');
      const format=action.slice(5),draft=this.studio.draft;
      googleClassroom.open({title:draft.title||'Atividade Storage Lab',file:{format,generate:async()=>{const {exportSlides}=await import('./export-slides.js');return exportSlides({...draft,slides:draft.slides.filter(slide=>!slide.game&&!slide.poll)},format,()=>{},{download:false});}}});return;
    }
    if(action==='classroom'){googleClassroom.open({link:this.link,title:this.studio.draft?.title||'Atividade Storage Lab'});return;}
    if(action==='copy'){try{await navigator.clipboard.writeText(this.link);this.message='Link copiado.';}catch{this.message='Copie o link no campo acima.';}this.studio.callbacks.render();return;}
    if(action==='revoke'){if(this.mode!=='portable')await this.request('/presentations/'+this.token,{method:'DELETE'});this.link='';this.token='';this.code='';try{localStorage.removeItem('sl-public-presentation:'+this.uid+':'+this.lessonId);}catch{}this.message=this.mode==='portable'?'Link removido deste navegador. Cópias enviadas continuam funcionando.':'Link desativado.';this.mode='cloud';this.studio.callbacks.render();return;}
    if(action==='create'){
      const uid=this.studio.account.user?.id;this.allowCopy=Boolean(this.studio.root.querySelector('[data-publish-copy]')?.checked);this.busy=true;this.message='';this.problemSlideId='';this.studio.callbacks.render();
      if(this.studio.groups.live)await this.studio.groups.live.persist();
      const lesson=validateLesson(await hydrateLesson(this.studio.draft,true));lesson.slides=lesson.slides.map(s=>({...canvasFromSlide(s),note:''}));
      const packed=await packLesson({publicPresentation:1,allowCopy:this.allowCopy,lesson}),blob=new Blob([packed.buffer],{type:packed.compressed?'application/gzip':'application/json'});
      if(this.studio.account.user?.id!==uid)throw Error('A conta mudou. Abra o compartilhamento novamente.');
      let result,portable='';this.mode='cloud';
      try{const response=await this.request('/presentations',{method:'POST',body:blob,headers:{'Content-Type':blob.type}});result=await response.json();if(!validPublicToken(result.token))throw Error('O servidor retornou um link inválido.');}
      catch(error){if(error.status!==404)throw error;portable=portablePresentation(packed.buffer);result={token:'portable'};this.mode='portable';}
      this.token=result.token;this.code=!portable&&validPublicCode(result.code)?result.code.toUpperCase():'';
      if(this.code)this.link=this.shortLink();else{const url=this.siteUrl();url.searchParams.set('presentation',result.token);if(portable)url.hash='deck='+portable;this.link=url.href;}
      this.save();
      this.busy=false;this.studio.callbacks.render();
    }
  }
}
