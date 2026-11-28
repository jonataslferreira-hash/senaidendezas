import { createUuid } from './uuid.js';
import {r2ApiUrl} from './cloud-files.js';
import {ChatRecorder} from './chat-recorder.js';
import {optimizeImage} from './image-optimize.js';
import {studioIcon} from './studio-icons.js';
import {ChatPreviews} from './chat-previews.js';
const prefix='[storage-lab-audio]';
const imagePrefix='[storage-lab-image]';
export function parseChatImage(body,scope,id){if(!body?.startsWith(imagePrefix))return null;try{const data=JSON.parse(body.slice(imagePrefix.length));return new RegExp('^/chat-image/'+scope+'/'+id+'/[a-f0-9-]{36}$','i').test(data.path)?data:null;}catch{return null;}}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseVoice(body,scope,id){if(!body?.startsWith(prefix))return null;try{const data=JSON.parse(body.slice(prefix.length));return new RegExp('^/chat-audio/'+scope+'/'+id+'/[a-f0-9-]{36}$','i').test(data.path)&&Number.isFinite(data.seconds)&&data.seconds>=0&&data.seconds<=130?data:null;}catch{return null;}}
// Cartões são montados a partir da URL sem enviar links privados a um serviço externo.
function chatLinkCard(url){
  let u;try{u=new URL(url)}catch{return esc(url)}
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  const ytHost=['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(host);
  const ytId=host==='youtu.be'?u.pathname.split('/')[1]:ytHost?(/^\/(?:shorts|embed|live|v)\//.test(u.pathname)?u.pathname.split('/')[2]:u.searchParams.get('v')):null;
  const yt=/^[A-Za-z0-9_-]{11}$/.test(ytId||'')?ytId:null;
  const vimeoId=(host==='vimeo.com'||host==='player.vimeo.com')?u.pathname.match(/^\/(?:video\/)?(\d{6,12})(?:\/|$)/)?.[1]:null;
  const spotify=host==='open.spotify.com'?u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]{22})(?:\/|$)/):null;
  const spotifyId=spotify?spotify[1]+'-'+spotify[2]:null;
  const google=host==='docs.google.com'&&/^\/(document|spreadsheets|presentation|forms)\//.exec(u.pathname)?.[1];
  const kinds={document:['Documento','DOCS'],spreadsheets:['Planilha','SHEETS'],presentation:['Apresentação','SLIDES'],forms:['Formulário','FORMS']};
  let kind=google?google:yt?'youtube':vimeoId?'vimeo':spotifyId?'spotify':'web';
  let segment=u.pathname.split('/').filter(Boolean).at(-1)||'';try{segment=decodeURIComponent(segment)}catch{}
  segment=segment.replace(/[-_]+/g,' ').trim();
  const title=google?kinds[google][0]+' no Google':yt||vimeoId||spotifyId?'Carregando prévia…':segment&&segment.length<75?segment:host;
  const label=google?kinds[google][1]:yt?'YOUTUBE':vimeoId?'VIMEO':spotifyId?'SPOTIFY':'LINK';
  const icon=google?'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 2.5h8l4 4V21H6z" fill="currentColor" opacity=".95"/><path d="M14 2.5v4h4M9 11h6M9 14h6M9 17h4" stroke="var(--link-art)" stroke-width="1.4" stroke-linecap="round"/></svg>':yt||vimeoId?'<span class="chat-link-play" aria-hidden="true">▶</span>':'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 12h17M12 3.5c-2.5 2.3-3.5 5.2-3.5 8.5s1 6.2 3.5 8.5c2.5-2.3 3.5-5.2 3.5-8.5s-1-6.2-3.5-8.5Z" stroke="currentColor" stroke-width="1.4"/></svg>';
  const art=yt?`<img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">`:vimeoId||spotifyId?'<img alt="" hidden loading="lazy" referrerpolicy="no-referrer">':'';
  return `<a class="chat-link-card chat-link-${kind}" ${yt||vimeoId||spotifyId?`data-video-preview="${esc(yt||vimeoId||spotifyId)}" data-preview-provider="${yt?'youtube':vimeoId?'vimeo':'spotify'}"`: ""} href="${esc(u.href)}" target="_blank" rel="noopener noreferrer"><span class="chat-link-art">${art}${icon}<span class="chat-link-label">${label}</span></span><span class="chat-link-copy"><strong data-preview-title>${esc(title.slice(0,90))}</strong><small data-preview-author>${esc(host)}</small></span></a>`;
}
export function chatMessageBody(body,scope,id){const image=parseChatImage(body,scope,id);if(image)return `<div class="chat-image-message"><button type="button" data-chat-image="${esc(image.path)}">${studioIcon('image')} Carregando imagem…</button><img hidden alt="Imagem enviada na conversa" loading="lazy"></div>`;const voice=parseVoice(body,scope,id);if(voice)return `<div class="voice-message"><button type="button" data-chat-audio="${esc(voice.path)}">▶ Ouvir áudio · ${Math.floor(voice.seconds/60)}:${String(Math.floor(voice.seconds%60)).padStart(2,'0')}</button><audio controls hidden preload="none"></audio></div>`;
  const text=String(body??''),parts=text.split(/(https?:\/\/[^\s<>"]+)/);
  if(parts.length>1)return `<div class="chat-link-message">${parts.map((part,i)=>{if(!(i%2))return esc(part);const match=part.match(/^(.*?)([.,!?;:]+)$/);return chatLinkCard(match?match[1]:part)+(match?esc(match[2]):'');}).join('')}</div>`;
  return `<p>${esc(text)}</p>`;}
export function chatDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';}
// Erros do Worker identificam a falha sem confundir objeto ausente com serviço desatualizado.
export function attachmentErrorMessage(status, code, method='GET') {
 const messages={
  chat_not_configured:'Não foi possível verificar a permissão no servidor do chat. A configuração do Supabase ou o serviço pode estar indisponível.',
  chat_audio_not_configured:'Não foi possível verificar a permissão no servidor do chat. A configuração do Supabase ou o serviço pode estar indisponível.',
  storage_not_configured:'O armazenamento de anexos não está configurado no servidor.',
  forbidden:'Você não tem permissão para acessar esta conversa ou este anexo.',
  unauthorized:'Sua sessão não foi aceita. Entre novamente na sua conta.',
  not_found:method==='GET'?'Este anexo não foi encontrado no armazenamento.':'O serviço de anexos não encontrou a rota de envio. Verifique a configuração do Worker.',
  too_large:'O anexo ultrapassa o limite permitido.',
  unsupported_image:'Este formato de imagem não é aceito.',
  invalid_image:'O arquivo não corresponde a um formato de imagem válido.',
  unsupported_audio:'Este formato de áudio não é aceito.',
  invalid_audio:'Não foi possível reconhecer o arquivo de áudio.',
  already_exists:'O anexo já existe. Tente enviar novamente.'
 };
 return messages[code]||(status===401?messages.unauthorized:status===403?messages.forbidden:status===404?messages.not_found:`Não foi possível acessar o anexo (servidor: ${status}). Tente novamente.`);
}
async function audioRequest(client,path,options={}){
 const {data}=await client.auth.getSession();if(!data.session)throw Error('Entre novamente na sua conta.');
 let response;try{response=await fetch(r2ApiUrl+path,{...options,headers:{...options.headers,Authorization:'Bearer '+data.session.access_token}});}catch{throw Error('Não foi possível conectar ao serviço do chat. Verifique sua conexão.');}
 if(!response.ok){let code;try{code=(await response.json())?.error;}catch{}throw Error(attachmentErrorMessage(response.status,code,options.method||'GET'));}
 return response;
}
export class ChatAudio{
 constructor(studio){
  this.studio=studio;this.previews=new ChatPreviews(studio);this.urls=new Map();this.imageLoads=new Map();this.observedImages=new Set();this.accountEpoch=0;this.recorder=new ChatRecorder(studio.root);
  this.imageObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){this.imageObserver.unobserve(entry.target);this.observedImages.delete(entry.target);this.tryImage(entry.target);}}, {rootMargin:'200px'}):null;
  studio.root.addEventListener('account-changed',()=>{this.accountEpoch++;this.imageObserver?.disconnect();this.observedImages.clear();this.recorder.cancel();for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();this.imageLoads.clear();});
  studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-chat-audio]');if(b)this.play(b).catch(error=>{b.disabled=false;b.textContent=error.message;});const img=e.target.closest('[data-chat-image]');if(img)this.tryImage(img);});
 }
 mountImages(slot){
  for(const button of this.observedImages)if(!button.isConnected){this.imageObserver?.unobserve(button);this.observedImages.delete(button);}
  if(!slot)return;
  this.previews.mount(slot);
  for(const button of slot.querySelectorAll('[data-chat-image]:not([data-image-state])')){
   button.dataset.imageState='waiting';
   if(this.imageObserver){this.observedImages.add(button);this.imageObserver.observe(button);}else this.tryImage(button);
  }
 }
 tryImage(button){
  if(!button.isConnected||button.dataset.imageState==='loading'||button.hidden)return;
  this.imageObserver?.unobserve(button);this.observedImages.delete(button);button.dataset.imageState='loading';button.disabled=true;button.textContent='Carregando imagem…';
  this.loadImage(button).catch(error=>{if(!button.isConnected)return;button.dataset.imageState='error';button.disabled=false;button.textContent='Não foi possível carregar. Toque para tentar novamente.';button.title=error.message;});
 }
 async play(button){const path=button.dataset.chatAudio;button.disabled=true;button.textContent='Carregando áudio…';let url=this.urls.get(path);if(!url){const uid=this.studio.account.user?.id,response=await audioRequest(this.studio.account.client,path),blob=await response.blob();if(uid!==this.studio.account.user?.id||!button.isConnected)return;url=URL.createObjectURL(blob);this.urls.set(path,url);}const audio=button.parentElement.querySelector('audio');audio.src=url;audio.hidden=false;button.hidden=true;audio.play().catch(()=>{});}
 async loadImage(button){
  const path=button.dataset.chatImage,epoch=this.accountEpoch;let url=this.urls.get(path);
  if(!url){
   let pending=this.imageLoads.get(path);
   if(!pending){pending=(async()=>{const response=await audioRequest(this.studio.account.client,path),blob=await response.blob();if(epoch!==this.accountEpoch)throw Error('Conta alterada.');const objectUrl=URL.createObjectURL(blob);this.urls.set(path,objectUrl);return objectUrl;})();this.imageLoads.set(path,pending);pending.finally(()=>{if(this.imageLoads.get(path)===pending)this.imageLoads.delete(path);}).catch(()=>{});}
   url=await pending;
  }
  if(epoch!==this.accountEpoch||!button.isConnected)return;
  const img=button.parentElement.querySelector('img'),log=button.closest('[role=log]'),nearBottom=log&&log.scrollHeight-log.clientHeight-log.scrollTop<36;
  img.onload=()=>{if(nearBottom&&log.isConnected)log.scrollTop=log.scrollHeight;};
  img.onerror=()=>{if(this.urls.get(path)===url){this.urls.delete(path);URL.revokeObjectURL(url);}img.hidden=true;button.hidden=false;button.disabled=false;button.dataset.imageState='error';button.textContent='Não foi possível abrir a imagem.';};
  img.src=url;img.hidden=false;button.hidden=true;button.dataset.imageState='loaded';
 }

 async sendImage(scope,id,file,send){const uid=this.studio.account.user?.id,optimized=await optimizeImage(file,{maxSide:1800});if(optimized.size>6*1024*1024)throw Error('A imagem deve ter até 6 MB após otimização.');if(uid!==this.studio.account.user?.id)return;const path='/chat-image/'+scope+'/'+id+'/'+createUuid();await audioRequest(this.studio.account.client,path,{method:'PUT',body:optimized,headers:{'Content-Type':optimized.type}});try{if(uid!==this.studio.account.user?.id)throw Error('Conta alterada.');await send(imagePrefix+JSON.stringify({path}));}catch(error){audioRequest(this.studio.account.client,path,{method:'DELETE'}).catch(()=>{});throw error;}}
 async send(scope,id,send,button){
  if(!id)throw Error('Abra uma conversa antes de gravar.');
  const uid=this.studio.account.user?.id;
  const valid=()=>uid===this.studio.account.user?.id&&(scope==='doc'?this.studio.chat.open&&this.studio.chat.documentId===id&&this.studio.chat.canComment:this.studio.social.open&&this.studio.social.active===id);
  await this.recorder.start(button,async(file,stillValid)=>{
   const path='/chat-audio/'+scope+'/'+id+'/'+createUuid();let uploaded=false;
   try{if(!stillValid())return;await audioRequest(this.studio.account.client,path,{method:'PUT',body:file,headers:{'Content-Type':file.type}});uploaded=true;if(!stillValid()){audioRequest(this.studio.account.client,path,{method:'DELETE'}).catch(()=>{});return;}await send(prefix+JSON.stringify({path,seconds:file.recordedSeconds||0}));}
   catch(error){if(uploaded)audioRequest(this.studio.account.client,path,{method:'DELETE'}).catch(()=>{});throw error;}
  },valid);
 }
}
