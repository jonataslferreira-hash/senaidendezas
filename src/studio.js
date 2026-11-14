import { createUuid } from './uuid.js';
import {avatarContent} from './player-avatar.js';
import {StorageAI} from './storage-ai.js';
import {cropLessonCover,projectFields} from './lesson-cover.js';
import {canvasMarkup} from './canvas-view.js';
import {presentationSlide} from './slide-display.js';
import {editorShortcut,routeParams} from './editor-route.js';
import {activityBlocks,normalizeBlocks} from './activity-blocks.js';
import {ActivityOrder,activityTabs} from './activity-order.js';
import {ChatAudio} from './chat-audio.js';
import {gameSettingsMarkup} from './game-settings-ui.js';
import {recordAudio} from './record-audio.js';
import {mobileChoice} from './slide-display.js';
import { AccountPresenter } from './account-presenter.js';
import { People } from './people.js';
import {SocialChat} from './social-chat.js';
import {LessonChat} from './chat.js';
import { PresentationSharing } from './public-presentations.js';
import { EditorMusic } from './editor-music.js';
import { canvasFromSlide } from './canvas-data.js';
import { GroupsPanel } from './groups.js';
import brandUrl from './assets/brand.svg';
import { Showcase, showcaseMarkup, deviceArt } from './showcase.js';
import { optimizeImage } from './image-optimize.js';
import { Account } from './auth.js';
import { studioIcon } from './studio-icons.js';
import { audioEditor } from './audio-editor.js';
import { readAudio } from './audio-data.js';
import { cloudConfigured, saveCloudLesson, listCloudLessons, readCloudLesson, readCloudCover, deleteCloudLesson } from './cloud-files.js';
import { storePages, fillAssetAudio } from './assets.js';
import { LessonLibrary, newLesson, newSlide, newQuestion, clone, validateLesson, imageURL, difficulties, MAX_LESSON_BYTES } from './lessons.js';

import { archiveImportedPages, fillAssetImages, hydrateLesson, removePageAssets } from './assets.js';
const assetImage = (slide, cls = '') => `<img class="${cls}" ${slide.image ? `src="${esc(slide.image)}"` : `data-asset-id="${esc(slide.assetId)}"`} alt="${esc(slide.imageAlt || slide.title)}">`;
import { HardwareViewer } from './models.js';
import { SlideDesigner } from './slide-designer.js';
import { importModelFiles } from './model-files.js';
import { lessonAssetIds } from './assets.js';
import './designer.css';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const glyph = (name) => ({ grid: '▦', add: '+', arrow: '↗', slides: '▤', quiz: '✦', play: '▷', edit: '✎', copy: '⧉', more: '···', back: '←', up: '↑', down: '↓', close: '×', download: '↓', image: '▧', model: '◇', text: 'T' }[name] || name);
const button = (action, label, cls = '', attributes = '') => `<button type="button" class="studio-btn ${cls}" data-studio-action="${action}" ${attributes}>${label}</button>`;
const field = (label, key, value, scope, { textarea = false, hint = '', type = 'text', attributes = '' } = {}) => {
  const id = scope + '-' + key;
  return `<div class="editor-field"><label for="${id}">${label}</label>${textarea ? `<textarea id="${id}" data-scope="${scope}" data-field="${key}" ${attributes}>${esc(value)}</textarea>` : `<input id="${id}" type="${type}" data-scope="${scope}" data-field="${key}" value="${esc(value)}" ${attributes}>`}${hint ? `<small>${hint}</small>` : ''}</div>`;
};
const kindLabel = kind => ({ text: 'Texto', image: 'Imagem', model: 'Modelo 3D', document: 'Slide importado', canvas: 'Slide livre' }[kind]);

