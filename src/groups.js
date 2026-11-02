import { Y,encode,decode,writeLesson,readLesson } from './collaboration-core.js';
import { LiveDocument } from './collaboration-live.js';
import { rpc,getDocument,getSnapshot,putSnapshot,groupRequest } from './collaboration-api.js';
import { hydrateLesson,archiveImportedPages } from './assets.js';
import { validateLesson } from './lessons.js';
import { canvasFromSlide } from './canvas-data.js';
import './groups.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=/^[a-f0-9-]{36}$/i;
export class GroupsPanel {
  constructor(studio){
    this.studio=studio;this.client=studio.account.client;this.documents=[];this.groups=[];this.photos=new Map();this.message='';this.status='';this.members=[];this.role='';
    studio.root.addEventListener('click',e=>{const b=e.target.closest('[data-group-action]');if(b&&!b.disabled)this.action(b.dataset.groupAction,b).catch(error=>{this.message=error.message;studio.callbacks.toast(error.message);this.paint();});});
    studio.root.addEventListener('change',e=>{if(!e.target.matches('[data-group-role]'))return;const input=e.target;input.disabled=true;rpc(this.client,'sl_set_collaborator_role',{p_document_id:this.live.row.id,p_user_id:input.dataset.groupRole,p_role:input.value}).then(()=>this.refreshMembers()).then(()=>studio.callbacks.render()).catch(error=>{input.disabled=false;this.message=error.message;this.paint();});});
    studio.root.addEventListener('compositionstart',()=>{if(this.live)this.live.composing=true;});
    studio.root.addEventListener('compositionend',()=>{if(this.live){this.live.composing=false;this.live.schedule();this.live.drain();}});
    studio.root.addEventListener('account-changed',()=>{
      if(this.live&&!this.live.current()){this.live.close();this.live=null;studio.draft=null;studio.dirty=false;studio.view='library';studio.callbacks.render();}
      this.documents=[];this.groups=[];this.resume().catch(e=>{this.message=e.message;this.paint();});
    });
    queueMicrotask(()=>this.resume().catch(e=>{this.message=e.message;this.paint();}));
  }
  get canEdit(){return !this.live||['owner','editor'].includes(this.role);}
  get canComment(){return !this.live||['owner','editor','commenter'].includes(this.role);}
  async refreshMembers(){if(!this.live)return;const live=this.live;const rows=await rpc(this.client,'sl_collaborators',{p_document_id:live.row.id});if(this.live!==live)return;this.members=Array.isArray(rows)?rows:[];this.role=this.members.find(m=>m.user_id===this.studio.account.user?.id)?.role||'viewer';for(const p of this.members)this.studio.people.load(p.user_id);}
  markup(){return `<section class="library-section group-library"><div class="library-section-title"><h2>Feitas em equipe <span>↗</span></h2><button type="button" class="studio-btn quiet" data-group-action="refresh">Atualizar</button></div><p>Convide pelo e-mail dentro do editor e criem a mesma aula ao mesmo tempo.</p><p role="status" data-group-message>${esc(this.message)}</p><div class="group-documents">${this.documents.map(d=>`<button type="button" data-group-action="open" data-doc="${d.id}"><span>▤</span><div><strong>${esc(d.title)}</strong><small>Edição compartilhada · abrir ↗</small></div></button>`).join('')||'<small>As aulas compartilhadas com sua conta aparecem aqui.</small>'}</div></section>`;}
  editorMarkup(){return `${this.shareDialog?`<dialog class="group-dialog" data-group-dialog aria-labelledby="collaboration-title"><button type="button" class="group-close" data-group-action="close" aria-label="Fechar colaboração">×</button><span class="studio-kicker">CRIEM JUNTOS</span><h2 id="collaboration-title">Convide alguém para sua aula.</h2><p>Convide por e-mail. A pessoa também recebe o convite no Chat da conta dela.</p><div class="collaborator-list">${this.members.map(p=>`<article>${this.studio.people.avatar(p.user_id,p.display_name)}<div><strong>${esc(p.display_name)}</strong><small>${p.role==='owner'?'Dono':'Colaborador'}</small></div>${p.role==='owner'?'':`<select data-group-role="${p.user_id}" aria-label="Permissão de ${esc(p.display_name)}" ${this.role==='owner'?'':'disabled'}>${[['viewer','Visualizar'],['commenter','Comentar'],['editor','Editar']].map(([v,t])=>`<option value="${v}" ${v===p.role?'selected':''}>${t}</option>`).join('')}</select>`}</article>`).join('')}</div><label for="collaborator-email">E-mail do colaborador</label><input id="collaborator-email" type="email" autocomplete="email" maxlength="254" placeholder="pessoa@exemplo.com"><label for="invite-role">Permissão</label><select id="invite-role"><option value="editor">Pode editar</option><option value="commenter">Pode comentar</option><option value="viewer">Pode visualizar</option></select><button type="button" class="studio-btn accent" data-group-action="invite" ${this.busy?'disabled':''}>${this.busy?'Preparando convite…':'Enviar convite'}</button><p role="status" data-group-message>${esc(this.message)}</p>${this.inviteLink?`<label for="collaborator-link">Link do convite</label><input id="collaborator-link" readonly value="${esc(this.inviteLink)}"><button type="button" class="studio-btn quiet" data-group-action="copy-link">Copiar convite</button>`:''}</dialog>`:''}`;}
  statusMarkup(){return this.live?`<span class="collab-dot"></span><span>${esc(this.live.status)}</span><div class="collaborator-avatars">${this.live.people.map(p=>{const photo=this.studio.people.get(p.uid).photo||this.photos.get(p.uid);return `<span data-editing="${Boolean(p.editing)}" title="${esc(p.name)}" aria-label="${esc(p.name)}" style="--avatar-hue:${parseInt(p.uid.slice(0,4),16)%360}">${photo?`<img src="${photo}" alt="">`:esc(p.name.slice(0,1).toUpperCase())}</span>`;}).join('')}</div>`:'';}
  paint(){
    if(this.live){const item=this.documents.find(d=>d.id===this.live.row.id);if(item)Object.assign(item,this.live.row);}
    const status=this.studio.root.querySelector('[data-collab-status]');if(status)status.innerHTML=this.statusMarkup();
    for(const message of this.studio.root.querySelectorAll('[data-group-message]'))message.textContent=this.message;
    this.loadPhotos();
    for(const node of this.studio.root.querySelectorAll('[data-person]')){const person=this.studio.people.get(node.dataset.person);if(person.photo&&!node.querySelector('img'))node.innerHTML=`<img src="${esc(person.photo)}" alt="">`;}
  }
  afterRender(){const dialog=this.studio.root.querySelector('[data-group-dialog]');if(dialog&&!dialog.open){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();this.shareDialog=false;this.studio.callbacks.render();});}this.paint();}
  async loadPhotos(){if(!this.live)return;const live=this.live;for(const p of live.people){if(this.photos.has(p.uid))continue;this.photos.set(p.uid,'');try{const response=await groupRequest(this.client,`/groups/${live.row.group_id}/avatars/${p.uid}`),blob=await response.blob();if(this.live!==live||!blob.type.startsWith('image/'))continue;this.photos.set(p.uid,URL.createObjectURL(blob));const status=this.studio.root.querySelector('[data-collab-status]');if(status)status.innerHTML=this.statusMarkup();}catch{/* Initial remains visible if there is no photo. */}}}
  async refresh(){
    if(!this.studio.account.user){this.message='Entre na conta para acessar suas aulas em equipe.';return;}
    const uid=this.studio.account.user.id;
    const [docs,groups]=await Promise.all([this.client.from('sl_group_documents').select('*').order('updated_at',{ascending:false}),this.client.from('sl_groups').select('*')]);
    if(this.studio.account.user?.id!==uid)return;
    if(docs.error||groups.error||!Array.isArray(docs.data)||!Array.isArray(groups.data)){this.message='A colaboração ainda precisa ser ativada pelo administrador do site.';return;}
    this.documents=docs.data||[];this.groups=groups.data||[];this.message='';
  }
  async resume(){
    await this.client.auth.getSession();
    const params=new URLSearchParams(location.search),invite=params.get('invite'),id=params.get('collab');
    if(!this.studio.account.user){if(uuid.test(invite||'')){this.message='Entre ou crie uma conta com o e-mail que recebeu o convite.';this.studio.account.show('login');}return;}
    if(this.resuming)return;this.resuming=true;
    try{
      await this.refresh();
      if(uuid.test(invite||'')){
        const row=await rpc(this.client,'sl_accept_invite',{p_token:invite});
        const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState({},'',url);await this.open(row.id);
      }else if(uuid.test(id||'')&&!this.live)await this.open(id);
      else if(this.studio.view==='library')this.studio.callbacks.render();
    }finally{this.resuming=false;}
  }
  async open(id){
    if(this.live)await this.stop();
    const uid=this.studio.account.user?.id; if(!uid)throw Error('Entre na conta para colaborar.');
    const row=await getDocument(this.client,id);let payload;
    try{payload=await getSnapshot(this.client,row);}catch{const latest=await getDocument(this.client,id);payload=await getSnapshot(this.client,latest);Object.assign(row,latest);}
    if(this.studio.account.user?.id!==uid)throw Error('A conta mudou.');
    const doc=new Y.Doc();Y.applyUpdate(doc,decode(payload.state),'snapshot');await this.enter(row,doc);
  }
  async enter(row,doc){
    const lesson=validateLesson(readLesson(doc),{draft:true});
    this.documents=this.documents.filter(d=>d.id!==row.id);this.documents.unshift(row);
    this.studio.account.close();this.studio.scrollEditorTop=true;this.studio.draft=lesson;this.studio.view='editor';this.studio.index=0;this.studio.questionIndex=0;this.studio.tab='slides';this.studio.visualMode=true;this.studio.dirty=false;
    this.role='viewer';this.live=new LiveDocument(this.studio,row,doc,()=>this.paint());try{await this.refreshMembers();}catch{this.message='Atualize o SQL para carregar as permissões da equipe.';}this.studio.writeRoute('editor',lesson.id,true);this.studio.callbacks.render();await this.live.connect();
  }
  async createShared(){
    await groupRequest(this.client,'/collaboration/status');
    this.studio.save();const portable=validateLesson(await hydrateLesson(this.studio.draft,true),{draft:true}),doc=new Y.Doc();
    portable.slides=portable.slides.map(canvasFromSlide);writeLesson(doc,portable);
    const group=await rpc(this.client,'sl_create_group',{p_name:portable.title}),id=crypto.randomUUID();
    const revision=await putSnapshot(this.client,group.id,{format:'sl-yjs-v1',state:encode(Y.encodeStateAsUpdate(doc))});
    const row=await rpc(this.client,'sl_publish_group_doc',{p_group_id:group.id,p_doc_id:id,p_expected_version:0,p_revision:revision,p_title:portable.title});
    this.groups.push(group);await this.enter(row,doc);
  }
  async stop(){if(!this.live)return;await this.live.persist();this.live.close();this.live=null;for(const photo of this.photos.values())if(photo)URL.revokeObjectURL(photo);this.photos.clear();}
  async action(action,button){
    if(action==='refresh'){await this.refresh();this.studio.callbacks.render();return;}
    if(action==='open'){await this.open(button.dataset.doc);return;}
    if(action==='close'){if(this.busy)return;this.shareDialog=false;this.studio.callbacks.render();return;}
    if(action==='share'){
      if(!this.studio.account.user){this.studio.account.show('login');return;}
      if(this.live)await this.refreshMembers();this.shareDialog=true;this.message='';this.inviteLink='';this.studio.callbacks.render();return;
    }
    if(action==='copy-link'){try{await navigator.clipboard.writeText(this.inviteLink);this.message='Convite copiado.';}catch{this.message='Copie o link no campo acima.';}this.paint();return;}
    if(action==='copy'){const archived=await archiveImportedPages(validateLesson(await hydrateLesson(this.studio.draft,true),{draft:true}));this.studio.library.import(archived.lesson);this.studio.callbacks.toast('Cópia salva neste navegador.');return;}
    if(action==='invite'){
      const input=this.studio.root.querySelector('#collaborator-email');if(!input.reportValidity()||!input.value.trim()){input.focus();return;}
      if(this.busy)return;const email=input.value.trim(),role=this.studio.root.querySelector('#invite-role')?.value||'editor';this.busy=true;this.message='';this.studio.callbacks.render();
      try{
        if(!this.live)await this.createShared();await this.live.persist();
        const response=await groupRequest(this.client,'/collaboration/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documentId:this.live.row.id,email,role})}),result=await response.json();
        this.inviteLink=result.link;this.message=result.sent?'Convite enviado por e-mail.':'Convite enviado ao Chat da conta convidada. Você também pode copiar o link.';
      }catch(e){this.message=e.message;}
      finally{this.busy=false;this.studio.callbacks.render();}
    }
  }
}
