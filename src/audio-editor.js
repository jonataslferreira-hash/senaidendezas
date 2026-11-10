import { esc } from './canvas-view.js';
export function audioEditor(audio, scope, elements = []) {
  const trigger = audio?.trigger || 'auto';
  const choices = [['auto','Assim que o slide abrir'],['background','Ao clicar no fundo do slide'],...elements.map((e,i)=>[
    'element:'+e.id, (i+1)+' · '+(e.type==='text'?e.text.trim().slice(0,40)||'Texto':{image:'Imagem',shape:'Forma',model:'Modelo 3D',simulation:'Simulação'}[e.type])
  ])];
  if(!choices.some(([id])=>id===trigger))choices.push([trigger,'Elemento removido']);
  const triggerField = scope==='slide' ? `<label>Quando começa<select data-slide-audio-trigger>${choices.map(([id,label])=>
    `<option value="${esc(id)}" ${id===trigger?'selected':''}>${esc(label)}</option>`).join('')}</select></label>` : '';

  const body=`<label class="audio-upload-label">↑ ${audio ? 'Trocar áudio' : 'Enviar áudio'}<input type="file" data-audio-upload="${scope}" accept=".mp3,.wav,.ogg,.m4a,.aac,.webm,audio/*"></label><button type="button" class="studio-btn quiet" data-record-audio="${scope}">● Gravar áudio</button><small>MP3, WAV, OGG, M4A, AAC ou WebM · até 8 MB</small>${audio ? `<strong class="audio-name">${esc(audio.name)}</strong>${triggerField}<audio controls preload="none" data-audio-preview="${scope}" ${audio.data ? `src="${esc(audio.data)}"` : `data-audio-asset="${esc(audio.assetId)}"`}></audio><label>Volume<input type="range" min="0" max="1" step="0.05" value="${audio.volume}" data-audio-volume="${scope}" aria-label="Volume ${scope.startsWith('quiz') ? 'do quiz' : 'do slide'}"></label><label class="audio-loop"><input type="checkbox" data-audio-loop="${scope}" ${audio.loop ? 'checked' : ''}> Repetir áudio</label>${scope.startsWith('quiz')?'':`<label>Velocidade<input type="number" min="0.5" max="2" step="0.05" value="${audio.rate||1}" data-audio-rate="${scope}"></label><label class="audio-loop"><input type="checkbox" data-audio-continue="${scope}" ${audio.continueAcrossSlides?'checked':''}> Continuar ao avançar de slide</label>`}<button type="button" class="studio-btn link" data-studio-action="remove-audio" data-audio-scope="${scope}">Remover áudio</button>` : ''}`;
  if(!scope.startsWith('quiz'))return `<details class="audio-editor inspector-audio" ${audio?'open':''}><summary data-slide-audio-open>♫ ${scope==='slide'?'Áudio do slide':'Áudio do elemento'}</summary>${body}</details>`;
  return `<details class="audio-editor" ${audio ? 'open' : ''}><summary>♫ ${scope==='quiz-lobby'?'Meu áudio do lobby':scope==='quiz-question'?'Meu áudio das perguntas':'Música do lobby e quiz'}</summary>${body}</details>`;
}
