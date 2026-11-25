import { createUuid } from './uuid.js';
import {r2ApiUrl} from './cloud-files.js';
import {ChatRecorder} from './chat-recorder.js';
import {optimizeImage} from './image-optimize.js';
import {studioIcon} from './studio-icons.js';
const prefix='[storage-lab-audio]';
const imagePrefix='[storage-lab-image]';
export function parseChatImage(body,scope,id){if(!body?.startsWith(imagePrefix))return null;try{const data=JSON.parse(body.slice(imagePrefix.length));return new RegExp('^/chat-image/'+scope+'/'+id+'/[a-f0-9-]{36}$','i').test(data.path)?data:null;}catch{return null;}}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseVoice(body,scope,id){if(!body?.startsWith(prefix))return null;try{const data=JSON.parse(body.slice(prefix.length));return new RegExp('^/chat-audio/'+scope+'/'+id+'/[a-f0-9-]{36}$','i').test(data.path)&&Number.isFinite(data.seconds)&&data.seconds>=0&&data.seconds<=130?data:null;}catch{return null;}}
// Links no chat viram cards clicáveis. A prévia usa apenas recursos que
// carregam como imagem (sem CORS): capa do YouTube e favicon do domínio.
function chatLinkCard(url){
  let u=null;try{u=new URL(url)}catch{}
  if(!u)return esc(url);
  const host=u.hostname.replace(/^www\./,'');
  const yt=url.match(/(?:youtube\.com\/(?:watch\?[^#\s]*v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  const segs=u.pathname.split('/').filter(Boolean);
  let segment=segs.at(-1)||'';try{segment=decodeURIComponent(segment)}catch{}
  const pretty=yt?'Vídeo no YouTube':segment.replace(/[-_]+/g,' ').trim()||host;
  const art=yt
    ?`<span class="chat-link-thumb"><img src="https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg" alt="" loading="lazy"></span>`
    :`<span class="chat-link-favicon" aria-hidden="true">↗</span>`;
  return `<a class="chat-link-card" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${art}<span class="chat-link-copy">${pretty?`<strong>${esc(pretty.slice(0,90))}</strong>`:''}<small>${esc(host)}</small><em>Abrir link ↗</em></span></a>`;
}
export function chatMessageBody(body,scope,id){const image=parseChatImage(body,scope,id);if(image)return `<div class="chat-image-message"><button type="button" data-chat-image="${esc(image.path)}">${studioIcon('image')} Ver imagem</button><img hidden alt="Imagem enviada na conversa" loading="lazy"></div>`;const voice=parseVoice(body,scope,id);if(voice)return `<div class="voice-message"><button type="button" data-chat-audio="${esc(voice.path)}">▶ Ouvir áudio · ${Math.floor(voice.seconds/60)}:${String(Math.floor(voice.seconds%60)).padStart(2,'0')}</button><audio controls hidden preload="none"></audio></div>`;
  const text=String(body??''),parts=text.split(/(https?:\/\/[^\s<>"]+)/);
  if(parts.length>1)return `<div class="chat-link-message">${parts.map((part,i)=>{if(!(i%2))return esc(part);const match=part.match(/^(.*?)([.,!?;:]+)$/);return chatLinkCard(match?match[1]:part)+(match?esc(match[2]):'');}).join('')}</div>`;
  return `<p>${esc(text)}</p>`;}
export function chatDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';}
async function audioRequest(client,path,options={}){const {data}=await client.auth.getSession();if(!data.session)throw Error('Entre novamente na sua conta.');let response;try{response=await fetch(r2ApiUrl+path,{...options,headers:{...options.headers,Authorization:'Bearer '+data.session.access_token}});}catch{throw Error('Não foi possível conectar ao serviço do chat. Verifique sua conexão.');}if(!response.ok){if(response.status===404||response.status===503)throw Error('Este anexo precisa da atualização do Worker e do chat no servidor.');if(response.status===403)throw Error('Você não tem permissão para esse áudio.');throw Error('Não foi possível acessar o áudio. Confira a conexão.');}return response;}
export class ChatAudio{
 constructor(studio){this.studio=studio;this.urls=new Map();this.recorder=new ChatRecorder(studio.root);studio.root.addEventListener('account-changed',()=>{this.recorder.cancel();for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();});studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-chat-audio]');if(b)this.play(b).catch(error=>{b.disabled=false;b.textContent=error.message;});const img=e.target.closest('[data-chat-image]');if(img)this.loadImage(img).catch(error=>{img.disabled=false;img.textContent=error.message;});});}
 async play(button){const path=button.dataset.chatAudio;button.disabled=true;button.textContent='Carregando áudio…';let url=this.urls.get(path);if(!url){const uid=this.studio.account.user?.id,response=await audioRequest(this.studio.account.client,path),blob=await response.blob();if(uid!==this.studio.account.user?.id||!button.isConnected)return;url=URL.createObjectURL(blob);this.urls.set(path,url);}const audio=button.parentElement.querySelector('audio');audio.src=url;audio.hidden=false;button.hidden=true;audio.play().catch(()=>{});}
 async loadImage(button){const path=button.dataset.chatImage;button.disabled=true;button.textContent='Carregando imagem…';let url=this.urls.get(path);if(!url){const uid=this.studio.account.user?.id,response=await audioRequest(this.studio.account.client,path),blob=await response.blob();if(uid!==this.studio.account.user?.id||!button.isConnected)return;url=URL.createObjectURL(blob);this.urls.set(path,url);}const img=button.parentElement.querySelector('img');img.src=url;img.hidden=false;button.hidden=true;}
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
