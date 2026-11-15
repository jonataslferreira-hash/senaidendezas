import {editorTracks} from './editor-playlist.js';
import {lobbyTracks,questionTracks} from './quiz-tracks.js';
import {validateGameSettings} from './game-settings.js';
import {audioEditor} from './audio-editor.js';
const lists={lobby:lobbyTracks,questions:questionTracks};
const play='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',pause='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
export function gameSettingsMarkup(lesson,open=false){
 const s=validateGameSettings(lesson.gameSettings);
 const select=(key,label)=>`<div class="music-pick"><label for="music-${key}">${label}</label><div class="music-pick-row"><select id="music-${key}" data-game-setting="${key}">${[['random','Aleatória'],['none','Sem música'],['custom','Meu arquivo'],...lists[key].map(t=>[t.id,t.title]),...editorTracks.map(t=>[t.id,t.title])].map(([id,name])=>`<option value="${id}" ${s[key]===id?'selected':''}>${name}</option>`).join('')}</select><button type="button" class="music-preview" data-music-preview="${key}" aria-pressed="false" aria-label="Ouvir prévia: ${label}" title="Ouvir prévia">${play}<span>Ouvir</span></button></div><small class="music-now" data-music-now="${key}" role="status"></small></div>`;
 return `<details class="game-settings" ${open?'open':''}><summary><span>♫ Música e sons do quiz</span><small>Clique para escolher e ouvir</small></summary><div class="game-setting-grid">${select('lobby','Música do lobby')}${select('questions','Música das perguntas')}<label class="music-volume">Volume da música<input data-game-setting="volume" type="range" min="0" max=".5" step=".01" value="${s.volume}"></label><label class="music-effects"><input type="checkbox" data-game-setting="effects" ${s.effects?'checked':''}> Efeitos sonoros</label></div>${audioEditor(lesson.lobbyAudio,'quiz-lobby')}${audioEditor(lesson.questionAudio||lesson.quizAudio,'quiz-question')}<p>Para usar uma música sua, envie o arquivo acima e escolha “Meu arquivo”. Em “Aleatória”, cada partida sorteia uma faixa.</p></details>`;
}
// Prévia: toca a faixa escolhida no próprio editor. Uma prévia por vez.
let audio=null,active=null,resume=null;
const paintButton=(button,on)=>{if(!button)return;button.setAttribute('aria-pressed',String(on));button.innerHTML=(on?pause:play)+`<span>${on?'Parar':'Ouvir'}</span>`;};
export function stopMusicPreview(){
 if(audio){audio.pause();audio.removeAttribute('src');audio=null;}
 if(active){paintButton(active.button,false);const note=active.note;if(note?.isConnected)note.textContent='';active=null;}
 if(resume){const music=resume;resume=null;music.play().catch(()=>{});}
}
export function toggleMusicPreview(button,studio,toast){
 const key=button.dataset.musicPreview,same=active?.button===button;
 stopMusicPreview();if(same)return;
 const root=button.closest('.game-settings'),value=root.querySelector(`[data-game-setting="${key}"]`).value,note=root.querySelector(`[data-music-now="${key}"]`);
 if(value==='none'){note.textContent='Sem música nesta etapa.';return;}
 if(value==='custom'){note.textContent='Ouça o seu arquivo no player logo abaixo.';return;}
 const pool=lists[key],track=value==='random'?pool[Math.floor(Math.random()*pool.length)]:[...pool,...editorTracks].find(t=>t.id===value);
 if(!track?.url){note.textContent='Essa música não tem prévia.';return;}
 const editorAudio=studio.editorMusic?.audio;if(editorAudio&&!editorAudio.paused){editorAudio.pause();resume=editorAudio;}
 const volume=()=>Math.max(.05,Math.min(1,Number(root.querySelector('[data-game-setting=volume]')?.value)||.1));
 const mine=audio=new Audio(track.url);mine.volume=volume();active={button,note,volume};
 paintButton(button,true);note.textContent=(value==='random'?'Sorteada: ':'Tocando: ')+track.title;
 mine.addEventListener('timeupdate',()=>{if(audio===mine&&!button.isConnected)stopMusicPreview();});
 mine.addEventListener('ended',()=>{if(audio===mine)stopMusicPreview();});
 const failed=()=>{if(audio!==mine)return;stopMusicPreview();if(note.isConnected)note.textContent='Não consegui carregar essa música agora.';toast?.('Não consegui carregar essa música agora.');};
 mine.addEventListener('error',failed);mine.play().catch(error=>{if(error?.name!=='AbortError')failed();});
}
export function musicPreviewChanged(input){
 if(!active)return;
 if(input.dataset.gameSetting==='volume'&&audio)audio.volume=active.volume();
 else if(input.dataset.gameSetting===active.button.dataset.musicPreview)stopMusicPreview();
}
