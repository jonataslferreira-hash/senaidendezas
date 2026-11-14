import {studioIcon} from './studio-icons.js';
import {routeParams} from './editor-route.js';
import {takePhoto} from './camera-photo.js';
import {GameLayout} from './game-layout.js';
import {GameAudio} from './game-audio.js';
import {quizMarkup,leaderboardMarkup} from './game-ui.js';
import {Simulations} from './simulations.js';
import {loadSlideFonts} from './fonts.js';
import {editParticipant,participantPhoto,manageParticipants} from './participant-profile.js';
import {scanRoomCode} from './qr-reader.js';
import './school-upgrade.css';
import {presentationSlide,mobileMarkup} from './slide-display.js';
import {fillAssetImages} from './assets.js';
import {FocusView,focusButton} from './focus-view.js';
import './classroom-display.css';
import { avatarContent,isPhotoAvatar } from './player-avatar.js';
import { PptxAnimations } from './pptx-animations.js';
import { loadPublicPresentation } from './public-presentations.js';
import brandUrl from './assets/brand.svg';
import { PageMotion } from './motion.js';
import { avatars } from './content.js';
import { demoLesson, validateLesson, clone, imageURL } from './lessons.js';
import { loadPresenterSettings, savePresenterSettings, presentationTools, pinnedInvite, liveEditDialog, qrCorners } from './presenter.js';
import './presentation.css';
import { canvasMarkup, CanvasModels } from './canvas-view.js';
import { Studio } from './studio.js';
import './studio.css';
import './documents.css';
import { lobbyMarkup } from './lobby.js';
import './quiz-party.css';
let activeLesson = demoLesson();
let slides = activeLesson.slides;
import { Classroom } from './network.js';
import { Room } from './room.js';
import { HardwareViewer } from './models.js';
import QRCode from 'qrcode';
import './style.css';
import './experience.css';
import './appearance.css';
import './quiz-layout.css';
import './font-picker.css';
import './studio-polish.css';
import './studio-workflows.css';
import './storage-ai-remake.css';

