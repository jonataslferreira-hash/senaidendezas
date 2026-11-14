import {takePhoto} from './camera-photo.js';
import {avatars} from './content.js';
import {avatarContent,isPhotoAvatar} from './player-avatar.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function participantPhoto(file){
 if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>15*1024*1024)throw Error('Escolha uma imagem de até 15 MB.');const bitmap=await createImageBitmap(file).catch(()=>{throw Error('Não foi possível abrir a foto. Tente outra imagem PNG, JPEG ou WebP.');}),canvas=document.createElement('canvas');canvas.width=canvas.height=96;const side=Math.min(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,96,96);bitmap.close();const data=canvas.toDataURL('image/webp',.8);if(!isPhotoAvatar(data))throw Error('A foto ficou grande demais. Tente outra imagem.');return data;
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
export function manageParticipants(state,kick){const dialog=document.createElement('dialog');dialog.className='participant-dialog';dialog.innerHTML=`<header><h2>Participantes · ${state.ranking.filter(p=>p.online).length}</h2><button type="button" aria-label="Fechar participantes">×</button></header><div>${state.ranking.filter(p=>p.online).map(p=>`<article class="manage-participant">${avatarContent(p.avatar)}<strong>${esc(p.name)}</strong><span>${p.online?'Conectado':'Offline'}</span>${kick?`<button type="button" data-remove-player="${p.id}">Remover da sala</button>`:''}</article>`).join('')||'<p>A turma ainda não entrou.</p>'}</div>`;dialog.addEventListener('click',e=>{const id=e.target.closest('[data-remove-player]')?.dataset.removePlayer;if(id){kick(id);e.target.closest('article').remove();}else if(e.target.closest('header button'))dialog.close();});dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();}
