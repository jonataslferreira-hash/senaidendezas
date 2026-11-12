import { createUuid } from './uuid.js';
import {mp3Duration} from './audio-duration.js';
import { editorTracks,musicCover,spotifyTrackId } from './editor-playlist.js';
import { storePages,getPageImage,removePageAssets } from './assets.js';
import { studioIcon } from './studio-icons.js';
import { spotifyMetadata } from './spotify.js';
import './editor-music.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=value=>Number.isFinite(value)?Math.floor(value/60)+':'+String(Math.floor(value%60)).padStart(2,'0'):'—:—';
const readFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Não foi possível ler o arquivo.'));r.readAsDataURL(file);});
function musicIcon(name){const shapes={play:'<path d="m9 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',previous:'<path d="M5 5v14m14-14L8 12l11 7z"/>',next:'<path d="M19 5v14M5 5l11 7-11 7z"/>',shuffle:'<path d="M3 7h3l12 10h3m-4-4 4 4-4 4M3 17h3l4-4m4-2 4-4h3m-4-4 4 4-4 4"/>'};return `<svg viewBox="0 0 24 24" width="18" height="18" fill="${name==='play'?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]}</svg>`;}
let spotifyApi;
function loadSpotify(){return spotifyApi ||= new Promise((resolve,reject)=>{window.onSpotifyIframeApiReady=resolve;const script=document.createElement('script');script.src='https://open.spotify.com/embed/iframe-api/v1';script.onerror=()=>{spotifyApi=null;reject(Error('Não foi possível abrir o Spotify.'));};document.head.append(script);});}
export class EditorMusic {
  constructor(studio){
    this.studio=studio;this.audio=new Audio();this.audio.hidden=true;this.audio.dataset.editorSoundtrack='';document.body.append(this.audio);this.audio.preload='metadata';this.audio.volume=.35;this.audio.playbackRate=.85;this.audio.preservesPitch=false;this.index=0;this.editing=false;this.playing=false;this.wantsPlay=false;this.open=false;this.spotifyFormOpen=false;this.position=0;this.duration=NaN;this.message='';this.selection=0;this.spotifyGeneration=0;
    try{const items=JSON.parse(localStorage.getItem('sl-editor-music')||'[]');this.custom=Array.isArray(items)?items.filter(t=>t&&typeof t.id==='string'&&(t.assetId||spotifyTrackId(t.url))).slice(0,25):[];}catch{this.custom=[];}
    this.shuffle=true;this.queue=[];this.history=[];
    this.index=this.randomAudioIndex();
    try{this.covers=JSON.parse(localStorage.getItem('sl-editor-music-covers')||'{}');for(const track of editorTracks)if(this.covers[track.id])Object.assign(track,this.covers[track.id]);}catch{this.covers={};}
    for(const track of editorTracks)this.coverColor(track);
    const root=studio.root;
    root.addEventListener('click',e=>{const b=e.target.closest('[data-music-action]');if(b)this.action(b.dataset.musicAction,b).catch(error=>{this.message=error.message;this.paint();});});
    root.addEventListener('change',e=>{
      if(e.target.matches('[data-music-upload]'))this.upload(e.target.files[0]).catch(error=>{this.message=error.message;this.paint();});
      if(e.target.matches('[data-music-rate]')){this.audio.playbackRate=Number(e.target.value);this.rate=this.audio.playbackRate;}
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
    this.audio.addEventListener('ended',()=>{if(this.editing)this.select(this.randomAudioIndex(),true).catch(e=>{this.message=e.message;this.paint();});});
    this.audio.addEventListener('error',()=>{this.playing=false;this.message='A fonte desta música não carregou. Tente outra faixa ou envie um arquivo.';this.paint();});
  }
  nextIndex(){if(!this.shuffle)return (this.index+1)%this.tracks.length;this.queue=this.queue.filter(i=>i<this.tracks.length&&i!==this.index);if(!this.queue.length){this.queue=this.tracks.map((_,i)=>i).filter(i=>i!==this.index);for(let i=this.queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.queue[i],this.queue[j]]=[this.queue[j],this.queue[i]];}}return this.queue.pop()??this.index;}
  get tracks(){return [...editorTracks,...this.custom];}get track(){return this.tracks[this.index]||this.tracks[0];}
  randomAudioIndex(){
    const indices=this.tracks.flatMap((track,index)=>track.kind==='spotify'?[]:[index]);
    const choices=indices.length>1?indices.filter(index=>index!==this.index):indices;
    return choices[Math.floor(Math.random()*choices.length)]??0;
  }
  headerMarkup(){return `<div data-editor-music>${this.markup()}</div>`;}
  markup(){const t=this.track;return `<div class="editor-music" data-playing="${this.playing}" style="--record-color:${esc(t.color||'#a59acb')}"><button type="button" class="music-cover-button" data-music-action="open" aria-label="Abrir músicas do editor"><span class="music-record"></span><img src="${esc(musicCover(t))}" alt="Capa de ${esc(t.title)}"></button><button type="button" class="music-info" data-music-action="open"><strong>${esc(t.title)}</strong><span>${esc(t.artist||'Spotify')} <small data-music-time>${time(this.position)} / ${time(this.duration)}</small></span></button><div class="music-controls"><button type="button" data-music-action="previous" aria-label="Música anterior">${musicIcon('previous')}</button><button type="button" data-music-action="toggle" data-music-play aria-label="${this.playing?'Pausar música':'Tocar música'}">${musicIcon(this.playing?'pause':'play')}</button><button type="button" data-music-action="next" aria-label="Próxima música">${musicIcon('next')}</button></div>${this.open?`<section class="music-panel" popover="manual" aria-label="Músicas do editor"><header><strong>Músicas</strong><button type="button" data-music-action="open" aria-label="Fechar músicas">×</button></header><div class="music-panel-transport"><button type="button" data-music-action="previous" aria-label="Música anterior">${musicIcon('previous')}</button><button type="button" data-music-action="toggle" data-music-play aria-label="${this.playing?'Pausar música':'Tocar música'}">${musicIcon(this.playing?'pause':'play')}</button><button type="button" data-music-action="next" aria-label="Próxima música">${musicIcon('next')}</button></div>${t.kind==='spotify'?'<p>O volume e a velocidade deste painel valem para as faixas de áudio. Use o player do Spotify para a faixa incorporada. Para slowed, envie um arquivo de áudio ou adicione o link de uma versão slowed já publicada.</p>':''}<div class="music-settings">
      <label class="music-slider" title="Volume">${studioIcon('volume')}<input aria-label="Volume" type="range" min="0" max="1" step=".01" value="${this.audio.volume}" style="--music-volume:${Math.round(this.audio.volume*100)}%" data-music-volume ${t.kind==='spotify'?'disabled':''}><output data-music-volume-value>${Math.round(this.audio.volume*100)}%</output></label>
      <label class="music-speed" title="Velocidade">${studioIcon('speed')}<select aria-label="Velocidade" data-music-rate ${t.kind==='spotify'?'disabled':''}>${[.75,.85,1].map(n=>`<option value="${n}" ${this.audio.playbackRate===n?'selected':''}>${n.toFixed(2).replace('.',',')}×</option>`).join('')}</select></label>
      <button type="button" class="studio-btn quiet" data-music-action="spotify-form" aria-expanded="${this.spotifyFormOpen}">${studioIcon('spotify')} Spotify</button>
      <label class="music-upload">${studioIcon('upload')} Enviar música<input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm" data-music-upload hidden></label></div>
      <div class="music-spotify-form" ${this.spotifyFormOpen?'':'hidden'}><label for="music-spotify">Link de uma música do Spotify</label><div><input id="music-spotify" type="url" placeholder="https://open.spotify.com/track/…"><button type="button" data-music-action="spotify">Adicionar</button></div></div><div class="music-track-list">${this.tracks.map((track,i)=>`<div class="${i===this.index?'selected':''}"><button type="button" data-music-action="select" data-track="${i}"><img src="${esc(musicCover(track))}" alt=""><span><strong>${esc(track.title)}</strong><small>${esc(track.artist||'Spotify')}</small></span></button>${track.assetId||track.kind==='spotify'?`<button type="button" data-music-action="remove" data-track="${i}" aria-label="Remover ${esc(track.title)}">×</button>`:''}</div>`).join('')}</div><p class="music-message" role="status">${esc(this.message)}</p></section>`:''}</div>`;}
  paint(){const slot=this.studio.root.querySelector('[data-editor-music]');if(slot)slot.innerHTML=this.markup();this.mountPanel();this.updateProgress();}
  mountPanel(){const panel=this.studio.root.querySelector('.music-panel');if(!panel)return;const anchor=this.studio.root.querySelector('.editor-music').getBoundingClientRect();panel.style.left=Math.max(8,Math.min(anchor.left,innerWidth-Math.min(420,innerWidth-16)-8))+'px';panel.style.top=Math.min(anchor.bottom+10,Math.max(8,innerHeight-360))+'px';if(!panel.matches(':popover-open'))panel.showPopover();}
  updateProgress(){this.mountPanel();for(const el of this.studio.root.querySelectorAll('[data-music-time]'))el.textContent=time(this.position)+' / '+time(this.duration);const shell=this.studio.root.querySelector('.editor-music');if(shell)shell.dataset.playing=String(this.playing);for(const button of this.studio.root.querySelectorAll('[data-music-play]')){button.innerHTML=musicIcon(this.playing?'pause':'play');button.setAttribute('aria-label',this.playing?'Pausar música':'Tocar música');}}
  setEditing(value){const entering=value&&!this.editing;this.editing=value;if(!value){this.wantsPlay=false;this.audio.pause();this.selection++;this.stopSpotify();}else if(entering)this.select(this.randomAudioIndex(),true).catch(()=>{});}
  async select(index,play=true){
    if(index!==this.index&&!this.rewinding){this.history.push(this.index);if(this.history.length>50)this.history.shift();}
    const selection=++this.selection;this.stopSpotify();this.spotifyShouldPlay=play;this.wantsPlay=play;
    this.index=index;this.position=0;this.duration=NaN;this.message='';this.audio.pause();this.spotifyController?.pause();this.playing=false;const t=this.track;this.duration=Number(t.duration)||NaN;
    try{localStorage.setItem('sl-editor-music-active',t.id);}catch{}
    if(this.spotifyBox)this.spotifyBox.hidden=true;
    if(t.kind==='spotify'){this.paint();const controller=await this.openSpotify(t,selection);if(selection===this.selection&&play&&this.spotifyShouldPlay&&this.editing&&this.track===t)controller?.play();return;}
    const url=t.assetId?await getPageImage(t.assetId):t.url;if(this.track!==t||selection!==this.selection||!this.editing)return;
    if(this.audio.src!==url)this.audio.src=url;else this.audio.currentTime=0;this.loadedSelection=selection;
    this.audio.playbackRate=this.rate||.85;this.audio.preservesPitch=false;this.audio.volume=this.volume??.35;this.paint();
    if(this.wantsPlay&&this.editing)await this.playFile(selection);
  }
  persist(){try{localStorage.setItem('sl-editor-music',JSON.stringify(this.custom));localStorage.setItem('sl-editor-music-covers',JSON.stringify(this.covers||{}));}catch{throw Error('Não foi possível guardar a playlist neste navegador.');}}
  async upload(file){
    if(!file)return;if(!/^audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|webm)$/.test(file.type)||file.size>25*1024*1024)throw Error('Escolha um áudio de até 25 MB.');
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
    this.playing=true;this.updateProgress();
    try{await this.audio.play();if(selection===this.selection&&!this.wantsPlay){this.audio.pause();this.playing=false;this.updateProgress();}}
    catch{
      if(selection!==this.selection||!this.wantsPlay)return;
      this.wantsPlay=false;this.playing=false;this.message='Toque em ▶ para começar a ouvir.';this.paint();
    }
  }
  stopSpotify(){
    this.spotifyGeneration=(this.spotifyGeneration||0)+1;
    this.spotifyCancel?.();this.spotifyCancel=null;this.spotifyLoading=null;
    const controller=this.spotifyController;this.spotifyController=null;
    controller?.pause();controller?.destroy?.();this.spotifyBox?.remove();this.spotifyBox=null;this.spotifyShouldPlay=false;this.spotifyPausePending=false;this.spotifyReady=false;
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
        try{api.createController(box.querySelector('[data-spotify-host]'),{uri:'spotify:track:'+spotifyTrackId(track.url),width:'100%',height:152},controller=>{
          if(!current()){controller.pause();controller.destroy?.();finish(null);return;}
          this.spotifyController=controller;
          controller.addListener('playback_update',event=>{
            if(!current()){if(!event.data.isPaused)controller.pause();return;}
            if(this.spotifyPausePending&&!event.data.isPaused){controller.pause();return;}
            if(event.data.isPaused)this.spotifyPausePending=false;
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
        if(name==='open'){this.open=!this.open;this.paint();return;}
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
          this.spotifyPausePending=true;
          this.spotifyController?.pause();this.playing=false;this.updateProgress();return;
        }
        this.spotifyShouldPlay=true;
        this.spotifyPausePending=false;
        if(this.spotifyReady){this.spotifyController?.play();return;}
        const controller=await this.openSpotify(track,selection);
        if(this.editing&&selection===this.selection&&this.track===track&&this.spotifyShouldPlay)controller?.play();
      }else if(this.wantsPlay||!this.audio.paused){
        this.wantsPlay=false;this.audio.pause();this.playing=false;this.updateProgress();
      }else{
        this.wantsPlay=true;
        if(this.loadedSelection===this.selection)await this.playFile();
        else await this.select(this.index,true);
      }
      return;
    }
    if(name==='next'||name==='previous'){const index=name==='next'?this.nextIndex():this.shuffle?(this.history.pop()??((this.index-1+this.tracks.length)%this.tracks.length)):((this.index-1+this.tracks.length)%this.tracks.length);this.rewinding=name==='previous';try{await this.select(index,true);}finally{this.rewinding=false;}return;}
    if(name==='select'){await this.select(Number(button.dataset.track),true);return;}
    if(name==='remove'){const i=Number(button.dataset.track),track=this.tracks[i];if(i<editorTracks.length)return;const active=i===this.index;this.custom.splice(i-editorTracks.length,1);if(this.index>=i)this.index=Math.max(0,this.index-1);this.persist();if(track.assetId)await removePageAssets([track.assetId]);if(active)await this.select(this.index,false);this.paint();return;}
    if(name==='spotify'){
      const value=this.studio.root.querySelector('#music-spotify').value,id=spotifyTrackId(value);if(!id)throw Error('Cole o link de uma música do Spotify.');
      if(this.custom.length>=25)throw Error('Remova uma faixa antes de adicionar outra.');
      const info=await spotifyMetadata(value);
      this.custom.push({id:createUuid(),kind:'spotify',url:'https://open.spotify.com/track/'+id,title:info.title,artist:info.artist,cover:info.cover,color:'#78b79a'});this.persist();this.spotifyFormOpen=false;await this.select(this.tracks.length-1,true);
    }
  }
}