const icons = {
  chip: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4M9 9h6v6H9z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M3 7l9 5v10m-4-17 9 5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/>',
  collapse: '<path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  volume: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m-6 0 6-6"/>',
  trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H3v3a4 4 0 0 0 5 4m8-7h5v3a4 4 0 0 1-5 4m-4 1v5m-5 3h10m-8-3h6v3H9z"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5m10-5A8 8 0 0 0 5 5L4 7m16 10-1 2a8 8 0 0 1-14-2"/>',
  book: '<path d="M12 6C8 3 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-1-10 2Zm0 0v15"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.chip}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = document.querySelector('#app');
const viewer = new HardwareViewer({ defer: true });
const canvasModels = new CanvasModels();
const focusView = new FocusView();
const pageMotion = new PageMotion();
const pptxAnimations=new PptxAnimations();const simulations=new Simulations(),gameAudio=new GameAudio(),gameLayout=new GameLayout();
let classroom, state, host = false, demo = false, busy = false, selectedAvatar = avatars[0];
let avatarChanged=false,joinNameTouched=false,joinNameDraft='',guestPhotoPending=false;
let shareOpen = false, solutionOpen = false, lastSlide = -1, localModel = 'ssd', localExploded = true;
let status = 'offline', statusMessage = '', timerOffset = 0, music = false, audio, musicTimer, audioStep = 0;
let editorLaunch=false, readOnlyPresentation=false, publicPresentationToken='', sharedLoading=Boolean(new URLSearchParams(location.search).get('presentation')), sharedError='';
let clockTimer;
const trackPlayer = new Audio(); let playingTrack = null;
trackPlayer.dataset.soundtrack = ''; trackPlayer.hidden = true; document.body.append(trackPlayer);
let demoTimer, toastTimer, controlsTimer, editDraft = null, editIndex = -1, editError = '', imageText = false;
const presenterSettings = loadPresenterSettings();
const phoneLayout=matchMedia('(max-width: 800px)');
phoneLayout.addEventListener('change',()=>{if(state?.phase==='lesson')render();});
const qrCache = new Map();
const params = routeParams();
let codeDraft = (params.get('s') || '').replace(/\D/g, '').slice(0, 6);
const studio = new Studio(app, { render, toast, joinForm, preview, remoteAction:action, present: (lesson,startIndex,fromEditor) => connectSession({host:true,lesson,startIndex,fromEditor}) });
if (codeDraft) studio.view = 'join';

function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4500);
}
function brand() { return `<button class="brand" data-action="home" aria-label="Storage Lab, início"><img class="lab-logo" src="${brandUrl}" alt=""><span>storage<span class="brand-light">lab</span><span class="brand-period">.</span></span></button>`; }
function soundButton() {
  const enabled=music&&!audioBlocked;
  return `<button class="icon-btn" data-action="sound" aria-label="${enabled?'Desativar':'Ativar'} áudio" title="Áudio da apresentação">${icon(enabled?'volume':'mute')}</button>`;
}
function header() {
  return `<header class="header">${brand()}<div class="header-right">${state?`${!host&&state.phase==='lesson'?'':participantCount()}${host&&!readOnlyPresentation&&!demo&&state.phase==='lesson'?'<button class="btn secondary small" data-action="edit-current-slide">Editar slide</button>':''}${!host&&state.me&&state.phase!=='lesson'?'<button class="my-room-avatar" data-action="edit-player" aria-label="Editar meu perfil na sala">'+avatarContent(state.me.avatar||selectedAvatar)+'</button>':''}${!host?`<span data-room-controller data-room-code="${esc(state.code)}">${studio.remote.roomButton(state.code)}</span>`:''}<span class="connection ${status==='online'||demo?'connected':''}"><span></span>${readOnlyPresentation&&demo?'Apresentação':demo?'Prévia':status==='online'?'Ao vivo':'Reconectando'}</span>${host||state.me?soundButton():''}`:''}</div></header>`;
}
function modelPanel(landing = false) {
  const custom = state && slides[state.slide]?.customModel;
  const choices = [['ssd', 'SSD SATA'], ['hdd', 'HDD'], ['nvme', 'SSD NVMe'], ...(custom ? [['custom', 'Meu modelo']] : [])];
  return `<section class="model-panel ${landing ? 'hero-model' : ''}" aria-label="Explorador de hardware em 3D">
    <div class="model-heading"><span class="eyebrow">${icon('cube')} HARDWARE EXPLORER</span><span class="live-pill">3D INTERATIVO</span></div>
    <div class="model-tabs" role="group" aria-label="Escolher modelo">${choices.map(([type, label]) => `<button class="model-tab ${localModel === type ? 'active' : ''}" data-model="${type}" aria-pressed="${localModel === type}" ${state && !host && type !== state.model ? 'disabled title="O professor escolhe o modelo deste slide"' : ''}>${label}</button>`).join('')}</div>
    <div id="viewer-slot"></div>
    <div class="model-actions"><button ${localModel === 'custom' ? 'hidden' : ''} class="subtle-btn ${localExploded ? 'selected' : ''}" data-action="explode" aria-pressed="${localExploded}">${icon('layers')} ${localExploded ? 'Fechar modelo' : 'Abrir modelo'}</button><button class="icon-btn" data-action="reset-model" aria-label="Restaurar câmera">${icon('refresh')}</button></div>
    <span class="model-footnote">Modelo didático · proporções e componentes simplificados</span>
  </section>`;
}
function animationGroups() {
  const slide=slides[state.slide],ids=new Set(slide.elements?.map(e=>e.id));
  return [...new Set((slide.animations||[]).filter(a=>ids.has(a.id)).map(a=>a.group||0))].sort((a,b)=>a-b);
}
function nextBuildStep(){return animationGroups().find(group=>group>(state.animationStep||0));}
function pendingPptxBuild(){return state&&nextBuildStep()!==undefined;}
function joinForm() {
  const user=studio.account.user,photo=studio.account.vault.list().find(s=>s.user.id===user?.id)?.avatar_thumbnail;
  if(user||!avatarChanged)selectedAvatar=isPhotoAvatar(photo)?photo:avatars[0];
  const name=joinNameTouched?joinNameDraft:user?.user_metadata?.display_name||'';
  return `<form id="join-form" class="join-card compact-join">
    <div class="join-card-head"><span class="join-card-mark">${studioIcon('join')}</span><div><h2>Entrar na sala<span>.</span></h2><p>Digite o código de 6 números que o professor mostrou.</p></div></div>
    <label for="room-code">Código da sala</label><input id="room-code" name="code" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" maxlength="6" placeholder="000 000" value="${esc(codeDraft)}" required>
    <label for="player-name">Como podemos chamar você?</label><input id="player-name" name="name" autocomplete="nickname" maxlength="24" placeholder="Seu nome ou apelido" value="${esc(name.slice(0,24))}" required>
    ${user?'':`<label id="avatar-label">Avatar no ranking</label><div class="avatar-picker" role="group" aria-labelledby="avatar-label">${isPhotoAvatar(selectedAvatar)?`<button type="button" class="avatar active" data-avatar="${selectedAvatar}" aria-label="Minha foto enviada" aria-pressed="true">${avatarContent(selectedAvatar)}</button>`:''}${avatars.map(a=>`<button type="button" class="avatar ${a===selectedAvatar?'active':''}" data-avatar="${a}" aria-label="Avatar ${a}" aria-pressed="${a===selectedAvatar}">${avatarContent(a)}</button>`).join('')}</div>`}
    <div class="join-utilities ${user?'signed-in':''}">
      ${user?'':`<button class="btn secondary" type="button" data-action="choose-guest-photo">${studioIcon('image')}<span>Escolher minha foto</span></button>
      <input type="file" data-guest-photo accept="image/png,image/jpeg,image/webp,image/gif" hidden>
      <button class="btn secondary" type="button" data-action="take-guest-photo">${studioIcon('camera')}<span>Tirar minha foto</span></button>`}
      <button class="btn secondary" type="button" data-action="scan-qr">${studioIcon('qr')}<span>Ler QR Code</span></button>
    </div>
    <button class="btn primary full" type="submit" ${busy||guestPhotoPending?'disabled':''}>${busy?'Conectando…':'Entrar na sala'} ${icon('arrow')}</button>
  </form>`;
}
function participantCount() {
  if(demo)return '';
  const count=state.ranking.filter(person=>person.online).length;
  const label=`${icon('users')} ${count} conectado${count===1?'':'s'}`;
  return count?`<button class="live-participants" data-action="participants" aria-label="${count} conectado${count===1?'':'s'} · Ver participantes">${label}</button>`:`<span class="live-participants">${label}</span>`;
}
function slideMedia(slide) {
  if (slide.kind === 'model') return modelPanel();
  if (slide.kind === 'image' && slide.image) return `<figure class="lesson-image"><img src="${esc(slide.image)}" alt="${esc(slide.imageAlt)}"><figcaption>${esc(slide.imageAlt)}</figcaption></figure>`;
  return '';
}
function fullscreenButton() {
  const active=Boolean(document.fullscreenElement);
  const label=active?'Sair da tela cheia':host?'Apresentar em tela cheia':'Ampliar slide';
  return `<button class="btn secondary small presentation-icon" data-action="fullscreen" aria-label="${label}" title="${label}">${icon(active?'collapse':'expand')}</button>`;
}
function presentationTop(){
  return `<div class="document-top"><div class="document-top-actions room-actions">${host?`
    <div class="presentation-start"><select id="document-page" aria-label="Ir para página">${slides.map((slide,i)=>`<option value="${i}" ${state.slide===i?'selected':''}>${i+1} · ${esc(slide.title)}</option>`).join('')}</select>
      ${!demo?`<button class="btn secondary small presentation-icon qr-toggle" data-action="toggle-qr" aria-label="QR Code" aria-pressed="${presenterSettings.qrVisible}">${studioIcon('qr')}</button>`:''}</div>
    ${!demo?`<button class="btn secondary small room-code" data-action="share">SALA <strong>${esc(state.code)}</strong></button>`:'<span></span>'}
    <div class="presentation-end">${presentationTools({host,demo,state,settings:presenterSettings,imageText,compact:true})}${readOnlyPresentation&&demo?'<button class="btn secondary small" data-action="connect-public-room">Conectar turma</button>':''}${document.fullscreenElement?soundButton():''}${fullscreenButton()}</div>
    `:`<span class="following-label"><span class="status-dot"></span> Acompanhando o professor</span><div class="viewer-tools">${participantCount()}${state.me?'<button class="my-room-avatar" data-action="edit-player" aria-label="Editar meu perfil na sala" title="Editar meu perfil">'+avatarContent(state.me.avatar||selectedAvatar)+'</button>':''}${fullscreenButton()}</div>`}<button class="btn secondary small exit-presentation" data-action="leave">↩ Sair</button></div></div>`;
}
function documentLesson(slide) {
  const canvas = slide.kind === 'canvas',mobile=!host&&phoneLayout.matches;
  const audioTrigger = host ? slide.audio?.trigger : '';
  return `${header()}<main class="document-classroom ${mobile?'mobile-companion':''}">${presentationTop()}
    ${status !== 'online' && !demo ? '<div class="connection-banner" role="status">Reconectando à sala. <button class="text-btn" data-action="reconnect">Reconectar</button></div>' : ''}
    ${mobile?mobileMarkup(slides[state.slide]):`<figure class="document-stage ${canvas ? 'canvas-stage' : ''}" ${!canvas&&audioTrigger==='background'?'data-play-slide-audio="background" tabindex="0" aria-label="Tocar áudio do slide"':''}>${canvas ? canvasMarkup(slide,{audioTrigger,audioHotspots:host}) : `<img ${slide.image?'src="'+esc(slide.image)+'"':slide.assetId?'data-asset-id="'+esc(slide.assetId)+'"':''} alt="${esc(slide.imageAlt || slide.title)}"><figcaption class="sr-only">${esc(slide.title)}</figcaption>`}${host?'':focusButton(slides[state.slide])}</figure>`}
    ${slide.prompt ? `<section class="document-discussion"><strong>${esc(slide.prompt)}</strong><button class="text-btn" data-action="solution">${solutionOpen ? 'Ocultar' : 'Conferir'} explicação</button>${solutionOpen ? `<p>${esc(slide.answer)}</p>` : ''}</section>` : ''}
    <footer class="document-footer"><div class="document-nav"><span class="slide-counter"><strong>${state.slide + 1}</strong> / ${slides.length}</span>${host ? `${state.totalQuestions?'<button class="text-btn" data-action="quiz">Ir para o quiz</button>':''}<button class="icon-btn bordered" data-action="previous" aria-label="Slide anterior" ${state.slide === 0 && !(state.animationStep>0) ? 'disabled' : ''}>${icon('left')}</button>${state.activity&&state.activity.slideIndices.at(-1)===state.slide&&!pendingPptxBuild()?`<button class="btn primary small" data-action="${state.activity.hasNext?'next-stage':'finish'}">${state.activity.hasNext?'Próxima etapa →':'Encerrar aula'}</button>`:state.slide < slides.length - 1 || pendingPptxBuild() ? `<button class="btn primary small" data-action="next-slide">Próximo ${icon('right')}</button>` : `<button class="btn primary small" data-action="${state.totalQuestions ? 'quiz' : 'finish'}">${state.totalQuestions ? 'Iniciar quiz' : 'Encerrar aula'} ${icon('check')}</button>`}` : '<span class="following-label">Sincronizado com a aula</span>'}</div></footer></main>${shareOpen ? shareDialog() : ''}`;
}
function lesson() { return documentLesson(presentationSlide(slides[state.slide])); }
function pollMarkup() {
  const p = state.poll, closed = state.phase === 'poll-results';
  return `${header()}<main class="poll-stage"><span class="poll-eyebrow">▥ ENQUETE AO VIVO · SEM PONTUAÇÃO</span><h1>${esc(p.text)}</h1><p>${closed ? 'Votação encerrada. Vamos conversar sobre as escolhas?' : 'Cada opinião abre uma nova conversa.'}</p><div class="poll-options">${p.options.map((option,i) => {
    const percent = p.total ? Math.round(p.counts[i] / p.total * 100) : 0;
    return `<button class="poll-option ${p.choice === i ? 'chosen' : ''}" data-poll-vote="${i}" ${closed || p.choice !== null || host && !demo ? 'disabled' : ''}><span class="poll-option-label"><b>${'ABCD'[i]}</b>${esc(option)}${p.choice === i ? ' ✓' : ''}</span><span class="poll-result">${percent}% · ${p.counts[i]} voto${p.counts[i] === 1 ? '' : 's'}</span><span class="poll-bar" style="--vote-width:${percent}%"></span></button>`;
  }).join('')}</div><p role="status">${p.total} voto${p.total === 1 ? '' : 's'} recebido${p.total === 1 ? '' : 's'}${p.choice !== null ? ' · Seu voto está registrado!' : ''}</p>${host ? `<div class="poll-actions">${!closed ? '<button class="btn primary" data-action="close-poll">Encerrar votação</button>' : ''}<button class="btn secondary" data-action="${state.activity?.type==='poll'?'next-stage':'back-lesson'}">${state.activity?.type==='poll'?(state.activity.hasNext?'Próxima etapa →':'Concluir enquete'):'Voltar ao slide '+(state.slide+1)}</button></div>` : `<p>${closed ? 'Aguarde o professor voltar à apresentação.' : 'Escolha uma opção. Você pode votar uma vez nesta rodada.'}</p>`}</main>`;
}
function rankingTable(full = false) {
  const rank = full ? state.ranking : state.ranking.slice(0, 5);
  return `<div class="ranking-list">${rank.length ? rank.map((p, i) => `<div class="rank-row ${state.me?.id === p.id ? 'is-me' : ''}"><span class="rank-position">${i === 0 ? '♛' : String(i + 1).padStart(2, '0')}</span><span class="rank-avatar">${avatarContent(p.avatar)}</span><div class="rank-person"><strong>${esc(p.name)}${state.me?.id === p.id ? ' <small>você</small>' : ''}</strong><span>${p.correct} acerto${p.correct === 1 ? '' : 's'}${p.online ? '' : ' · offline'}</span></div><strong class="rank-score">${p.score.toLocaleString('pt-BR')}<small> pts</small></strong></div>`).join('') : '<p class="empty-state">O ranking começa com a primeira resposta.</p>'}</div>`;
}
function quiz(){return quizMarkup(state,{header,host,demo,status,shareDialog,shareOpen});}
function finished() {
  return leaderboardMarkup(state,{header,host,offset:timerOffset,final:true});
}

