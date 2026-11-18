import {takePhoto} from './camera-photo.js';
import {avatars} from './content.js';
import {avatarContent,isPhotoAvatar} from './player-avatar.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Foto do convidado: abre o recorte (arrastar/zoom) e sai num quadrado 96px
// leve. Sem passar pelo recorte (ex.: GIF animado), cai no centro da imagem.
export async function participantPhoto(file,{crop=true}={}){
 if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>15*1024*1024)throw Error('Escolha uma imagem de até 15 MB.');
 const bitmap=await createImageBitmap(file).catch(()=>{throw Error('Não foi possível abrir a foto. Tente outra imagem PNG, JPEG ou WebP.');});
 let image=bitmap;
 if(crop&&typeof document!=='undefined'&&bitmap.width&&bitmap.height){
   const {cropSheet}=await import('./photo-crop.js');
   const cropped=await cropSheet(bitmap,{title:'Ajuste sua foto',output:480});
   if(cropped){image=await createImageBitmap(cropped);}
 }
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const side=Math.min(image.width,image.height);
 canvas.getContext('2d').drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,96,96);
 bitmap.close();if(image!==bitmap)image.close();
 const data=canvas.toDataURL('image/webp',.8);
 if(!isPhotoAvatar(data))throw Error('A foto ficou grande demais. Tente outra imagem.');
 return data;
}
export async function editParticipant(person,save){
 const dialog=document.createElement('dialog');dialog.className='profile-sheet';dialog.setAttribute('aria-labelledby','profile-sheet-title');
 let avatar=person.avatar||avatars[0],photo=isPhotoAvatar(avatar)?avatar:'';
 dialog.innerHTML=`<form novalidate>
  <header><h2 id="profile-sheet-title">Meu perfil nesta sala</h2><button type="button" data-cancel aria-label="Fechar perfil da sala">×</button></header>
  <div class="profile-sheet-hero"><div class="profile-sheet-preview" data-preview></div><strong data-preview-name></strong><span>É assim que a turma vê você</span></div>
  <label class="profile-sheet-name">Seu nome<input name="name" maxlength="24" required autocomplete="nickname" value="${esc(person.name)}"></label>
  <fieldset><legend>Escolha um avatar</legend><div class="profile-sheet-grid" data-grid></div></fieldset>
  <div class="profile-sheet-photo"><label class="profile-sheet-upload">Usar uma foto<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label><button type="button" data-camera>Tirar foto agora</button></div>
  <p class="profile-sheet-status" role="status"></p>
  <footer><button type="button" class="profile-sheet-quiet" data-cancel>Cancelar</button><button class="profile-sheet-save" type="submit">Salvar</button></footer>
 </form>`;
 const preview=dialog.querySelector('[data-preview]'),grid=dialog.querySelector('[data-grid]'),status=dialog.querySelector('[role=status]'),nameInput=dialog.querySelector('[name=name]'),nameOut=dialog.querySelector('[data-preview-name]');
 const paint=()=>{
  grid.innerHTML=`${photo?`<button type="button" data-guest-avatar="photo" aria-label="Minha foto" aria-pressed="${avatar===photo}">${avatarContent(photo)}</button>`:''}${avatars.map((a,index)=>`<button type="button" style="--i:${index}" data-guest-avatar="${index}" aria-label="Avatar ${index+1}" aria-pressed="${avatar===a}">${avatarContent(a)}</button>`).join('')}`;
  preview.innerHTML=avatarContent(avatar);
  // Reinicia a animação do retrato a cada troca.
  preview.classList.remove('pop');void preview.offsetWidth;preview.classList.add('pop');
 };
 const paintName=()=>{nameOut.textContent=nameInput.value.trim()||'Sem nome';};
 const usePhoto=async file=>{status.textContent='';try{photo=await participantPhoto(file);avatar=photo;paint();}catch(error){status.textContent=error.message;}};
 dialog.addEventListener('click',e=>{
  const choice=e.target.closest('[data-guest-avatar]');
  if(choice){avatar=choice.dataset.guestAvatar==='photo'?photo:avatars[Number(choice.dataset.guestAvatar)];paint();grid.querySelector('[aria-pressed=true]')?.focus();}
  if(e.target.closest('[data-cancel]'))dialog.close();
 });
 nameInput.addEventListener('input',paintName);
 dialog.querySelector('[data-camera]').onclick=async()=>{try{const file=await takePhoto();if(file)await usePhoto(file);}catch(error){status.textContent=error.message;}};
 dialog.querySelector('[type=file]').onchange=e=>{if(e.target.files[0])usePhoto(e.target.files[0]);e.target.value='';};
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();
  const name=nameInput.value.trim();
  if(!name){status.textContent='Escreva seu nome para a turma reconhecer você.';nameInput.focus();return;}
  const submit=dialog.querySelector('[type=submit]');submit.disabled=true;submit.textContent='Salvando…';
  try{await save(name,avatar);dialog.close();}catch(error){status.textContent=error.message;submit.disabled=false;submit.textContent='Salvar';}
 };
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);paint();paintName();dialog.showModal();
}
// Painel "N conectados": lista da turma com busca, time, pontos e (para o professor) remover da sala.
export function manageParticipants(state,kick,control,{host=false}={}){
  // Nunca deixa de abrir: se a lista não veio (jogo em andamento, snapshot
  // antigo), monta com o que existe em vez de estourar e fechar mudo.
  if(!Array.isArray(state?.ranking)){
    const people=(state?.teams||[]).flatMap(team=>(team.members||[]).map(member=>({...member,score:member.score||0})));
    state={...state,ranking:people};
  }
  const dialog=document.createElement('dialog');dialog.className='participants-sheet';
  const people=[...(state.ranking||[])].sort((a,b)=>Number(b.online)-Number(a.online)||a.name.localeCompare(b.name,'pt-BR')),online=people.filter(p=>p.online).length,teams=state.teams||[];
  const teamOf=p=>teams.find(team=>(team.members||[]).some(member=>member.id===p.id));
  const row=p=>{const team=teamOf(p);return `<li class="ps-person" data-name="${esc(p.name.toLowerCase())}" data-online="${p.online}" data-me="${p.id===state.me?.id}"${team?` style="--team:${esc(team.color)}"`:''}><span class="ps-avatar">${avatarContent(p.avatar)}</span><div class="ps-text"><strong>${esc(p.name)}${p.id===state.me?.id?' <em>você</em>':''}</strong><small>${p.online?'Conectado':'Saiu da sala'}${team?' · Time '+esc(team.name):''}${p.score?' · '+p.score.toLocaleString('pt-BR')+' pts':''}</small></div>${kick?`<button type="button" class="ps-remove" data-remove-player="${esc(p.id)}">Remover</button>`:''}</li>`;};
  // Botão de atalho: editar/criar times sem sair da lista de participantes.
  const teamsShortcut = (host && teams.length && state.game?.type === 'teams')
    ? `<div class="ps-teams-actions"><button type="button" class="btn secondary small" data-action="edit-teams">Editar times</button><button type="button" class="btn secondary small" data-game-do="shuffle">Sortear times de novo</button></div>`
    : '';
  dialog.innerHTML=`<header><div><h2>Participantes</h2><p><b>${online}</b> ${online===1?'conectado':'conectados'}${people.length>online?' · '+(people.length-online)+' fora':''}</p></div><button type="button" data-close aria-label="Fechar participantes">×</button></header>
    ${people.length>6?'<input type="search" class="ps-search" placeholder="Procurar pelo nome" aria-label="Procurar participante">':''}
    ${teams.length?`<div class="ps-teams">${teams.map(team=>`<span style="--team:${esc(team.color)}">${team.photo?`<img class="team-photo" src="${esc(team.photo)}" alt="">`:''}<b>Time ${esc(team.name)}</b> <small>${(team.members||[]).length}</small></span>`).join('')}</div>${teamsShortcut}`:''}
    <ul class="ps-list">${people.map(row).join('')||'<li class="ps-empty">A turma ainda não entrou.</li>'}</ul>`;
  dialog.addEventListener('input',e=>{if(!e.target.matches('.ps-search'))return;const term=e.target.value.trim().toLowerCase();for(const item of dialog.querySelectorAll('.ps-person'))item.hidden=Boolean(term)&&!item.dataset.name.includes(term);});
  dialog.addEventListener('click',e=>{
    const button=e.target.closest('[data-remove-player]');
    if(button){
      // Dois toques para remover: o primeiro só pede confirmação.
      if(button.dataset.confirm!=='true'){for(const other of dialog.querySelectorAll('[data-confirm=true]')){other.dataset.confirm='false';other.textContent='Remover';}button.dataset.confirm='true';button.textContent='Confirmar';return;}
      kick(button.dataset.removePlayer);button.closest('li').remove();return;
    }
    const editTeams=e.target.closest('[data-action="edit-teams"]');
    if(editTeams){dialog.close();editTeamsDialog(state,control);return;}
    if(e.target.closest('[data-game-do="shuffle"]')){if(host && control)control('game',{do:'shuffle'});dialog.close();return;}
    if(e.target.closest('[data-close]')||e.target===dialog)dialog.close();
  });
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}

