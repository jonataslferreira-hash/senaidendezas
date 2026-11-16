import {editorTracks} from './editor-playlist.js';
import {validateGameSettings} from './game-settings.js';
import {lobbyTracks,questionTracks,countdownTracks,resultTrack,podiumTrack,chooseTrack,timedTracks} from './quiz-tracks.js';
const createAudio=label=>{const audio=new Audio();audio.preload='metadata';audio.hidden=true;audio.dataset[label]='';document.body.append(audio);return audio;};
export class GameAudio{
 constructor({audioFactory=createAudio,random=Math.random,now=Date.now,context=null}={}){
  this.random=random;this.now=now;this.context=context;this.audio=audioFactory('quizSoundtrack');this.five=audioFactory('quizCountdown');this.result=audioFactory('quizResult');this.versions=new WeakMap();this.desired=new WeakMap();this.timers=[];this.cuesPlayed=[];this.drumrollTimer=null;this.drumrollMode=null;this.drumrollStep=0;
  this.audio.addEventListener('ended',()=>{
   const inLobby=['lobby','countdown'].includes(this.state?.phase)||(this.state?.phase==='game'&&['ready','teams'].includes(this.state?.game?.state==='ready'?'ready':this.state?.game?.type));
   if(inLobby&&this.selected==='random'&&this.enabled){this.key='';this.sync(...this.current);}
  });
  this.five.addEventListener('error',()=>{this.fiveActive=false;if(this.state?.phase==='reveal'&&this.suppressedResult)this.playResult();});
 }
 unlock(){try{this.context||=new (window.AudioContext||window.webkitAudioContext)();this.context.resume().catch(()=>{});}catch{}}
 noiseBuffer(){
  if(this._noiseBuffer&&this._noiseCtx===this.context)return this._noiseBuffer;
  const ctx=this.context,length=Math.floor((ctx.sampleRate||44100)*0.12),buf=ctx.createBuffer(1,length,ctx.sampleRate||44100),data=buf.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(length*0.35));
  this._noiseBuffer=buf;this._noiseCtx=ctx;return buf;
 }
 // Abertura das etapas: arpejo curto estilo chiptune (ré maior brilhante).
 playStageIntro(){
  if(!this.context||this.context.state!=='running')return;
  try{
   const ctx=this.context,now=ctx.currentTime+0.03,vol=Math.max(.05,Math.min(.2,(this.settings?.volume??.1)*1.5));
   const notes=[587.33,739.99,880,1174.66],step=.085;
   notes.forEach((freq,i)=>{
    const t=now+i*step,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='square';osc.frequency.setValueAtTime(freq,t);
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(vol*(i===3?.9:.66),t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.24);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.26);
    const shine=ctx.createOscillator(),sg=ctx.createGain();
    shine.type='triangle';shine.frequency.setValueAtTime(freq*2,t+.02);
    sg.gain.setValueAtTime(.0001,t+.02);sg.gain.linearRampToValueAtTime(vol*.18,t+.03);sg.gain.exponentialRampToValueAtTime(.0001,t+.2);
    shine.connect(sg);sg.connect(ctx.destination);shine.start(t+.02);shine.stop(t+.22);
   });
   const bass=ctx.createOscillator(),bg=ctx.createGain();
   bass.type='triangle';bass.frequency.setValueAtTime(146.83,now);
   bg.gain.setValueAtTime(.0001,now);bg.gain.linearRampToValueAtTime(vol*.5,now+.02);bg.gain.exponentialRampToValueAtTime(.0001,now+.5);
   bass.connect(bg);bg.connect(ctx.destination);bass.start(now);bass.stop(now+.52);
  }catch{}
 }
 playDrumrollChunk(duration=0.32,mode='podium',step=0){
  const ctx=this.context;if(!ctx||ctx.state!=='running')return;
  const now=ctx.currentTime+0.015,baseVol=Math.max(.03,Math.min(.22,(this.settings?.volume??.1)*1.4));
  const modeGain=mode==='results'?0.68:mode==='raffle'?1.05:0.92;
  const vol=baseVol*modeGain,buffer=this.noiseBuffer();
  const rate=mode==='raffle'?22:mode==='results'?16:20;
  const hits=Math.max(4,Math.round(duration*rate));
  for(let i=0;i<hits;i++){
   const t=now+(i/hits)*duration;
   const swell=0.65+0.35*Math.sin(((step*hits+i)%24)/24*Math.PI);
   const accent=((step*hits+i)%4===0)?1.18:0.86;
   const amp=vol*swell*accent;
   const src=ctx.createBufferSource();src.buffer=buffer;
   const filter=ctx.createBiquadFilter();filter.type='bandpass';
   filter.frequency.value=(mode==='raffle'?2100:mode==='results'?1450:1750)+((i%3)*190);
   filter.Q.value=mode==='raffle'?2.0:1.4;
   const gain=ctx.createGain();gain.gain.setValueAtTime(0.0001,t);gain.gain.linearRampToValueAtTime(amp,t+0.005);gain.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
   src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);src.start(t);src.stop(t+0.055);
   if(i%2===0){
    const body=ctx.createOscillator(),bg=ctx.createGain();
    body.type=mode==='raffle'?'sine':'triangle';
    const baseFreq=mode==='raffle'?250+((step+i)%5)*22:mode==='results'?150:185;
    body.frequency.setValueAtTime(baseFreq,t);body.frequency.exponentialRampToValueAtTime(baseFreq*0.6,t+0.042);
    bg.gain.setValueAtTime(0.0001,t);bg.gain.linearRampToValueAtTime(amp*(mode==='raffle'?0.34:0.44),t+0.005);bg.gain.exponentialRampToValueAtTime(0.0001,t+0.048);
    body.connect(bg);bg.connect(ctx.destination);body.start(t);body.stop(t+0.052);
   }
  }
 }
 startDrumroll(mode='podium'){
  if(!this.effects)return;
  if(this.drumrollTimer&&this.drumrollMode===mode)return;
  this.stopDrumroll();
  this.drumrollMode=mode;this.drumrollStep=0;
  this.cuesPlayed.push('drumroll');
  if(mode==='raffle')this.cuesPlayed.push('raffle-drumroll');
  if(mode==='results')this.cuesPlayed.push('suspense');
  const tick=()=>{try{this.playDrumrollChunk(0.28,mode,this.drumrollStep++);}catch{}};
  tick();
  this.drumrollTimer=setInterval(tick,240);
 }
 stopDrumroll(){
  if(this.drumrollTimer){clearInterval(this.drumrollTimer);this.drumrollTimer=null;}
  this.drumrollMode=null;this.drumrollStep=0;
 }
 playDrumroll(duration=1.5){
  this.playDrumrollChunk(duration,'podium',0);
 }
 playConfetti(){
  const ctx=this.context,now=ctx.currentTime,vol=Math.max(.04,Math.min(.22,(this.settings?.volume??.1)*1.35));
  // Estouro festivo curto (pop de confete) + acorde brilhante ascendente.
  const pop=ctx.createBufferSource();pop.buffer=this.noiseBuffer();
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1200;
  const pg=ctx.createGain();pg.gain.setValueAtTime(0.0001,now);pg.gain.linearRampToValueAtTime(vol*1.2,now+0.008);pg.gain.exponentialRampToValueAtTime(0.0001,now+0.12);
  pop.connect(hp);hp.connect(pg);pg.connect(ctx.destination);pop.start(now);pop.stop(now+0.13);
  [523.25,659.25,783.99,1046.5,1318.5].forEach((freq,i)=>{
   const osc=ctx.createOscillator(),g=ctx.createGain(),t=now+0.04+i*0.055;
   osc.type=i>2?'sine':'triangle';osc.frequency.setValueAtTime(freq,t);
   g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol*0.55,t+0.014);g.gain.exponentialRampToValueAtTime(0.0001,t+0.34);
   osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+0.36);
  });
 }
 cue(name){
  if(!this.effects)return;
  if(name==='drumroll'){this.startDrumroll('podium');return;}
  this.cuesPlayed.push(name);
  if(!this.context||this.context.state!=='running')return;
  if(name==='confetti'){try{this.playConfetti();}catch{}return;}
  const tones={answer:[523,659],correct:[523,659,784],wrong:[220,174],countdown:[440,660,880],podium:[294,440,587]};const notes=tones[name];if(!notes)return;
  notes.forEach((f,i)=>{const o=this.context.createOscillator(),g=this.context.createGain(),start=this.context.currentTime+i*.12;o.type=name==='wrong'?'triangle':'sine';o.frequency.value=f;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.05,start+.012);g.gain.exponentialRampToValueAtTime(.001,start+.24);o.connect(g);g.connect(this.context.destination);o.start(start);o.stop(start+.25);});
 }
 pause(player){this.versions.set(player,(this.versions.get(player)||0)+1);this.desired.set(player,false);player.pause();}
 play(player){const version=(this.versions.get(player)||0)+1;this.versions.set(player,version);this.desired.set(player,true);try{return Promise.resolve(player.play()).then(()=>{if(!this.desired.get(player))player.pause();return this.versions.get(player)===version;}).catch(()=>false);}catch{return Promise.resolve(false);}}
 clearTimers(){for(const timer of this.timers)clearTimeout(timer);this.timers=[];clearInterval(this.fade);this.fade=null;this.stopDrumroll();}
 remaining(){return Math.max(0,((this.state?.question?.deadline||0)-this.now()-this.offset)/1000);}
 playResult(){if(!this.enabled||!this.effects||this.resultKey===this.questionKey)return;this.resultKey=this.questionKey;this.suppressedResult=false;if(!this.result.paused&&this.result.src===resultTrack.url)return;this.pause(this.result);this.result.src=resultTrack.url;this.result.loop=false;this.result.playbackRate=1;this.result.volume=this.settings.volume>0?Math.min(.35,Math.max(.2,this.settings.volume*2)):0;this.play(this.result);}
 startTrack(track,key,{loop=true,volume=this.settings.volume,rate=1}={}){if(!track||this.key===key)return;this.pause(this.audio);clearInterval(this.fade);this.fade=null;this.key=key;this.lastTrack=track.id;this.audio.src=track.url;this.audio.loop=loop;this.audio.volume=volume;this.audio.playbackRate=rate;this.audio.preservesPitch=rate===1;this.play(this.audio);}
 startPodium(){
  const activePodium=this.state?.phase==='finished'||(this.state?.phase==='game'&&this.state?.game?.state==='done');
  if(!this.enabled||!activePodium||this.key==='podium')return;
  this.startTrack(podiumTrack,'podium',{loop:true,volume:0,rate:.85});
  const started=this.now(),target=this.settings.volume>0?Math.min(.45,this.settings.volume*1.4):0;
  this.fade=setInterval(()=>{const progress=Math.min(1,(this.now()-started)/1800);this.audio.volume=target*progress;if(progress>=1){clearInterval(this.fade);this.fade=null;}},50);
 }
 playLobbyTrack(lesson,key){
  this.section='lobby';this.selected=this.settings.lobby;
  const custom=lesson?.lobbyAudio;
  if(this.selected==='none'||this.selected==='custom'&&!custom?.data){this.pause(this.audio);this.key='';return;}
  if(this.key===key)return;
  const track=this.selected==='custom'?{id:'custom-lobby',url:custom.data}:this.selected==='random'?chooseTrack(lobbyTracks,this.lastTrack,this.random):[...lobbyTracks,...questionTracks,...editorTracks].find(t=>t.id===this.selected);
  this.startTrack(track,key,{loop:this.selected==='custom'?custom.loop!==false:this.selected!=='random',volume:this.settings.volume*(this.selected==='custom'?(custom.volume??1):1)});
 }
 sync(state,lesson,host,music){
  const previousState=this.state;this.current=[state,lesson,host,music];this.state=state;this.settings=validateGameSettings(lesson?.gameSettings);this.enabled=Boolean(host&&music);this.effects=this.settings.effects&&music;if(state!==previousState||this.offset===undefined)this.offset=(state?.serverTime||this.now())-this.now();
  const phase=state?.phase,raffleSpin=state?.game?.type==='raffle'?':'+(state.game?.revealAt||0):'',gameKey=phase==='game'?':'+(state.game?.id||'')+':'+(state.game?.state||'')+':'+(state.game?.round??'')+raffleSpin:'',scene=(state?.code||'')+':'+phase+':'+state?.questionIndex+gameKey,changed=scene!==this.scene;
  if(!this.enabled){this.clearTimers();for(const p of [this.audio,this.five,this.result])this.pause(p);this.key='';this.scene=null;return;}
  if(changed){this.clearTimers();this.scene=scene;
   if(!['question','reveal','leaderboard','finished'].includes(phase))this.pause(this.five);
   if(!['reveal','leaderboard','finished','game'].includes(phase))this.pause(this.result);
   if(phase==='question'){
    this.questionKey=(state.code||'')+':'+state.questionIndex+':'+state.question.startedAt;this.fiveActive=false;this.fiveAttempted=false;this.suppressedResult=false;this.resultKey='';this.key='';this.pause(this.five);
    this.countdownTrack=this.settings.questions!=='none'&&this.settings.effects&&this.random()<1/3?chooseTrack(countdownTracks,null,this.random):null;
    if(this.countdownTrack){this.five.src=this.countdownTrack.url;this.five.loop=false;this.five.preload='auto';this.five.load();}
   }
   if(phase==='reveal'){
    this.pause(this.audio);this.key='';
    // The five-second files already contain their own result sting after 0:05.
    if(this.fiveActive&&this.remaining()<.25)this.suppressedResult=true;
    else{this.pause(this.five);this.playResult();}
   }
   if(phase==='leaderboard'){
    this.pause(this.audio);this.key='';
    // Suspense contínuo nos resultados da rodada (loopável durante a corrida do placar).
    this.startDrumroll('results');
    this.timers.push(setTimeout(()=>{this.stopDrumroll();this.cue('podium');},3100));
   }
   if(phase==='finished'){
    this.pause(this.audio);this.key='';this.finalSkipped=false;const elapsed=Math.max(0,(this.now()+this.offset-(state.resultStartedAt||this.now()))/1000);
    // Rufo de tambor contínuo e loopável enquanto o pódio é revelado; para exatamente ao mostrar o campeão.
    if(!state.podiumRevealed&&elapsed<7){
     this.timers.push(setTimeout(()=>this.startDrumroll('podium'),Math.max(0,(.15-elapsed)*1000)));
    }
    for(const [delay,fn]of [[2,()=>this.cue('podium')],[4.5,()=>this.cue('podium')],[7,()=>{this.stopDrumroll();this.resultKey='';this.playResult();this.cue('confetti');}],[9,()=>this.startPodium()]])if(delay>elapsed&&!state.podiumRevealed)this.timers.push(setTimeout(fn,(delay-elapsed)*1000));
    if(state.podiumRevealed||elapsed>=9)this.startPodium();
   }
   if(phase==='countdown')this.cue('countdown');
  }
  if(phase==='finished'){if(state.podiumRevealed&&!this.finalSkipped){for(const timer of this.timers)clearTimeout(timer);this.timers=[];this.stopDrumroll();this.finalSkipped=true;if(this.key!=='podium'){this.resultKey='';this.playResult();this.cue('confetti');this.startPodium();}}return;}
  if(phase==='game'){
   const g=state.game,sel=this.settings.questions,custom=lesson?.questionAudio||lesson?.quizAudio;
   if(!g){this.pause(this.audio);this.key='';return;}
   // Sorteio: novo rufo de tambor loopável dedicado enquanto gira + confete/sino na revelação.
   if(g.type==='raffle'){
    if(g.current&&g.revealAt){
     const remaining=Math.max(0,g.revealAt-(this.now()+this.offset));
     if(changed){
      this.pause(this.audio);this.key='';
      if(remaining>80){
       this.startDrumroll('raffle');
       this.timers.push(setTimeout(()=>{this.stopDrumroll();this.questionKey='raffle:'+g.id+':'+g.revealAt;this.resultKey='';this.playResult();this.cue('confetti');},remaining));
      }else{
       this.cue('confetti');
      }
     }
     return;
    }
    this.playLobbyTrack(lesson,'game-lobby:'+g.id+':'+this.settings.lobby);return;
   }
   // Salas de espera de jogos ao vivo (Cabo de Guerra, Relâmpago, Sobrevivência, Corrida, Equipes) tocam música de lobby.
   if(g.state==='ready'||g.type==='teams'){
    this.playLobbyTrack(lesson,'game-lobby:'+g.id+':'+this.settings.lobby);return;
   }
   if(g.state==='pull'){
    this.pause(this.audio);this.key='';
    if(changed)this.startDrumroll('tug');
    return;
   }
   if(g.state==='leaderboard'){
    this.pause(this.audio);this.key='';this.stopDrumroll();
    if(changed){this.questionKey='game-board:'+g.id+':'+(g.round??'');this.resultKey='';this.playResult();}
    return;
   }
   if(g.state==='between'){
    this.stopDrumroll();
    return;
   }
   if(g.state==='done'){
    if(changed){this.stopDrumroll();this.questionKey='game-done:'+g.id;this.resultKey='';this.playResult();this.cue('confetti');this.startPodium();}
    return;
   }
   // Resultados parciais de rodada (Relâmpago, Sobrevivência, Corrida): suspense suave nos resultados.
   if(g.state==='reveal'){
    this.pause(this.audio);this.key='';
    if(changed){this.startDrumroll('results');this.timers.push(setTimeout(()=>this.stopDrumroll(),2400));}
    return;
   }
   if(!['survival','tug','race','flash'].includes(g.type)||g.state!=='open'||sel==='none'||sel==='custom'&&!custom?.data){
    this.pause(this.audio);this.key='';return;
   }
   const key='game:'+g.id+':'+g.round;if(this.key===key)return;
   const track=sel==='custom'?{id:'custom-questions',url:custom.data}:sel==='random'?chooseTrack(timedTracks(g.seconds||15),this.lastTrack,this.random):[...lobbyTracks,...questionTracks,...editorTracks].find(t=>t.id===sel);
   this.startTrack(track,key,{loop:true,volume:this.settings.volume*(sel==='custom'?(custom.volume??1):1)});return;
  }
  if(!['lobby','countdown','question'].includes(phase)){if(phase!=='reveal'){this.pause(this.audio);this.key='';}return;}
  if(phase!=='question'){this.playLobbyTrack(lesson,'lobby:'+this.settings.lobby);return;}
  this.section='questions';this.selected=this.settings.questions;const custom=lesson?.questionAudio||lesson?.quizAudio;
  if(this.selected==='none'||this.selected==='custom'&&!custom?.data){this.pause(this.audio);return;}
  const key='questions:'+state.questionIndex+':'+state.question.startedAt;if(this.key===key){this.tick();return;}
  if(this.fiveActive)return;
  let track;if(this.selected==='custom')track={id:'custom-questions',url:custom.data};else if(this.selected==='random')track=chooseTrack(timedTracks((state.question.deadline-state.question.startedAt)/1000),this.lastTrack,this.random);else track=[...lobbyTracks,...questionTracks,...editorTracks].find(t=>t.id===this.selected);
  this.startTrack(track,key,{loop:this.selected==='custom'?custom.loop!==false:true,volume:this.settings.volume*(this.selected==='custom'?(custom.volume??1):1)});this.tick();
 }
 tick(){
  if(!this.enabled||this.state?.phase!=='question'||!this.countdownTrack||this.fiveAttempted)return;const remaining=this.remaining();if(remaining>5||remaining<=0)return;
  this.fiveAttempted=true;this.fiveActive=true;this.pause(this.audio);this.five.volume=this.settings.volume;this.five.playbackRate=1;
  try{this.five.currentTime=Math.max(0,5-remaining);}catch{}
  const question=this.questionKey;this.play(this.five).then(ok=>{if(question!==this.questionKey)return;if(!ok){this.fiveActive=false;if(this.state?.phase==='reveal')this.playResult();else if(this.state?.phase==='question')this.play(this.audio);}});
 }
 stop(){this.clearTimers();for(const p of [this.audio,this.five,this.result])this.pause(p);this.current=null;this.state=null;this.scene=null;this.key='';this.enabled=false;this.questionKey='';}
}