export class Studio {
  constructor(root, callbacks) {
    this.root = root; this.callbacks = callbacks; this.showcase = new Showcase(root); this.account = new Account(root, callbacks.render);
    // A busca de imagens usa o Worker do Storage Lab e precisa da sessão da
    // conta. O cliente fica disponível para os módulos que não recebem o
    // studio por parâmetro.
    globalThis.storageLabAccount = this.account;
    this.view = 'library'; this.tab = 'slides'; this.index = 0; this.questionIndex = 0;
    this.dirty = false; this.launching = false; this.dialog = null;
    this.gameSettingsOpen = false; this.metaExpanded = false; this.visualMode = false; this.designer = new SlideDesigner(this); this.ai=new StorageAI(this); this.cloudCovers=new Map();
    this.importDialog = false; this.importing = null; this.importError = '';
    this.cloudItems = []; this.cloudBusy = false; this.cloudMessage = '';this.cloudLoaded=false;this.cloudRequest=0;
    root.addEventListener('account-changed', () => { this.cloudRequest++;this.cloudCovers.clear();this.cloudItems=[];this.cloudBusy=false;this.cloudMessage='';this.cloudLoaded=false;this.refreshCloudPanel();if(this.view==='library'&&this.account.user)this.cloudAction('cloud-refresh',{}); });
    try { this.library = new LessonLibrary(); }
    catch {
      this.library = Object.create(LessonLibrary.prototype);
      this.library.lessons = []; this.library.warning = 'O armazenamento do navegador está indisponível. Permita o armazenamento para salvar aulas.';
    }
    this.sharing = new PresentationSharing(this);
    this.editorMusic = new EditorMusic(this);
    try{this.cloudLinks=JSON.parse(localStorage.getItem('sl-cloud-links')||'{}');}catch{this.cloudLinks={};}
    this.bindIconHints();
    this.activityOrder=new ActivityOrder(this);this.remote=new AccountPresenter(this);this.people=new People(this);this.groups=new GroupsPanel(this);this.chat=new LessonChat(this);this.chatAudio=new ChatAudio(this);this.social=new SocialChat(this);
    root.addEventListener('before-account-change',event=>{event.detail.tasks.push((async()=>{
      if(this.groups.live)await this.groups.live.persist();else if(this.draft&&this.dirty){this.library.save(validateLesson(this.draft,{draft:true}));this.dirty=false;}
    })());});
    root.addEventListener('toggle',e=>{if(e.target.matches('.game-settings')&&e.target.isConnected)this.gameSettingsOpen=e.target.open;},true);
    this.restoreRoute();
    if (!new URLSearchParams(location.search).has('presentation') && !routeParams().has('collab') && !['preview', 'present'].includes(new URLSearchParams(location.search).get('page'))) this.writeRoute(this.view, this.draft?.id, true);
    root.addEventListener('click', e => {
      const drawer=this.root.querySelector('#studio-navigation');
      if(drawer?.open&&(e.target===drawer||e.target.closest('#studio-navigation [data-studio-action], #studio-navigation [data-social-action]')))drawer.close();
      const options = root.querySelector('.mobile-editor-actions[aria-expanded=true]');
      if (options && !e.target.closest('.mobile-editor-actions, .editor-top-actions details > summary, [data-studio-action=close-mobile-actions]')) {
        options.setAttribute('aria-expanded', 'false');
      }
      const menu=e.target.closest('.editor-top-actions details,.designer-toolbar details');
      for(const open of root.querySelectorAll('.editor-top-actions details[open],.designer-toolbar details[open]')){
        if(open!==menu)open.open=false;
      }
      const menuAction=e.target.closest('.editor-sharing button,.designer-insert-more button');
      if(menuAction)menuAction.closest('details').open=false;
      const target = e.target.closest('[data-studio-action]');
      if (target && !target.disabled) this.action(target.dataset.studioAction, target).catch(err => callbacks.toast(err.message));
    });
    root.addEventListener('click',async e=>{const b=e.target.closest('[data-record-audio]');if(!b)return;try{const file=await recordAudio();if(file)await this.uploadAudio(file,b.dataset.recordAudio);}catch(error){callbacks.toast(error.message);}});
    root.addEventListener('input', e => this.change(e.target));
    root.addEventListener('change', e => {
      if (this.receivingRemote || !this.root.contains(e.target)) return;
      if (e.target.dataset.audioUpload) this.uploadAudio(e.target.files[0], e.target.dataset.audioUpload).catch(err => callbacks.toast(err.message));
      else if (e.target.matches('[data-slide-audio-trigger]') && this.groups.canEdit) {
        const trigger=e.target.value, slide=this.draft.slides[this.index];
        if(!slide?.audio)return;
        const target=trigger.startsWith('element:')?this.designer.ensure():slide;
        if(trigger!=='auto' && (!target.audio.trigger || target.audio.trigger==='auto')){
          target.audio.loop=false;
          const loop=this.root.querySelector('[data-audio-loop="slide"]');
          if(loop)loop.checked=false;
        }
        target.audio.trigger=trigger;
        this.markDirty();
      }
      else if (e.target.matches('[data-audio-volume],[data-audio-loop],[data-audio-rate],[data-audio-continue]')) {
        if (!this.groups.canEdit) return;
        const {audioVolume,audioLoop,audioRate,audioContinue}=e.target.dataset;
        const audio=this.audioTarget(audioVolume||audioLoop||audioRate||audioContinue);
        if (!audio) return;
        if (audioVolume) audio.volume=Number(e.target.value);
        else if (audioRate) e.target.value=audio.rate=Math.max(.5,Math.min(2,Number(e.target.value)||1));
        else if (audioContinue) audio.continueAcrossSlides=e.target.checked;
        else audio.loop=e.target.checked;
        const preview = e.target.closest('.audio-editor')?.querySelector('[data-audio-preview]');
        if (preview) {
          preview.volume = audio.volume;
          preview.defaultPlaybackRate = audio.rate || 1;
          preview.playbackRate = preview.defaultPlaybackRate;
          preview.loop = audio.loop;
        }
        this.markDirty();
      }
      else if(e.target.matches('[data-lesson-cover-file]'))this.chooseLessonCover(e.target.files[0]).catch(error=>callbacks.toast(error.message));
      else if (e.target.id === 'native-model-files') this.uploadNativeModel(e.target.files).catch(err => callbacks.toast(err.message));
      else if (e.target.id === 'import-slides-file') this.importSlideFile(e.target.files[0]);
      else if (e.target.id === 'import-lesson-file') this.importFile(e.target.files[0]).catch(err => callbacks.toast(err.message));
      else if (e.target.id === 'slide-image-file') this.uploadImage(e.target.files[0]).catch(err => callbacks.toast(err.message));
      else this.change(e.target);
    });
    window.addEventListener('beforeunload', e => { if (this.dirty) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.dialog) { this.dialog = null; callbacks.render(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && this.view === 'editor' && this.root.querySelector('.studio-editor')) {
        e.preventDefault();
        this.saveEditor().catch(error=>callbacks.toast(error.message));
      }
    });
  }
  writeRoute(page = this.view, id = this.draft?.id, replace = false) {
    const url = new URL(location.href);for(const key of ['reload','edit'])url.searchParams.delete(key);url.searchParams.set('page', page);
    if (!['join', 'present'].includes(page)) url.searchParams.delete('s');
    for (const key of ['lesson', 'tab', 'slide', 'block']) url.searchParams.delete(key);
    if (['editor', 'preview', 'present'].includes(page) && id) url.searchParams.set('lesson', id);
    if (page === 'editor') { if(this.draft?.activityBlocks&&this.currentBlock())url.searchParams.set('block',this.currentBlock().id);else url.searchParams.delete('block'); if (this.tab === 'quiz') url.searchParams.set('tab', 'quiz'); url.searchParams.set('slide', String(this.index + 1)); }
    url.searchParams.delete('presentation');
    if (this.groups?.live && page === 'editor') url.searchParams.set('collab', this.groups.live.row.id);
    else url.searchParams.delete('collab');
    let editor;if(page==='editor'){const context={tab:this.tab,slide:this.index+1,question:this.questionIndex+1,block:this.currentBlock()?.id||'',collab:this.groups?.live?.row.id||''},alias=editorShortcut(id,context);if(alias){const localSignal=url.searchParams.has('localSignal');url.search='';url.searchParams.set('edit',alias);if(localSignal)url.searchParams.set('localSignal','');editor={alias,id,...context};}}
    if (url.href === location.href && !replace&&JSON.stringify(history.state?.editor)===JSON.stringify(editor)) return;
    history[replace ? 'replaceState' : 'pushState']({ storageLab: true,...(editor?{editor}:{}) }, '', url);
  }
  restoreRoute() {
    const params = routeParams(), page = params.get('page');
    if (['editor', 'preview', 'present'].includes(page) && this.library.lessons.some(l => l.id === params.get('lesson'))) {
      this.open(params.get('lesson'), false); this.tab = params.get('tab') === 'quiz' ? 'quiz' : 'slides';
      const selected=Math.max(0,Math.min(this.draft.slides.length-1,(Number(params.get('slide'))||1)-1));if(params.get('block'))this.selectBlock(params.get('block'));if(!this.draft.activityBlocks||this.currentBlock()?.items.includes(this.draft.slides[selected]?.id))this.index=selected;const question=Math.max(0,Math.min(this.draft.questions.length-1,(Number(params.get('question'))||1)-1));if(this.tab==='quiz'&&this.currentBlock()?.items.includes(this.draft.questions[question]?.id))this.questionIndex=question;
    } else {
      this.view = ['shared','storage-ai'].includes(page)?page:page === 'join' || (!page && params.has('s')) ? 'join' : 'library';
      if(this.view==='storage-ai')this.ai.freshPending=true;
    }
  }
  selectBlock(id){const block=activityBlocks(this.draft).find(b=>b.id===id);if(!block)return;this.blockId=block.id;this.tab=block.type==='quiz'?'quiz':'slides';const list=this.tab==='quiz'?this.draft.questions:this.draft.slides,key=this.tab==='quiz'?'questionIndex':'index',index=list.findIndex(i=>block.items.includes(i.id));if(index>=0)this[key]=index;}
  currentBlock(){const blocks=activityBlocks(this.draft);return blocks.find(b=>b.id===this.blockId)||blocks.find(b=>(b.type==='quiz'?'quiz':'slides')===this.tab);}
  visibleItems(){const quiz=this.tab==='quiz',list=quiz?this.draft.questions:this.draft.slides,block=this.currentBlock();return list.map((item,index)=>({item,index})).filter(({item})=>!this.draft.activityBlocks||block?.items.includes(item.id));}
  audioOwner(scope) {
    if(scope.startsWith('quiz'))return this.draft;
    const slide=this.draft?.slides[this.index];
    return scope.startsWith('element:')?slide?.elements?.find(e=>e.id===scope.slice(8)):slide;
  }
  audioTarget(scope) {
    const owner=this.audioOwner(scope);
    if(scope.startsWith('element:')&&!owner?.audio){
      const slide=this.draft?.slides[this.index];
      return slide?.audio?.trigger===scope?slide.audio:null;
    }
    return owner?.[this.audioField(scope)];
  }
  audioField(scope){return scope==='quiz-lobby'?'lobbyAudio':scope==='quiz-question'?'questionAudio':scope==='quiz'?'quizAudio':'audio';}
  linkCloud(id,path){const uid=this.account.user?.id;if(!uid||!path)return;this.cloudLinks[uid]||={};this.cloudLinks[uid][id]={path,savedAt:Date.now()};try{localStorage.setItem('sl-cloud-links',JSON.stringify(this.cloudLinks));}catch{}}
  cloudFor(lesson){const link=this.cloudLinks[this.account.user?.id]?.[lesson.id];return this.cloudItems.find(item=>item.path===link?.path||item.path==='r2:'+lesson.id||item.id===lesson.id);}
  cloudLessonIds(item){
    const linked=Object.entries(this.cloudLinks[this.account.user?.id]||{})
      .filter(([,link])=>link.path===item.path).map(([id])=>id);
    return [item.id,item.path?.startsWith('r2:')?item.path.slice(3):null,...linked].filter(Boolean);
  }
  unmatchedShared(){
    const listedIds=new Set([
      ...this.library.lessons.map(lesson=>lesson.id),
      ...this.cloudItems.flatMap(item=>this.cloudLessonIds(item))
    ]);
    return this.groups.documents.filter(row=>!listedIds.has(this.groups.lessonIds.get(row.id)));
  }
  libraryCount(){const used=new Set(this.library.lessons.map(l=>this.cloudFor(l)?.path).filter(Boolean));return this.library.lessons.length+this.cloudItems.filter(c=>!used.has(c.path)).length+this.unmatchedShared().length;}
  libraryCards(){const used=new Set(),cards=this.library.lessons.map((lesson,index)=>{const cloud=this.cloudFor(lesson);if(cloud)used.add(cloud.path);return this.lessonCard(lesson,index);});this.cloudItems.forEach((item,index)=>{if(!used.has(item.path))cards.push(this.cloudCard(item,index));});for(const row of this.unmatchedShared()){
    const lesson=this.groups.sharedLessons.get(row.id)?.lesson,cover=lesson?.thumbnail;
    cards.push(`<article class="lesson-card shared-lesson-card"><div class="lesson-card-art ideas-art">${cover?`<img class="lesson-cover-image" decoding="async" src="${esc(cover)}" alt="">`:lesson?.slides?.length?`<div class="slide-cover-mini" inert aria-hidden="true">${canvasMarkup(presentationSlide(lesson.slides[0]),{interactive:false})}</div>`:`<div class="shared-card-symbol">${studioIcon('collaborate')}</div>`}${this.coverStorageIcon(true,true,false)}</div><div class="lesson-card-content"><h3>${esc(lesson?.title||row.title||'Aula compartilhada')}</h3><p>${esc(lesson?.description||'Aula da equipe')}</p><div class="lesson-card-meta"><span>${lesson?.slides?.length||0} slides</span><span class="storage-state cloud">Compartilhada</span></div><div class="lesson-card-primary"><button type="button" class="studio-btn card-edit" data-group-action="open" data-doc="${esc(row.id)}">Editar aula ↗</button><button type="button" class="studio-btn card-present" data-group-action="present" data-doc="${esc(row.id)}">▷ Apresentar</button></div></div></article>`);
  }return cards.join('');}
  cloudCard(item,index){
    const attrs=`data-cloud-index="${index}" ${this.cloudBusy?'disabled':''}`;
    const shared=this.cloudLessonIds(item).some(id=>this.groups.isShared(id));
    return `<article class="lesson-card cloud-lesson-card"><div class="lesson-card-art cloud-card-art" data-cloud-cover="${index}"><div class="cloud-cover-placeholder" aria-hidden="true">${studioIcon('cloud')}</div>${this.coverStorageIcon(true,shared,Boolean(item.generatedByAI))}</div><div class="lesson-card-content"><h3>${esc(item.title)}</h3><p>Aula disponível na sua conta.</p><div class="lesson-card-meta"><small>${(item.bytes/1048576).toFixed(1)} MB</small><span class="storage-state cloud">${shared?'Compartilhada':'Na nuvem'}</span></div><div class="lesson-card-primary">${button('cloud-open','Editar aula ↗','card-edit',attrs)}${button('cloud-present','▷ Apresentar','card-present',attrs)}${this.cloudMenu(item,true,index)}</div></div></article>`;
  }
  coverStorageIcon(cloud, shared = false, generated = false) {
    const name=[shared?'Compartilhada':'',cloud||shared?'Na nuvem':'Neste dispositivo',generated?'Gerada por IA':''].filter(Boolean).join(' · ');
    return `<span class="cover-storage ${shared?'cover-shared':''} ${generated?'cover-generated':''}" role="img" aria-label="${name}" title="${name}">${shared?studioIcon('collaborate'):''}${studioIcon(cloud||shared?'cloud':'monitor')}${generated?studioIcon('robot'):''}</span>`;
  }
  watchCloudCovers(){
    this.coverObserver?.disconnect();
    const targets=this.root.querySelectorAll('[data-cloud-cover]');
    if(!targets.length)return;
    this.coverObserver=new IntersectionObserver(entries=>{
      for(const {target,isIntersecting} of entries){
        if(!isIntersecting)continue;
        this.coverObserver?.unobserve(target);
        const item=this.cloudItems[Number(target.dataset.cloudCover)],uid=this.account.user?.id;
        if(!item||!uid)continue;
        const key=uid+':'+item.path+':'+item.updatedAt;
        let task=this.cloudCovers.get(key);
        if(!task){
          task=(this.coverQueue||Promise.resolve()).then(async()=>{
            if(this.account.user?.id!==uid)return null;
            try{return await readCloudCover(this.account.client,item.path);}catch{
              if(!item.bytes||item.bytes>5*1024*1024||this.account.user?.id!==uid)return null;
              const lesson=validateLesson(await readCloudLesson(this.account.client,item.path),{draft:true});
              const {thumbnailFor}=await import('./cover-render.js');
              const cover=await thumbnailFor(lesson);
              return cover?(await fetch(cover)).blob():null;
            }
          }).catch(()=>null);
          this.coverQueue=task;
          if(this.cloudCovers.size>=48)this.cloudCovers.delete(this.cloudCovers.keys().next().value);
          this.cloudCovers.set(key,task);
        }
        task.then(blob=>{
          if(!blob||!target.isConnected||this.account.user?.id!==uid)return;
          const image=new Image(),url=URL.createObjectURL(blob);
          image.className='lesson-cover-image';image.alt='';
          image.onload=image.onerror=()=>URL.revokeObjectURL(url);
          image.src=url;target.querySelector('.cloud-cover-placeholder')?.replaceWith(image);
        });
      }
    },{rootMargin:'80px'});
    for(const node of targets)this.coverObserver.observe(node);
  }
  cloudMenu(item, menu = true, index = 0) {
    const remove = button('cloud-delete-dialog', 'Excluir da nuvem', 'danger-text', `data-cloud-path="${esc(item.path)}"`);
    return menu ? `<details class="lesson-menu"><summary aria-label="Mais opções: ${esc(item.title)}">···</summary><div>${button('cloud-cover','Trocar capa','',`data-cloud-index="${index}"`)}${remove}</div></details>` : remove;
  }
  storageBadge(lesson){
    if(this.groups.isShared(lesson.id))return '<span class="storage-state cloud">Compartilhada</span>';
    const cloud=this.cloudFor(lesson);
    if(!this.cloudLoaded&&this.account.user)return '<span class="storage-state">Consultando nuvem…</span>';
    if(!cloud)return '<span class="storage-state device">▣ Neste dispositivo</span>';
    const savedAt=this.cloudLinks[this.account.user?.id]?.[lesson.id]?.savedAt||new Date(cloud.updatedAt).getTime();
    const localChanges=lesson.updatedAt>savedAt;
    return `<span class="storage-state cloud ${localChanges?'local-dirty':''}" title="${localChanges?'Há edições neste dispositivo que ainda não chegaram à nuvem.':'Cópia disponível na nuvem.'}">${localChanges?'Alterações locais':'Na nuvem'}</span>`;
  }
  cloudMarkup(){if(!this.account.user)return '';return `<p class="cloud-status" role="status">${esc(this.cloudBusy||!this.cloudLoaded?'Consultando aulas na nuvem…':/^\d+ aulas? nesta conta\.$|^Nenhuma aula salva na nuvem ainda\.$/.test(this.cloudMessage)?'':this.cloudMessage)}</p>`;}
  refreshCloudPanel(){const slot=this.root.querySelector('[data-cloud-library]');if(slot)slot.innerHTML=this.cloudMarkup();const grid=this.root.querySelector('[data-library-grid]');const count=this.root.querySelector('[data-library-count]');if(count)count.textContent=this.libraryCount();const refresh=this.root.querySelector('[data-studio-action=cloud-refresh]');if(refresh){refresh.disabled=this.cloudBusy;refresh.setAttribute('aria-busy',String(this.cloudBusy));}if(grid){const create=grid.querySelector('.create-import-card')?.outerHTML||'';grid.innerHTML=this.libraryCards()+create;fillAssetImages(grid);this.watchCloudCovers();}}
  hasCloudCopy(lesson=this.draft) {
    return Boolean(lesson && (this.cloudLinks[this.account.user?.id]?.[lesson.id]||this.cloudFor(lesson)));
  }
  async saveLocalEditor() {
    if(!this.groups.live){this.save();return;}
    const live=this.groups.live;
    await live.persist();
    if(!live.current()||this.groups.live!==live)throw Error('A aula compartilhada mudou. Tente novamente.');
    const {lesson,ids}=await archiveImportedPages(this.draft);
    try{if(!live.current()||this.groups.live!==live)throw Error('A aula compartilhada mudou. Tente novamente.');this.library.save(lesson);}catch(error){await removePageAssets(ids).catch(()=>{});throw error;}
  }
  async saveEditor() {
    if(!this.groups.canEdit||!this.dirty)return;
    await this.saveLocalEditor();
    this.callbacks.toast(this.groups.live?'Aula salva no grupo e no dispositivo.':this.hasCloudCopy()?'Aula salva neste dispositivo. Use “Nuvem” para atualizar a cópia online.':'Aula salva neste dispositivo.');
    this.callbacks.render();
  }
  editorSaveControls() {
    // Dois botões sempre à vista: salvar aqui e salvar na nuvem. Sem menu.
    const linked=this.hasCloudCopy(), canEdit=this.groups.canEdit, disabled=!canEdit||this.cloudBusy?'disabled':'';
    const dirty=this.dirty;
    const label=this.cloudBusy?'Salvando…':dirty?'Salvar':'Salvo';
    return `<div class="editor-save-controls">${cloudConfigured?button('cloud-save',studioIcon('cloud')+'<span>Nuvem</span>','quiet editor-cloud-save '+(linked&&!this.needsSave()?'is-saved':''),
      `aria-label="Salvar na nuvem" title="${linked?'Enviar esta versão para a nuvem':'Guardar uma cópia na nuvem'}" ${disabled}`):''}${button('save',studioIcon('download')+label,'quiet '+(dirty?'':'is-saved'),
      `aria-label="Salvar neste dispositivo" title="Salvar neste dispositivo" ${disabled||(!dirty?'disabled':'')}`)}</div>`;
  }
  needsSave() {
    if(this.dirty)return true;
    const link=this.cloudLinks[this.account.user?.id]?.[this.draft?.id];
    return Boolean(link&&this.draft.updatedAt>link.savedAt);
  }
  paintSaveButton() {
    for(const button of this.root.querySelectorAll('.editor-save-controls [data-studio-action=save]')){
      const dirty=this.dirty;
      button.classList.toggle('is-saved',!dirty);
      button.disabled=!this.groups.canEdit||this.cloudBusy||!dirty;
      const label=this.cloudBusy?'Salvando…':dirty?'Salvar':'Salvo';
      if(button.textContent!==label)button.innerHTML=studioIcon('download')+label;
    }
    for(const button of this.root.querySelectorAll('.editor-save-controls [data-studio-action=cloud-save]'))button.classList.toggle('is-saved',this.hasCloudCopy()&&!this.needsSave());
  }
  async cloudAction(action, target) {
    if (this.cloudBusy) return;
    if (action==='cloud-delete-dialog') {
      const item=this.cloudItems.find(file=>file.path===target.dataset.cloudPath);
      if(item){this.dialog={type:'cloud-delete',item,uid:this.account.user?.id};this.callbacks.render();}
      return;
    }
    if (!this.account.user) { this.account.show('login'); return; }
    const uid = this.account.user.id,request=++this.cloudRequest,current=()=>this.cloudRequest===request&&this.account.user?.id===uid; this.cloudBusy = true; this.cloudMessage = ''; this.refreshCloudPanel();
    const saveButtons=this.root.querySelectorAll('.editor-save-controls button');
    if(action!=='cloud-refresh')for(const button of saveButtons)button.disabled=true;
    try {
      if (action === 'cloud-save') {
        await this.saveLocalEditor();
        if(!current())return;
        const lesson = validateLesson(await hydrateLesson(this.draft, true), { draft: true });
        if(!current())return;
        this.callbacks.toast('Enviando aula e arquivos para sua conta…');
        const {thumbnailFor}=await import('./cover-render.js');
        const cover=await thumbnailFor(lesson).catch(()=>'');
        if(!current())return;
        const stored = await saveCloudLesson(this.account.client, lesson, cover);
        if(!current())return;this.linkCloud(lesson.id,stored.path);
        try{const items=await listCloudLessons(this.account.client);if(!current())return;this.cloudItems=items;this.cloudLoaded=true;this.cloudMessage=items.length?`${items.length} ${items.length===1?'aula':'aulas'} nesta conta.`:'Aula enviada. Atualize os arquivos para conferir a lista.';}catch{if(!current())return;this.cloudLoaded=true;this.cloudMessage='A aula foi salva, mas a lista não pôde ser atualizada. Clique em Atualizar arquivos.';}
        this.callbacks.toast(stored.coverSynced===false?'Aula salva. A capa da lista na nuvem aguarda a atualização do Worker.':stored.compressed ? 'Aula salva na nuvem. Compressão economizou ' + Math.round((1 - stored.bytes / stored.originalBytes) * 100) + '%.' : 'Aula e arquivos salvos na nuvem.');
      } else if (action === 'cloud-refresh') {
        const refreshGroups=this.groups.refresh().catch(()=>{});
        const items = await listCloudLessons(this.account.client).finally(()=>refreshGroups);
        if (current()) { this.cloudLoaded=true;this.cloudItems = items; this.cloudMessage = items.length ? `${items.length} ${items.length===1?'aula':'aulas'} nesta conta.` : 'Nenhuma aula salva na nuvem ainda.'; }
      } else if (action === 'cloud-delete') {
        const dialog=this.dialog;
        if(dialog?.type!=='cloud-delete'||dialog.uid!==uid)return;
        await deleteCloudLesson(this.account.client,dialog.item.path);
        if(!current())return;
        this.cloudItems=this.cloudItems.filter(item=>item.path!==dialog.item.path);
        for(const [id,link] of Object.entries(this.cloudLinks[uid]||{}))if(link.path===dialog.item.path)delete this.cloudLinks[uid][id];
        try{localStorage.setItem('sl-cloud-links',JSON.stringify(this.cloudLinks));}catch{}
        this.dialog=null;
        this.callbacks.toast('Aula excluída da nuvem.');
      } else if (['cloud-open','cloud-present','cloud-cover'].includes(action)) {
        const item = this.cloudItems[Number(target.dataset.cloudIndex)]; if (!item) throw Error('Atualize a lista de arquivos.');
        if(action==='cloud-present')this.requestPresentationFullscreen();
        const input = await readCloudLesson(this.account.client, item.path);
        if (!current()) return;
        const parsed = validateLesson(input, { draft: true });
        if(action!=='cloud-cover'&&await this.groups.openForLesson(parsed.id)){
          if(action==='cloud-present'&&current())await this.launch(this.draft,false,false);
          return;
        }
        if(!current())return;
        const archived = await archiveImportedPages(parsed);
        if(!current()){await removePageAssets(archived.ids).catch(()=>{});return;}
        let saved;
        try { const linked=Object.entries(this.cloudLinks[uid]||{}).find(([,v])=>v.path===item.path)?.[0];const cloudId=item.path.startsWith('r2:')?item.path.slice(3):parsed.id;saved = this.library.save({...archived.lesson,id:linked||cloudId});this.linkCloud(saved.id,item.path); }
        catch (error) { await removePageAssets(archived.ids).catch(() => {}); throw error; }
        if(action==='cloud-present')await this.launch(saved,false,false);else if(action==='cloud-cover')this.openCoverDialog(saved);else this.open(saved.id);
      }
    } catch (error) { if(current()){this.cloudLoaded=true;this.cloudMessage=error.message||'Não foi possível consultar as aulas. Clique em Atualizar arquivos para tentar novamente.';this.callbacks.toast(this.cloudMessage);} }
    finally { if(current()){this.cloudBusy = false;if(action==='cloud-refresh'){this.refreshCloudPanel();this.paintSaveButton();const upload=this.root.querySelector('.editor-save-controls [data-studio-action=cloud-save]');if(upload)upload.disabled=!this.groups.canEdit;}else this.callbacks.render();} }
  }
  async uploadAudio(file, scope) {
    if (!file) return;
    if(!this.groups.canEdit)return;
    if(scope.startsWith('element:'))this.designer.ensure();
    const draft=this.draft, slide=draft.slides[this.index], target=this.audioOwner(scope);
    if(!target)return;
    const audio=await readAudio(file);
    const [assetId] = await storePages([audio.data]);
    if(this.draft!==draft||!this.groups.canEdit||(!scope.startsWith('quiz')&&(!draft.slides.includes(slide)||(scope.startsWith('element:')&&!slide.elements.includes(target))))){
      await removePageAssets([assetId]).catch(()=>{});
      return;
    }
    if(scope.startsWith('element:')&&slide.audio?.trigger===scope)slide.audio=null;
    target[this.audioField(scope)] = { ...audio, ...(scope.startsWith('element:')?{loop:false}:{}), assetId, data: '', ...(scope==='slide'?{trigger:target.audio?.trigger||'auto'}:{}) };if(scope==='quiz-lobby'||scope==='quiz-question'){draft.gameSettings||={};draft.gameSettings[scope==='quiz-lobby'?'lobby':'questions']='custom';}
    this.markDirty(); this.callbacks.render(); this.callbacks.toast('Áudio adicionado. Use o botão de som ao apresentar.');
  }
  brandMarkup() {
    return `<button class="studio-wordmark" data-studio-action="library" aria-label="Storage Lab, biblioteca"><img class="lab-logo" src="${brandUrl}" alt=""><span>storage<span>lab.</span></span></button>`;
  }
  navigationMarkup() {
    return `<nav>${button('library', studioIcon('library')+' Biblioteca de aulas', this.view === 'library' ? 'rail-link active' : 'rail-link','aria-label="Biblioteca de aulas"')}${button('join', studioIcon('join')+' Entrar em uma sala', this.view === 'join' ? 'rail-link active' : 'rail-link','aria-label="Entrar em uma sala"')}${button('shared',studioIcon('collaborate')+' Compartilhados',this.view==='shared'?'rail-link active':'rail-link','aria-label="Compartilhados"')} ${button('storage-ai',studioIcon('sparkle')+' Storage AI',this.view==='storage-ai'?'rail-link active':'rail-link','aria-label="Storage AI"')}<button type="button" class="studio-btn rail-link" data-social-action="open" aria-label="Chat">${studioIcon('chat')} Chat <b data-chat-badge class="chat-badge" ${this.social.badge?'':'hidden'}>${this.social.badge||''}</b></button></nav>`;
  }
  railMarkup(closeButton = '') {
    const brand = this.brandMarkup();
    return `<aside class="studio-rail">${closeButton ? `<div class="ai-rail-brand">${brand}${closeButton}</div>` : brand}
      ${this.navigationMarkup()}
      <div class="rail-footer">
      <div class="rail-quick-actions">
        ${button('new', studioIcon('add') + '<span>Nova aula</span>', 'quiet')}
        ${button('upload-slides', studioIcon('upload') + '<span>Importar slides</span>', 'quiet')}
      </div>
      <div class="rail-profile" data-account-profile>${this.account.profile()}</div>
      </div>
    </aside>`;
  }
  // Barra superior do celular: logo, perfil e um único botão que abre o menu
  // lateral. Antes os atalhos ficavam espremidos ao lado da logo e o perfil
  // ocupava uma faixa inteira embaixo, o que empurrava o conteúdo e crescia
  // sem controle ao trocar de tela.
  topbarMarkup() {
    const closeIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const close = `<button type="button" class="ai-nav-toggle" data-studio-action="close-navigation" aria-label="Fechar menu" title="Fechar menu" autofocus>${closeIcon}</button>`;
    return `<header class="studio-header studio-topbar"><button type="button" class="ai-nav-toggle" data-studio-action="open-navigation" aria-label="Abrir menu" aria-controls="studio-navigation" aria-expanded="false" title="Abrir menu">${studioIcon('sidebar')}</button>${this.brandMarkup()}<span data-account-profile>${this.account.profile()}</span></header>
      <dialog id="studio-navigation" class="ai-drawer studio-drawer" aria-label="Menu do Storage Lab">${this.railMarkup(close)}</dialog>`;
  }
  shell(content) {
    const editor = this.view === 'editor';
    const ai = this.view === 'storage-ai';
    const header = editor ? '' : ai ? this.ai.navigationMarkup() : this.topbarMarkup();
    return `<div class="studio-shell ${editor ? 'editor-shell' : ai ? 'ai-shell' : ''}">${editor || ai ? '' : this.railMarkup()}<div class="studio-body">${header}${content}</div></div>${this.dialogMarkup()}${this.importMarkup()}${this.sharing.markup()}<div data-remote-dialog>${this.remote.dialog()}</div><div data-account-dialog></div><div data-chat-slot>${this.chat.markup()}</div><div data-social-slot>${this.social.markup()}</div>`;
  }
  markup() {
    if (this.view==='ai-generation') return this.shell(this.ai.generationMarkup());
    if (this.view === 'editor') return this.editor();
    if (this.view === 'join') return this.shell(`<main class="studio-join"><svg class="join-waves" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path d="M-50 360C190 180 295 510 525 340S820 165 1050 315"/><path d="M-50 415C180 235 300 540 520 395S805 215 1050 360"/><path d="M-50 470C185 295 315 605 540 450S840 295 1050 410"/></svg><div class="join-intro"><h1>Sua próxima descoberta<br>começa <em>aqui.</em></h1><p>Use o código compartilhado pelo professor ou aponte a câmera para o QR Code da apresentação.</p><div class="join-illustration join-orbit" aria-hidden="true">${[['🚀','⚡','🦉'],['🤖','🎮','👾'],['🦊','🐸','🪐']].map((icons,i)=>`<div class="join-float" style="--float:${i}">${icons.map((icon,j)=>`<span style="--cycle:${j}">${avatarContent(icon)}</span>`).join('')}</div>`).join('')}</div></div>${this.callbacks.joinForm()}</main>`);
    if(this.view==='storage-ai')return this.shell(this.ai.createMarkup());
    if(this.view==='shared')return this.shell(`<main class="studio-library shared-library">${this.groups.markup()}</main>`);
    return this.libraryMarkup();
  }
  libraryMarkup() {
    const lessons = this.library.lessons;
    return this.shell(`<main class="studio-library">${this.library.warning ? `<p class="studio-warning" role="alert">${esc(this.library.warning)}</p>` : ''}
      <div data-live-sessions>${this.remote.markup()}</div>${showcaseMarkup()}


      <section class="library-section"><div class="library-section-title"><h2>Minha biblioteca <span data-library-count>${this.libraryCount()}</span></h2><div class="library-actions"><button type="button" data-studio-action="storage-ai" class="studio-btn storage-ai-primary">${studioIcon('sparkle')} Criar slides com IA</button>${this.account.user?button('cloud-refresh',studioIcon('reload'),'quiet editor-icon',`aria-label="Recarregar aulas" title="Recarregar aulas" ${this.cloudBusy?'disabled':''}`):''}</div></div><div class="lesson-card-grid" data-library-grid>${this.libraryCards()}<div class="new-lesson-card create-import-card"><button class="create-half" data-studio-action="new"><span>+</span><strong>Uma ideia nova?</strong><small>Comece uma aula do zero</small></button><div class="import-half"><span>↥</span><strong>Já tem o conteúdo?</strong><small>Traga seus slides para cá</small><div>${button('upload-slides', 'Importar PDF / PPTX', 'quiet')}${button('import', 'Importar JSON', 'quiet')}</div></div></div></div></section><div data-cloud-library>${this.cloudMarkup()}</div><input type="file" id="import-lesson-file" accept=".json,application/json" hidden><input type="file" id="import-slides-file" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" hidden></main>`);
  }
  lessonCard(l, index = 0) {
    const model=l.id==='hdd-ssd-demo';
    const cloud = this.cloudFor(l);
    const firstSlide=l.slides[0];
    const firstSlideImage=firstSlide&&(firstSlide.image||firstSlide.assetId?firstSlide:firstSlide.elements?.find(e=>e.type==='image'&&(e.image||e.assetId)));
    const cover=firstSlideImage&&!l.generatedByAI?{...firstSlideImage,sourceType:firstSlideImage.sourceType||'pdf',imageAlt:firstSlideImage.imageAlt||firstSlide?.title}:null;
    return `<article class="lesson-card" style="--card-index:${Math.min(index, 6)}"><div class="lesson-card-art ${model ? 'hardware-art' : 'ideas-art'}">${l.thumbnail?`<img class="lesson-cover-image" decoding="async" src="${esc(l.thumbnail)}" alt="">`:cover?assetImage(cover,'imported-cover lesson-cover-image'):model? `<div aria-hidden="true">${deviceArt()}<span>EXPLORE POR DENTRO</span></div>`:`<div class="slide-cover-mini" inert aria-hidden="true">${canvasMarkup(presentationSlide(l.slides[0]),{interactive:false})}</div>`}${this.coverStorageIcon(Boolean(cloud),this.groups.isShared(l.id),Boolean(l.generatedByAI))}<span class="card-art-number">${String(l.slides.length).padStart(2, '0')}</span></div><div class="lesson-card-content"><h3>${esc(l.title || 'Aula sem título')}</h3><p>${esc(l.description || 'Dê forma à sua próxima descoberta.')}</p><div class="lesson-card-meta"><span>▤ ${l.slides.length} slides</span><span>✦ ${l.questions.length} perguntas</span>${this.storageBadge(l)}</div><div class="lesson-card-primary">${button('edit', 'Editar aula ↗', 'card-edit', `data-id="${esc(l.id)}" aria-label="Editar aula: ${esc(l.title)}"`)}${button('present', '▷ Apresentar', 'card-present studio-launch', `data-id="${esc(l.id)}" ${this.launching ? 'disabled' : ''}`)}<details class="lesson-menu"><summary aria-label="Mais opções: ${esc(l.title)}">···</summary><div>${button('rename', 'Renomear', '', `data-id="${esc(l.id)}"`)}${button('duplicate', 'Duplicar', '', `data-id="${esc(l.id)}"`)}${button('cover', 'Trocar capa', '', `data-id="${esc(l.id)}"`)}${button('export-pdf','Exportar PDF','',`data-id="${esc(l.id)}"`)}${button('export-pptx','Exportar PPTX','',`data-id="${esc(l.id)}"`)}${cloud?this.cloudMenu(cloud,false):''}${button('delete', cloud?'Excluir do dispositivo':'Excluir aula', 'danger-text', `data-id="${esc(l.id)}"`)}</div></details></div></div></article>`;
  }
  editor() {
    const l = this.draft;
    return this.shell(`<main class="studio-editor ${this.metaExpanded ? 'expanded-meta' : ''}">${this.groups.editorMarkup()}<div class="editor-heading"><div class="editor-heading-main">${button('library', studioIcon('chevron'), 'quiet editor-back editor-icon', 'aria-label="Voltar" title="Voltar"')}<div class="editor-title-block"><strong class="editor-title">${esc(l.title)}</strong><span class="editor-heading-meta">${this.groups.live?`<span class="editor-group-presence" data-collab-status>${this.groups.statusMarkup()}</span>`:`<span class="editor-heading-hint">${l.slides.length} ${l.slides.length===1?'slide':'slides'} · ${l.questions.length} ${l.questions.length===1?'pergunta':'perguntas'}</span>`}</span></div></div><div class="editor-context">${this.editorMusic.headerMarkup()}<span data-account-profile>${this.account.profile()}</span></div></div><div class="editor-command-row"><button type="button" class="studio-btn mobile-activity-list" data-studio-action="list-activities">${studioIcon('sequence')}<span>Roteiro da aula</span></button><div class="mobile-editor-history">${this.tab==='slides'&&this.visualMode&&this.currentBlock()?.type!=='poll'?this.designer.historyMarkup():''}</div><div class="mobile-primary-actions">${this.editorSaveControls()}${this.tab==='slides'&&this.visualMode&&this.currentBlock()?.type!=='poll'?`<button type="button" class="studio-btn editor-icon ai-tool" data-storage-ai="toggle" aria-label="storageAI" title="storageAI" aria-pressed="${Boolean(this.ai.open)}" ${this.groups.canEdit?'':'disabled'}>${studioIcon('sparkle')}</button>`:''}${button('present-draft','▷','accent studio-launch','aria-label="Apresentar" title="Apresentar" '+(this.launching?'disabled':''))}</div><div class="editor-tabs" role="tablist" aria-label="Conteúdo da aula">${activityTabs(l,this.tab,this.currentBlock()?.id,this.groups.canEdit)}</div><button type="button" class="studio-btn quiet mobile-editor-actions" data-studio-action="mobile-actions" aria-expanded="false" aria-controls="editor-actions" aria-label="Opções da aula" title="Opções da aula">···</button><div class="editor-top-actions" id="editor-actions"><div class="mobile-actions-heading"><strong>Opções da aula</strong><button type="button" class="studio-btn" data-studio-action="close-mobile-actions" aria-label="Fechar opções">×</button></div>${button('present-draft', 'Apresentar ↗', 'accent studio-launch', this.launching ? 'disabled' : '')}${this.editorSaveControls()}${this.tab==='slides'&&this.visualMode&&this.currentBlock()?.type!=='poll'?`<button type="button" class="studio-btn editor-icon ai-tool" data-storage-ai="toggle" aria-label="Storage AI" title="Storage AI" aria-pressed="${Boolean(this.ai.open)}" ${this.groups.canEdit?'':'disabled'}>${studioIcon('sparkle')}<span class="mobile-action-label">storageAI</span></button>`:''}<details class="editor-more editor-sharing"><summary aria-label="Compartilhar e colaborar" title="Compartilhar e colaborar">${studioIcon('share')}<span class="mobile-action-label">Compartilhar</span></summary><div><button type="button" class="studio-btn quiet" data-group-action="share">${studioIcon('collaborate')} Colaborar</button><button type="button" class="studio-btn quiet" data-chat-action="open">${studioIcon('chat')} Chat</button>${button('share-presentation','Compartilhar','quiet')}</div></details><details class="editor-more editor-download"><summary aria-label="Baixar apresentação" title="Baixar apresentação">${studioIcon('download')}<span class="mobile-action-label">Baixar</span></summary><div>${button('export-pdf','Baixar PDF','quiet')}${button('export-pptx','Baixar PPTX','quiet')}${this.tab==='slides'?button('export-png','Baixar PNG deste slide','quiet'):''}</div></details>${this.tab === 'slides'&&this.currentBlock()?.type!=='poll' ? button('toggle-visual', studioIcon('fields') + '<span>' + (this.visualMode ? 'Campos' : 'Editor visual') + '</span>', 'quiet') : ''}<details class="editor-more"><summary aria-label="Mais opções da aula">${studioIcon('more')}<span class="mobile-action-label">Projeto</span></summary><div>${button('rename-draft','Renomear','quiet','aria-label="Editar título e descrição"')}${button('export-draft','Baixar JSON','quiet')}</div></details></div></div><div class="editor-workspace ${this.visualMode && this.tab === 'slides' ? 'visual-workspace' : ''}"><aside class="editor-outline" data-outline-lesson="${esc(l.id)}"><div class="outline-heading"><span>${this.currentBlock()?.type==='poll'?'ENQUETES':this.tab === 'slides' ? 'SEQUÊNCIA DA AULA' : 'PERGUNTAS'}</span></div><div class="outline-actions">${this.itemActions(this.tab==='slides'?'slide':'question',this.tab==='slides'?this.index:this.questionIndex,this.tab==='slides'?l.slides.length:l.questions.length)}${button(this.tab === 'slides' ? 'add-slide' : 'add-question', '+', 'outline-add', `aria-label="${this.tab === 'slides' ? 'Adicionar slide' : 'Adicionar pergunta'}"`)}</div><div class="outline-items">${this.visibleItems().map(({item,index:i}) => `<button class="outline-item ${i === (this.tab === 'slides' ? this.index : this.questionIndex) ? 'active' : ''}" data-studio-action="${this.tab === 'slides' ? 'select-slide' : 'select-question'}" data-index="${i}">${this.tab==='slides'?this.slideThumbnail(item):''}<span>${String(i + 1).padStart(2, '0')}</span><div><strong ${i === (this.tab === 'slides' ? this.index : this.questionIndex) ? 'data-current-label' : ''}>${esc((this.tab === 'slides' ? item.title : item.text) || 'Sem título')}</strong><small>${this.tab === 'slides' ? kindLabel(item.kind) : esc(item.difficulty) + ' · ' + item.seconds + ' s'}</small></div>${this.tab==='slides'&&this.groups.live?`<span class="collaborator-avatars outline-presence" data-slide-presence="${esc(item.id)}"></span>`:''}</button>`).join('')}</div></aside><section class="editor-form-area">${this.tab==='quiz'?gameSettingsMarkup(l,this.gameSettingsOpen):!this.visualMode&&l.slides[this.index].kind!=='canvas'?audioEditor(l.slides[this.index].audio,'slide'):''}${this.tab === 'slides' ? this.currentBlock()?.type==='poll'?this.pollBlockEditor():(this.visualMode ? this.itemToolbar('slide', this.index, l.slides.length) + this.mobileSlidePreviews() + this.designer.markup(false,false) : this.slideEditor()) + (this.visualMode?'':this.slideActivities()) : this.quizEditor()}</section><aside class="editor-preview-area"><span class="studio-kicker">UM OLHAR DA TURMA</span><div id="editor-mini-preview">${this.previewMarkup()}</div></aside></div></main>`);
  }
  slideActivities() {
    const s = this.draft.slides[this.index], poll = s.poll || { text: '', options: ['Concordo', 'Ainda tenho dúvidas'] };
    return `<details class="editor-details slide-activities"><summary>▥ Atividades e passagem deste slide</summary>${s.poll ? `<div class="editor-field"><label for="poll-text">Pergunta da enquete</label><input id="poll-text" data-poll-field="text" maxlength="500" value="${esc(poll.text)}"></div><div class="editor-field"><label for="poll-options">Opções (uma por linha, de 2 a 4)</label><textarea id="poll-options" data-poll-field="options" rows="4">${esc(poll.options.join('\n'))}</textarea></div>` : ''}${mobileChoice(s)}<div class="editor-field"><label for="slide-transition">Transição ao entrar neste slide</label><select id="slide-transition" data-scope="slide" data-field="transition">${[['slide', 'Deslizar'], ['fade', 'Dissolver'], ['zoom', 'Aproximar'], ['rise', 'Subir'], ['wipe', 'Revelar'], ['iris', 'Círculo'], ['split', 'Cortina'], ['flip', 'Virar página'], ['none', 'Sem animação']].map(([value,label]) => `<option value="${value}" ${(s.transition || 'slide') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div></details>`;
  }
  pollBlockEditor(){const poll=this.draft.slides[this.index].poll;return `${this.itemToolbar('slide',this.index,this.draft.slides.length)}<div class="poll-block-editor"><h2>Enquete</h2><label for="poll-text">Pergunta da enquete</label><input id="poll-text" data-poll-field="text" maxlength="500" value="${esc(poll.text)}"><label for="poll-options">Opções (uma por linha, de 2 a 4)</label><textarea id="poll-options" data-poll-field="options" rows="4">${esc(poll.options.join('\n'))}</textarea></div>`;}
  itemActions(type,i,total){const position=this.draft.activityBlocks?this.visibleItems().findIndex(v=>v.index===i):i,count=this.draft.activityBlocks?this.visibleItems().length:total;return `${button('move-' + type + '-up', '↑', 'square', `aria-label="Mover ${type === 'slide' ? 'slide' : 'pergunta'} para cima" ${position === 0 ? 'disabled' : ''}`)}${button('move-' + type + '-down', '↓', 'square', `aria-label="Mover ${type === 'slide' ? 'slide' : 'pergunta'} para baixo" ${position >= count - 1 ? 'disabled' : ''}`)}${button('duplicate-' + type, '⧉', 'square', `aria-label="Duplicar ${type === 'slide' ? 'slide' : 'pergunta'}" ${count?'':'disabled'}`)}${button('delete-' + type, '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>', 'square danger-text', `aria-label="Excluir ${type === 'slide' ? 'slide' : 'pergunta'}" ${count?'':'disabled'}`)}`;}
  bindIconHints() {
    let timer, origin, hint, shown = false;
    const clear = () => { clearTimeout(timer); hint?.remove(); hint = null; };
    this.root.addEventListener('pointerdown', event => {
      clear();
      shown = false;
      const control = event.target.closest('.editor-shell :is(button,summary)[aria-label]');
      if (event.pointerType !== 'touch' || !control?.querySelector('svg')) return;
      origin = {x:event.clientX,y:event.clientY};
      timer = setTimeout(() => {
        if (!control.isConnected) return;
        const rect = control.getBoundingClientRect();
        hint = document.createElement('span');
        hint.className = 'editor-icon-hint';
        hint.textContent = control.getAttribute('aria-label');
        hint.style.left = Math.max(82,Math.min(window.innerWidth-82,rect.left+rect.width/2))+'px';
        hint.style.top = (rect.top>44?rect.top-8:rect.bottom+36)+'px';
        document.body.append(hint);
        shown = true;
      }, 550);
    });
    this.root.addEventListener('pointermove', event => {
      if (origin && Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>10) clear();
    });
    for (const type of ['pointerup','pointercancel']) this.root.addEventListener(type, () => {
      origin = null;
      clearTimeout(timer);
      if (hint) { const visible = hint; setTimeout(() => visible.remove(), 800); }
      if (shown) setTimeout(() => { shown = false; }, 400);
    });
    this.root.addEventListener('click', event => {
      if (!shown) return;
      shown = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
  slideThumbnail(item) {
    const slide=presentationSlide(item);
    const content=item.kind==='document'?assetImage(item):canvasMarkup(slide,{interactive:false}).replace(/<button\b[\s\S]*?<\/button>/gi,'');
    return `<div class="slide-thumbnail" style="aspect-ratio:${slide.pageWidth&&slide.pageHeight?slide.pageWidth/slide.pageHeight:16/9}" inert aria-hidden="true">${content}</div>`;
  }
  mobileSlidePreviews() {
    return `<div class="mobile-slide-previews" aria-label="Páginas do slide">${this.visibleItems().map(({item,index}) =>
      `<div class="mobile-slide-preview">
        <button type="button" data-studio-action="select-slide" data-index="${index}" aria-current="${index===this.index?'page':'false'}" aria-label="${esc(item.title || 'Slide '+(index+1))}">${this.slideThumbnail(item)}<span class="mobile-slide-number">${index+1}</span></button>
      </div>`).join('')}${this.groups.canEdit?button('add-slide','+', 'studio-btn','aria-label="Adicionar slide" title="Adicionar slide"'):''}</div>`;
  }
  itemToolbar(type, i, total) {
    const position=this.draft.activityBlocks?this.visibleItems().findIndex(v=>v.index===i):i,count=this.draft.activityBlocks?this.visibleItems().length:total;
    return `<div class="item-toolbar"><div class="item-identity"><span class="item-number">${type === 'slide' ? 'SLIDE' : 'PERGUNTA'} ${String(position + 1).padStart(2, '0')}</span><span class="save-state ${this.dirty ? 'unsaved' : ''}" role="status">${this.groups.live ? esc(this.groups.live.status) : this.dirty ? 'Alterações não salvas' : 'Salvo'}</span></div>${type==='slide'&&(this.visualMode||this.draft.slides[i].kind==='canvas')?`<div class="item-tools">${this.designer.toolbarMarkup()}</div>`:''}</div>`;
  }
  slideEditor() {
    const s = this.draft.slides[this.index];
    if (s.kind === 'canvas') return this.itemToolbar('slide',this.index,this.draft.slides.length)+this.designer.markup(true,false);
    if (s.kind === 'document') return this.documentEditor(s);
    return `${this.itemToolbar('slide', this.index, this.draft.slides.length)}<div class="editor-field"><label for="slide-kind">Formato do slide</label><select id="slide-kind" data-scope="slide" data-field="kind">${[['text', 'Texto e ideias'], ['image', 'Imagem e explicação'], ['model', 'Modelo 3D interativo']].map(([v, label]) => `<option value="${v}" ${s.kind === v ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
      ${field('Título do slide', 'title', s.title, 'slide', { attributes: 'maxlength="200"' })}${field('Etiqueta', 'tag', s.tag, 'slide', { attributes: 'maxlength="160" placeholder="Ex.: O ponto de partida"' })}${field('Introdução', 'intro', s.intro, 'slide', { textarea: true })}${field('Ideias principais', 'points', s.points.join('\n'), 'slide', { textarea: true, hint: 'Uma ideia por linha. Até 12 tópicos.' })}
      ${s.kind === 'model' ? `<div class="editor-field"><label for="slide-model">Modelo para explorar</label><select id="slide-model" data-scope="slide" data-field="model">${[['ssd', 'SSD SATA'], ['hdd', 'HDD'], ['nvme', 'SSD M.2 NVMe'], ['custom', 'Meu modelo enviado']].map(([v, label]) => `<option value="${v}" ${s.model === v ? 'selected' : ''}>${label}</option>`).join('')}</select><small>Use um modelo da biblioteca ou envie um modelo próprio.</small>${button('upload-native-model', '↑ Enviar modelo GLB / GLTF / OBJ', 'quiet')}<input type="file" id="native-model-files" accept=".glb,.gltf,.obj,.mtl,.bin,.png,.jpg,.jpeg,.webp,.gif,.ktx2" multiple hidden>${s.customModel ? `<small>${esc(s.customModel.name)}</small>` : ''}<small>GLB é mais prático. Em OBJ/GLTF, selecione também MTL, BIN e texturas. Até 15 MB no total.</small><div class="native-model-preview"></div></div>` : ''}
      ${s.kind === 'image' ? `<div class="image-editor">${field('Link da imagem', 'image', s.image.startsWith('data:') ? '' : s.image, 'slide', { type: 'url', attributes: 'placeholder="https://..."', hint: s.image.startsWith('data:') ? 'Imagem incorporada ao arquivo da aula.' : 'Use um link HTTPS ou carregue uma imagem abaixo.' })}<label class="upload-image" for="slide-image-file">↑ Carregar imagem do computador</label><input id="slide-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>${field('Descrição da imagem', 'imageAlt', s.imageAlt, 'slide', { attributes: 'maxlength="500"', hint: 'Descreva o que a turma deve observar. Também ajuda quem usa leitor de tela.' })}${s.image || s.assetId ? button('clear-image', 'Remover imagem', 'link') : ''}</div>` : ''}
      ${field('Destaque', 'callout', s.callout, 'slide', { textarea: true })}${s.comparison ? button('clear-comparison', 'Remover comparação HDD × SSD deste slide', 'link') : ''}<details class="editor-details" ${s.prompt ? 'open' : ''}><summary>↗ Pergunta para discutir com a turma</summary>${field('Pergunta de discussão', 'prompt', s.prompt, 'slide', { textarea: true })}${field('Explicação da discussão', 'answer', s.answer, 'slide', { textarea: true })}</details><details class="editor-details"><summary>▤ Roteiro do apresentador</summary>${field('Notas só para o professor', 'note', s.note, 'slide', { textarea: true, hint: 'As notas não são enviadas aos celulares dos alunos.' })}</details>`;
  }
  quizEditor() {
    if (!this.visibleItems().length) return `<div class="editor-empty"><span>✦</span><h2>O aprendizado vira desafio.</h2><p>Crie perguntas com alternativas, tempo e dificuldade. O quiz é opcional: você também pode encerrar a aula sem ele.</p>${button('add-question', '+ Criar primeira pergunta', 'accent')}</div>`;
    const q = this.draft.questions[this.questionIndex];
    return `${this.itemToolbar('question', this.questionIndex, this.draft.questions.length)}${field('Pergunta', 'text', q.text, 'question', { textarea: true })}<div class="editor-field"><label for="question-option-count">Número de alternativas</label><select id="question-option-count" data-scope="question" data-field="optionCount">${[2, 3, 4].map(n => `<option value="${n}" ${q.options.length === n ? 'selected' : ''}>${n} alternativas</option>`).join('')}</select></div><fieldset class="quiz-options-editor"><legend>Alternativas <small>Marque a resposta correta</small></legend>${q.options.map((option, i) => `<div><input type="radio" name="correct-answer" id="correct-${i}" data-scope="question" data-field="correct" value="${i}" aria-label="Alternativa correta: ${'ABCD'[i]}" ${q.correct === i ? 'checked' : ''}><label for="option-${i}">${'ABCD'[i]}</label><input id="option-${i}" data-scope="question" data-option="${i}" value="${esc(option)}" aria-label="Alternativa ${'ABCD'[i]}" maxlength="500"></div>`).join('')}</fieldset><div class="editor-field-row"><div class="editor-field"><label for="question-difficulty">Dificuldade</label><select id="question-difficulty" data-scope="question" data-field="difficulty">${Object.keys(difficulties).map(d => `<option ${q.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select><small id="difficulty-points">Até ${difficulties[q.difficulty].toLocaleString('pt-BR')} pontos</small></div>${field('Tempo (segundos)', 'seconds', q.seconds, 'question', { type: 'number', attributes: 'min="5" max="300" step="1"', hint: 'Entre 5 e 300 segundos.' })}</div>${field('Explicação da resposta', 'explanation', q.explanation, 'question', { textarea: true, hint: 'Aparece depois que o professor revela a resposta ou o tempo termina.' })}`;
  }
  previewMarkup() {
    if(this.currentBlock()?.type==='poll'){const p=this.draft.slides[this.index].poll;return `<div class="mini-slide"><span>ENQUETE</span><h3>${esc(p.text)}</h3><div class="mini-answers">${p.options.map((o,i)=>`<p><b>${'ABCD'[i]}</b>${esc(o)}</p>`).join('')}</div></div>`;}
    if (this.tab === 'quiz') {
      const q = this.draft.questions[this.questionIndex];
      return q ? `<div class="mini-slide"><span>✦ QUIZ · ${esc(q.seconds)} s</span><h3>${esc(q.text || 'Sua pergunta')}</h3><div class="mini-answers">${q.options.map((o, i) => `<p><b>${'ABCD'[i]}</b>${esc(o)}</p>`).join('')}</div></div>` : '<div class="mini-slide"><span>✦ SEU QUIZ</span><h3>A próxima descoberta começa com uma pergunta.</h3></div>';
    }
    const s = this.draft.slides[this.index];
    if (s.kind === 'canvas') return `<div class="mini-slide"><span>SLIDE LIVRE</span><h3>${esc(s.title)}</h3><p>${s.elements.length} elementos · visual editável</p></div>`;
    if (s.kind === 'document') return `<div class="mini-slide mini-imported"><span>${esc(s.sourceType.toUpperCase())} · ${esc(s.title)}</span>${assetImage(s)}</div>`;
    let media = '';
    try { if (s.kind === 'image' && (s.image || s.assetId)) media = assetImage(s); } catch { media = '<p>Adicione uma imagem válida.</p>'; }
    return `<div class="mini-slide"><span>${esc(s.tag || 'SUA AULA')}</span><h3>${esc(s.title || 'Título do slide')}</h3>${media}${s.kind === 'model' ? `<div class="mini-model">◇<small>${s.model === 'custom' ? esc(s.customModel?.name || 'Envie seu modelo') : { ssd: 'SSD SATA', hdd: 'HDD', nvme: 'SSD NVMe' }[s.model]}</small></div>` : ''}<p>${esc(s.intro)}</p><ul>${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>${s.prompt ? `<blockquote>${esc(s.prompt)}</blockquote>` : ''}</div>`;
  }
  openCoverDialog(lesson) {
    this.dialog={type:'cover',id:lesson.id,form:{thumbnail:lesson.thumbnail||''}};
  }
  async chooseLessonCover(file) {
    const dialog=this.dialog;
    if(!file||!dialog?.form)return;
    const thumbnail=await cropLessonCover(file);
    if(this.dialog!==dialog||!thumbnail)return;
    dialog.form.thumbnail=thumbnail;
    this.callbacks.render();
  }
  dialogMarkup() {
    if (!this.dialog) return '';
    if(['new','cover'].includes(this.dialog.type)){
      const creating=this.dialog.type==='new',form=this.dialog.form;
      return `<div class="modal-backdrop"><section class="studio-dialog project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-title">
        <h2 id="project-title">${creating?'Nova aula':'Trocar capa'}</h2>
        ${creating?projectFields(form):'<label class="lesson-cover-input">'+studioIcon('upload')+' Escolher capa<input type="file" data-lesson-cover-file accept="image/png,image/jpeg,image/webp,image/gif" hidden></label>'}
        ${form.thumbnail?`<img class="lesson-cover-preview" src="${esc(form.thumbnail)}" alt="Prévia da capa">${button('clear-cover','Remover capa','link')}`:''}
        <div>${button('cancel-dialog','Cancelar','quiet')}${button(creating?'confirm-new':'confirm-cover',creating?'Criar aula':'Salvar capa','accent')}</div>
      </section></div>`;
    }
    if(this.dialog.type==='leave'){
      return `<div class="modal-backdrop"><section class="studio-dialog leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="studio-dialog-title"><h2 id="studio-dialog-title">Sair sem salvar?</h2><p>Esta aula tem alterações que ainda não foram salvas. Quer mesmo sair?</p><div>${button('cancel-dialog','Continuar editando','quiet')}${button('leave-discard','Sair sem salvar','danger')}${button('leave-save','Salvar e sair','accent')}</div></section></div>`;
    }
    if(this.dialog.type==='cloud-delete'){
      if(this.dialog.uid!==this.account.user?.id)return '';
      return `<div class="modal-backdrop"><section class="studio-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-dialog-title"><h2 id="studio-dialog-title">Excluir da nuvem?</h2><p>“${esc(this.dialog.item.title)}” será removida da sua conta. Cópias no dispositivo continuam disponíveis.</p><div>${button('cancel-dialog','Cancelar','quiet')}${button('cloud-delete','Excluir da nuvem','danger')}</div></section></div>`;
    }
    const l = this.dialog.type === 'rename-draft' ? this.draft : this.library.lessons.find(l => l.id === this.dialog.id);
    if (!l) return '';
    const deleting = this.dialog.type === 'delete';
    if (!deleting && !this.dialog.form) this.dialog.form = { title: l.title, description: l.description || '' };
    return `<div class="modal-backdrop"><section class="studio-dialog" role="dialog" aria-modal="true" aria-labelledby="studio-dialog-title"><h2 id="studio-dialog-title">${deleting ? 'Excluir esta aula?' : 'Renomear aula'}</h2><p>${deleting ? `“${esc(l.title)}” será removida deste navegador. Você pode exportar um JSON antes de excluir.` : 'Título e descrição da aula.'}</p>${!deleting ? '<label for="rename-lesson">Título da aula</label><input id="rename-lesson" maxlength="140" value="' + esc(this.dialog.form.title) + '"><label for="rename-description">Descrição</label><textarea id="rename-description" maxlength="500">' + esc(this.dialog.form.description) + '</textarea>' : ''}<div>${button('cancel-dialog', 'Cancelar', 'quiet')}${button(deleting ? 'confirm-delete' : 'confirm-rename', deleting ? 'Excluir aula' : 'Salvar alterações', deleting ? 'danger' : 'accent')}</div></section></div>`;
  }
  change(input) {
    if (this.receivingRemote || !this.root.contains(input)) return;
    if (this.dialog?.form && ['rename-lesson', 'rename-description'].includes(input.id)) { this.dialog.form[input.id === 'rename-lesson' ? 'title' : 'description'] = input.value; return; }
    if (this.view !== 'editor') return;
    if (input.matches('[data-poll-enabled]')) {
      this.draft.slides[this.index].poll = input.checked ? { text: 'O que você acha desta ideia?', options: ['Concordo', 'Ainda tenho dúvidas'] } : null;
      this.markDirty(); this.callbacks.render(); this.root.querySelector('.slide-activities').open = true; return;
    }
    if (input.dataset.pollField) {
      const poll = this.draft.slides[this.index].poll;
      if (poll) { poll[input.dataset.pollField] = input.dataset.pollField === 'options' ? input.value.split('\n').slice(0,4) : input.value; this.markDirty(); }
      return;
    }
    if(input.dataset.gameSetting){this.draft.gameSettings||={};this.draft.gameSettings[input.dataset.gameSetting]=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;this.markDirty();return;}
    if (!input.dataset.scope) return;
    const scope = input.dataset.scope, key = input.dataset.field;
    const item = scope === 'lesson' ? this.draft : scope === 'slide' ? this.draft.slides[this.index] : this.draft.questions[this.questionIndex];
    if (input.type === 'radio' && !input.checked) return;
    if (key === 'optionCount') {
      const count = Number(input.value);
      item.options = Array.from({ length: count }, (_, i) => item.options[i] ?? 'Alternativa ' + 'ABCD'[i]);
      item.correct = Math.min(item.correct, count - 1);
    } else if (input.dataset.option !== undefined) item.options[Number(input.dataset.option)] = input.value;
    else item[key] = key === 'points' ? input.value.split('\n').filter(p => p.trim()).slice(0, 12) : ['seconds', 'correct'].includes(key) ? Number(input.value) : input.value;
    if (key === 'difficulty') item.base = difficulties[item.difficulty];
    if (key === 'image') delete item.assetId;
    this.markDirty();
    if (key === 'kind' || key === 'optionCount' || key === 'model') this.callbacks.render();
    else {
      const preview = document.querySelector('#editor-mini-preview');
      if (preview) { preview.innerHTML = this.previewMarkup(); fillAssetImages(preview); }
      const label = document.querySelector('[data-current-label]');
      if (label && scope !== 'lesson') label.textContent = (this.tab === 'slides' ? item.title : item.text) || 'Sem título';
      if (key === 'difficulty') document.querySelector('#difficulty-points').textContent = 'Até ' + item.base.toLocaleString('pt-BR') + ' pontos';
    }
  }
  markDirty() {
    this.dirty = true; this.paintSaveButton(); this.groups?.live?.schedule();
    const status = document.querySelector('.save-state');
    if (status) { status.textContent = 'Alterações não salvas'; status.classList.add('unsaved'); }
  }
  save() {
    if (!this.draft) return;
    if (this.groups?.live) { this.groups.live.schedule(); return; }
    this.draft = this.library.save(this.draft); this.dirty = false;
  }
  open(id, navigate = true) {
    this.scrollEditorTop = true;
    this.draft = clone(this.library.lessons.find(l => l.id === id));
    this.blockId=''; this.index = 0; this.questionIndex = 0; this.tab = 'slides'; this.visualMode = true; this.designer.selected = ''; this.dirty = false; this.view = 'editor';
    if (navigate) this.writeRoute();
  }
  requestPresentationFullscreen() {
    if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>this.callbacks.toast('Use Tela cheia na barra da apresentação.'));
  }
  async launch(lesson, preview, fullscreen = !preview, startIndex, fromEditor = false) {
    if (this.launching) return;
    if(fullscreen)this.requestPresentationFullscreen();
    this.launching = true; this.callbacks.render();
    try {
      if (this.groups.live) await this.groups.live.persist();
      const validated = validateLesson(await hydrateLesson(lesson));
      this.nativeViewer?.dispose(); this.nativeViewer = null; this.designer.models.mount(null, null);
      await (preview ? this.callbacks.preview(validated) : this.callbacks.present(validated,startIndex,fromEditor));
    }
    finally { this.launching = false; this.callbacks.render(); }
  }
  async exportVisual(lesson,format){for(const menu of this.root.querySelectorAll('details.editor-more,details.lesson-menu'))menu.open=false;const dialog=document.createElement('dialog');dialog.className='export-dialog';dialog.innerHTML='<h2>Exportando '+format.toUpperCase()+'</h2><p role="status">Preparando os slides…</p><div class="export-orbit" aria-hidden="true"><i></i><i></i><i></i></div><button type="button">Cancelar</button>';document.body.append(dialog);dialog.showModal();let cancelled=false;dialog.querySelector('button').onclick=()=>{cancelled=true;};dialog.addEventListener('cancel',e=>{e.preventDefault();cancelled=true;});try{const {exportSlides}=await import('./export-slides.js');await exportSlides(lesson,format,(done,total)=>{if(cancelled)throw new DOMException('Cancelado','AbortError');dialog.querySelector('[role=status]').textContent=done+' de '+total+' slides';});this.callbacks.toast('Arquivo '+format.toUpperCase()+' exportado.');}catch(error){if(error.name!=='AbortError')this.callbacks.toast(error.message||'Não foi possível exportar.');}finally{dialog.close();dialog.remove();}}
  async download(lesson) {
    const content = validateLesson(await hydrateLesson(lesson, true), { draft: true });
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = (content.title || 'aula').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async importFile(file) {
    if (!file) return;
    if (file.size > MAX_LESSON_BYTES * 2) throw Error('O arquivo é grande demais. Use uma aula de até 48 MB.');
    let input;
    try { input = JSON.parse(await file.text()); } catch { throw Error('Não foi possível ler o JSON. Escolha um arquivo exportado pela plataforma.'); }
    const parsed = validateLesson(input, { draft: true });
    if ([parsed.quizAudio,parsed.lobbyAudio,parsed.questionAudio, ...parsed.slides.flatMap(s => [s.audio,...(s.elements||[]).map(e=>e.audio)])].some(a => a?.assetId && !a.data)) throw Error('Este JSON não contém todas as músicas. Exporte novamente a aula no navegador original.');
    if (parsed.slides.some(s => (s.assetId && !s.image) || (s.customModel?.assetId && !s.customModel.data) || s.elements?.some(e => (e.assetId && !e.image) || (e.customModel?.assetId && !e.customModel.data)))) throw Error('Este JSON não contém todas as imagens. Exporte novamente a aula no navegador original.');
    const archived = await archiveImportedPages(parsed);
    let lesson;
    try { lesson = this.library.import(archived.lesson); }
    catch (error) { await removePageAssets(archived.ids).catch(() => {}); throw error; }
    this.open(lesson.id); this.callbacks.render(); this.callbacks.toast('Aula importada. Uma nova cópia foi criada na biblioteca.');
  }
  async uploadImage(file) {
    if (!file) return;
    const draft = this.draft, slide = draft.slides[this.index];
    file = await optimizeImage(file);
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 1_400_000) throw Error('Escolha PNG, JPEG, WebP ou GIF de até 1,4 MB.');
    const result = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Não foi possível carregar a imagem.')); reader.readAsDataURL(file); });
    if (this.draft !== draft || !draft.slides.includes(slide)) return;
    slide.image = imageURL(result); delete slide.assetId; this.markDirty(); this.callbacks.render();
  }
  sharePresentation() { this.sharing.show(); }
  afterRender() {
    if (this.scrollEditorTop && this.view === 'editor') { this.scrollEditorTop = false; window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
    this.account.afterRender();
    this.remote.paint();
    this.ai.mountCreate();
    const cloudVisible=this.view==='library';
    if(cloudVisible&&this.account.user&&!this.cloudBusy&&(!this.cloudLoaded||!this.cloudWasVisible))queueMicrotask(()=>{if(this.view==='library'&&this.account.user&&!this.cloudBusy)this.cloudAction('cloud-refresh',{});});
    this.cloudWasVisible=cloudVisible;
    this.editorMusic.mountPanel();
    if(this.groups.live&&!this.groups.canEdit)for(const node of this.root.querySelectorAll('.designer-toolbar,.designer-workspace,.editor-field,.quiz-options-editor,.slide-activities'))node.inert=true;
    this.groups.afterRender();this.groups.live?.trackPosition();
    this.sharing.mount();
    this.showcase.mount();
    fillAssetAudio(this.root);
    for (const preview of this.root.querySelectorAll('[data-audio-preview]')) {
      const track = this.audioTarget(preview.dataset.audioPreview);
      if (!track) continue;
      preview.volume = track.volume;
      preview.defaultPlaybackRate = track.rate || 1;
      preview.playbackRate = preview.defaultPlaybackRate;
      preview.loop = track.loop;
    }
    fillAssetImages(this.root);
    this.watchCloudCovers();
    if(this.dialog?.type==='new'){
      this.root.querySelector('#rename-lesson').value=this.dialog.form.title;
      this.root.querySelector('#rename-description').value=this.dialog.form.description;
    }
    if (this.view === 'editor' && this.tab === 'slides') this.designer.afterRender(); else this.designer.models.mount(null, null);
    this.designer.simulations.mountStatic(this.root);
    const slot = this.root.querySelector('.native-model-preview');
    if (slot) {
      this.nativeViewer ||= new HardwareViewer(); slot.append(this.nativeViewer.el);
      const slide = this.draft.slides[this.index];
      if (slide.model === 'custom' && slide.customModel) this.nativeViewer.setCustomModel(slide.customModel);
      else this.nativeViewer.setModel(slide.model === 'custom' ? 'ssd' : slide.model, false);
      requestAnimationFrame(() => this.nativeViewer.resize());
    } else if (this.nativeViewer) { this.nativeViewer.dispose(); this.nativeViewer = null; }
  }
  documentEditor(slide) {
    return `${this.itemToolbar('slide', this.index, this.draft.slides.length)}
      <div class="imported-notice"><span>${esc((slide.sourceType || 'ARQUIVO').toUpperCase())} IMPORTADO</span><p>A página preserva o visual do arquivo. Você pode reordenar, duplicar ou excluir páginas e acrescentar slides, perguntas e notas. Para editar o desenho original, altere o arquivo e importe novamente.</p>${slide.sourceType === 'pptx' ? '<p>Revise a prévia: animações e vídeos não são importados, e fontes ou elementos complexos podem mudar. Para maior fidelidade, exporte o PowerPoint como PDF.</p>' : ''}</div>
      ${field('Título do slide', 'title', slide.title, 'slide', { attributes: 'maxlength="200"' })}
      <div class="imported-page-preview">${assetImage(slide)}</div>
      ${field('Pergunta de discussão', 'prompt', slide.prompt, 'slide', { textarea: true })}
      ${field('Explicação da discussão', 'answer', slide.answer, 'slide', { textarea: true })}
      ${field('Notas só para o professor', 'note', slide.note, 'slide', { textarea: true })}`;
  }
  importMarkup() {
    if (!this.importDialog) return '';
    const job = this.importing;
    return `<div class="modal-backdrop"><section class="studio-dialog import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title"><h2 id="import-title">Traga seus slides</h2><p>Importe um PDF ou PowerPoint (.pptx). Cada página vira um slide para apresentar em tela cheia e acompanhar pelo celular.</p>${job ? `<div class="import-status"><strong>${esc(job.name)}</strong><p id="import-read-status" role="status">Abrindo o arquivo…</p><progress id="import-progress" max="1" aria-label="Progresso da importação"></progress></div>` : `${button('choose-slides', '↑ Escolher PDF ou PPTX', 'accent import-choose')}<p class="import-limits">Até 25 MB e 80 páginas. O arquivo é processado neste navegador.</p>`}
      ${this.importError ? `<p class="studio-warning" role="alert">${esc(this.importError)}</p>` : ''}<div>${button('cancel-import', job ? 'Cancelar importação' : 'Fechar', 'quiet')}</div></section></div>`;
  }
  async importSlideFile(file) {
    if (!file || this.importing) return;
    const controller = new AbortController();
    this.importing = { controller, name: file.name }; this.importDialog = true; this.importError = '';
    this.callbacks.render();
    let ids = [], committed = false;
    try {
      const { importSlides } = await import('./import-slides.js');
      const lesson = await importSlides(file, { signal: controller.signal, progress: (done, total) => {
        const status = document.querySelector('#import-read-status'), progress = document.querySelector('#import-progress');
        if (status) status.textContent = total ? 'Preparando slide ' + Math.min(done + 1, total) + ' de ' + total : 'Abrindo o arquivo…';
        if (progress && total) { progress.max = total; progress.value = done; }
      } });
      controller.signal.throwIfAborted();
      const archived = await archiveImportedPages(validateLesson(lesson));
      ids = archived.ids; controller.signal.throwIfAborted();
      const saved = this.library.save(archived.lesson); committed = true;
      this.open(saved.id); this.importDialog = false;
      this.callbacks.toast(saved.slides.length + ' slides importados. Confira a prévia antes de apresentar.');
    } catch (error) {
      if (controller.signal.aborted||error.name==='AbortError') { this.importDialog = false; this.callbacks.toast('Importação cancelada.'); }
      else { this.importError = error.message || 'Não foi possível importar o arquivo. Tente exportá-lo como PDF.'; }
    } finally {
      if (!committed) await removePageAssets(ids).catch(() => {});
      this.importing = null; this.callbacks.render();
    }
  }
  async uploadNativeModel(files) {
    const slide = this.draft.slides[this.index], model = await importModelFiles(files);
    if (!model || this.draft.slides[this.index] !== slide) return;
    slide.model = 'custom'; slide.customModel = model; this.markDirty(); this.callbacks.render();
  }
  async action(action, target) {
    if (action === 'mobile-actions' || action === 'close-mobile-actions') {
      const toggle = this.root.querySelector('.mobile-editor-actions');
      const open = action === 'mobile-actions' && toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        this.designer.closeMobileInspector();
        this.root.querySelector('.mobile-actions-heading button')?.focus();
      } else {
        toggle.focus();
      }
      return;
    }
    if(action==='open-navigation'){const drawer=this.root.querySelector('#studio-navigation');if(drawer&&!drawer.open){drawer.showModal();drawer.querySelector('[data-studio-action="close-navigation"]')?.focus();}return;}
    if(action==='close-navigation'){target.closest('dialog')?.close();return;}
    if(this.view==='editor'&&this.groups.live&&!this.groups.canEdit&&!['library','select-slide','select-question','tab-slides','tab-quiz','toggle-visual','list-activities','preview-draft','present-draft','share-presentation','export-draft'].includes(action)){this.callbacks.toast('Sua permissão permite '+(this.groups.role==='commenter'?'comentar':'visualizar')+' esta aula.');return;}
    if (this.importing && action !== 'cancel-import') return;
    if (action.startsWith('cloud-')) { await this.cloudAction(action, target); return; }
    const id = target.dataset.id;
    const lookup = () => this.library.lessons.find(l => l.id === id);
    if (['library', 'join','shared','storage-ai'].includes(action)) {
      // Sair com mudanças pendentes pede confirmação em vez de decidir sozinho.
      if (this.view==='editor'&&this.dirty&&!this.groups.live&&this.groups.canEdit&&!this.leaveDecided) {
        this.dialog={type:'leave',target:action};this.callbacks.render();return;
      }
      this.leaveDecided=false;
      if (this.groups.live) await this.groups.stop();
      if (this.dirty) this.save();
      if(action==='storage-ai'&&this.view!=='storage-ai')this.ai.freshPending=true;
      this.view = action; this.writeRoute(); this.callbacks.render();
      if(action==='shared'&&this.account.user){await this.groups.refresh();if(this.view==='shared')this.callbacks.render();}
      return;
    }
    if(action==='list-activities'){this.activityOrder.list();return;}
    if(action==='add-activity'){this.activityOrder.open();return;}
    if(action==='export-png'){await this.exportVisual({...this.draft,slides:[this.draft.slides[this.index]]},'png');return;}
    if(action==='export-pdf'||action==='export-pptx'){await this.exportVisual(id?lookup():this.draft,action.slice(7));return;}
    if (action === 'share-presentation') { await this.sharePresentation(); return; }
    if (action === 'upload-slides') { this.importDialog = true; this.importError = ''; }
    else if (action === 'choose-slides') { document.querySelector('#import-slides-file').click(); return; }
    else if (action === 'cancel-import') {
      if (this.importing) this.importing.controller.abort();
      else this.importDialog = false;
    }
    else if(action==='new')this.dialog={type:'new',form:{title:'',description:'',thumbnail:''}};
    else if(action==='confirm-new'){
      const form=this.dialog?.form,title=form?.title.trim();
      if(!title){this.root.querySelector('#rename-lesson').reportValidity();return;}
      const l=this.library.save({...newLesson(),title,description:form.description,thumbnail:form.thumbnail});
      this.dialog=null;this.open(l.id);
    }
    else if(action==='cover')this.openCoverDialog(lookup());
    else if(action==='clear-cover')this.dialog.form.thumbnail='';
    else if(action==='confirm-cover'){
      const lesson=this.library.lessons.find(l=>l.id===this.dialog?.id);
      if(!lesson)return;
      const saved=this.library.save({...lesson,thumbnail:this.dialog.form.thumbnail});
      this.dialog=null;
      this.callbacks.render();
      if(this.hasCloudCopy(saved)&&this.account.user){
        const uid=this.account.user.id,{thumbnailFor}=await import('./cover-render.js');
        const cloud=this.cloudFor(saved),link=this.cloudLinks[uid]?.[saved.id];
        const path=cloud?.path||link?.path;
        if(!path)return;
        const content=validateLesson(await readCloudLesson(this.account.client,path),{draft:true});
        if(saved.thumbnail)content.thumbnail=saved.thumbnail;else delete content.thumbnail;
        const cover=await thumbnailFor(content).catch(()=>'');
        if(this.account.user?.id!==uid)return;
        const result=await saveCloudLesson(this.account.client,content,cover);
        if(this.account.user?.id!==uid)return;
        if(!link||lesson.updatedAt<=link.savedAt)this.linkCloud(saved.id,result.path);
        await this.cloudAction('cloud-refresh',{});
        this.callbacks.toast(result.coverSynced===false?'Capa salva. A miniatura na nuvem aguarda a atualização do Worker.':'Capa atualizada na nuvem.');
      }
      return;
    }
    else if (action === 'rename-draft') this.dialog = { type: 'rename-draft', id: this.draft.id };
    else if (action === 'remove-audio') { const scope = target.dataset.audioScope; const owner=this.audioOwner(scope);if(owner)owner[this.audioField(scope)]=null;
      const slide=this.draft.slides[this.index];if(scope.startsWith('element:')&&slide.audio?.trigger===scope)slide.audio=null;
      this.markDirty(); }
    else if (action === 'toggle-visual') { this.visualMode = !this.visualMode; this.designer.interacting = ''; }
    else if (action === 'upload-native-model') { this.root.querySelector('#native-model-files').click(); return; }
    else if (action === 'restore-demo') { const l = this.library.restoreDemo(); this.open(l.id); }
    else if (action === 'edit') {if(await this.groups.openForLesson(id))return;this.open(id);}
    else if (action === 'save') { await this.saveEditor(); return; }
    else if (action === 'duplicate') { this.library.duplicate(id); this.callbacks.toast('Cópia adicionada à biblioteca.'); }
    else if (action === 'rename' || action === 'delete') this.dialog = { type: action, id };
    else if (action === 'cancel-dialog') this.dialog = null;
    else if (action === 'leave-save' || action === 'leave-discard') {
      const destination=this.dialog?.target||'library';
      this.dialog=null;
      if(action==='leave-discard')this.dirty=false;
      this.leaveDecided=true;
      await this.action(destination,target);
      if(action==='leave-save')this.callbacks.toast('Aula salva neste dispositivo.');
      return;
    }
    else if (action === 'confirm-delete') {
      const deleted = this.library.lessons.find(l => l.id === this.dialog.id);
      this.library.remove(this.dialog.id); this.dialog = null;
      const retained = new Set(this.library.lessons.flatMap(l => lessonAssetIds(l)));
      await removePageAssets(lessonAssetIds(deleted).filter(id => !retained.has(id))).catch(() => {});
    }
    else if (action === 'confirm-rename') {
      const name = document.querySelector('#rename-lesson').value.trim();
      if (!name) throw Error('Digite o novo nome da aula.');
      const description = this.root.querySelector('#rename-description').value.trim();
      if (this.dialog.type === 'rename-draft') { this.draft.title = name; this.draft.description = description; this.markDirty(); }
      else { const l = this.library.lessons.find(l => l.id === this.dialog.id); this.library.save({ ...l, title: name, description }); }
      this.dialog = null;
    }
    else if (action === 'import') { document.querySelector('#import-lesson-file').click(); return; }
    else if (action === 'export') { await this.download(lookup()); return; }
    else if (action === 'export-draft') { await this.download(this.draft); return; }
    else if (['preview', 'present'].includes(action)) {
      const shared=this.groups.documents.find(row=>this.groups.lessonIds.get(row.id)===id);
      if(shared){
        if(action==='present')this.requestPresentationFullscreen();
        await this.groups.open(shared.id);
        await this.launch(this.draft,action==='preview',false);
      }else await this.launch(lookup(),action==='preview');
      return;
    }
    else if (['preview-draft', 'present-draft'].includes(action)) { this.save(); await this.launch(this.draft, action === 'preview-draft', action === 'present-draft', this.tab==='slides'&&this.currentBlock()?.type!=='poll'?this.index:undefined, action==='present-draft'); return; }
    else if (action.startsWith('tab-')) { this.selectBlock(target.dataset.block||activityBlocks(this.draft).find(b=>(b.type==='quiz'?'quiz':'slides')===action.slice(4))?.id); this.writeRoute(); }
    else if (action === 'select-slide') { this.index = Number(target.dataset.index); this.designer.mobilePanel = ''; this.writeRoute(this.view, this.draft.id, true); }
    else if (action === 'select-question') this.questionIndex = Number(target.dataset.index);
    else if (action === 'clear-comparison') { this.draft.slides[this.index].comparison = false; this.markDirty(); }
    else if (action === 'clear-image') { this.draft.slides[this.index].image = ''; delete this.draft.slides[this.index].assetId; this.markDirty(); }
    else {
      const isSlide = action.includes('slide'), list = isSlide ? this.draft.slides : this.draft.questions, indexKey = isSlide ? 'index' : 'questionIndex', i = this[indexKey];
      if (action.startsWith('add-') || action.startsWith('duplicate-')) {
        if (list.length >= (isSlide ? 80 : 50)) throw Error('Você chegou ao limite de ' + (isSlide ? '80 slides.' : '50 perguntas.'));
        let item = action.startsWith('add-') ? (isSlide ? newSlide() : newQuestion()) : { ...clone(list[i]), id: createUuid() };
        if(isSlide&&this.currentBlock()?.type==='poll')item.poll||={text:'Qual é a sua opinião?',options:['Concordo','Ainda tenho dúvidas']};
        if (isSlide && this.groups.live) item = canvasFromSlide(item);
        const next = action.startsWith('add-') ? list.length : i + 1;
        list.splice(next, 0, item); this[indexKey] = next;if(this.draft.activityBlocks){const block=this.currentBlock();if(block)block.items.push(item.id);}
      } else if (action.startsWith('delete-')) {
        if (isSlide && (list.length === 1||this.draft.activityBlocks&&this.visibleItems().length===1)) throw Error('Mantenha pelo menos um slide na aula.');
        list.splice(i, 1); this[indexKey] = Math.max(0, Math.min(i, list.length - 1));
      } else if (action.startsWith('move-')) {
        const visible=this.visibleItems().map(v=>v.index),at=visible.indexOf(i),next=visible[at+(action.endsWith('up')?-1:1)]??-1;
        if (next < 0 || next >= list.length) return;
        [list[i], list[next]] = [list[next], list[i]]; this[indexKey] = next;
      } else return;
      if(this.draft.activityBlocks){this.draft.activityBlocks=normalizeBlocks(this.draft.activityBlocks,this.draft);const visible=this.visibleItems();if(visible.length&&!visible.some(({index})=>index===this[indexKey]))this[indexKey]=visible[0].index;}
      this.markDirty();
    }
    if (this.view === 'editor') this.writeRoute(this.view, this.draft.id, true);
    this.callbacks.render();
    if (this.dialog) document.querySelector('#rename-lesson, .studio-dialog button')?.focus();
  }
}
