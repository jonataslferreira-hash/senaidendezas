import { createUuid } from './uuid.js';
import {r2ApiUrl} from './cloud-files.js';
import {recordAudio} from './record-audio.js';
const prefix='[storage-lab-audio]';
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
  const pretty=yt?'Vídeo no YouTube':segs.length?decodeURIComponent(segs[segs.length-1]).replace(/[-_]+/g,' ').trim():'';
  const art=yt
    ?`<span class="chat-link-thumb"><img src="https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg" alt="" loading="lazy"></span>`
    :`<span class="chat-link-favicon"><img src="https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></span>`;
  return `<a class="chat-link-card" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${art}<span class="chat-link-copy">${pretty?`<strong>${esc(pretty.slice(0,90))}</strong>`:''}<small>${esc(host)}</small><em>Abrir link ↗</em></span></a>`;
}
export function chatMessageBody(body,scope,id){const voice=parseVoice(body,scope,id);if(voice)return `<div class="voice-message"><button type="button" data-chat-audio="${esc(voice.path)}">▶ Ouvir áudio · ${Math.floor(voice.seconds/60)}:${String(Math.floor(voice.seconds%60)).padStart(2,'0')}</button><audio controls hidden preload="none"></audio></div>`;
  const text=String(body??''),parts=text.split(/(https?:\/\/[^\s<>"]+)/);
  if(parts.length>1)return `<p>${parts.map((part,i)=>i%2?chatLinkCard(part):esc(part)).join('')}</p>`;
  return `<p>${esc(text)}</p>`;}
export function chatDate(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';}
async function audioRequest(client,path,options={}){const {data}=await client.auth.getSession();if(!data.session)throw Error('Entre novamente na sua conta.');const response=await fetch(r2ApiUrl+path,{...options,headers:{...options.headers,Authorization:'Bearer '+data.session.access_token}});if(!response.ok){if(response.status===404||response.status===503)throw Error('O áudio do chat precisa da atualização voice-chat.sql e do Worker versão 5.');if(response.status===403)throw Error('Você não tem permissão para esse áudio.');throw Error('Não foi possível acessar o áudio. Confira a conexão.');}return response;}
export class ChatAudio{
 constructor(studio){this.studio=studio;this.urls=new Map();studio.root.addEventListener('account-changed',()=>{for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();});studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-chat-audio]');if(b)this.play(b).catch(error=>{b.disabled=false;b.textContent=error.message;});});}
 async play(button){const path=button.dataset.chatAudio;button.disabled=true;button.textContent='Carregando áudio…';let url=this.urls.get(path);if(!url){const uid=this.studio.account.user?.id,response=await audioRequest(this.studio.account.client,path),blob=await response.blob();if(uid!==this.studio.account.user?.id||!button.isConnected)return;url=URL.createObjectURL(blob);this.urls.set(path,url);}const audio=button.parentElement.querySelector('audio');audio.src=url;audio.hidden=false;button.hidden=true;audio.play().catch(()=>{});}
 async send(scope,id,send){if(!id)throw Error('Abra uma conversa antes de gravar.');const uid=this.studio.account.user?.id,file=await recordAudio({title:'Mensagem de voz',confirm:'Enviar áudio'});if(!file||uid!==this.studio.account.user?.id)return;const path='/chat-audio/'+scope+'/'+id+'/'+createUuid();await audioRequest(this.studio.account.client,path,{method:'PUT',body:file,headers:{'Content-Type':file.type}});if(uid!==this.studio.account.user?.id)return;try{await send(prefix+JSON.stringify({path,seconds:file.recordedSeconds||0}));}catch(error){audioRequest(this.studio.account.client,path,{method:'DELETE'}).catch(()=>{});throw error;}}
}
