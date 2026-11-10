import {editorTracks} from './editor-playlist.js';
import {lobbyTracks,questionTracks} from './quiz-tracks.js';
export function validateGameSettings(value){const valid=(id,tracks)=>['random','none','custom',...tracks.map(t=>t.id),...editorTracks.map(t=>t.id)].includes(id)?id:'random';return {lobby:valid(value?.lobby,lobbyTracks),questions:valid(value?.questions,questionTracks),volume:Math.max(0,Math.min(.5,(Number.isFinite(Number(value?.volume))?Number(value.volume):.1))),effects:value?.effects!==false};}
