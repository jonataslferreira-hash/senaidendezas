import { createUuid } from './uuid.js';
import {mp3Duration} from './audio-duration.js';
import { editorTracks,musicCover,spotifyItem } from './editor-playlist.js';
import { storePages,getPageImage,removePageAssets } from './assets.js';
import { studioIcon } from './studio-icons.js';
import { spotifyMetadata } from './spotify.js';
import { AUDIO_ACCEPT, isSupportedAudioFile } from './audio-data.js';
import { applyEditorPlayback } from './editor-audio.js';
import { nextEditorTrack } from './editor-playback-order.js';
import './editor-music.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=value=>Number.isFinite(value)?Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0'):'—:—';
const readFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Não foi possível ler o arquivo.'));r.readAsDataURL(file);});
function musicIcon(name){const shapes={play:'<path d="m9 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',previous:'<path d="M5 5v14m14-14L8 12l11 7z"/>',next:'<path d="M19 5v14M5 5l11 7-11 7z"/>',shuffle:'<path d="M3 7h3l12 10h3m-4-4 4 4-4 4M3 17h3l4-4m4-2 4-4h3m-4-4 4 4-4 4"/>',repeat:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>'};return `<svg viewBox="0 0 24 24" width="18" height="18" fill="${name==='play'?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;}
let spotifyApi;
function loadSpotify(){return spotifyApi ||= new Promise((resolve,reject)=>{window.onSpotifyIframeApiReady=resolve;const script=document.createElement('script');script.src='https://open.spotify.com/embed/iframe-api/v1';script.onerror=()=>{spotifyApi=null;reject(Error('Não foi possível abrir o Spotify.'));};document.head.append(script);});}
export class EditorMusic {
  constructor(studio){
    this.studio=studio;this.audio=new Audio();this.audio.hidden=true;this.audio.dataset.editorSoundtrack='';document.body.append(this.audio);this.audio.preload='metadata';this.rate=.85;applyEditorPlayback(this.audio,{volume:.35,rate:.85});this.index=0;this.editing=false;this.playing=false;this.wantsPlay=false;this.open=false;this.spotifyFormOpen=false;this.position=0;this.duration=NaN;this.message='';this.selection=0;this.spotifyGeneration=0;
    try{const items=JSON.parse(localStorage.getItem('sl-editor-music')||'[]');this.custom=Array.isArray(items)?items.filter(t=>t&&typeof t.id==='string'&&(t.assetId||spotifyItem(t.url))).slice(0,25):[];}catch{this.custom=[];}
    this.shuffle=true;this.repeat='all';try{const shuffle=localStorage.getItem('sl-music-shuffle'),repeat=localStorage.getItem('sl-music-repeat');if(shuffle==='true'||shuffle==='false')this.shuffle=shuffle==='true';if(['off','all','one'].includes(repeat))this.repeat=repeat;}catch{}this.queue=[];this.history=[];this.played=[];
    this.index=this.shuffle?this.randomAudioIndex():0;
    try{this.covers=JSON.parse(localStorage.getItem('sl-editor-music-covers')||'{}');for(const track of editorTracks)if(this.covers[track.id])Object.assign(track,this.covers[track.id]);}catch{this.covers={};}
    for(const track of editorTracks)this.coverColor(track);
    const root=studio.root;
    // Clicar fora ou apertar Esc fecha o painel de músicas.
    document.addEventListener('pointerdown',e=>{if(this.open&&!e.target.closest?.('.editor-music,.music-panel')){this.open=false;this.paint();}});
    document.addEventListener('keydown',e=>{if(this.open&&e.key==='Escape'){this.open=false;this.paint();}});
    addEventListener('resize',()=>{if(this.open)this.mountPanel();});
    root.addEventListener('click',e=>{const bar=e.target.closest('[data-music-seek]');if(!bar||this.track.kind==='spotify'||!(this.audio.duration>0))return;const box=bar.getBoundingClientRect();this.audio.currentTime=Math.max(0,Math.min(1,(e.clientX-box.left)/box.width))*this.audio.duration;});
    root.addEventListener('click',e=>{const b=e.target.closest('[data-music-action]');if(b)this.action(b.dataset.musicAction,b).catch(error=>{this.message=error.message;this.paint();});});
    root.addEventListener('change',e=>{
      if(e.target.matches('[data-music-upload]'))this.upload(e.target.files[0]).catch(error=>{this.message=error.message;this.paint();});
      if(e.target.matches('[data-music-rate]')){this.rate=Number(e.target.value);applyEditorPlayback(this.audio,{volume:this.volume??this.audio.volume,rate:this.rate});}
    });
    root.addEventListener('input',e=>{
      if(!e.target.matches('[data-music-volume]'))return;
      this.volume=this.audio.volume=Math.max(0,Math.min(1,Number(e.target.value)));
      e.target.style.setProperty('--music-volume',Math.round(this.volume*100)+'%');
      const output=root.querySelector('[data-music-volume-value]');
      if(output)output.textContent=Math.round(this.volume*100)+'%';
    });
    this.audio.addEventListener('timeupdate',()=>{this.position=this.audio.currentTime;if(Number.isFinite(this.audio.duration)&&this.audio.duration>0)this.duration=this.audio.duration;this.updateProgress();});
    const duration=()=>{if(Number.isFinite(this.audio.duration)&&this.audio.duration>0)this.duration=this.audio.duration;this.updateProgress();};this.audio.addEventListener('loadedmetadata',duration);this.audio.addEventListener('durationchange',duration);this.audio.addEventListener('canplay',duration);
    this.audio.addEventListener('play',()=>{
      if(!this.wantsPlay||this.track.kind==='spotify'){this.audio.pause();return;}
      this.playing=!this.audio.paused;this.updateProgress();
    });
    this.audio.addEventListener('pause',()=>{if(this.track.kind!=='spotify'){this.playing=!this.audio.paused;this.updateProgress();}});
    this.audio.addEventListener('ended',()=>{if(!this.editing||!this.wantsPlay)return;const next=nextEditorTrack(this.tracks,this.index,{shuffle:this.shuffle,repeat:this.repeat,played:this.played});this.played=next.played;if(next.index===null){this.wantsPlay=false;this.playing=false;this.updateProgress();return;}this.select(next.index,true).catch(e=>{this.message=e.message;this.paint();});});
    this.audio.addEventListener('error',()=>{if(this.track.kind==='spotify'||!this.audio.error)return;this.playing=false;this.wantsPlay=false;this.loadedSelection=null;this.message='Não foi possível carregar esta música externa. Confira a conexão, tente novamente ou envie um arquivo.';this.paint();});
  }
  // Reduz e restaura suavemente o áudio local sem alterar a preferência do usuário.
  setSuspense(active){
    if(this.suspense===active)return;
    this.suspense=active;
    if(this.track.kind==='spotify')return; // player em iframe não expõe volume ou filtro
    cancelAnimationFrame(this.suspenseFrame);
    const start=this.audio.volume, target=(this.volume??.35)*(active?.24:1),begin=performance.now(),duration=650;
    const tick=now=>{const t=Math.min(1,(now-begin)/duration),ease=t*t*(3-2*t);this.audio.volume=Math.max(0,Math.min(1,start+(target-start)*ease));if(t<1)this.suspenseFrame=requestAnimationFrame(tick);};
    this.suspenseFrame=requestAnimationFrame(tick);
  }
  nextIndex(){if(!this.shuffle)return (this.index+1)%this.tracks.length;this.queue=this.queue.filter(i=>i<this.tracks.length&&i!==this.index);if(!this.queue.length){this.queue=this.tracks.map((_,i)=>i).filter(i=>i!==this.index);for(let i=this.queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.queue[i],this.queue[j]]=[this.queue[j],this.queue[i]];}}return this.queue.pop()??this.index;}
  get tracks(){return [...editorTracks,...this.custom];}get track(){return this.tracks[this.index]||this.tracks[0];}
  randomAudioIndex(){
    const indices=this.tracks.flatMap((track,index)=>track.kind==='spotify'?[]:[index]);
    const choices=indices.length>1?indices.filter(index=>index!==this.index):indices;
    return choices[Math.floor(Math.random()*choices.length)]??0;
  }
  headerMarkup(){return `<div data-editor-music>${this.markup()}</div>`;}
  markup(){const t=this.track,vol=Math.round(this.audio.volume*100);return `<div class="editor-music" data-playing="${this.playing}" style="--record-color:${esc(t.color||'#a59acb')}"><button type="button" class="music-cover-button" data-music-action="open" aria-label="Abrir músicas do editor"><span class="music-record"></span><img src="${esc(musicCover(t))}" alt="Capa de ${esc(t.title)}"></button><button type="button" class="music-info" data-music-action="open"><strong>${esc(t.title)}</strong><span>${esc(t.artist||'')} <small data-music-time>${time(this.position)} / ${time(this.duration)}</small></span>${this.message?`<small class="music-header-status" role="status">${esc(this.message)}</small>`:''}</button><div class="music-controls"><button type="button" data-music-action="previous" aria-label="Música anterior">${musicIcon('previous')}</button><button type="button" data-music-action="toggle" data-music-play aria-label="${this.playing?'Pausar música':'Tocar música'}">${musicIcon(this.playing?'pause':'play')}</button><button type="button" data-music-action="next" aria-label="Próxima música">${musicIcon('next')}</button></div>${this.open?`<section class="music-panel music-panel-v3" popover="manual" aria-label="Músicas do editor">
      <header class="mp3-head">
        <strong>Músicas do editor</strong>
        <button type="button" class="mp3-close" data-music-action="open" aria-label="Fechar músicas">×</button>
      </header>
      <div class="mp3-now">
        <div class="mp3-now-top">
          <img class="mp3-cover" src="${esc(musicCover(t))}" alt="">
          <div class="mp3-meta">
            <small>Tocando agora</small>
            <strong>${esc(t.title)}</strong>
            <span>${esc(t.artist||'')}</span>
          </div>
          <div class="mp3-transport">
            <button type="button" class="mp3-tbtn" data-music-action="previous" aria-label="Música anterior">${musicIcon('previous')}</button>
            <button type="button" class="mp3-tbtn mp3-play" data-music-action="toggle" data-music-play aria-label="${this.playing?'Pausar música':'Tocar música'}">${musicIcon(this.playing?'pause':'play')}</button>
            <button type="button" class="mp3-tbtn" data-music-action="next" aria-label="Próxima música">${musicIcon('next')}</button>
          </div>
        </div>
        <div class="mp3-progress">
          <span data-music-position>${time(this.position)}</span>
          <div class="mp3-bar" data-music-seek title="Clique para pular"><i data-music-bar></i></div>
          <span data-music-duration>${time(this.duration)}</span>
        </div>
      </div>
      <div class="mp3-playback-modes" role="group" aria-label="Modo de reprodução">
        <button type="button" data-music-action="shuffle" aria-label="Reprodução aleatória" aria-pressed="${this.shuffle}" ${t.kind==='spotify'?'disabled':''}>${musicIcon('shuffle')}<span>Aleatório <strong>${this.shuffle?'ligado':'desligado'}</strong></span></button>
        <button type="button" data-music-action="repeat" ${t.kind==='spotify'?'disabled':''} aria-label="${this.repeat==='one'?'Repetição: música':this.repeat==='all'?'Repetição: playlist':'Repetição: desligada'}">${musicIcon('repeat')}<span>Repetir <strong>${this.repeat==='one'?'música':this.repeat==='all'?'playlist':'desligado'}</strong></span></button>
      </div>
      <div class="mp3-controls">
        <label class="mp3-vol" title="Volume">
          ${studioIcon('volume')}
          <input aria-label="Volume" type="range" min="0" max="1" step=".01" value="${this.audio.volume}" style="--music-volume:${vol}%" data-music-volume ${t.kind==='spotify'?'disabled':''}>
          <output data-music-volume-value>${vol}%</output>
        </label>
        <label class="mp3-speed" title="Velocidade">
          ${studioIcon('speed')}
          <select aria-label="Velocidade" data-music-rate ${t.kind==='spotify'?'disabled':''}>${[.75,.85,1].map(n=>`<option value="${n}" ${this.audio.playbackRate===n?'selected':''}>${n.toFixed(2).replace('.',',')}×</option>`).join('')}</select>
        </label>
      </div>
      ${t.kind==='spotify'?'<p class="mp3-hint">No Spotify, repetição, aleatório, volume e avanço da playlist são controlados pelo próprio Spotify.</p>':''}
      <div class="mp3-actions">
        <button type="button" class="mp3-act-btn" data-music-action="spotify-form" aria-expanded="${this.spotifyFormOpen}">${studioIcon('spotify')}<span>Adicionar do Spotify</span></button>
        <label class="mp3-act-btn">${studioIcon('upload')}<span>Enviar música</span><input type="file" accept="${AUDIO_ACCEPT}" data-music-upload hidden></label>
      </div>
      <div class="mp3-spotify" ${this.spotifyFormOpen?'':'hidden'}>
        <label for="music-spotify">Link de música, playlist ou álbum do Spotify</label>
        <div class="mp3-spotify-row"><input id="music-spotify" type="url" placeholder="https://open.spotify.com/playlist/…"><button type="button" data-music-action="spotify">Adicionar</button></div>
      </div>
      <div class="mp3-list-head"><h3>Sua lista</h3><small>${this.tracks.length} ${this.tracks.length===1?'faixa':'faixas'}</small></div>
      <div class="mp3-tracks">${this.tracks.map((track,i)=>{const kind=track.kind==='spotify'?(spotifyItem(track.url)?.type==='playlist'?'Playlist':spotifyItem(track.url)?.type==='album'?'Álbum':'Spotify'):track.assetId?'Enviada':'';return `<div class="mp3-track${i===this.index?' selected':''}"><button type="button" class="mp3-track-pick" data-music-action="select" data-track="${i}"><img src="${esc(musicCover(track))}" alt=""><span class="mp3-track-copy"><strong>${esc(track.title)}</strong><small>${esc(track.artist||'')}</small></span>${kind?`<em class="mp3-tag">${kind}</em>`:''}${i===this.index?'<b class="music-eq" aria-hidden="true"><i></i><i></i><i></i></b>':''}</button>${track.assetId||track.kind==='spotify'?`<button type="button" class="mp3-track-del" data-music-action="remove" data-track="${i}" aria-label="Remover ${esc(track.title)}">×</button>`:''}</div>`;}).join('')}</div>
      ${this.message?`<p class="mp3-msg" role="status">${esc(this.message)}</p>`:''}
    </section>`:''}</div>`;}
  paint(){const slot=this.studio.root.querySelector('[data-editor-music]');if(slot)slot.innerHTML=this.markup();this.mountPanel();this.updateProgress();}
  // O painel abre logo abaixo do player, alinhado a ele, e sempre inteiro dentro da tela.
  mountPanel(){
    const panel=this.studio.root.querySelector('.music-panel');if(!panel)return;
    if(!panel.matches(':popover-open'))try{panel.showPopover();}catch{}
    const anchorEl=this.studio.root.querySelector('.editor-music');
    const anchor=anchorEl?.getBoundingClientRect();
    if(!anchor||(!anchor.width&&!anchor.height)){
      requestAnimationFrame(()=>{if(this.open&&panel.isConnected)this.mountPanel();});
      return;
    }
    const gap=10,edge=10;
    const width=Math.min(430,innerWidth-edge*2);
    const left=Math.max(edge,Math.min(anchor.right-width,innerWidth-width-edge));
    const below=innerHeight-anchor.bottom-gap-edge;
    const top=below>=260?anchor.bottom+gap:Math.max(edge,innerHeight-Math.min(560,innerHeight-edge*2)-edge);
    panel.style.left=Math.round(left)+'px';
    panel.style.top=Math.round(top)+'px';
    panel.style.right='auto';
    panel.style.bottom='auto';
    panel.style.width=Math.round(width)+'px';
    panel.style.maxHeight=Math.round(Math.min(600,innerHeight-top-edge))+'px';
  }
  updateProgress(){this.mountPanel();const label=time(this.position)+' / '+time(this.duration);const bar=this.studio.root.querySelector('[data-music-bar]');if(bar){bar.style.width=(this.duration>0?Math.min(100,this.position/this.duration*100):0)+'%';const a=this.studio.root.querySelector('[data-music-position]'),b=this.studio.root.querySelector('[data-music-duration]');if(a)a.textContent=time(this.position);if(b)b.textContent=time(this.duration);}for(const el of this.studio.root.querySelectorAll('[data-music-time]'))if(el.textContent!==label)el.textContent=label;const shell=this.studio.root.querySelector('.editor-music');if(shell)shell.dataset.playing=String(this.playing);for(const button of this.studio.root.querySelectorAll('[data-music-play]')){const icon=this.playing?'pause':'play';if(button.dataset.musicIcon===icon)continue;/* Trocar o SVG a cada timeupdate cancelava o clique em andamento. */button.dataset.musicIcon=icon;button.innerHTML=musicIcon(icon);button.setAttribute('aria-label',this.playing?'Pausar música':'Tocar música');}}
  setEditing(value){const entering=value&&!this.editing;this.editing=value;if(!value){this.wantsPlay=false;this.audio.pause();this.selection++;this.stopSpotify();}else if(entering){this.played=[];this.select(this.shuffle?this.randomAudioIndex():this.index,true).catch(()=>{});}}
  async select(index,play=true){
    if(index!==this.index&&!this.rewinding){this.history.push(this.index);if(this.history.length>50)this.history.shift();}
    const selection=++this.selection;this.stopSpotify();this.spotifyShouldPlay=play;this.wantsPlay=play;
    this.index=index;this.position=0;this.duration=NaN;this.message='';this.audio.pause();this.spotifyController?.pause();this.playing=false;const t=this.track;this.duration=Number(t.duration)||NaN;
    try{localStorage.setItem('sl-editor-music-active',t.id);}catch{}
    if(this.spotifyBox)this.spotifyBox.hidden=true;
    if(t.kind==='spotify'){this.paint();const controller=await this.openSpotify(t,selection);if(selection===this.selection&&play&&this.spotifyShouldPlay&&this.editing&&this.track===t){this.startSpotify(controller,selection);}return;}
    const url=t.assetId?await getPageImage(t.assetId):t.url;if(this.track!==t||selection!==this.selection||!this.editing)return;
    if(this.audio.src!==url||this.audio.error){this.audio.src=url;this.audio.load();}else this.audio.currentTime=0;this.loadedSelection=selection;
    applyEditorPlayback(this.audio,{volume:(this.volume??.35)*(this.suspense?.24:1),rate:this.rate||.85});this.paint();
    if(this.wantsPlay&&this.editing)await this.playFile(selection);
  }
  persist(){try{localStorage.setItem('sl-editor-music',JSON.stringify(this.custom));localStorage.setItem('sl-editor-music-covers',JSON.stringify(this.covers||{}));}catch{throw Error('Não foi possível guardar a playlist neste navegador.');}}
  async upload(file){
    if(!file)return;if(!isSupportedAudioFile(file)||file.size>50*1024*1024)throw Error('Escolha um áudio válido de até 50 MB.');
    if(this.custom.length>=25)throw Error('Remova uma faixa antes de adicionar outra.');const [assetId]=await storePages([await readFile(file)]);
    const duration=file.name.toLowerCase().endsWith('.mp3')?mp3Duration(new Uint8Array(await file.arrayBuffer())):NaN;
    const track={id:createUuid(),assetId,duration,title:file.name.replace(/\.[^.]+$/,''),artist:'Sua biblioteca',color:'#b09cc8'};
    this.custom.push(track);try{this.persist();}catch(e){this.custom.pop();await removePageAssets([assetId]);throw e;}await this.select(this.tracks.length-1,true);
  }
  async coverColor(track){
    try{const image=new Image();image.crossOrigin='anonymous';image.src=musicCover(track);await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d'),side=Math.min(image.naturalWidth,image.naturalHeight);ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,1,1);const data=ctx.getImageData(0,0,1,1).data;track.color='#'+[...data].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('');if(this.track===track)this.studio.root.querySelector('.editor-music')?.style.setProperty('--record-color',track.color);}catch{/* Retain the palette if an external cover blocks sampling. */}
  }
  async playFile(selection=this.selection){
    if(!this.wantsPlay||selection!==this.selection)return;
    try{await this.audio.play();if(selection===this.selection&&!this.wantsPlay){this.audio.pause();this.playing=false;this.updateProgress();}}
    catch(error){
      if(selection!==this.selection)return;
      this.wantsPlay=false;this.playing=false;
      if(error?.name==='NotAllowedError')this.message='O navegador bloqueou a reprodução automática. Toque em ▶ para ouvir.';
      else {this.loadedSelection=null;this.message='Não foi possível carregar esta música externa. Confira a conexão, tente novamente ou envie um arquivo.';}
      this.paint();
    }
  }
  stopSpotify(){
    this.spotifyGeneration=(this.spotifyGeneration||0)+1;
    this.spotifyCancel?.();this.spotifyCancel=null;this.spotifyLoading=null;
    const controller=this.spotifyController;this.spotifyController=null;
    clearTimeout(this.spotifyWaitTimer);controller?.pause();controller?.destroy?.();this.spotifyBox?.remove();this.spotifyBox=null;this.spotifyShouldPlay=false;this.spotifyPausePending=false;this.spotifyReady=false;this.spotifyStarted=false;this.spotifyPausedAt=0;this.spotifyResumeSeek=null;
  }
  startSpotify(controller,selection){
    if(!controller||selection!==this.selection||!this.editing||!this.spotifyShouldPlay)return;
    // Em navegadores que exigem interação, activateElement ajuda a desbloquear
    // o iframe; outros ainda podem exigir o botão do próprio Spotify.
    controller.activateElement?.();controller.play?.();
    clearTimeout(this.spotifyWaitTimer);
    this.spotifyWaitTimer=setTimeout(()=>{if(selection===this.selection&&this.spotifyShouldPlay&&!this.playing){this.message='O Spotify ainda não iniciou. Se o navegador bloquear, toque em play no player do Spotify.';if(this.spotifyBox)this.spotifyBox.hidden=false;this.paint();}},8000);
  }
  async openSpotify(track,selection=this.selection){
    if(this.spotifyLoading?.selection===selection)return this.spotifyLoading.promise;
    if(this.spotifyController)return this.spotifyController;
    const generation=++this.spotifyGeneration;
    const current=()=>this.editing&&selection===this.selection&&generation===this.spotifyGeneration&&this.track===track;
    const box=document.createElement('section');box.className='spotify-editor-player';document.body.append(box);this.spotifyBox=box;
    box.innerHTML='<button type="button" aria-label="Minimizar player Spotify">×</button><div data-spotify-host></div>';
    box.querySelector('button').onclick=()=>{box.hidden=true;};
    const promise=(async()=>{
      const api=await loadSpotify();if(!current())return null;
      return new Promise((resolve,reject)=>{
        let settled=false;const finish=value=>{if(settled)return;settled=true;resolve(value);};
        this.spotifyCancel=()=>finish(null);
        try{api.createController(box.querySelector('[data-spotify-host]'),{uri:'spotify:'+spotifyItem(track.url).type+':'+spotifyItem(track.url).id,width:'100%',height:spotifyItem(track.url).type==='track'?152:352},controller=>{
          if(!current()){controller.pause();controller.destroy?.();finish(null);return;}
          this.spotifyController=controller;
          controller.addListener('playback_update',event=>{
            if(!current()){if(!event.data.isPaused)controller.pause();return;}
            if(this.spotifyPausePending&&!event.data.isPaused){controller.pause();return;}
            if(event.data.isPaused){
              this.spotifyPausePending=false;
              if(this.playing)this.spotifyShouldPlay=false;
              if(event.data.position>0){
                this.spotifyStarted=true;
                this.spotifyPausedAt=event.data.position/1000;
              }
            }else{
              this.spotifyStarted=true;
              clearTimeout(this.spotifyWaitTimer);if(this.message){this.message='';this.studio.root.querySelector('.music-header-status')?.remove();this.studio.root.querySelector('.mp3-msg')?.remove();}
              this.spotifyShouldPlay=true;
              if(this.spotifyResumeSeek&&event.data.position<1200&&typeof controller.seek==='function'){
                const target=Math.floor(this.spotifyResumeSeek);
                this.spotifyResumeSeek=null;
                controller.seek(target);
              }else if(event.data.position>=1200){
                this.spotifyResumeSeek=null;
              }
            }
            this.playing=!event.data.isPaused;
            this.position=event.data.position/1000;this.duration=event.data.duration/1000;this.updateProgress();
          });
          controller.addListener('ready',()=>{if(!current()){controller.pause();controller.destroy?.();finish(null);return;}this.spotifyReady=true;finish(controller);});
        });}catch(error){reject(error);}
      });
    })();
    this.spotifyLoading={selection,promise};
    try{return await promise;}catch(error){if(current())throw error;return null;}
    finally{if(generation===this.spotifyGeneration){this.spotifyLoading=null;this.spotifyCancel=null;}}
  }
  async action(name,button){
        if(name==='open'){this.open=!this.open;if(this.open&&this.custom.some(t=>t.kind==='spotify'))loadSpotify().catch(()=>{});this.paint();return;}
    if(name==='shuffle'){this.shuffle=!this.shuffle;this.queue=[];this.played=[];try{localStorage.setItem('sl-music-shuffle',String(this.shuffle));}catch{}this.paint();return;}
    if(name==='repeat'){this.repeat=({off:'all',all:'one',one:'off'})[this.repeat]||'all';this.played=[];try{localStorage.setItem('sl-music-repeat',this.repeat);}catch{}this.paint();return;}
    if(name==='spotify-form'){
      this.spotifyFormOpen=!this.spotifyFormOpen;this.paint();
      if(this.spotifyFormOpen)this.studio.root.querySelector('#music-spotify')?.focus();
      return;
    }
    if(name==='toggle'){
      if(this.track.kind==='spotify'){
        const track=this.track,selection=this.selection;
        if(this.spotifyShouldPlay||this.playing){
          this.spotifyShouldPlay=false;
          clearTimeout(this.spotifyWaitTimer);this.spotifyPausePending=true;
          if(this.position>0)this.spotifyPausedAt=this.position;
          this.spotifyController?.pause();this.playing=false;this.updateProgress();return;
        }
        this.spotifyShouldPlay=true;
        this.spotifyPausePending=false;
        if(this.spotifyReady&&this.spotifyController){
          this.spotifyController.activateElement?.();
          if(this.spotifyStarted){
            this.spotifyResumeSeek=this.spotifyPausedAt>2?this.spotifyPausedAt:null;
            if(typeof this.spotifyController.resume==='function')this.spotifyController.resume();
            else if(typeof this.spotifyController.togglePlay==='function')this.spotifyController.togglePlay();
            else this.spotifyController.play?.();
          }else{
            this.startSpotify(this.spotifyController,selection);
          }
          return;
        }
        const controller=await this.openSpotify(track,selection);
        if(this.editing&&selection===this.selection&&this.track===track&&this.spotifyShouldPlay){this.startSpotify(controller,selection);}
      }else if(this.wantsPlay||!this.audio.paused){
        this.wantsPlay=false;this.audio.pause();this.playing=false;this.updateProgress();
      }else{
        this.wantsPlay=true;
        if(this.loadedSelection===this.selection)await this.playFile();
        else await this.select(this.index,true);
      }
      return;
    }
    if(name==='next'||name==='previous'){this.played=[];const index=name==='next'?this.nextIndex():this.shuffle?(this.history.pop()??((this.index-1+this.tracks.length)%this.tracks.length)):((this.index-1+this.tracks.length)%this.tracks.length);this.rewinding=name==='previous';try{await this.select(index,true);}finally{this.rewinding=false;}return;}
    if(name==='select'){this.played=[];await this.select(Number(button.dataset.track),true);return;}
    if(name==='remove'){this.queue=[];this.played=[];const i=Number(button.dataset.track),track=this.tracks[i];if(i<editorTracks.length)return;const active=i===this.index;this.custom.splice(i-editorTracks.length,1);if(this.index>=i)this.index=Math.max(0,this.index-1);this.persist();if(track.assetId)await removePageAssets([track.assetId]);if(active)await this.select(this.index,false);this.paint();return;}
    if(name==='spotify'){
      const value=this.studio.root.querySelector('#music-spotify').value,id=spotifyItem(value)?.id;if(!id)throw Error('Cole o link de uma música, playlist ou álbum do Spotify.');
      if(this.custom.length>=25)throw Error('Remova uma faixa antes de adicionar outra.');
      const info=await spotifyMetadata(value);
      this.custom.push({id:createUuid(),kind:'spotify',url:'https://open.spotify.com/'+info.type+'/'+id,title:info.title,artist:info.artist,cover:info.cover,color:'#78b79a'});this.persist();this.spotifyFormOpen=false;await this.select(this.tracks.length-1,true);
    }
  }
}
