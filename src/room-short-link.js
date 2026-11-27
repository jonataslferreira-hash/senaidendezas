import {createUuid} from './uuid.js';

// Não enviar endereços de desenvolvimento, convites privados ou URLs arbitrárias ao serviço.
export function isPublicRoomLink(value){
 try{
  const url=new URL(value),keys=[...url.searchParams.keys()];
  return url.protocol==='https:'&&url.hostname==='jonataslferreira-hash.github.io'&&!url.port&&!url.username&&!url.password&&
   /^\/senaidendezas\/(?:index\.html)?$/.test(url.pathname)&&!url.hash&&keys.length===1&&keys[0]==='s'&&/^\d{6}$/.test(url.searchParams.get('s')||'');
 }catch{return false;}
}
export function validShortRoomLink(value){
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='is.gd'&&!url.port&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/[A-Za-z0-9_]{5,30}$/.test(url.pathname)?url.href:null;}catch{return null;}
}

// O is.gd oferece JSONP. O código de terceiros roda apenas num iframe sandbox
// de origem opaca, sem acesso ao DOM, localStorage ou credenciais do aplicativo.
const frameSource=`<!doctype html><meta name="referrer" content="no-referrer"><script>
addEventListener('message',function onMessage(event){
 if(event.source!==parent||!event.data||event.data.kind!=='room-link-request')return;
 removeEventListener('message',onMessage);
 const nonce=event.data.nonce;
 window.roomShortResult=function(data){parent.postMessage({kind:'room-link-result',nonce:nonce,result:data},'*');};
 const script=document.createElement('script');script.referrerPolicy='no-referrer';
 script.src='https://is.gd/create.php?format=json&callback=roomShortResult&url='+encodeURIComponent(event.data.url);
 script.onerror=function(){parent.postMessage({kind:'room-link-result',nonce:nonce,result:null},'*');};
 document.head.appendChild(script);
});
<\/script>`;

export function shortenRoomLink(url,{timeout=8000}={}){
 if(!isPublicRoomLink(url))return Promise.resolve(null);
 return new Promise(resolve=>{
  const nonce=createUuid(),frame=document.createElement('iframe');let done=false,timer;
  frame.hidden=true;frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('title','Gerar link curto');frame.srcdoc=frameSource;
  const finish=result=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();resolve(result);};
  const receive=event=>{if(event.source!==frame.contentWindow||event.origin!=='null'||event.data?.kind!=='room-link-result'||event.data?.nonce!==nonce)return;finish(validShortRoomLink(event.data.result?.shorturl));};
  window.addEventListener('message',receive);
  frame.addEventListener('load',()=>frame.contentWindow?.postMessage({kind:'room-link-request',nonce,url},'*'),{once:true});
  timer=setTimeout(()=>finish(null),timeout);
  document.body.append(frame);
 });
}
