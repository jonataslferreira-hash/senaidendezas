import {studioIcon} from './studio-icons.js';
import { reconcileStageSafely, tagStageSources, setStageCache } from './stage-keep.js';
import { SiteTour, shouldOfferTour, markTourSeen } from './tour.js';
import './tour.css';
import { BUILTIN_MODELS, HARDWARE_MODEL_IDS, modelMeta } from './model-catalog.js';
import {routeParams} from './editor-route.js';
import {takePhoto} from './camera-photo.js';
import {GameLayout} from './game-layout.js';
import {GameAudio} from './game-audio.js';
import {quizMarkup,leaderboardMarkup,animateRanking} from './game-ui.js';
import { downloadResultsPng } from './results-png.js';
import { gameMarkup, keepGame, animateRaffle, gameIcon } from './stage-games-view.js';
import { gameNames } from './stage-games.js';
import { blockNames } from './activity-blocks.js';
import { optimizeImage } from './image-optimize.js';
import { applyAudioPlayback } from './audio-data.js';
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
import { loadPublicPresentation, validPublicCode, resolvePublicCode } from './public-presentations.js';
// Link de apresentação: ?presentation=<token> (antigo) ou ?p=<código curto>.
function publicLinkParam() { const query = new URLSearchParams(location.search); return query.get('presentation') || (validPublicCode(query.get('p')) ? query.get('p') : ''); }
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
import './online-library.css';
import { lobbyMarkup } from './lobby.js';
import './quiz-party.css';
let activeLesson = demoLesson();
let slides = activeLesson.slides;
import { Classroom } from './network.js';
import { Room } from './room.js';
import { HardwareViewer } from './models.js';
import { teacherControls, captureInteraction, applyInteraction, InteractionBroadcaster, describeSims, applySimCommand, describeModels, applyModelCommand } from './live-interaction.js';
import { cleanSimEvents, cleanSimValues } from './custom-sim-bridge.js';
import { VideoSync } from './video-sync.js';
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
// Slides em "Só eu controlo": o professor transmite o experimento/modelo 3D e os alunos só acompanham.
const interactionBroadcaster = new InteractionBroadcaster(payload => { if (host && !demo) classroom?.live?.(payload); });
let liveInteraction = null, liveInteractionTimers = [];
// Vídeos do YouTube: o relógio do professor chega pelo estado da sala (timerOffset).
const videoSync = new VideoSync(() => Date.now() + (host ? 0 : timerOffset));
// Experimentos importados rodam em iframes isolados: a conversa é por mensagens.
let customSimValues = {}, customSimKey = '', customSimControls = {}, customSimPads = {};
const customSimFrames = () => [...app.querySelectorAll('.canvas-presenting .custom-sim iframe')];
const customSimRole = () => { const teacher = state?.phase === 'lesson' ? teacherControls(slides[state.slide]) : ''; return !teacher || teacher === 'models' ? 'off' : host ? (demo ? 'off' : 'send') : 'follow'; };
const tellCustomSim = (frame, message) => { try { frame?.contentWindow?.postMessage(message, '*'); } catch { /* iframe ainda carregando */ } };
window.addEventListener('message', event => {
  const data = event.data;
  if (!data || typeof data !== 'object' || typeof data.storageLab !== 'string') return;
  const frames = customSimFrames(), index = frames.findIndex(frame => frame.contentWindow === event.source);
  if (index < 0) return;
  const role = customSimRole();
  if (data.storageLab === 'sim-controls') {
    // Lista de controles do experimento importado, para o controle remoto desenhar.
    const text = value => String(value ?? '').slice(0, 60);
    const fields = (Array.isArray(data.fields) ? data.fields : []).slice(0, 14).filter(f => f && Number.isInteger(f.i) && ['range', 'select', 'toggle', 'text'].includes(f.k)).map(f => ({ i: f.i, k: f.k, label: text(f.label), value: text(f.value), ...(f.k === 'range' ? { min: text(f.min), max: text(f.max), step: text(f.step) } : {}), ...(f.k === 'select' ? { options: (Array.isArray(f.options) ? f.options : []).slice(0, 24).map(o => [text(o?.[0]), text(o?.[1])]) } : {}) }));
    const buttons = (Array.isArray(data.buttons) ? data.buttons : []).slice(0, 16).filter(b => b && Number.isInteger(b.a)).map(b => ({ a: b.a, label: text(b.label) }));
    const next = { fields, buttons };
    if (JSON.stringify(next) !== JSON.stringify(customSimControls[index])) { customSimControls[index] = next; publishRemote(); }
    return;
  }
  if (data.storageLab === 'sim-ready') {
    if (host) tellCustomSim(frames[index], { storageLab: 'sim-describe' });
    tellCustomSim(frames[index], { storageLab: 'sim-role', role });
    const values = liveInteraction?.slide === state?.slide ? liveInteraction.payload?.custom?.[index] : null;
    if (role === 'follow' && Array.isArray(values)) tellCustomSim(frames[index], { storageLab: 'sim-state', values: cleanSimValues(values) });
  } else if (data.storageLab === 'sim-events' && role === 'send') {
    const events = cleanSimEvents(data.events);
    customSimValues[index] = cleanSimValues(data.values);
    if (events.length && JSON.stringify(events).length < 3200) classroom?.live?.({ replay: { index, events } }, true);
  }
});
// O que o controle remoto (celular do professor) precisa saber da apresentação.
function publishRemote() {
  if (!state || !host || demo) { studio.remote.setPresentation(null); return; }
  const lesson = state.phase === 'lesson', slide = lesson ? slides[state.slide] : null;
  const frames = lesson ? customSimFrames() : [];
  const customs = frames.slice(0, 3).map((frame, index) => ({ name: String(frame.closest('.custom-sim')?.querySelector('strong')?.textContent || 'Experimento importado').replace(/\s+/g, ' ').trim().slice(0, 60), fields: customSimControls[index]?.fields || [], buttons: customSimControls[index]?.buttons || [] }));
  studio.remote.setPresentation({ code: state.code, title: activeLesson.title, slide: state.slide, total: slides.length, phase: state.phase, stage: state.activity?.type || '', hasNext: Boolean(state.activity?.hasNext), game: remoteGame(), note: lesson ? slide?.note?.slice(0, 2000) : '',
    sims: lesson ? describeSims(app) : [], customs, models: lesson ? describeModels(app, { canvasModels, slide: slide ? presentationSlide(slide) : null }) : [] });
}
function remoteGame() { const g = state?.game; return g ? { type: g.type, state: g.state, drawn: g.current?.name || '', ...(Number.isInteger(g.round) ? { round: g.round, rounds: g.rounds } : {}) } : null; }
// Comandos do controle remoto para experimentos (nativos e importados) e modelos 3D.
function remoteInteract(value) {
  if (state?.phase !== 'lesson' || !host || !value || typeof value !== 'object') return;
  if (value.model !== undefined) { if (applyModelCommand(value, { canvasModels, viewer, slide: presentationSlide(slides[state.slide]) }) && value.explode) setTimeout(publishRemote, 200); return; }
  if (Number.isInteger(value.custom)) {
    const frame = customSimFrames()[value.custom];
    if (!frame) return;
    if (value.pad && typeof value.pad === 'object') {
      const pad = customSimPads[value.custom] ||= { x: .5, y: .5 }, kind = String(value.pad.t);
      if (!['move', 'down', 'up', 'tap'].includes(kind)) return;
      pad.x = Math.max(0, Math.min(1, pad.x + (Number(value.pad.dx) || 0))); pad.y = Math.max(0, Math.min(1, pad.y + (Number(value.pad.dy) || 0)));
      showRemoteCursor(frame, pad, kind);
      tellCustomSim(frame, { storageLab: 'sim-command', pad: { t: kind, x: pad.x, y: pad.y } });
    } else if (Number.isInteger(value.button)) tellCustomSim(frame, { storageLab: 'sim-command', button: value.button });
    else if (Number.isInteger(value.field)) tellCustomSim(frame, { storageLab: 'sim-command', field: value.field, value: String(value.value ?? '').slice(0, 60) });
    return;
  }
  if (applySimCommand(app, value)) setTimeout(publishRemote, 200);
}
// Mostra na tela projetada onde o "dedo" do controle remoto está.
let remoteCursorTimer = 0;
function showRemoteCursor(frame, pad, kind) {
  const box = frame.getBoundingClientRect();
  let dot = document.querySelector('.remote-cursor');
  if (!dot) { dot = document.createElement('i'); dot.className = 'remote-cursor'; dot.setAttribute('aria-hidden', 'true'); document.body.append(dot); }
  dot.style.left = box.left + pad.x * box.width + 'px'; dot.style.top = box.top + pad.y * box.height + 'px';
  dot.dataset.down = String(kind === 'down' || kind === 'tap' || (kind === 'move' && dot.dataset.down === 'true' && kind !== 'up'));
  if (kind === 'up') dot.dataset.down = 'false';
  if (kind === 'tap') setTimeout(() => { dot.dataset.down = 'false'; }, 180);
  clearTimeout(remoteCursorTimer); remoteCursorTimer = setTimeout(() => dot.remove(), 4000);
}
function syncInteraction() {
  const slide = state?.phase === 'lesson' ? slides[state.slide] : null, teacher = teacherControls(slide);
  const simKey = slide ? activeLesson.id + ':' + state.slide : '';
  if (simKey !== customSimKey) { customSimKey = simKey; customSimValues = {}; customSimControls = {}; customSimPads = {}; }
  for (const frame of customSimFrames()) tellCustomSim(frame, { storageLab: 'sim-role', role: customSimRole() });
  const tools = { canvasModels, viewer, slide: slide ? presentationSlide(slide) : null };
  if (teacher && !host) app.dataset.teacherControls = teacher; else delete app.dataset.teacherControls;
  // O vídeo do YouTube acompanha o professor em qualquer slide; o aluno só silencia o dele.
  videoSync.mount(slide ? app : null, { follow: Boolean(slide && !host) });
  const hasVideo = videoSync.players.size > 0;
  if (slide && host && !demo && (teacher || hasVideo)) interactionBroadcaster.watch(activeLesson.id + ':' + state.slide, () => ({ ...(teacher ? captureInteraction(app, tools) : {}), ...(teacher && teacher !== 'models' && Object.keys(customSimValues).length ? { custom: customSimValues } : {}), ...(hasVideo ? { videos: videoSync.capture() } : {}) }));
  else interactionBroadcaster.stop();
  for (const timer of liveInteractionTimers.splice(0)) clearTimeout(timer);
  if (slide && !host && liveInteraction?.slide === state.slide) videoSync.setTargets(liveInteraction.payload?.videos);
  if (!teacher || host || liveInteraction?.slide !== state.slide) return;
  const apply = () => { if (state?.phase === 'lesson' && liveInteraction?.slide === state.slide) applyInteraction(app, liveInteraction.payload, tools); };
  apply();
  // Modelos 3D terminam de carregar depois do render: repete para a câmera chegar.
  liveInteractionTimers = [400, 1500].map(delay => setTimeout(apply, delay));
}
function receiveInteraction(message) {
  if (!message || !Number.isInteger(message.slide)) return;
  const replay = message.payload?.replay;
  if (replay) {
    if (!host && state?.phase === 'lesson' && state.slide === message.slide && customSimRole() === 'follow') tellCustomSim(customSimFrames()[replay.index], { storageLab: 'sim-replay', events: cleanSimEvents(replay.events) });
    return;
  }
  liveInteraction = message;
  if (!host && state?.phase === 'lesson' && state.slide === message.slide) videoSync.setTargets(message.payload?.videos);
  if (!host && state?.phase === 'lesson' && state.slide === message.slide && teacherControls(slides[state.slide])) applyInteraction(app, message.payload, { canvasModels, viewer, slide: presentationSlide(slides[state.slide]) });
}
const focusView = new FocusView();
const pageMotion = new PageMotion();
const pptxAnimations=new PptxAnimations();const simulations=new Simulations(),gameAudio=new GameAudio(),gameLayout=new GameLayout();
let classroom, state, host = false, demo = false, busy = false, selectedAvatar = avatars[0];
let avatarChanged=false,joinNameTouched=false,joinNameDraft='',guestPhotoPending=false;
let shareOpen = false, solutionOpen = false, lastSlide = -1, localModel = 'ssd', localExploded = true;
let status = 'offline', statusMessage = '', timerOffset = 0, music = false, audio, musicTimer, audioStep = 0;
let editorLaunch=false, readOnlyPresentation=false, publicPresentationToken='', sharedLoading=Boolean(publicLinkParam()), sharedError='';
let clockTimer;
const trackPlayer = new Audio(); let playingTrack = null;
trackPlayer.dataset.soundtrack = ''; trackPlayer.hidden = true; document.body.append(trackPlayer);
let demoTimer, toastTimer, controlsTimer, editDraft = null, editIndex = -1, editError = '', imageText = false;
const presenterSettings = loadPresenterSettings();
// Só celular na vertical usa o cartão de leitura; ao girar para a horizontal (paisagem) o aluno vê o slide visual como foi desenhado.
const phoneLayout=matchMedia('(max-width: 800px) and (orientation: portrait) and (pointer: coarse), (max-width: 800px) and (orientation: portrait) and (hover: none)');
phoneLayout.addEventListener('change',()=>{if(state?.phase==='lesson')render();});
// Celular do aluno: ao entrar na sala, a apresentação toma a tela inteira e a
// tela vira para o lado (paisagem). Se o navegador segurar o fullscreen por
// falta de gesto, o primeiro toque completa. Quem sair manualmente não é
// forçado a voltar.
let immersiveDone = false;
let lastStageEnter = null;
async function enterImmersiveRoom() {
  if (host || demo || !state || !phoneLayout.matches || immersiveDone) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    immersiveDone = true;
    try { await screen.orientation?.lock?.('landscape'); } catch { /* iPhone e afins: segue na orientação da tela */ }
  } catch { /* sem gesto do usuário ainda: o primeiro toque tenta de novo */ }
}
const qrCache = new Map();
const params = routeParams();
let codeDraft = (params.get('s') || '').replace(/\D/g, '').slice(0, 6);
const studio = new Studio(app, { render, toast, joinForm, preview, remoteAction:(name,value)=>{if(name==='sim')remoteInteract(value);else action(name);}, present: (lesson,startIndex,fromEditor) => connectSession({host:true,lesson,startIndex,fromEditor}) });
const tour = new SiteTour(studio);
document.addEventListener('start-tour', () => tour.start());
queueMicrotask(() => {
  if (!shouldOfferTour() || state || studio.view !== 'library') return;
  // O tour é só para quem chegou agora de verdade: quem já tem conta (ativa
  // ou lembrada neste navegador) não recebe a oferta — e nunca recebe.
  const account = studio.account;
  const hasAccount = Boolean(account.user) || (account.vault?.list?.().length || 0) > 0;
  if (hasAccount) { markTourSeen(undefined, 'skipped'); return; }
  tour.offer();
});
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
  return `<header class="header">${brand()}<div class="header-right">${state?`${!host&&state.phase==='lesson'?'':participantCount()}${host&&!readOnlyPresentation&&!demo&&state.phase==='lesson'?'<button class="btn secondary small" data-action="edit-current-slide">Editar slide</button>':''}${!host&&state.me&&state.phase!=='lesson'?'<button class="my-room-avatar" data-action="edit-player" aria-label="Editar meu perfil na sala">'+avatarContent(state.me.avatar||selectedAvatar)+'</button>':''}${!host?`<span data-room-controller data-room-code="${esc(state.code)}">${studio.remote.roomButton(state.code)}</span>`:''}${state&&!readOnlyPresentation?`<button type="button" class="connection ${status==='online'||demo?'connected':''}" data-action="participants" title="Participantes da sala" aria-label="Ver participantes da sala"><span></span>${demo?'Prévia':status==='online'?'Ao vivo':'Reconectando'}</button>`:`<span class="connection ${status==='online'||demo?'connected':''}"><span></span>${readOnlyPresentation&&demo?'Apresentação':demo?'Prévia':status==='online'?'Ao vivo':'Reconectando'}</span>`}${host||state.me?soundButton():''}`:''}</div></header>`;
}
function modelPanel(landing = false) {
  const custom = state && slides[state.slide]?.customModel;
  const activeId = localModel || 'ssd';
  const activeMeta = modelMeta(activeId);
  const baseChoices = landing
    ? BUILTIN_MODELS.map(m => [m.id, m.shortName])
    : HARDWARE_MODEL_IDS.includes(activeId)
      ? HARDWARE_MODEL_IDS.map(id => [id, modelMeta(id).shortName])
      : [[activeId, activeMeta.shortName], ...HARDWARE_MODEL_IDS.map(id => [id, modelMeta(id).shortName])];
  const choices = [...baseChoices, ...(custom ? [['custom', 'Meu modelo']] : [])];
  const headingLabel = landing ? 'EXPLORADOR 3D · 13 MODELOS' : `${activeMeta.subject.toUpperCase()} · 3D`;
  return `<section class="model-panel ${landing ? 'hero-model' : ''}" aria-label="Explorador de modelos em 3D">
    <div class="model-heading"><span class="eyebrow">${icon('cube')} ${esc(headingLabel)}</span><span class="live-pill">3D INTERATIVO</span></div>
    <div class="model-tabs" role="group" aria-label="Escolher modelo">${choices.map(([type, label]) => `<button class="model-tab ${localModel === type ? 'active' : ''}" data-model="${type}" aria-pressed="${localModel === type}" ${state && !host && type !== state.model ? 'disabled title="O professor escolhe o modelo deste slide"' : ''}>${esc(label)}</button>`).join('')}</div>
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
  return `<div class="modal-backdrop"><section class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button class="icon-btn close-modal" data-action="close-share" aria-label="Fechar convite">${icon('close')}</button><span class="eyebrow purple-text">A AULA FICA MELHOR JUNTO</span><h2 id="share-title">Conecte a turma<span>.</span></h2><p>Aponte a câmera. Escolha um avatar. Entre na aula.</p><div class="qr-wrap"><img id="room-qr" width="230" height="230" alt="QR Code para entrar nesta sala"></div><span class="eyebrow">OU ENTRE COM O CÓDIGO</span><div class="big-code">${esc(state.code.slice(0, 3))}<span> </span>${esc(state.code.slice(3))}</div><div class="share-link"><input readonly aria-label="Link de convite" value="${esc(url)}"><button class="icon-btn" data-action="copy-link" aria-label="Copiar link">${icon('copy')}</button></div>${host ? `<button class="btn secondary small share-manage" data-action="manage-people">Ver e remover pessoas</button>` : ''}${import.meta.env.DEV&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&!routeParams().has('localSignal')?`<details><summary>Configurar endereço público</summary><label for="public-url">URL publicada no GitHub Pages</label><input id="public-url" type="url" placeholder="https://usuario.github.io/senaidendezas/"><button class="btn secondary small" data-action="save-url">Salvar endereço</button></details>`:''}</section></div>`;
}
// Vídeos, experimentos e modelos 3D recomeçariam do zero a cada atualização da
// tela (clique de animação, aluno entrando…). Enquanto o slide é o mesmo e o
// conteúdo dele não mudou, o quadro do slide fica onde está e só o resto é trocado.
const LIVE_SLIDE = '.canvas-frame.canvas-presenting';
let liveSlide = null;
// Palco do editor preservado entre renders: evita que salvar ou abrir
// diálogos reconstruam o canvas (imagens, modelos 3D e simulações piscando).
let editorStage = null;
function keepLiveSlide(markup, key) {
  const old = liveSlide?.node;
  if (!key || liveSlide?.key !== key || !old?.isConnected || app.querySelector(LIVE_SLIDE) !== old || !old.querySelector('iframe,video,audio,[data-simulation],[data-canvas-model]')) return false;
  const next = document.createElement('template'); next.innerHTML = markup;
  const fresh = next.content.querySelector(LIVE_SLIDE);
  if (!fresh || fresh.outerHTML !== liveSlide.html) return false;
  const chain = (node, top) => { const list = []; for (let item = node; item && item !== top; item = item.parentNode) list.unshift(item); return list; };
  const oldChain = chain(old, app), newChain = chain(fresh, next.content);
  if (oldChain.length !== newChain.length || oldChain.some((node, index) => node.tagName !== newChain[index].tagName)) return false;
  let oldParent = app, newParent = next.content;
  oldChain.forEach((keep, index) => {
    const incoming = newChain[index];
    for (const child of [...oldParent.childNodes]) if (child !== keep) child.remove();
    let before = true;
    for (const child of [...newParent.childNodes]) {
      if (child === incoming) { before = false; continue; }
      if (before) oldParent.insertBefore(child, keep); else oldParent.append(child);
    }
    if (keep !== old) {
      for (const name of keep.getAttributeNames()) if (!incoming.hasAttribute(name)) keep.removeAttribute(name);
      for (const name of incoming.getAttributeNames()) if (keep.getAttribute(name) !== incoming.getAttribute(name)) keep.setAttribute(name, incoming.getAttribute(name));
    }
    oldParent = keep; newParent = incoming;
  });
  return true;
}
function keepChatEditorStage(content) {
  try {
    const old = editorStage?.node;
    if (state || !old?.isConnected || app.querySelector('.designer-stage-wrap') !== old) return;
    if (!old.querySelector('img,[data-simulation],[data-canvas-model],iframe,video')) return;
    const fresh = content.querySelector('.designer-stage-wrap');
    if (fresh && fresh.outerHTML === editorStage.html) fresh.replaceWith(old);
  } catch { /* sem preservação: o conteúdo novo é aplicado normalmente */ }
}
function keepEditorStage(markup) {
  try {
  const old = editorStage?.node;
  if (state || sharedLoading || sharedError || busy && host) return false;
  if (!old?.isConnected || app.querySelector('.designer-stage-wrap') !== old) return false;
  if (!old.querySelector('img,[data-simulation],[data-canvas-model],iframe,video')) return false;
  const next = document.createElement('template'); next.innerHTML = markup;
  const fresh = next.content.querySelector('.designer-stage-wrap');
  if (!fresh) return false;
  // Referência pré-montagem capturada antes de qualquer nó sair do template.
  const freshHtml = fresh.outerHTML;
  const chain = (node, top) => { const list = []; for (let item = node; item && item !== top; item = item.parentNode) list.unshift(item); return list; };
  const oldChain = chain(old, app), newChain = chain(fresh, next.content);
  if (oldChain.length !== newChain.length || oldChain.some((node, index) => node.tagName !== newChain[index].tagName)) return false;
  let oldParent = app, newParent = next.content;
  oldChain.forEach((keep, index) => {
    const incoming = newChain[index];
    for (const child of [...oldParent.childNodes]) if (child !== keep) child.remove();
    let before = true;
    for (const child of [...newParent.childNodes]) {
      if (child === incoming) { before = false; continue; }
      if (before) oldParent.insertBefore(child, keep); else oldParent.append(child);
    }
    if (keep !== old) {
      for (const name of keep.getAttributeNames()) if (!incoming.hasAttribute(name)) keep.removeAttribute(name);
      for (const name of incoming.getAttributeNames()) if (keep.getAttribute(name) !== incoming.getAttribute(name)) keep.setAttribute(name, incoming.getAttribute(name));
    }
    oldParent = keep; newParent = incoming;
  });
  // Dentro do palco preservado, só os objetos que mudaram são trocados:
  // imagens, vídeos, modelos 3D e simulações continuam vivos. A reconciliação
  // é blindada — qualquer divergência remonta o palco em vez de quebrá-lo.
  const oldStage = old.querySelector('.designer-stage'), freshStage = fresh.querySelector('.designer-stage');
  if (oldStage && freshStage) reconcileStageSafely(oldStage, freshStage);
  const oldList = old.querySelector('.designer-layer-list'), freshList = fresh.querySelector('.designer-layer-list');
  if (freshList) oldList ? oldList.replaceWith(freshList) : old.append(freshList);
  else oldList?.remove();
  editorStage = { node: old, html: freshHtml };
  setStageCache(editorStage);
  return true;
  } catch { return false; }
}
// Abertura das etapas: cartela animada com o nome da etapa e fanfarra curta.
let introStageKey = '';
function stageIntro() {
  if (!state) { introStageKey = ''; return; }
  let key = '', label = '', icon = '';
  if (state.phase === 'lesson' && state.activity && state.activity.type !== 'slides') {
    key = `${state.code || 'aula'}:${state.activity.type}:${state.activity.slideIndices?.[0] ?? state.slide}`;
    label = blockNames[state.activity.type] || 'Etapa';
    icon = gameIcon(state.activity.type);
  } else if (state.phase === 'game' && state.game) {
    key = `${state.code || 'aula'}:game:${state.game.type}:${state.slide}`;
    label = gameNames[state.game.type] || 'Dinâmica';
    icon = gameIcon(state.game.type);
  } else if (state.phase === 'quiz') {
    key = `${state.code || 'aula'}:quiz`;
    label = 'Quiz';
    icon = gameIcon('quiz');
  }
  if (!key || introStageKey === key) { if (!key) introStageKey = ''; return; }
  introStageKey = key;
  const overlay = document.createElement('div');
  overlay.className = 'stage-intro';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<div class="stage-intro-card"><span class="stage-intro-icon">${icon}</span><strong>${esc(label)}</strong><span class="stage-intro-sub">${esc(activeLesson?.title || '')}</span></div>`;
  document.body.append(overlay);
  setTimeout(() => overlay.remove(), 2100);
  gameAudio.playStageIntro();
}
// Última visualização do studio renderizada: trocar de visualização (editor,
// Storage AI, biblioteca…) entra com transição suave de cross-fade do
// navegador — sem a sensação de o site inteiro recarregar.
let lastStudioView = null;
function render() {
  const arrive = !state && !sharedLoading && !sharedError && !(busy && host) && lastStudioView !== null && lastStudioView !== studio.view;
  if (!state && arrive) app.dataset.viewArrive = '1'; else delete app.dataset.viewArrive;
  applyRender();
  lastStudioView = state ? null : studio.view;
}
function applyRender() {
  // Em sala ao vivo (slides, quiz e jogos) animações e transições definidas na aula sempre tocam, exceto se o usuário escolher "reduzido" no perfil.
  document.documentElement.toggleAttribute('data-play', Boolean(state));
  stageIntro();
  const slideMotionKey = state?.phase === 'lesson' ? `${activeLesson.id}:${state.code}:${state.slide}` : '';
  const activeTransition = state?.slideTransition || slides[state?.slide]?.transition || 'slide';
  const outgoingSlide = pageMotion.captureSlide(app, slideMotionKey, activeTransition);
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
  // A URL acompanha a sala atual: o código antigo sai, o atual entra —
  // assim o refresh volta direto para a sala em que a turma está.
  if (state?.code && classroom && !readOnlyPresentation && !demo) {
    const url = new URL(location.href);
    if (url.searchParams.get('s') !== state.code) { url.searchParams.set('s', state.code); history.replaceState(history.state, '', url); }
  }
  // Aula sem atividades pontuadas (nem quiz nem jogos) volta direto ao encerrar.
  if (state?.phase === 'finished' && !state.totalQuestions && !state.hasScoredStages) { focusView.close(); leave(); return; }
  app.classList.toggle('quiz-party', Boolean(state && state.phase !== 'lesson'));
  const markup = sharedLoading || busy && host && !state ? `${header()}<main class="public-loading"><p role="status">Carregando apresentação…</p></main>` : sharedError ? `${header()}<main class="public-loading"><h1>Apresentação indisponível</h1><p>${esc(sharedError)}</p><button class="btn secondary" data-action="home">Voltar</button></main>` : !state ? studio.markup() : state.phase === 'lesson' ? lesson() : ['lobby', 'countdown'].includes(state.phase) ? lobbyMarkup(state, { host, demo, header, shareDialog, shareOpen }) : state.phase === 'finished' ? finished() : state.phase==='leaderboard'?leaderboardMarkup(state,{header,host,offset:timerOffset}):state.game ? gameMarkup(state, { host, demo, header, now: Date.now() + timerOffset }) : state.poll ? pollMarkup() : quiz();
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
    keepChatEditorStage(next.content);
    for (const child of [...app.children]) if (!child.matches(chatSlots)) child.remove();
    app.prepend(next.content);
    studio.chat.paint();
    studio.social.paint();
  } else if (keepGame(app, markup, state)) {
    liveSlide = null;
  } else if (keepEditorStage(markup)) {
    liveSlide = null;
  } else if (!keepLiveSlide(markup, slideMotionKey)) {
    app.innerHTML = markup;
    const frame = slideMotionKey ? app.querySelector(LIVE_SLIDE) : null;
    liveSlide = frame ? { key: slideMotionKey, node: frame, html: frame.outerHTML } : null;
    const stageFrame = !state ? app.querySelector('.designer-stage-wrap') : null;
    if (stageFrame) {
      // Voltar de outra visualização (Storage AI, biblioteca, apresentar):
      // se o palco guardado continua igual, reanexa em vez de remontar.
      if (editorStage?.node && !editorStage.node.isConnected && editorStage.html === stageFrame.outerHTML) stageFrame.replaceWith(editorStage.node);
      else { tagStageSources(stageFrame); editorStage = { node: stageFrame, html: stageFrame.outerHTML }; }
      setStageCache(editorStage);
    } else if (!state) { editorStage = null; setStageCache(null); }
  }
  // Entrada do slide no computador (apresentador e aluno conectado): o quadro
  // novo chega com data-enter e a transição escolhida anima direto nele — sem
  // depender da janela de tempo da cena, que não alcançava o PC de quem
  // acompanha a aula.
  const stageNode = state?.phase === 'lesson' ? app.querySelector('.document-stage') : null;
  if (stageNode && state.slide !== lastStageEnter && activeTransition && activeTransition !== 'none') stageNode.dataset.enter = activeTransition;
  lastStageEnter = state?.phase === 'lesson' ? state.slide : null;
  if (state?.phase === 'lesson') {
    app.insertAdjacentHTML('beforeend', pinnedInvite({ host, demo, state, settings: presenterSettings }));
    if (editDraft) app.insertAdjacentHTML('beforeend', liveEditDialog(editDraft, editError));
  }
  app.dataset.transition = state?.phase === 'lesson' ? activeTransition : 'slide';
  if (state?.phase === 'leaderboard') animateRanking(app, Math.max(0, (Date.now() + timerOffset - (state.resultStartedAt || 0)) / 1000));
  if (state?.game?.type === 'raffle') animateRaffle(app, () => Date.now() + timerOffset);
  if(state&&!app.querySelector('[data-remote-dialog]'))app.insertAdjacentHTML('beforeend','<div data-remote-dialog></div>');
  studio.remote.paint();
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
  fillAssetImages(app);simulations.mount(state?.phase==='lesson'||state?.game?.type==='challenge'?app:null);syncInteraction();publishRemote();if(state?.phase==='lesson')loadSlideFonts(slides[state.slide],activeLesson.customFonts);
  if (state && (shareOpen || (host && !demo && presenterSettings.qrVisible && state.phase === 'lesson'))) {
    const url = joinUrl();
    const setQR = src => { if (state && joinUrl() === url) for (const image of document.querySelectorAll('#room-qr, [data-pinned-qr]')) image.src = src; };
    if (qrCache.has(url)) setQR(qrCache.get(url));
    else QRCode.toDataURL(url, { width: 460, margin: 2 }).then(src => { qrCache.set(url, src); setQR(src); }).catch(() => toast('Não foi possível gerar o QR Code. Use o link ou código.'));
  }
  if(state?.phase==='lesson'){pptxAnimations.mount(app,slides[state.slide],activeLesson.id+':'+state.slide,state.animationStep||0);}else{pptxAnimations.key=null;}
  // Desafio do experimento: trilha de fundo (as músicas de 120 s+ dos
  // quizzes) enquanto a turma trabalha; para no encerramento.
  gameAudio.stageBed(state?.phase==='game'&&state.game?.type==='challenge'&&state.game.state!=='done','challenge:'+(state?.game?.id||''));
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
  if(next==='ended'){leave();toast(message);return;}
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
  classroom = new Room('PREVIA', undefined, Date.now, lesson, options?.startIndex);
  classroom.fullText = true; // na prévia o professor é telão e aluno ao mesmo tempo
  demoPlayer = classroom.join({ name: 'Você', avatar: selectedAvatar }).id;
  receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) });
  demoTimer = setInterval(() => {
    const key = () => classroom.data.phase + ':' + (classroom.data.game?.state || '') + ':' + (classroom.data.podiumStep || 0), phase = key(); classroom.tick();
    if (phase !== key()) receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) });
  }, 100);
}
async function connectSession(mode) {
  if (mode.lesson) { activeLesson = mode.lesson; slides = mode.lesson.slides; }
  busy = true; host = mode.host; demo = false; editorLaunch=Boolean(mode.fromEditor);music=true; gameAudio.unlock(); render();
  classroom?.stop?.();
  const session = new Classroom(
    next => { if (classroom === session) receive(next); },
    (next, message) => { if (classroom === session) connection(next, message); }
  );
  classroom = session;
  classroom.onLive = msg => { if (classroom === session) receiveInteraction(msg); };
  liveInteraction = null;
  try {
    if (host) { await classroom.create(Boolean(mode.resume), mode.lesson, mode.startIndex,editorLaunch);shareOpen=!mode.resume; }
    else {music=true;gameAudio.unlock();await classroom.join(mode.code, mode.name, mode.avatar);enterImmersiveRoom();}
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
  clearInterval(demoTimer);
  // Professor saindo: avisa os alunos (eles voltam para a tela inicial) antes de fechar as conexões.
  if (host && !demo && classroom?.end) { const room = classroom; room.end(); clearInterval(room.timer); setTimeout(() => room.stop(), 300); } else classroom?.stop?.();
  classroom = null;
  readOnlyPresentation=false;publicPresentationToken='';sharedLoading=false;sharedError='';
  state = null; host = false; demo = false; editorLaunch=false;shareOpen = false; lastSlide = -1; immersiveDone = false; lastStageEnter = null;
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
trackPlayer.addEventListener('loadedmetadata',()=>{if(playingTrack?.track)applyAudioPlayback(trackPlayer,playingTrack.track);});
function playSlideTrack(track,key,manual=false) {
  trackPlayer.src=track.data;
  applyAudioPlayback(trackPlayer,track);
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
// Etapas interativas: o que o aluno envia (resposta, palavra, toques…).
async function sendGame(payload, quiet = false) {
  if (!state?.game || state.phase !== 'game') return;
  try {
    if (!quiet) { gameAudio.unlock(); gameAudio.cue('answer'); }
    if (demo) { classroom.answer(demoPlayer, { choice: payload, questionIndex: state.game.id }); receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) }); }
    else await classroom.answer(payload, state.game.id);
  } catch (err) { if (!quiet) toast(err.message); }
}
let tugTaps = 0, tugTimer = 0;
function tugTap(button) {
  tugTaps++; navigator.vibrate?.(8);
  // Faísca "+1" subindo do botão a cada toque.
  const box = button.getBoundingClientRect(), spark = document.createElement('i');
  spark.className = 'tug-spark'; spark.textContent = '+1'; spark.style.left = box.left + box.width * (.3 + Math.random() * .4) + 'px'; spark.style.top = box.top + box.height * .3 + 'px'; spark.style.setProperty('--dx', Math.round(Math.random() * 60 - 30) + 'px');
  document.body.append(spark); setTimeout(() => spark.remove(), 720);
  button.classList.remove('pulse'); void button.offsetWidth; button.classList.add('pulse');
  if (!tugTimer) tugTimer = setTimeout(() => { const taps = tugTaps; tugTaps = 0; tugTimer = 0; sendGame({ taps }, true); }, 450);
}
app.addEventListener('pointerdown', event => { const button = event.target.closest('[data-tug-tap]'); if (button) { event.preventDefault(); tugTap(button); } });
app.addEventListener('keydown', event => { const button = event.target.closest?.('[data-tug-tap]'); if (button && (event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); tugTap(button); } });
app.addEventListener('submit', event => {
  const form = event.target.closest('[data-cloud-form]');
  if (!form) return;
  event.preventDefault();
  const input = form.querySelector('input'), word = input.value.trim();
  if (!word) return;
  if (Number(form.dataset.left) <= 0) { toast('Você já enviou as suas 3 respostas.'); return; }
  input.value = ''; sendGame({ word });
});
app.addEventListener('click', event => {
  const button = event.target.closest('[data-game-send],[data-game-do],[data-challenge-send]');
  if (!button || button.disabled || !state?.game) return;
  if (button.dataset.gameDo === 'team-rename') { if (host) control('game', { do: 'team-rename', team: Number(button.dataset.team), name: button.closest('.team-rename')?.querySelector('[data-team-rename-input]')?.value || '' }); return; }
  if (button.dataset.gameDo === 'team-leader') { if (host) control('game', { do: 'team-leader', team: Number(button.dataset.team), player: button.dataset.player || '' }); return; }
  if (button.dataset.gameDo === 'team-count') { if (host) control('game', { do: 'team-count', count: Number(button.closest('.team-count-control')?.querySelector('[data-team-count-select]')?.value) || 2 }); return; }
  if (button.dataset.gameDo) { control('game', { do: button.dataset.gameDo, id: button.dataset.id }); return; }
  if (button.hasAttribute('data-challenge-send')) {
    const values = [...app.querySelectorAll('[data-challenge-sim] :is([data-param],[data-sim-select],[data-sim-text],[data-sim-toggle])')].map(field => field.dataset.simToggle !== undefined ? field.dataset.value || '0' : String(field.value).slice(0, 80));
    // Prévia silenciosa: o telão vê os controles mexendo em tempo real.
    sendGame({ values, peek: true }, true);
    sendGame({ values }); return;
  }
  try { sendGame(JSON.parse(button.dataset.gameSend)); } catch { /* botão inválido */ }
});
// Líder do time: troca o nome e a foto da equipe pelo próprio celular.
let teamPhotoDraft;
app.addEventListener('click', async event => {
  const photoButton = event.target.closest('[data-team-photo-button]');
  if (photoButton) { photoButton.closest('.team-leader-tools')?.querySelector('[data-team-photo]')?.click(); return; }
  const clearButton = event.target.closest('[data-team-photo-clear]');
  if (clearButton) {
    const tools = clearButton.closest('.team-leader-tools');
    if (tools) { teamPhotoDraft = ''; sendGame({ teamCustom: { team: Number(tools.dataset.leaderTeam), name: tools.querySelector('[data-team-name]')?.value || '', photo: '' } }, true); toast('Foto do time removida.'); }
    return;
  }
  const saveButton = event.target.closest('[data-team-save]');
  if (saveButton) {
    const tools = saveButton.closest('.team-leader-tools');
    if (!tools) return;
    sendGame({ teamCustom: { team: Number(tools.dataset.leaderTeam), name: tools.querySelector('[data-team-name]')?.value || '', ...(teamPhotoDraft !== undefined ? { photo: teamPhotoDraft } : {}) } }, true);
    teamPhotoDraft = undefined;
    toast('Time atualizado.');
  }
});
app.addEventListener('change', async event => {
  const input = event.target.closest('[data-team-photo]');
  if (!input) return;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const optimized = await optimizeImage(file, { avatar: true });
    teamPhotoDraft = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(optimized);
    });
    if (teamPhotoDraft.length > 30000) { teamPhotoDraft = undefined; toast('Escolha uma foto menor.'); }
    else {
      const preview = input.closest('.team-leader-tools')?.querySelector('[data-team-preview]');
      if (preview) preview.innerHTML = `<img src="${teamPhotoDraft}" alt="Nova foto do time">`;
      toast('Foto pronta. Toque em Salvar.');
    }
  } catch (error) { toast(error?.message || 'Não foi possível abrir a imagem.'); }
});
function exportResults() {
  if (!state) return;
  downloadResultsPng(state, activeLesson?.title || 'Resultado da aula');
}
async function action(name) {
  switch (name) {
    case 'choose-guest-photo':app.querySelector('[data-guest-photo]')?.click();break;
    case 'take-guest-photo':{const file=await takePhoto();if(file){selectedAvatar=await participantPhoto(file);avatarChanged=true;render();}break;}
    case 'scan-qr':{const code=await scanRoomCode();if(code){codeDraft=code;const field=app.querySelector('#room-code');if(field)field.value=code;studio.view='join';render();}break;}
    case 'participants':if(state){if(host){shareOpen=true;render();}else manageParticipants(state,null);}break;
    case 'manage-people':if(state)manageParticipants(state,host&&!demo?id=>control('kick',id):null);break;
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
    case 'game-next': control('game', { do: 'next' }); break;
    case 'game-draw': control('game', { do: 'draw' }); break;
    case 'game-end': control('game', { do: 'end' }); break;
    case 'game-restart': control('game', { do: 'restart' }); break;
    case 'game-shuffle': control('game', { do: 'shuffle' }); break;
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
  // Entrar na sala já abre em tela cheia (precisa acontecer dentro do clique).
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
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
  try{if(validPublicCode(token))token=await resolvePublicCode(token);const lesson=await loadPublicPresentation(token);sharedLoading=false;preview(lesson,{readOnly:true,token});}
  catch(error){sharedLoading=false;sharedError=error.message;render();}
}
const savedSession = Classroom.resume();
async function restorePage() {
  const token=publicLinkParam();if(token){await openPublicPresentation(token);return;}
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
if (publicLinkParam()) openPublicPresentation(publicLinkParam());
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
// Celular do aluno que ainda não conseguiu a tela cheia: o primeiro toque
// completa (o navegador exige um gesto para liberar o fullscreen).
app.addEventListener('pointerdown',()=>{enterImmersiveRoom();},{passive:true});

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