function joinUrl() {
  const current=new URL(location.pathname,location.origin);
  let url=current;
  if (import.meta.env.DEV && !routeParams().has('localSignal') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    try { url=new URL(localStorage.getItem('sl-public-url')||'https://jonataslferreira-hash.github.io/senaidendezas/'); } catch { /* use current URL */ }
  }
  url.search='';
  if(import.meta.env.DEV && routeParams().has('localSignal'))url.searchParams.set('localSignal','');
  url.searchParams.set('s',state.code);
  return url.href;
}
function shareDialog() {
  const url=joinUrl();
  return `<div class="modal-backdrop"><section class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button class="icon-btn close-modal" data-action="close-share" aria-label="Fechar convite">${icon('close')}</button><span class="eyebrow purple-text">A AULA FICA MELHOR JUNTO</span><h2 id="share-title">Conecte a turma<span>.</span></h2><p>Aponte a câmera. Escolha um avatar. Entre na aula.</p><div class="qr-wrap"><img id="room-qr" width="230" height="230" alt="QR Code para entrar nesta sala"></div><span class="eyebrow">OU ENTRE COM O CÓDIGO</span><div class="big-code">${esc(state.code.slice(0, 3))}<span> </span>${esc(state.code.slice(3))}</div><div class="share-link"><input readonly aria-label="Link de convite" value="${esc(url)}"><button class="icon-btn" data-action="copy-link" aria-label="Copiar link">${icon('copy')}</button></div>${import.meta.env.DEV&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&!routeParams().has('localSignal')?`<details><summary>Configurar endereço público</summary><label for="public-url">URL publicada no GitHub Pages</label><input id="public-url" type="url" placeholder="https://usuario.github.io/senaidendezas/"><button class="btn secondary small" data-action="save-url">Salvar endereço</button></details>`:''}</section></div>`;
}
function render() {
  const slideMotionKey = state?.phase === 'lesson' ? `${activeLesson.id}:${state.code}:${state.slide}` : '';
  const outgoingSlide = pageMotion.captureSlide(app, slideMotionKey, slides[state?.slide]?.transition);
  const previousOutline=app.querySelector('.editor-outline');
  const outlineScroll=previousOutline?.scrollTop;
  const previewsScroll=app.querySelector('.mobile-slide-previews')?.scrollLeft;
  const outlineLesson=previousOutline?.closest('[data-outline-lesson]')?.dataset.outlineLesson;
  studio.editorMusic.setEditing(!state && studio.view === 'editor');
  const form = document.querySelector('#join-form');
  const draftName = form?.querySelector('#player-name')?.value;
  if (form) codeDraft = form.querySelector('#room-code').value;
  viewer.el.remove();
  app.dataset.readOnly = String(readOnlyPresentation);
  app.dataset.role = state ? host ? 'presenter' : 'student' : 'studio';
  // Aula sem quiz não tem tela de encerramento: quem apresenta volta direto
  // para onde estava e quem assiste volta ao início.
  if (state?.phase === 'finished' && !state.totalQuestions) { focusView.close(); leave(); return; }
  app.classList.toggle('quiz-party', Boolean(state && state.phase !== 'lesson'));
  const markup = sharedLoading || busy && host && !state ? `${header()}<main class="public-loading"><p role="status">Carregando apresentação…</p></main>` : sharedError ? `${header()}<main class="public-loading"><h1>Apresentação indisponível</h1><p>${esc(sharedError)}</p><button class="btn secondary" data-action="home">Voltar</button></main>` : !state ? studio.markup() : state.phase === 'lesson' ? lesson() : ['lobby', 'countdown'].includes(state.phase) ? lobbyMarkup(state, { host, demo, header, shareDialog, shareOpen }) : state.phase === 'finished' ? finished() : state.phase==='leaderboard'?leaderboardMarkup(state,{header,host,offset:timerOffset}):state.poll ? pollMarkup() : quiz();
  const chatSlots = '[data-chat-slot], [data-social-slot]';
  const currentAIPage = app.querySelector('.storage-ai-page');
  const keepAI = !state && !sharedLoading && !sharedError && !(busy && host) &&
    studio.view === 'storage-ai' && currentAIPage?.dataset.account === (studio.account.user?.id || '');
  if (keepAI) {
    const next = document.createElement('template');
    next.innerHTML = markup;
    const shell = currentAIPage.closest('.studio-shell');
    for (const child of [...shell.children]) {
      if (child.matches('.studio-body, .studio-rail, [data-account-dialog]') || child.matches(chatSlots)) continue;
      child.remove();
    }
    for (const child of [...next.content.querySelector('.studio-shell').children]) {
      if (!child.matches('.studio-body, .studio-rail, [data-account-dialog]') && !child.matches(chatSlots)) shell.append(child);
    }
    studio.chat.paint();
    studio.social.paint();
  } else if (!state && !sharedLoading && !sharedError && (studio.chat.open || studio.social.open) && app.querySelector(chatSlots)) {
    const next = document.createElement('template');
    next.innerHTML = markup;
    next.content.querySelectorAll(chatSlots).forEach(slot=>slot.remove());
    for (const child of [...app.children]) if (!child.matches(chatSlots)) child.remove();
    app.prepend(next.content);
    studio.chat.paint();
    studio.social.paint();
  } else {
    app.innerHTML = markup;
  }
  if (state?.phase === 'lesson') {
    app.insertAdjacentHTML('beforeend', pinnedInvite({ host, demo, state, settings: presenterSettings }));
    if (editDraft) app.insertAdjacentHTML('beforeend', liveEditDialog(editDraft, editError));
  }
  app.dataset.transition = state?.phase === 'lesson' ? slides[state.slide]?.transition || 'slide' : 'slide';
  if(state)app.insertAdjacentHTML('beforeend','<div data-remote-dialog></div>');
  studio.remote.paint();
  studio.remote.setPresentation(state&&host&&!demo?{code:state.code,title:activeLesson.title,slide:state.slide,total:slides.length,phase:state.phase,note:state.phase==='lesson'?slides[state.slide]?.note?.slice(0,2000):''}:null);
  syncPresentationMode();
  if (editDraft) for (const el of app.querySelectorAll('.header, .classroom, .document-classroom, .presentation-toolbar, .pinned-room-qr')) el.inert = true;
  if (!state && !sharedLoading && !(busy && host)) studio.afterRender();
  const nextPreviews=app.querySelector('.mobile-slide-previews');
  if(nextPreviews&&previewsScroll!=null&&outlineLesson===app.querySelector('[data-outline-lesson]')?.dataset.outlineLesson)nextPreviews.scrollLeft=previewsScroll;
  const nextOutline=app.querySelector('.editor-outline');
  if(nextOutline&&outlineScroll!=null&&outlineLesson===nextOutline.closest('[data-outline-lesson]')?.dataset.outlineLesson){
    nextOutline.scrollTop=outlineScroll;
  }
  if (!state && joinNameTouched && draftName!==undefined && document.querySelector('#player-name')) document.querySelector('#player-name').value = draftName;
  const slot = document.querySelector('#viewer-slot');
  if (slot) { slot.append(viewer.el); if (localModel === 'custom' && slides[state.slide]?.customModel) viewer.setCustomModel(slides[state.slide].customModel); else viewer.setModel(localModel, localExploded); requestAnimationFrame(() => viewer.resize()); }
  canvasModels.mount(state?.phase === 'lesson' ? app : null, state?.phase === 'lesson' ? presentationSlide(slides[state.slide]) : null);
  const upcoming = state?.phase === 'lesson' ? slides[state.slide + 1] : null;
  canvasModels.preload(upcoming ? presentationSlide(upcoming) : null);
  focusView.sync(state?.phase==='lesson'?slides[state.slide]?.id:'');
  fillAssetImages(app);simulations.mount(state?.phase==='lesson'?app:null);if(state?.phase==='lesson')loadSlideFonts(slides[state.slide],activeLesson.customFonts);
  if (state && (shareOpen || (host && !demo && presenterSettings.qrVisible && state.phase === 'lesson'))) {
    const url = joinUrl();
    const setQR = src => { if (state && joinUrl() === url) for (const image of document.querySelectorAll('#room-qr, [data-pinned-qr]')) image.src = src; };
    if (qrCache.has(url)) setQR(qrCache.get(url));
    else QRCode.toDataURL(url, { width: 460, margin: 2 }).then(src => { qrCache.set(url, src); setQR(src); }).catch(() => toast('Não foi possível gerar o QR Code. Use o link ou código.'));
  }
  if(state?.phase==='lesson'){pptxAnimations.mount(app,slides[state.slide],activeLesson.id+':'+state.slide,state.animationStep||0);}else{pptxAnimations.key=null;}
  const motionKey=state
    ? `${activeLesson.id}:${state.phase}:${state.slide}:${state.questionIndex}`
    : studio.view==='editor'?`editor:${studio.draft?.id||''}`:studio.view;
  pageMotion.mount(app, {key:motionKey,kind:state?.phase||studio.view,slide:state?.slide||0});
  pageMotion.showOutgoingSlide(app, outgoingSlide);
  gameLayout.mount(app);
  updateClock();
  const ticking = ['question', 'countdown'].includes(state?.phase);
  if (ticking && !clockTimer) clockTimer = setInterval(updateClock, 100);
  else if (!ticking && clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  updateMusic();
}
function receive(next) {
  const newPage = !state || next.slide !== state.slide || next.questionIndex !== state.questionIndex || (next.phase !== state.phase && next.phase !== 'reveal');
  if (next.lesson) { activeLesson = next.lesson; slides = activeLesson.slides; }
  timerOffset = next.serverTime - Date.now();
  if (!state || next.slide !== lastSlide || next.model !== state.model || next.exploded !== state.exploded) {
    localModel = next.model; localExploded = next.exploded;
  }
  if (next.slide !== lastSlide) { solutionOpen = false; }
  lastSlide = next.slide;
  state = next; render();
  if (newPage) window.scrollTo(0, 0);
}
function connection(next, message = '') {
  if(next==='removed'){leave();studio.view='join';render();toast(message);return;}
  status = next; statusMessage = message;
  if (state) render();
}
function control(action, value) {
  if (!host) return;
  try {
    if (demo) { classroom.control(action, value); receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) }); }
    else classroom.control(action, value);
  } catch (err) { toast(err.message); }
}
let demoPlayer;
function preview(lesson = demoLesson(), options = {}) {
  leave(false); activeLesson = lesson; slides = lesson.slides; demo = true; host = true; status = 'online';
  readOnlyPresentation=Boolean(options.readOnly);publicPresentationToken=options.token||'';
  if (!options.token) studio.writeRoute('preview', lesson.id);
  classroom = new Room('PREVIA', undefined, Date.now, lesson);
  demoPlayer = classroom.join({ name: 'Você', avatar: selectedAvatar }).id;
  receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) });
  demoTimer = setInterval(() => {
    const phase = classroom.data.phase; classroom.tick();
    if (phase !== classroom.data.phase) receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) });
  }, 100);
}
async function connectSession(mode) {
  if (mode.lesson) { activeLesson = mode.lesson; slides = mode.lesson.slides; }
  busy = true; host = mode.host; demo = false; editorLaunch=Boolean(mode.fromEditor);music=true; gameAudio.unlock(); render();
  classroom?.stop?.();
  classroom = new Classroom(receive, connection);
  try {
    if (host) { await classroom.create(Boolean(mode.resume), mode.lesson, mode.startIndex,editorLaunch);shareOpen=!mode.resume; }
    else {music=true;gameAudio.unlock();await classroom.join(mode.code, mode.name, mode.avatar);}
    if (!readOnlyPresentation) studio.writeRoute('present', activeLesson.id);
  } catch (err) {
    classroom.stop(); if (!state) host = false;
    if (readOnlyPresentation && publicPresentationToken) { const token=publicPresentationToken;preview(activeLesson,{readOnly:true,token}); }
    toast(err.message);
  } finally { busy = false; render(); }
}
function leave(show = true) {
  clearInterval(clockTimer); clockTimer = null;
  editDraft = null; editError = ''; clearTimeout(controlsTimer);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  clearInterval(demoTimer); classroom?.stop?.(); classroom = null;
  readOnlyPresentation=false;publicPresentationToken='';sharedLoading=false;sharedError='';
  state = null; host = false; demo = false; editorLaunch=false;shareOpen = false; lastSlide = -1;
  localModel = 'ssd'; localExploded = true; status = 'offline'; stopMusic();
  if (show) { studio.writeRoute(); render(); }
}
function updateClock() {
  gameAudio.tick();
  const countdown = document.querySelector('#lobby-countdown');
  if (countdown && state?.countdownEndsAt) countdown.textContent = Math.max(1, Math.ceil((state.countdownEndsAt - Date.now() - timerOffset) / 1000));
  if (!state?.question) return;
  const q = state.question;
  const remaining = Math.max(0, q.deadline - Date.now() - timerOffset);
  const timer = document.querySelector('#timer-value') || document.querySelector('.timer strong');
  if (timer) timer.textContent = Math.ceil(remaining / 1000);
  const bar = document.querySelector('#time-bar');
  if (bar) bar.style.width = `${Math.min(100, remaining / (q.deadline - q.startedAt) * 100)}%`;
}
let audioBlocked=false;
function stopMusic() {
  gameAudio.stop();clearInterval(musicTimer);musicTimer=null;audio?.suspend().catch(()=>{});
  trackPlayer.pause();trackPlayer.removeAttribute('src');playingTrack=null;audioBlocked=false;
}
function updateMusic() {
  gameAudio.sync(state,activeLesson,host,music);
  if (!state || !host) return;
  if (state.phase !== 'lesson' || !music) { trackPlayer.pause();return; }
  const slide=slides[state.slide],track=slide.audio;
  if (playingTrack?.slideId===slide.id && playingTrack.manual ||
      playingTrack?.track.continueAcrossSlides && state.slide>playingTrack.index && state.slide<playingTrack.index+(playingTrack.track.continueSlides||slides.length) && !trackPlayer.ended) {
    resumeSlideTrack();return;
  }
  if (track?.data && (!track.trigger || track.trigger==='auto')) {
    const key=slideTrackKey(track);
    if (playingTrack?.key===key) resumeSlideTrack();
    else playSlideTrack(track,key);
  } else if (playingTrack) {
    trackPlayer.pause();playingTrack=null;
  }
}
function slideTrackKey(track) {
  return slides[state.slide].id+':'+(track.assetId||track.name)+':'+track.data.length+':'+(track.trigger||'auto');
}
function resumeSlideTrack() {
  if(audioBlocked || !trackPlayer.paused || trackPlayer.ended)return;
  const current=playingTrack;
  trackPlayer.play().catch(error=>{
    if(playingTrack!==current || !music || error.name==='AbortError')return;
    if(error.name==='NotAllowedError') {
      audioBlocked=true;
      for(const sound of app.querySelectorAll('[data-action=sound]')){sound.innerHTML=icon('mute');sound.setAttribute('aria-label','Ativar áudio');}
      toast('Clique no ícone de som para liberar o áudio.');
    }
  });
}
trackPlayer.addEventListener('ended',()=>{if(playingTrack?.track.continueAcrossSlides&&state?.slide>playingTrack.index)updateMusic();});
function playSlideTrack(track,key,manual=false) {
  trackPlayer.volume=track.volume;
  trackPlayer.loop=track.loop;
  trackPlayer.src=track.data;
  trackPlayer.playbackRate=track.rate||1;
  playingTrack={track,key,manual,slideId:slides[state.slide].id,index:state.slide};
  audioBlocked=false;
  resumeSlideTrack();
}
async function answer(choice) {
  if (!state || !['question', 'poll'].includes(state.phase)) return;
  const questionIndex = state.phase === 'poll' ? state.poll.id : state.questionIndex;
  try {
    gameAudio.unlock();gameAudio.cue('answer');
    if (demo) { classroom.answer(demoPlayer, { choice, questionIndex }); receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) }); }
    else await classroom.answer(choice, questionIndex);
  } catch (err) { toast(err.message); }
}
function exportResults() {
  const rows = [['Posição', 'Nome', 'Pontos', 'Acertos'], ...state.ranking.map((p, i) => [i + 1, p.name, p.score, p.correct])];
  const csv = '\uFEFF' + rows.map(row => row.map(value => '"' + String(value).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'storage-lab-resultados.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function action(name) {
  switch (name) {
    case 'choose-guest-photo':app.querySelector('[data-guest-photo]')?.click();break;
    case 'take-guest-photo':{const file=await takePhoto();if(file){selectedAvatar=await participantPhoto(file);avatarChanged=true;render();}break;}
    case 'scan-qr':{const code=await scanRoomCode();if(code){codeDraft=code;const field=app.querySelector('#room-code');if(field)field.value=code;studio.view='join';render();}break;}
    case 'participants':if(state)manageParticipants(state,host?id=>control('kick',id):null);break;
    case 'edit-player':await editParticipant(state.me,async(name,avatar)=>{selectedAvatar=avatar;avatarChanged=true;joinNameDraft=name;joinNameTouched=true;if(demo){classroom.updateProfile(demoPlayer,{name,avatar});receive({...classroom.snapshot(demoPlayer),lesson:classroom.publicLesson(true)});}else await classroom.updateProfile(name,avatar);});break;
    case 'show-ranking':control('ranking');break;
    case 'podium-all':control('podium-all');break;
    case 'create': if (!busy) await connectSession({ host: true }); break;
    case 'preview': preview(); break;
    case 'connect-public-room': { const lesson=activeLesson;clearInterval(demoTimer);await connectSession({host:true,lesson});break; }
    case 'home': leave(false);studio.view='library';studio.writeRoute();render();break;
    case 'leave': focusView.close(); leave(); break;
    case 'focus-item': if(state?.phase==='lesson'&&slides[state.slide])focusView.open(slides[state.slide]); break;
    case 'toggle-qr': presenterSettings.qrVisible=!presenterSettings.qrVisible;savePresenterSettings(presenterSettings);render();showPresentationControls();break;
    case 'next-stage':music=true;control('next-stage');break;
    case 'next-slide': if(pendingPptxBuild()){control('animation',nextBuildStep());break;}if(state.activity){const ids=state.activity.slideIndices,next=ids[ids.indexOf(state.slide)+1];if(next===undefined)control('next-stage');else control('slide',next);}else control('slide', Math.min(slides.length - 1, state.slide + 1)); break;
    case 'previous': if(state.animationStep>0){control('animation',animationGroups().filter(group=>group<state.animationStep).at(-1)||0);break;}control('slide',state.activity?state.activity.slideIndices[Math.max(0,state.activity.slideIndices.indexOf(state.slide)-1)]:Math.max(0,state.slide-1)); break;
    case 'quiz': gameAudio.unlock();music = true; control('quiz'); break;
    case 'poll': control('poll'); break;
    case 'close-poll': control('close-poll'); break;
    case 'start-quiz': gameAudio.unlock();control('start-quiz'); break;
    case 'finish': control('finish'); break;
    case 'reveal': control('reveal'); break;
    case 'next-question': control(state.phase==='reveal'?'ranking':'next'); break;
    case 'back-lesson': control('lesson'); break;
    case 'edit-current-slide': await editInStudio(); break;
    case 'cancel-edit-slide': editDraft = null; editError = ''; render(); showPresentationControls(); break;
    case 'image-text': imageText = !imageText; syncPresentationMode(); showPresentationControls(); break;
    case 'solution': solutionOpen = !solutionOpen; render(); break;
    case 'share': if (!demo) { shareOpen = true; render(); document.querySelector('.close-modal')?.focus(); } break;
    case 'close-share': shareOpen = false; render(); document.querySelector('[data-action="share"]')?.focus(); break;
    case 'copy-link': try { await navigator.clipboard.writeText(joinUrl()); toast('Link copiado!'); } catch { toast('Copie o endereço no campo de convite.'); } break;
    case 'save-url': {
      try {
        const url = new URL(document.querySelector('#public-url').value);
        if (!['https:', 'http:'].includes(url.protocol)) throw Error();
        localStorage.setItem('sl-public-url', url.href); render();
      } catch { toast('Digite uma URL válida, começando com https://.'); }
      break;
    }
    case 'explode':
      localExploded = !localExploded;
      if (state && host) control('explode', localExploded); else render();
      break;
    case 'reset-model': viewer.reset(); break;
    case 'sound': gameAudio.unlock();music = !music || audioBlocked; audioBlocked=false; render(); break;
    case 'fullscreen':
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('Tela cheia indisponível. Use F11 no computador.'); }
      break;
    case 'export': exportResults(); break;
    case 'reconnect': {
      const saved = Classroom.resume();
      if (saved) await connectSession({ ...saved, resume: true });
      break;
    }
  }
}
function activateSlideAudio(event) {
  const trigger = event.target.closest('[data-play-slide-audio]');
  if (!trigger || !host || state?.phase!=='lesson') return;
  if (event.type==='keydown' && (!['Enter',' '].includes(event.key) || event.target!==trigger || event.repeat)) return;
  if (trigger.dataset.playSlideAudio==='background' && event.target.closest('.canvas-object')) return;
  const slide=slides[state.slide], id=trigger.dataset.objectId;
  const elementTrack=id && slide.elements?.find(e=>e.id===id)?.audio;
  const track=elementTrack||slide.audio;
  if (!track?.data) return;
  if(event.type==='keydown')event.preventDefault();
  if(!music){music=true;render();}
  playSlideTrack(track,elementTrack?slide.id+':element:'+id:slideTrackKey(track),true);
}
app.addEventListener('click',activateSlideAudio);
app.addEventListener('keydown',activateSlideAudio);
app.addEventListener('click', event => { const button = event.target.closest('[data-poll-vote]'); if (button && !button.disabled) answer(Number(button.dataset.pollVote)); });
app.addEventListener('click', async e => {
  const button = e.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.canvasExplode) { canvasModels.toggle(button.dataset.canvasExplode, presentationSlide(slides[state.slide])); return; }
  if (button.dataset.avatar) { avatarChanged=true;selectedAvatar = button.dataset.avatar; render(); }
  else if (button.dataset.model) {
    if (state && !host && button.dataset.model !== state.model) return;
    localModel = button.dataset.model;
    if (state && host) control('model', localModel); else render();
  } else if (button.dataset.slide !== undefined) control('slide', Number(button.dataset.slide));
  else if (button.dataset.answer !== undefined) await answer(Number(button.dataset.answer));
  else if (button.dataset.action) await action(button.dataset.action);
});
app.addEventListener('input', e => {
  if(e.target.id==='player-name'){joinNameTouched=true;joinNameDraft=e.target.value;}if(e.target.id==='room-code')codeDraft=e.target.value.replace(/\D/g,'').slice(0,6);
  const key = e.target.dataset.liveField;
  if (editDraft && e.target.dataset.liveElement) { const el = editDraft.elements.find(el => el.id === e.target.dataset.liveElement); if (el) { el.text = e.target.value; if (el.role === 'title') editDraft.title = el.text.slice(0, 200); } return; }
  if (!key || !editDraft) return;
  if (key === 'image' && !e.target.value && editDraft.image.startsWith('data:')) return;
  editDraft[key] = key === 'points' ? e.target.value.split('\n').filter(p => p.trim()).slice(0, 12) : e.target.value;
  if (key === 'image') delete editDraft.assetId;
  if (key === 'title' && editDraft.kind === 'canvas') { const title = editDraft.elements.find(el => el.role === 'title'); if (title) title.text = editDraft.title; }
});
app.addEventListener('change', async e => {
  if(e.target.matches('[data-guest-photo]')){guestPhotoPending=true;const submit=app.querySelector('#join-form [type=submit]');if(submit)submit.disabled=true;try{selectedAvatar=await participantPhoto(e.target.files[0]);avatarChanged=true;const choice=app.querySelector('.avatar-picker');if(!choice)return;choice.querySelector('[aria-label="Minha foto enviada"]')?.remove();choice.insertAdjacentHTML('afterbegin','<button type="button" class="avatar active" data-avatar="'+selectedAvatar+'" aria-label="Minha foto enviada">'+avatarContent(selectedAvatar)+'</button>');for(const b of choice.querySelectorAll('[data-avatar]')){b.classList.toggle('active',b.dataset.avatar===selectedAvatar);b.setAttribute('aria-pressed',String(b.dataset.avatar===selectedAvatar));}}catch(error){toast(error.message);}finally{guestPhotoPending=false;if(submit?.isConnected)submit.disabled=false;}return;}

  if (e.target.id === 'live-image-file') { replaceLiveImage(e.target.files[0]); return; }
  if (state?.phase === 'lesson' && host && !demo) {
    if (e.target.id === 'pinned-qr-corner' && Object.hasOwn(qrCorners, e.target.value)) { presenterSettings.qrCorner = e.target.value; savePresenterSettings(presenterSettings); render(); showPresentationControls(); }
  }
  if (e.target.id === 'document-page' && host) control('slide', Number(e.target.value));
});
app.addEventListener('submit', async e => {
  if (e.target.id === 'live-edit-form') { e.preventDefault(); saveLiveSlide(); return; }
  if (e.target.id !== 'join-form') return;
  e.preventDefault(); if (busy||guestPhotoPending) return;
  const form = new FormData(e.target);
  codeDraft = String(form.get('code')).replace(/\D/g, '').slice(0, 6);
  if (codeDraft.length !== 6) { toast('Digite os 6 números da sala.'); return; }
  await connectSession({ host: false, code: codeDraft, name: String(form.get('name')).trim(), avatar: selectedAvatar });
});
document.addEventListener('keydown', e => {
  if (editDraft) { if (e.key === 'Escape') action('cancel-edit-slide'); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape' && shareOpen) { action('close-share'); return; }
  if (shareOpen || !state) return;
  if (e.key.toLowerCase() === 'f') action('fullscreen');
  if (host && state.phase === 'lesson') {
    if (e.key === 'ArrowRight') { e.preventDefault(); action('next-slide'); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); action('previous'); }
  }
});
function syncPresentationMode() {
  app.dataset.qrCorner = presenterSettings.qrVisible && !demo ? presenterSettings.qrCorner : 'none';
  app.classList.toggle('is-presenting', Boolean(document.fullscreenElement && state?.phase === 'lesson'));
  app.classList.toggle('show-image-text', imageText);
  requestAnimationFrame(() => viewer.resize());
}
function showPresentationControls(delay = 2200) {
  if (!document.fullscreenElement || state?.phase !== 'lesson') return;
  app.classList.add('presenter-controls-visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => app.classList.remove('presenter-controls-visible'), delay);
}
// Toque (celular e tablet): encostar no alto da tela mostra a barra; o toque
// que a revela não aciona nenhum botão. Tocar fora dela a esconde.
let controlsRevealedAt = 0;
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || !document.fullscreenElement || state?.phase !== 'lesson') return;
  const visible = app.classList.contains('presenter-controls-visible');
  if (e.target.closest?.('.document-top') && visible) { showPresentationControls(5000); return; }
  if (!visible && e.clientY <= Math.max(130, innerHeight * .3)) { controlsRevealedAt = Date.now(); showPresentationControls(5000); }
  else if (visible) { clearTimeout(controlsTimer); app.classList.remove('presenter-controls-visible'); }
}, true);
document.addEventListener('click', e => {
  if (Date.now() - controlsRevealedAt < 450 && e.target.closest?.('.document-top')) { e.preventDefault(); e.stopPropagation(); }
}, true);
// "Editar slide" sai da apresentação e abre o editor de verdade no slide atual.
async function editInStudio() {
  if (!host || readOnlyPresentation || state?.phase !== 'lesson') return;
  const index = state.slide, lessonId = activeLesson?.id, fromEditor = editorLaunch;
  focusView.close(); leave(false);
  if (!fromEditor || studio.view !== 'editor' || !studio.draft) await studio.action('edit', { dataset: { id: lessonId } });
  if (studio.view === 'editor' && studio.draft?.slides?.[index]) { studio.index = index; studio.tab = 'slides'; studio.blockId = ''; studio.designer.selected = ''; }
  studio.writeRoute(); render();
}
function openLiveEditor() {
  if (!host || readOnlyPresentation || state?.phase !== 'lesson') return;
  const room = demo ? classroom : classroom.room;
  editIndex = state.slide; editDraft = clone(room.lesson.slides[editIndex]);
  editDraft.model = state.model; editError = '';
  render(); document.querySelector('#live-title')?.focus();
}
function saveLiveSlide() {
  if (!editDraft || !host) return;
  try {
    if (state.phase !== 'lesson' || state.slide !== editIndex) throw Error('O slide mudou. Feche a edição e tente novamente.');
    const room = demo ? classroom : classroom.room;
    const validated = validateLesson({ ...room.lesson, slides: room.lesson.slides.map((s, i) => i === editIndex ? editDraft : s) });
    const saved = studio.library.save(validated);
    if (studio.draft?.id === saved.id) { studio.draft = clone(saved); studio.dirty = false; }
    solutionOpen = false;
    classroom.control('edit-slide', { index: editIndex, slide: validated.slides[editIndex] });
    if (demo) receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) });
    editDraft = null; editError = ''; render(); showPresentationControls();
    toast('Slide atualizado e salvo na biblioteca.');
  } catch (error) { editError = error.message; render(); document.querySelector('.live-edit-dialog [role="alert"]')?.scrollIntoView({ block: 'nearest' }); }
}
async function replaceLiveImage(file) {
  if (!file || !editDraft) return;
  const draft = editDraft;
  try {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1_400_000) throw Error('Escolha PNG, JPEG, WebP ou GIF de até 1,4 MB.');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Não foi possível carregar a imagem.')); reader.readAsDataURL(file);
    });
    if (editDraft !== draft) return;
    editDraft.image = imageURL(data); delete editDraft.assetId; render();
  } catch (error) { editError = error.message; render(); }
}
document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!document.fullscreenElement)return;const bar=app.querySelector('.document-top'),box=bar?.getBoundingClientRect();if(box&&e.clientY<=Math.max(38,box.bottom+8)&&e.clientX>=box.left-8&&e.clientX<=box.right+8)showPresentationControls();else if(!document.activeElement?.closest('.document-top select')){clearTimeout(controlsTimer);app.classList.remove('presenter-controls-visible');}});
document.addEventListener('focusin', e => { if (e.target.closest('.document-top')) showPresentationControls(); });
document.addEventListener('fullscreenchange',()=>{if(state)render();else syncPresentationMode();app.classList.remove('presenter-controls-visible');});
document.addEventListener('visibilitychange', () => { document.documentElement.dataset.pageHidden = String(document.hidden); });
window.addEventListener('beforeunload', e => { if (editDraft) { e.preventDefault(); e.returnValue = ''; } });
if (!['preview','present'].includes(params.get('page'))) render();
else app.innerHTML='<main class="public-loading"><p role="status">Carregando apresentação…</p></main>';
document.documentElement.dataset.appReady = 'true';
async function openPublicPresentation(token) {
  leave(false);sharedLoading=true;render();
  try{const lesson=await loadPublicPresentation(token);sharedLoading=false;preview(lesson,{readOnly:true,token});}
  catch(error){sharedLoading=false;sharedError=error.message;render();}
}
const savedSession = Classroom.resume();
async function restorePage() {
  const token=new URLSearchParams(location.search).get('presentation');if(token){await openPublicPresentation(token);return;}
  const page = routeParams().get('page');
  try { if (studio.dirty) studio.save(); }
  catch (error) { studio.writeRoute('editor', studio.draft.id, true); toast(error.message); return; }
  if (studio.groups.live) await studio.groups.stop();
  leave(false); studio.restoreRoute();
  if (!['preview','present'].includes(page)) render();
  const sharedId = routeParams().get('collab');
  if (sharedId) { try { await studio.groups.open(sharedId); } catch (error) { toast(error.message); } return; }
  if (['preview', 'present'].includes(page)) {
    const id = routeParams().get('lesson'), lesson = studio.library.lessons.find(l => l.id === id);
    if (lesson) {
      sharedLoading=true;render();
      try { await studio.launch(lesson,page==='preview',false); }
      catch (error) { toast(error.message); }
      finally { sharedLoading=false;render(); }
    } else render();
  }
}
window.addEventListener('popstate', restorePage);
if (params.get('presentation')) openPublicPresentation(params.get('presentation'));
else if (savedSession && (!codeDraft || savedSession.code === codeDraft) && (!params.has('page') || params.get('page') === 'present')) connectSession({ ...savedSession, resume: true });
else if (['preview', 'present'].includes(params.get('page'))) restorePage();

