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
const viewer = new HardwareViewer();
const canvasModels = new CanvasModels();
const pageMotion = new PageMotion();
let classroom, state, host = false, demo = false, busy = false, selectedAvatar = avatars[0];
let shareOpen = false, notesOpen = false, solutionOpen = false, lastSlide = -1, localModel = 'ssd', localExploded = true;
let status = 'offline', statusMessage = '', timerOffset = 0, music = false, audio, musicTimer, audioStep = 0;
let clockTimer;
const trackPlayer = new Audio(); let trackKey = '';
trackPlayer.dataset.soundtrack = ''; trackPlayer.hidden = true; document.body.append(trackPlayer);
let demoTimer, toastTimer, controlsTimer, editDraft = null, editIndex = -1, editError = '', imageText = false;
const presenterSettings = loadPresenterSettings();
const qrCache = new Map();
const params = new URLSearchParams(location.search);
let codeDraft = (params.get('s') || '').replace(/\D/g, '').slice(0, 6);
const studio = new Studio(app, { render, toast, joinForm, preview, present: lesson => connectSession({ host: true, lesson }) });
if (codeDraft) studio.view = 'join';

function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4500);
}
function brand() { return `<button class="brand" data-action="home" aria-label="Storage Lab, início"><span class="brand-symbol">${icon('chip')}</span><span>storage<span class="brand-light">lab</span><span class="brand-period">.</span></span></button>`; }
function header() {
  return `<header class="header">${brand()}<div class="header-center"><span class="tiny-square"></span> AULA INTERATIVA <span class="divider">/</span> ${esc(activeLesson.title)}</div><div class="header-right">${state ? `<span class="connection ${status === 'online' || demo ? 'connected' : ''}"><span></span>${demo ? 'Prévia local' : status === 'online' ? 'Ao vivo' : 'Reconectando'}</span>${host ? `<button class="icon-btn" data-action="sound" aria-label="${music ? 'Desativar' : 'Ativar'} áudio" title="Áudio da apresentação">${icon(music ? 'volume' : 'mute')}</button>` : ''}<button class="icon-btn desktop-only" data-action="fullscreen" aria-label="Tela cheia">${icon('expand')}</button>` : '<span class="senai-badge">SENAI <span>×</span> HARDWARE</span>'}</div></header>`;
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
function joinForm() {
  return `<form id="join-form" class="join-card"><div class="join-card-top"><span class="small-icon">${icon('users')}</span><span class="eyebrow">SEU LUGAR NA AULA</span></div><h2>Entre na experiência<span>.</span></h2><p>Escolha seu avatar. O resto a gente conecta.</p>
  <label for="room-code">Código da sala</label><input id="room-code" name="code" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" maxlength="6" placeholder="000 000" value="${esc(codeDraft)}" required>
  <label for="player-name">Como podemos chamar você?</label><input id="player-name" name="name" autocomplete="nickname" maxlength="24" placeholder="Seu nome ou apelido" required>
  <label id="avatar-label">Sua identidade no ranking</label><div class="avatar-picker" role="group" aria-labelledby="avatar-label">${avatars.map(a => `<button type="button" class="avatar ${a === selectedAvatar ? 'active' : ''}" data-avatar="${a}" aria-label="Avatar ${a}" aria-pressed="${a === selectedAvatar}">${a}</button>`).join('')}</div>
  <button class="btn primary full" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Conectando…' : 'Entrar na sala'} ${icon('arrow')}</button><p class="form-note">Sem cadastro. Sem download. Só aprender.</p></form>`;
}
function participants(limit = 8) {
  const people = state.ranking;
  return `<div class="participants-strip"><div class="participant-count">${icon('users')} <strong>${people.filter(p => p.online).length}</strong> conectado${people.filter(p => p.online).length === 1 ? '' : 's'}</div><div class="participant-avatars">${people.slice(0, limit).map(p => `<span title="${esc(p.name)}${p.online ? '' : ' · offline'}" class="${p.online ? '' : 'offline'}">${esc(p.avatar)}</span>`).join('')}${people.length > limit ? `<span class="extra-people">+${people.length - limit}</span>` : ''}</div>${host && !demo ? `<button class="text-btn" data-action="share">Convidar turma ${icon('arrow')}</button>` : ''}</div>`;
}
function slideMedia(slide) {
  if (slide.kind === 'model') return modelPanel();
  if (slide.kind === 'image' && slide.image) return `<figure class="lesson-image"><img src="${esc(slide.image)}" alt="${esc(slide.imageAlt)}"><figcaption>${esc(slide.imageAlt)}</figcaption></figure>`;
  return '';
}
function documentLesson(slide) {
  const canvas = slide.kind === 'canvas';
  return `${header()}${presentationTools({ host, demo, state, settings: presenterSettings, imageText })}<main class="document-classroom"><div class="document-top"><div><span class="eyebrow purple-text">${esc((slide.sourceType || (canvas ? 'SLIDE LIVRE' : 'SLIDES')).toUpperCase())} · ${demo ? 'PRÉVIA' : 'AULA AO VIVO'}</span><h1>${esc(activeLesson.title)}</h1></div><div class="document-top-actions">${host ? `<label class="sr-only" for="document-page">Ir para página</label><select id="document-page" aria-label="Ir para página">${slides.map((s, i) => `<option value="${i}" ${state.slide === i ? 'selected' : ''}>${i + 1} · ${esc(s.title)}</option>`).join('')}</select><button class="btn secondary small" data-action="fullscreen" aria-label="Apresentar em tela cheia">${icon('expand')} Tela cheia</button>` : '<span class="following-label"><span class="status-dot"></span> Acompanhando o professor</span>'}<button class="text-btn" data-action="leave">Sair</button></div></div>
    ${status !== 'online' && !demo ? '<div class="connection-banner" role="status">Reconectando à sala. <button class="text-btn" data-action="reconnect">Reconectar</button></div>' : ''}
    <figure class="document-stage ${canvas ? 'canvas-stage' : ''}">${canvas ? canvasMarkup(slide) : `<img src="${esc(slide.image)}" alt="${esc(slide.imageAlt || slide.title)}"><figcaption class="sr-only">${esc(slide.title)}</figcaption>`}</figure>
    ${slide.prompt ? `<section class="document-discussion"><strong>${esc(slide.prompt)}</strong><button class="text-btn" data-action="solution">${solutionOpen ? 'Ocultar' : 'Conferir'} explicação</button>${solutionOpen ? `<p>${esc(slide.answer)}</p>` : ''}</section>` : ''}
    ${host && notesOpen && slide.note ? `<aside class="document-notes">${esc(slide.note)}</aside>` : ''}
    <footer class="document-footer">${participants()}<div class="document-nav"><span class="slide-counter"><strong>${state.slide + 1}</strong> / ${slides.length}</span>${host ? `${slide.note ? '<button class="text-btn" data-action="notes">Roteiro</button>' : ''}<button class="icon-btn bordered" data-action="previous" aria-label="Slide anterior" ${state.slide === 0 ? 'disabled' : ''}>${icon('left')}</button>${state.slide < slides.length - 1 ? `<button class="btn primary small" data-action="next-slide">Próximo ${icon('right')}</button>` : `<button class="btn primary small" data-action="${state.totalQuestions ? 'quiz' : 'finish'}">${state.totalQuestions ? 'Iniciar quiz' : 'Encerrar aula'} ${icon('check')}</button>`}` : '<span class="following-label">Sincronizado com a aula</span>'}</div></footer></main>${shareOpen ? shareDialog() : ''}`;
}
function lesson() {
  const slide = slides[state.slide];
  if (['document', 'canvas'].includes(slide.kind)) return documentLesson(slide);
  return `${header()}${presentationTools({ host, demo, state, settings: presenterSettings, imageText })}<main class="classroom ${!host ? 'student-class' : ''} ${slide.kind === 'image' ? 'image-slide' : ''}"><div class="classroom-top"><div><span class="eyebrow">${demo ? 'MODO EXPLORAÇÃO' : host ? 'VOCÊ ESTÁ NO CONTROLE' : 'VOCÊ FAZ PARTE DESTA AULA'}</span><h2>${esc(activeLesson.title)}<span class="purple-text">.</span></h2></div><div class="room-actions">${!demo ? `<button class="room-code" data-action="share">SALA <strong>${esc(state.code)}</strong>${icon('copy')}</button>` : '<span class="demo-badge">Prévia · sem transmissão</span>'}<button class="text-btn" data-action="leave">Sair</button></div></div>
    ${status !== 'online' && !demo ? `<div class="connection-banner" role="status">Conexão interrompida. ${esc(statusMessage || 'Tentando reconectar. Se necessário, toque em Reconectar.')} <button class="text-btn" data-action="reconnect">Reconectar</button></div>` : ''}
    ${!host ? `<div class="mobile-topic"><span class="eyebrow purple-text">${esc(slide.tag)}</span><h1>${esc(slide.title)}</h1></div>` : ''}
    <div class="lesson-layout ${slide.kind === 'text' ? 'text-lesson' : ''}"><section class="slide-panel"><span class="eyebrow purple-text">${esc(slide.tag)}</span><h1>${esc(slide.title)}</h1><p class="slide-intro">${esc(slide.intro)}</p><ul class="teaching-points">${slide.points.map((p, i) => `<li><span>0${i + 1}</span><p>${esc(p)}</p></li>`).join('')}</ul>
    ${slide.comparison ? `<div class="comparison"><div><strong>HDD</strong><span>Menor custo por GB</span><span>Ruído e partes móveis</span></div><div><strong>SSD</strong><span>Menor latência</span><span>Silencioso e sem partes móveis</span></div></div>` : ''}
    ${slide.callout ? `<div class="callout">${icon('bolt')}<p>${esc(slide.callout)}</p></div>` : ''}
    ${slide.prompt ? `<div class="discussion-prompt"><span class="eyebrow purple-text">PARA CONVERSAR COM A TURMA</span><p>${esc(slide.prompt)}</p></div><button class="text-btn reveal-discussion" data-action="solution">${solutionOpen ? 'Ocultar' : 'Conferir'} explicação ${icon('right')}</button>${solutionOpen ? `<p class="discussion-answer">${esc(slide.answer)}</p>` : ''}` : ''}
    ${host ? `<div class="presenter-notes"><button data-action="notes" aria-expanded="${notesOpen}">${icon('book')} Roteiro do apresentador ${icon(notesOpen ? 'left' : 'right')}</button>${notesOpen ? `<p>${esc(slide.note)}</p>` : ''}</div>` : '<p class="student-hint">O apresentador conduz os slides. Você explora o modelo do seu jeito.</p>'}</section>${slideMedia(slide)}</div>
    <div class="lesson-bottom">${participants()}<div class="slide-controls"><span class="slide-counter"><strong>${String(state.slide + 1).padStart(2, '0')}</strong> / ${String(slides.length).padStart(2, '0')}</span><div class="slide-dots">${slides.map((s, i) => `<button ${host ? `data-slide="${i}"` : 'disabled'} class="${i === state.slide ? 'active' : ''}" aria-label="Slide ${i + 1}: ${esc(s.title)}" ${i === state.slide ? 'aria-current="step"' : ''}></button>`).join('')}</div>${host ? `<button class="icon-btn bordered" data-action="previous" aria-label="Slide anterior" ${state.slide === 0 ? 'disabled' : ''}>${icon('left')}</button>${state.slide === slides.length - 1 ? `<button class="btn primary small" data-action="${state.totalQuestions ? 'quiz' : 'finish'}">${state.totalQuestions ? 'Iniciar quiz' : 'Encerrar aula'} ${icon('bolt')}</button>` : `<button class="btn primary small" data-action="next-slide">Próximo ${icon('right')}</button>`}` : '<span class="following-label"><span class="status-dot"></span> Sincronizado com a aula</span>'}</div></div>
    ${host ? `<div class="presenter-footer"><span>← → para trocar os slides · F para tela cheia</span>${state.totalQuestions ? `<button class="text-btn" data-action="quiz">Ir para o quiz ${icon('trophy')}</button>` : ''}</div>` : ''}</main>${shareOpen ? shareDialog() : ''}`;
}
function rankingTable(full = false) {
  const rank = full ? state.ranking : state.ranking.slice(0, 5);
  return `<div class="ranking-list">${rank.length ? rank.map((p, i) => `<div class="rank-row ${state.me?.id === p.id ? 'is-me' : ''}"><span class="rank-position">${i === 0 ? '♛' : String(i + 1).padStart(2, '0')}</span><span class="rank-avatar">${esc(p.avatar)}</span><div class="rank-person"><strong>${esc(p.name)}${state.me?.id === p.id ? ' <small>você</small>' : ''}</strong><span>${p.correct} acerto${p.correct === 1 ? '' : 's'}${p.online ? '' : ' · offline'}</span></div><strong class="rank-score">${p.score.toLocaleString('pt-BR')}<small> pts</small></strong></div>`).join('') : '<p class="empty-state">O ranking começa com a primeira resposta.</p>'}</div>`;
}
function quiz() {
  const q = state.question, revealed = state.phase === 'reveal', myAnswer = state.me?.answer;
  const canAnswer = (!host || demo) && !myAnswer && !revealed && status === 'online';
  return `${header()}<main class="quiz-page"><div class="quiz-top"><span class="eyebrow">${icon('bolt')} DESAFIO STORAGE LAB</span><span class="quiz-count">PERGUNTA <strong>${state.questionIndex + 1}</strong> / ${state.totalQuestions}</span>${host && !demo ? `<button class="room-code" data-action="share">SALA <strong>${state.code}</strong></button>` : `<span class="score-pill">${icon('trophy')} ${(state.me?.score || 0).toLocaleString('pt-BR')} pts</span>`}</div>
    ${status !== 'online' && !demo ? '<div class="connection-banner" role="status">Reconectando ao apresentador. Respostas pausadas. <button class="text-btn" data-action="reconnect">Reconectar</button></div>' : ''}
    <div class="quiz-layout"><section class="question-card"><div class="question-meta"><span class="difficulty ${q.difficulty === 'Difícil' ? 'hard' : ''}">${esc(q.difficulty)}</span><span>Até ${q.base.toLocaleString('pt-BR')} pontos</span><div class="timer ${revealed ? 'done' : ''}">${icon('clock')}<strong id="time-left">—</strong></div></div><div class="time-track"><div id="time-bar"></div></div><h1>${esc(q.text)}</h1><div class="answer-options">${q.options.map((option, i) => {
      const good = revealed && i === q.correct, wrong = revealed && myAnswer?.choice === i && i !== q.correct;
      return `<button class="answer-option answer-${i} ${myAnswer?.choice === i ? 'chosen' : ''} ${good ? 'correct' : ''} ${wrong ? 'incorrect' : ''}" data-answer="${i}" ${canAnswer ? '' : 'disabled'}><span class="answer-letter">${'ABCD'[i]}</span><span>${esc(option)}</span>${good ? icon('check') : wrong ? icon('close') : myAnswer?.choice === i ? icon('check') : ''}</button>`;
    }).join('')}</div>
    ${revealed ? `<div class="answer-explanation"><strong>${myAnswer ? myAnswer.correct ? `Boa! +${myAnswer.points.toLocaleString('pt-BR')} pontos 🎉` : 'Essa não foi. A próxima é sua!' : 'Vamos entender a resposta.'}</strong><p>${esc(q.explanation)}</p></div>` : `<p class="answer-status" role="status">${myAnswer ? `${icon('check')} Resposta registrada. Aguarde a revelação!` : host && !demo ? 'A turma responde pelo celular. A resposta certa aparece ao final do tempo.' : 'Escolha com atenção. Acertos mais rápidos valem mais pontos.'}</p>`}
    <div class="question-footer"><span>${icon('users')} ${state.answeredCount} de ${state.ranking.length} responderam</span>${host ? `<button class="btn ${revealed ? 'primary' : 'secondary'} small" data-action="${revealed ? 'next-question' : 'reveal'}">${revealed ? state.questionIndex + 1 === state.totalQuestions ? 'Ver resultado' : 'Próxima pergunta' : 'Revelar resposta'} ${icon(revealed ? 'arrow' : 'check')}</button>` : `<span class="waiting-host">${revealed ? 'Aguarde o apresentador avançar' : 'Uma resposta por pergunta'}</span>`}</div></section><aside class="quiz-sidebar"><div class="ranking-title"><span class="small-icon">${icon('trophy')}</span><div><span class="eyebrow">A DISPUTA ESTÁ ON</span><h2>Ranking da turma</h2></div></div>${rankingTable()}<div class="scoring-note"><strong>Como funciona a pontuação?</strong><p>Acertou? Ganha de 50% a 100% dos pontos da pergunta, conforme o tempo restante. Erros e tempo esgotado valem zero.</p><span>Fácil · 1.000 <span>/</span> Média · 1.500 <span>/</span> Difícil · 2.000</span><p>Empates: mais acertos; depois ordem alfabética. A música é opcional e toca no computador do professor.</p></div></aside></div><p class="quiz-music-note">${icon(music ? 'volume' : 'mute')} ${music ? 'Trilha ativada neste dispositivo' : 'Quer uma trilha? Ative o som no topo da página.'}</p></main>${shareOpen ? shareDialog() : ''}`;
}
function finished() {
  if (!state.totalQuestions) return `${header()}<main class="results"><span class="eyebrow purple-text">IDEIAS COMPARTILHADAS</span><h1>Aula <span>concluída.</span></h1><p>${esc(activeLesson.title)}</p><p>${state.ranking.length} participante(s) fizeram parte desta descoberta.</p><div class="results-actions">${host ? '<button class="btn primary" data-action="back-lesson">Voltar à aula</button>' : ''}<button class="btn secondary" data-action="leave">Voltar ao início</button></div></main>`;

  const winners = state.ranking.slice(0, 3);
  return `${header()}<main class="results"><div class="confetti" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><span class="eyebrow purple-text">${icon('trophy')} MISSÃO CONCLUÍDA</span><h1>Conhecimento que<br>merece um <span>pódio.</span></h1><p>A turma explorou, descobriu e deu um show. Agora, o resultado.</p><div class="podium">${[1, 0, 2].filter(i => winners[i]).map(i => `<div class="podium-person place-${i + 1}"><div class="podium-avatar">${i === 0 ? '<span class="crown">♛</span>' : ''}${esc(winners[i].avatar)}</div><strong>${esc(winners[i].name)}</strong><span>${winners[i].score.toLocaleString('pt-BR')} pts</span><div class="podium-block">${i + 1}<small>${winners[i].correct} acertos</small></div></div>`).join('')}</div><div class="full-ranking"><div class="ranking-title"><h2>Todo mundo faz parte</h2><button class="text-btn" data-action="export">Baixar resultado ${icon('arrow')}</button></div>${rankingTable(true)}</div><div class="results-actions">${host ? '<button class="btn primary" data-action="back-lesson">Voltar à aula</button>' : ''}<button class="btn secondary" data-action="leave">Voltar ao início ${icon('arrow')}</button></div><p class="closing-line">O melhor resultado é sair sabendo um pouco mais. 💜</p></main>`;
}
function joinUrl() {
  let url;
  try { url = new URL(localStorage.getItem('sl-public-url') || location.href); } catch { url = new URL(location.href); }
  url.search = ''; url.hash = ''; url.searchParams.set('s', state.code); return url.href;
}
function shareDialog() {
  const url = joinUrl(), local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(new URL(url).hostname);
  return `<div class="modal-backdrop"><section class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button class="icon-btn close-modal" data-action="close-share" aria-label="Fechar convite">${icon('close')}</button><span class="eyebrow purple-text">A AULA FICA MELHOR JUNTO</span><h2 id="share-title">Conecte a turma<span>.</span></h2><p>Aponte a câmera. Escolha um avatar. Entre na aula.</p><div class="qr-wrap"><img id="room-qr" width="230" height="230" alt="QR Code para entrar nesta sala"></div><span class="eyebrow">OU ENTRE COM O CÓDIGO</span><div class="big-code">${esc(state.code.slice(0, 3))}<span> </span>${esc(state.code.slice(3))}</div><div class="share-link"><input readonly aria-label="Link de convite" value="${esc(url)}"><button class="icon-btn" data-action="copy-link" aria-label="Copiar link">${icon('copy')}</button></div><details><summary>Configurar endereço público</summary><label for="public-url">URL publicada no GitHub Pages</label><input id="public-url" type="url" placeholder="https://usuario.github.io/senaidendezas/"><button class="btn secondary small" data-action="save-url">Salvar endereço</button></details>${local ? '<p class="local-warning">Este endereço local só abre neste computador. Para celulares, use a URL publicada ou o IP do PC na mesma rede.</p>' : ''}</section></div>`;
}
function render() {
  const form = document.querySelector('#join-form');
  const draftName = form?.querySelector('#player-name')?.value;
  if (form) codeDraft = form.querySelector('#room-code').value;
  viewer.el.remove();
  app.classList.toggle('quiz-party', Boolean(state && state.phase !== 'lesson'));
  app.innerHTML = !state ? studio.markup() : state.phase === 'lesson' ? lesson() : ['lobby', 'countdown'].includes(state.phase) ? lobbyMarkup(state, { host, demo, header, shareDialog, shareOpen }) : state.phase === 'finished' ? finished() : quiz();
  if (state?.phase === 'lesson') {
    app.insertAdjacentHTML('beforeend', pinnedInvite({ host, demo, state, settings: presenterSettings }));
    if (editDraft) app.insertAdjacentHTML('beforeend', liveEditDialog(editDraft, editError));
  }
  syncPresentationMode();
  if (editDraft) for (const el of app.querySelectorAll('.header, .classroom, .document-classroom, .presentation-toolbar, .pinned-room-qr')) el.inert = true;
  if (!state) studio.afterRender();
  if (!state && draftName && document.querySelector('#player-name')) document.querySelector('#player-name').value = draftName;
  const slot = document.querySelector('#viewer-slot');
  if (slot) { slot.append(viewer.el); if (localModel === 'custom' && slides[state.slide]?.customModel) viewer.setCustomModel(slides[state.slide].customModel); else viewer.setModel(localModel, localExploded); requestAnimationFrame(() => viewer.resize()); }
  canvasModels.mount(state?.phase === 'lesson' && slides[state.slide]?.kind === 'canvas' ? app : null, state?.phase === 'lesson' ? slides[state.slide] : null);
  if (state && (shareOpen || (host && !demo && presenterSettings.qrVisible && state.phase === 'lesson'))) {
    const url = joinUrl();
    const setQR = src => { if (state && joinUrl() === url) for (const image of document.querySelectorAll('#room-qr, [data-pinned-qr]')) image.src = src; };
    if (qrCache.has(url)) setQR(qrCache.get(url));
    else QRCode.toDataURL(url, { width: 460, margin: 2 }).then(src => { qrCache.set(url, src); setQR(src); }).catch(() => toast('Não foi possível gerar o QR Code. Use o link ou código.'));
  }
  pageMotion.mount(app, { key: state ? `${activeLesson.id}:${state.phase}:${state.slide}:${state.questionIndex}` : `${studio.view}:${studio.draft?.id || ''}:${studio.tab}:${studio.index}:${studio.questionIndex}:${studio.visualMode}`, kind: state?.phase || studio.view, slide: state?.slide || 0 });
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
  if (next.slide !== lastSlide) { notesOpen = false; solutionOpen = false; }
  lastSlide = next.slide;
  state = next; render();
  if (newPage) window.scrollTo(0, 0);
}
function connection(next, message = '') {
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
function preview(lesson = demoLesson()) {
  leave(false); activeLesson = lesson; slides = lesson.slides; demo = true; host = true; status = 'online';
  studio.writeRoute('preview', lesson.id);
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
  busy = true; host = mode.host; demo = false; render();
  classroom?.stop?.();
  classroom = new Classroom(receive, connection);
  try {
    if (host) { await classroom.create(Boolean(mode.resume), mode.lesson); shareOpen = !mode.resume; }
    else await classroom.join(mode.code, mode.name, mode.avatar);
    studio.writeRoute('present', activeLesson.id);
  } catch (err) {
    classroom.stop(); if (!state) host = false;
    toast(err.message);
  } finally { busy = false; render(); }
}
function leave(show = true) {
  clearInterval(clockTimer); clockTimer = null;
  editDraft = null; editError = ''; clearTimeout(controlsTimer);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  clearInterval(demoTimer); classroom?.stop?.(); classroom = null;
  state = null; host = false; demo = false; shareOpen = false; lastSlide = -1;
  localModel = 'ssd'; localExploded = true; status = 'offline'; stopMusic();
  if (show) { studio.writeRoute(); render(); }
}
function updateClock() {
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
function stopMusic() { clearInterval(musicTimer); musicTimer = null; audio?.suspend().catch(() => {}); trackPlayer.pause(); trackKey = ''; }
function updateMusic() {
  const quizPhase = ['lobby', 'countdown', 'question', 'reveal'].includes(state?.phase);
  const track = state?.phase === 'lesson' ? slides[state.slide]?.audio : quizPhase ? activeLesson.quizAudio : null;
  const active = music && host && (quizPhase || state?.phase === 'lesson' && track);
  if (!active) { stopMusic(); return; }
  if (track?.data) {
    clearInterval(musicTimer); musicTimer = null; audio?.suspend().catch(() => {});
    const key = `${state.phase === 'lesson' ? slides[state.slide].id : 'quiz'}:${track.assetId || track.name}:${track.data.length}`;
    trackPlayer.volume = track.volume; trackPlayer.loop = track.loop;
    if (trackKey !== key) {
      trackPlayer.src = track.data; trackKey = key;
      trackPlayer.play().catch(() => { if (trackKey === key && music) { music = false; render(); toast('O navegador pausou o áudio. Ative o som no topo para tocar.'); } });
    }
    return;
  }
  trackPlayer.pause(); trackKey = '';
  if (musicTimer) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  audio ||= new Audio(); audio.resume().catch(() => {});
  musicTimer = setInterval(() => {
    if (audio.state !== 'running') return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = [220, 277.18, 329.63, 440, 329.63, 277.18][audioStep++ % 6];
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.24);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }, 300);
}
async function answer(choice) {
  if (!state || !['question'].includes(state.phase)) return;
  try {
    if (demo) { classroom.answer(demoPlayer, { choice, questionIndex: state.questionIndex }); receive({ ...classroom.snapshot(demoPlayer), lesson: classroom.publicLesson(true) }); }
    else await classroom.answer(choice, state.questionIndex);
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
    case 'create': if (!busy) await connectSession({ host: true }); break;
    case 'preview': preview(); break;
    case 'home': case 'leave': leave(); break;
    case 'next-slide': control('slide', Math.min(slides.length - 1, state.slide + 1)); break;
    case 'previous': control('slide', Math.max(0, state.slide - 1)); break;
    case 'quiz': music = true; control('quiz'); break;
    case 'start-quiz': control('start-quiz'); break;
    case 'finish': control('finish'); break;
    case 'reveal': control('reveal'); break;
    case 'next-question': control('next'); break;
    case 'back-lesson': control('lesson'); break;
    case 'edit-current-slide': openLiveEditor(); break;
    case 'cancel-edit-slide': editDraft = null; editError = ''; render(); showPresentationControls(); break;
    case 'image-text': imageText = !imageText; syncPresentationMode(); showPresentationControls(); break;
    case 'notes': notesOpen = !notesOpen; render(); break;
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
    case 'sound': music = !music; render(); break;
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
app.addEventListener('click', async e => {
  const button = e.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.canvasExplode) { canvasModels.toggle(button.dataset.canvasExplode, slides[state.slide]); return; }
  if (button.dataset.avatar) { selectedAvatar = button.dataset.avatar; render(); }
  else if (button.dataset.model) {
    if (state && !host && button.dataset.model !== state.model) return;
    localModel = button.dataset.model;
    if (state && host) control('model', localModel); else render();
  } else if (button.dataset.slide !== undefined) control('slide', Number(button.dataset.slide));
  else if (button.dataset.answer !== undefined) await answer(Number(button.dataset.answer));
  else if (button.dataset.action) await action(button.dataset.action);
});
app.addEventListener('input', e => {
  const key = e.target.dataset.liveField;
  if (editDraft && e.target.dataset.liveElement) { const el = editDraft.elements.find(el => el.id === e.target.dataset.liveElement); if (el) { el.text = e.target.value; if (el.role === 'title') editDraft.title = el.text.slice(0, 200); } return; }
  if (!key || !editDraft) return;
  if (key === 'image' && !e.target.value && editDraft.image.startsWith('data:')) return;
  editDraft[key] = key === 'points' ? e.target.value.split('\n').filter(p => p.trim()).slice(0, 12) : e.target.value;
  if (key === 'image') delete editDraft.assetId;
  if (key === 'title' && editDraft.kind === 'canvas') { const title = editDraft.elements.find(el => el.role === 'title'); if (title) title.text = editDraft.title; }
});
app.addEventListener('change', e => {
  if (e.target.id === 'live-image-file') { replaceLiveImage(e.target.files[0]); return; }
  if (state?.phase === 'lesson' && host && !demo) {
    if (e.target.id === 'pinned-qr-enabled') { presenterSettings.qrVisible = e.target.checked; savePresenterSettings(presenterSettings); render(); showPresentationControls(); }
    if (e.target.id === 'pinned-qr-corner' && Object.hasOwn(qrCorners, e.target.value)) { presenterSettings.qrCorner = e.target.value; savePresenterSettings(presenterSettings); render(); showPresentationControls(); }
  }
  if (e.target.id === 'document-page' && host) control('slide', Number(e.target.value));
});
app.addEventListener('submit', async e => {
  if (e.target.id === 'live-edit-form') { e.preventDefault(); saveLiveSlide(); return; }
  if (e.target.id !== 'join-form') return;
  e.preventDefault(); if (busy) return;
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
function showPresentationControls() {
  if (!document.fullscreenElement || state?.phase !== 'lesson') return;
  app.classList.add('presenter-controls-visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => app.classList.remove('presenter-controls-visible'), 2200);
}
function openLiveEditor() {
  if (!host || state?.phase !== 'lesson') return;
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
document.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') showPresentationControls(); });
document.addEventListener('focusin', e => { if (e.target.closest('.presentation-toolbar')) showPresentationControls(); });
document.addEventListener('fullscreenchange', () => { syncPresentationMode(); showPresentationControls(); });
document.addEventListener('visibilitychange', () => { document.documentElement.dataset.pageHidden = String(document.hidden); });
window.addEventListener('beforeunload', e => { if (editDraft) { e.preventDefault(); e.returnValue = ''; } });
render();
const savedSession = Classroom.resume();
async function restorePage() {
  const page = new URLSearchParams(location.search).get('page');
  try { if (studio.dirty) studio.save(); }
  catch (error) { studio.writeRoute('editor', studio.draft.id, true); toast(error.message); return; }
  leave(false); studio.restoreRoute(); render();
  if (['preview', 'present'].includes(page)) {
    const id = new URLSearchParams(location.search).get('lesson'), lesson = studio.library.lessons.find(l => l.id === id);
    if (lesson) try { await studio.launch(lesson, page === 'preview'); } catch (error) { toast(error.message); }
  }
}
window.addEventListener('popstate', restorePage);
if (savedSession && (!codeDraft || savedSession.code === codeDraft) && !['library', 'editor', 'join', 'preview'].includes(params.get('page'))) connectSession({ ...savedSession, resume: true });
else if (['preview', 'present'].includes(params.get('page'))) restorePage();
