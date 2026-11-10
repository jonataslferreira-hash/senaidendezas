import {editorTracks} from './editor-playlist.js';
import {validateGameSettings} from './game-settings.js';
import {lobbyTracks,questionTracks,countdownTracks,resultTrack,podiumTrack,chooseTrack,timedTracks} from './quiz-tracks.js';
const createAudio=label=>{const audio=new Audio();audio.preload='metadata';audio.hidden=true;audio.dataset[label]='';document.body.append(audio);return audio;};
export class GameAudio{
 constructor({audioFactory=createAudio,random=Math.random,now=Date.now}={}){
  this.random=random;this.now=now;this.audio=audioFactory('quizSoundtrack');this.five=audioFactory('quizCountdown');this.result=audioFactory('quizResult');this.versions=new WeakMap();this.desired=new WeakMap();this.timers=[];
  this.audio.addEventListener('ended',()=>{if(['lobby','countdown'].includes(this.state?.phase)&&this.selected==='random'&&this.enabled){this.key='';this.sync(...this.current);}});
  this.five.addEventListener('error',()=>{this.fiveActive=false;if(this.state?.phase==='reveal'&&this.suppressedResult)this.playResult();});
 }
 unlock(){try{this.context||=new (window.AudioContext||window.webkitAudioContext)();this.context.resume().catch(()=>{});}catch{}}
 cue(name){
  if(!this.context||this.context.state!=='running'||!this.effects)return;
  const tones={answer:[523,659],correct:[523,659,784],wrong:[220,174],countdown:[440,660,880],podium:[294,440,587]};const notes=tones[name];if(!notes)return;
  notes.forEach((f,i)=>{const o=this.context.createOscillator(),g=this.context.createGain(),start=this.context.currentTime+i*.12;o.type=name==='wrong'?'triangle':'sine';o.frequency.value=f;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.04,start+.012);g.gain.exponentialRampToValueAtTime(.001,start+.24);o.connect(g);g.connect(this.context.destination);o.start(start);o.stop(start+.25);});
 }
 pause(player){this.versions.set(player,(this.versions.get(player)||0)+1);this.desired.set(player,false);player.pause();}
 play(player){const version=(this.versions.get(player)||0)+1;this.versions.set(player,version);this.desired.set(player,true);try{return Promise.resolve(player.play()).then(()=>{if(!this.desired.get(player))player.pause();return this.versions.get(player)===version;}).catch(()=>false);}catch{return Promise.resolve(false);}}
 clearTimers(){for(const timer of this.timers)clearTimeout(timer);this.timers=[];clearInterval(this.fade);this.fade=null;}
 remaining(){return Math.max(0,((this.state?.question?.deadline||0)-this.now()-this.offset)/1000);}
 playResult(){if(!this.enabled||!this.effects||this.resultKey===this.questionKey)return;this.resultKey=this.questionKey;this.suppressedResult=false;if(!this.result.paused&&this.result.src===resultTrack.url)return;this.pause(this.result);this.result.src=resultTrack.url;this.result.loop=false;this.result.playbackRate=1;this.result.volume=Math.min(.35,Math.max(.18,this.settings.volume*2));this.play(this.result);}
 startTrack(track,key,{loop=true,volume=this.settings.volume,rate=1}={}){if(!track||this.key===key)return;this.pause(this.audio);clearInterval(this.fade);this.fade=null;this.key=key;this.lastTrack=track.id;this.audio.src=track.url;this.audio.loop=loop;this.audio.volume=volume;this.audio.playbackRate=rate;this.audio.preservesPitch=rate===1;this.play(this.audio);}
 startPodium(){
  if(!this.enabled||this.state?.phase!=='finished'||this.key==='podium')return;
  this.startTrack(podiumTrack,'podium',{loop:true,volume:0,rate:.85});const started=this.now(),target=Math.min(.08,this.settings.volume*.7);
  this.fade=setInterval(()=>{const progress=Math.min(1,(this.now()-started)/1800);this.audio.volume=target*progress;if(progress>=1){clearInterval(this.fade);this.fade=null;}},50);
 }
 sync(state,lesson,host,music){
  const previousState=this.state;this.current=[state,lesson,host,music];this.state=state;this.settings=validateGameSettings(lesson?.gameSettings);this.enabled=Boolean(host&&music);this.effects=this.settings.effects&&music;if(state!==previousState||this.offset===undefined)this.offset=(state?.serverTime||this.now())-this.now();
  const phase=state?.phase,scene=(state?.code||'')+':'+phase+':'+state?.questionIndex,changed=scene!==this.scene;
  if(!this.enabled){this.clearTimers();for(const p of [this.audio,this.five,this.result])this.pause(p);this.key='';this.scene=null;return;}
  if(changed){this.clearTimers();this.scene=scene;
   if(!['question','reveal','leaderboard','finished'].includes(phase))this.pause(this.five);
   if(!['reveal','leaderboard','finished'].includes(phase))this.pause(this.result);
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
   if(phase==='finished'){
    this.pause(this.audio);this.key='';this.finalSkipped=false;const elapsed=Math.max(0,(this.now()+this.offset-(state.resultStartedAt||this.now()))/1000);
    for(const [delay,fn]of [[2,()=>this.cue('podium')],[4.5,()=>this.cue('podium')],[7,()=>{this.resultKey='';this.playResult();}],[9,()=>this.startPodium()]])if(delay>elapsed&&!state.podiumRevealed)this.timers.push(setTimeout(fn,(delay-elapsed)*1000));
    if(state.podiumRevealed||elapsed>=9)this.startPodium();
   }
   if(phase==='countdown')this.cue('countdown');
  }
  if(phase==='finished'){if(state.podiumRevealed&&!this.finalSkipped){for(const timer of this.timers)clearTimeout(timer);this.timers=[];this.finalSkipped=true;if(this.key!=='podium'){this.resultKey='';this.playResult();this.startPodium();}}return;}
  if(!['lobby','countdown','question'].includes(phase)){if(phase!=='reveal'){this.pause(this.audio);this.key='';}return;}
  this.section=phase==='question'?'questions':'lobby';this.selected=this.settings[this.section];const custom=this.section==='lobby'?lesson.lobbyAudio:lesson.questionAudio||lesson.quizAudio;
  if(this.selected==='none'||this.selected==='custom'&&!custom?.data){this.pause(this.audio);return;}
  const key=this.section+':'+(this.section==='questions'?state.questionIndex+':'+state.question.startedAt:this.selected);if(this.key===key){this.tick();return;}
  if(this.fiveActive)return;
  let track;if(this.selected==='custom')track={id:'custom-'+this.section,url:custom.data};else if(this.selected==='random')track=chooseTrack(this.section==='lobby'?lobbyTracks:timedTracks((state.question.deadline-state.question.startedAt)/1000),this.lastTrack,this.random);else track=[...lobbyTracks,...questionTracks,...editorTracks].find(t=>t.id===this.selected);
  this.startTrack(track,key,{loop:this.selected==='custom'?custom.loop!==false:this.section==='questions'||this.selected!=='random',volume:this.settings.volume*(this.selected==='custom'?(custom.volume??1):1)});this.tick();
 }
 tick(){
  if(!this.enabled||this.state?.phase!=='question'||!this.countdownTrack||this.fiveAttempted)return;const remaining=this.remaining();if(remaining>5||remaining<=0)return;
  this.fiveAttempted=true;this.fiveActive=true;this.pause(this.audio);this.five.volume=this.settings.volume;this.five.playbackRate=1;
  try{this.five.currentTime=Math.max(0,5-remaining);}catch{}
  const question=this.questionKey;this.play(this.five).then(ok=>{if(question!==this.questionKey)return;if(!ok){this.fiveActive=false;if(this.state?.phase==='reveal')this.playResult();else if(this.state?.phase==='question')this.play(this.audio);}});
 }
 stop(){this.clearTimers();for(const p of [this.audio,this.five,this.result])this.pause(p);this.current=null;this.state=null;this.scene=null;this.key='';this.enabled=false;this.questionKey='';}
}