import './mobile.css';
import './refinements.css';

import './workspace.css';
import './dark-palette.css';
import './lively.css';
import './personalization.css';
import './interface-system.css';

app.addEventListener('pointerdown',e=>{gameAudio.unlock();if(document.fullscreenElement&&(e.clientY<48||e.target.closest('.document-top')))showPresentationControls();});

// Navigate only deliberate taps; model dragging and interactive controls keep
// their own gestures and never advance the presentation.
let slideTap=null;
app.addEventListener('pointerdown',e=>{
  slideTap=null;
  if(!document.fullscreenElement||state?.phase!=='lesson'||!host||e.pointerType!=='touch')return;
  if(!e.target.closest('.document-stage')||e.target.closest('button,a,input,select,textarea,[contenteditable],.canvas-model-slot,.mobile-model-slot,[data-play-slide-audio]'))return;
  slideTap={id:e.pointerId,x:e.clientX,y:e.clientY};
});
app.addEventListener('pointerup',e=>{
  const tap=slideTap;slideTap=null;
  if(!tap||tap.id!==e.pointerId||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>12||!document.fullscreenElement||state?.phase!=='lesson')return;
  const stage=app.querySelector('.document-stage');if(!stage)return;
  const rect=stage.getBoundingClientRect();
  action(e.clientX<rect.left+rect.width/2?'previous':'next-slide');
});
app.addEventListener('pointercancel',()=>{slideTap=null;});

import './editor-refinement.css';

import './workspace-controls.css';

app.addEventListener('profile-updated',()=>{
  if(!state&&studio.view==='join'){
    const name=app.querySelector('#player-name');
    const preferred=studio.account.user?.user_metadata?.display_name||'';
    if(name&&!joinNameTouched&&preferred)name.value=preferred.slice(0,24);
  }
});
app.addEventListener('account-changed',()=>{avatarChanged=false;joinNameTouched=false;joinNameDraft='';selectedAvatar=avatars[0];if(!state&&studio.view==='join')queueMicrotask(render);});

import './account-live.css';
import './workspace-styles.css';
import './finishing.css';