// Edição rápida de times direto da lista de participantes: quantidade, nomes
// (e foto, tocando na miniatura) sem sair da tela nem recomeçar do zero.
function editTeamsDialog(state,control){
  const teams=(state.teams||[]).slice(),me=state.me?.id;
  const dialog=document.createElement('dialog');dialog.className='participants-sheet';
  const countInput=`<select name="team-count" data-team-count>${Array.from({length:9},(_,i)=>i+2).map(count=>`<option value="${count}"${count===teams.length?' selected':''}>${count} times</option>`).join('')}</select>`;
  const rows=teams.map((team,i)=>{
    const kind=(team.members||[]).length===1?'pessoa':'pessoas';
    const meSuffix=(team.members||[]).some(m=>m.id===me)?' · você':'';
    return `<li class="ps-team-edit" style="--team:${esc(team.color)}">
    <span class="ps-avatar">${team.photo?`<img class="team-photo" src="${esc(team.photo)}" alt="">`:`<b>${esc((team.name||'Time').slice(0,1).toUpperCase())}</b>`}</span>
    <label>Nome do time<input type="text" maxlength="24" name="team-name-${i}" value="${esc(team.name)}" data-team-index="${i}"></label>
    ${team.members?`<small>${(team.members||[]).length} ${kind}${meSuffix}</small>`:''}
  </li>`;
  }).join('');
  dialog.innerHTML=`<header><div><h2>Editar times</h2><p>Quantidade e nomes das equipes.</p></div><button type="button" data-close aria-label="Fechar">×</button></header>
    <div class="ps-teams"><label>Quantos times ${countInput}</label></div>
    <ul class="ps-list ps-team-list">${rows||'<li class="ps-empty">Sem times.</li>'}</ul>
    <footer><button type="button" class="btn secondary small" data-cancel>Cancelar</button><button type="button" class="btn primary small" data-save-teams>Salvar times</button></footer>`;
  dialog.addEventListener('click',e=>{
    if(e.target.closest('[data-close]')||e.target.closest('[data-cancel]')||e.target===dialog){dialog.close();return;}
    if(e.target.closest('[data-save-teams]')){
      const countSel=dialog.querySelector('[name=team-count]');
      const count=Number(countSel?.value||teams.length);
      const changes=[];
      for(const input of dialog.querySelectorAll('[name^="team-name-"]')){
        const index=Number(input.dataset.teamIndex),name=input.value.trim()||teams[index].name;
        if(name!==teams[index].name)changes.push({team:index,name});
      }
      if(count!==teams.length&&control)control('game',{do:'team-count',count});
      for(const ch of changes)if(control)control('game',{do:'team-rename',team:ch.team,name:ch.name});
      dialog.close();
    }
  });
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}
