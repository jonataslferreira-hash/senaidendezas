import {studioIcon} from './studio-icons.js';

// O gravador vive no formulário do chat; a conversa pode atualizar sem perder
// a gravação ou o áudio de prévia. Trocar de conversa libera o microfone.
export class ChatRecorder {
 constructor(root){
  this.root=root;this.current=null;
  root.addEventListener('click',event=>{
   const button=event.target.closest('[data-voice-control]');if(!button||!this.current||!this.current.panel.contains(button))return;
   const action=button.dataset.voiceControl;
   if(action==='cancel')this.cancel();
   if(action==='stop')this.stop();
   if(action==='send')this.send();
  });
 }
 async start(button,send,valid){
  if(this.current)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Este navegador não oferece gravação. Abra o site por HTTPS e permita o microfone.');
  const panel=button.closest('form')?.querySelector('[data-chat-recorder]');if(!panel)return;
  const state={panel,button,send,valid,stream:null,recorder:null,chunks:[],bytes:0,url:'',file:null,done:false};this.current=state;
  panel.hidden=false;panel.innerHTML=`<div class="chat-recorder-head"><span class="chat-recorder-dot"></span><strong data-voice-status>Preparando microfone…</strong><button type="button" data-voice-control="cancel" aria-label="Cancelar gravação">×</button></div>`;
  state.observer=new MutationObserver(()=>{if(!panel.isConnected||!valid())this.cancel();});state.observer.observe(this.root,{childList:true,subtree:true});
  let stream;
  try {stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});}
  catch {if(this.current===state)this.showError(state,'Não foi possível abrir o microfone. Verifique a permissão do navegador.');return;}
  if(this.current!==state||!panel.isConnected||!valid()){stream.getTracks().forEach(track=>track.stop());if(this.current===state)this.cancel();return;}
  state.stream=stream;
  const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
  try{state.recorder=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:48000}:{audioBitsPerSecond:48000});}
  catch{this.releaseStream(state);this.showError(state,'Não foi possível iniciar a gravação.');return;}
  const recorder=state.recorder;
  recorder.ondataavailable=event=>{if(this.current!==state||!event.data.size)return;state.chunks.push(event.data);state.bytes+=event.data.size;if(state.bytes>6*1024*1024&&recorder.state==='recording'){state.tooLarge=true;this.stop();}};
  recorder.onerror=()=>{if(this.current===state){this.releaseStream(state);this.showError(state,'Não foi possível gravar o áudio.');}};
  recorder.onstop=()=>this.finishRecording(state);
  panel.innerHTML=`<div class="chat-recorder-head"><span class="chat-recorder-dot"></span><strong>Gravando</strong><output data-voice-time>0:00</output><button type="button" data-voice-control="cancel" aria-label="Cancelar gravação">×</button></div><div class="chat-recorder-wave" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--bar:${i%6}"></i>`).join('')}</div><div class="chat-recorder-actions"><button type="button" data-voice-control="cancel">Cancelar</button><button type="button" class="studio-btn accent" data-voice-control="stop">■ Parar</button></div>`;
  try{state.started=Date.now();recorder.start(500);}catch{this.releaseStream(state);this.showError(state,'Não foi possível iniciar a gravação.');return;}
  state.timer=setInterval(()=>{if(this.current!==state)return;const seconds=Math.min(120,Math.floor((Date.now()-state.started)/1000)),output=panel.querySelector('[data-voice-time]');if(output)output.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');if(seconds>=120)this.stop();},250);
 }
 stop(){const state=this.current;if(!state||state.recorder?.state!=='recording')return;state.seconds=Math.min(120,(Date.now()-state.started)/1000);state.recorder.stop();}
 finishRecording(state){
  clearInterval(state.timer);this.releaseStream(state);if(this.current!==state||state.failed)return;
  if(state.tooLarge){this.showError(state,'O áudio ultrapassou 6 MB. Grave uma mensagem mais curta.');return;}
  const type=(state.recorder.mimeType||state.chunks[0]?.type||'').split(';')[0];
  if(!state.bytes||!['audio/webm','audio/ogg','audio/mp4'].includes(type)){this.showError(state,'Não foi possível preparar este áudio. Tente gravar novamente.');return;}
  const ext=type==='audio/mp4'?'m4a':type==='audio/ogg'?'ogg':'webm';state.file=new File(state.chunks,'Gravação-'+Date.now()+'.'+ext,{type});state.file.recordedSeconds=state.seconds??Math.min(120,(Date.now()-state.started)/1000);state.url=URL.createObjectURL(state.file);
  state.panel.innerHTML=`<div class="chat-recorder-head"><span class="chat-recorder-ready">✓</span><strong>Áudio pronto</strong><button type="button" data-voice-control="cancel" aria-label="Descartar gravação">×</button></div><audio controls preload="metadata" aria-label="Ouvir gravação"></audio><p class="chat-recorder-error" role="status" hidden></p><div class="chat-recorder-actions"><button type="button" data-voice-control="cancel">Descartar</button><button type="button" class="studio-btn accent" data-voice-control="send">${studioIcon('send')} Enviar áudio</button></div>`;
  state.panel.querySelector('audio').src=state.url;
 }
 async send(){
  const state=this.current;if(!state?.file||state.sending)return;
  if(!state.valid()){this.cancel();return;}
  state.sending=true;const send=state.panel.querySelector('[data-voice-control="send"]'),error=state.panel.querySelector('.chat-recorder-error');send.disabled=true;send.textContent='Enviando…';error.hidden=true;
  try{await state.send(state.file,()=>this.current===state&&state.valid());if(this.current===state)this.cancel();}
  catch(err){if(this.current!==state)return;state.sending=false;send.disabled=false;send.innerHTML=studioIcon('send')+' Enviar áudio';error.textContent=err.message||'Não foi possível enviar. Tente novamente.';error.hidden=false;}
 }
 showError(state,message){
  if(this.current!==state)return;state.failed=true;clearInterval(state.timer);if(state.recorder&&state.recorder.state!=='inactive'){try{state.recorder.stop();}catch{}}this.releaseStream(state);
  state.panel.innerHTML=`<div class="chat-recorder-head"><strong>Gravação indisponível</strong><button type="button" data-voice-control="cancel" aria-label="Fechar gravação">×</button></div><p class="chat-recorder-error" role="status"></p><div class="chat-recorder-actions"><button type="button" data-voice-control="cancel">Fechar</button></div>`;
  state.panel.querySelector('.chat-recorder-error').textContent=message;
 }
 releaseStream(state){state.stream?.getTracks().forEach(track=>track.stop());state.stream=null;}
 cancel(){
  const state=this.current;if(!state)return;this.current=null;clearInterval(state.timer);state.observer?.disconnect();
  if(state.recorder&&state.recorder.state!=='inactive'){try{state.recorder.stop();}catch{}}
  this.releaseStream(state);if(state.url)URL.revokeObjectURL(state.url);state.panel.innerHTML='';state.panel.hidden=true;
 }
}
