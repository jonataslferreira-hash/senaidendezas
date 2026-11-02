import { Y, encode, decode, writeLesson, readLesson } from './collaboration-core.js';
import { rpc, getDocument, getSnapshot, putSnapshot, groupRequest } from './collaboration-api.js';
import { validateLesson } from './lessons.js';
import { getPageImage } from './assets.js';
const listItem = (list,id,index) => list instanceof Y.Map ? list.get('items').get(id) : list?.get(index);
export class LiveDocument {
  constructor(studio,row,doc,onStatus) {
    this.studio=studio;this.client=studio.account.client;this.row=row;this.doc=doc;this.onStatus=onStatus;this.uid=studio.account.user.id;
    this.clientId=crypto.randomUUID();this.version=0;this.savedVersion=0;this.queue=[];this.people=[];this.status='Conectando ao grupo…';
    this.update=(update,origin)=>{
      if(this.closed||origin==='snapshot')return;
      this.version++;this.studio.dirty=true;this.status='Alterações por salvar';this.paint();
      if(origin==='local') {
        if(update.length<24000)rpc(this.client,'sl_broadcast_document',{p_document_id:this.row.id,p_event:'update',p_data:encode(update),p_client:this.clientId}).catch(error=>this.fail(error));
        else this.status='Enviando arquivo ao grupo…';
      }
      clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.persist().catch(e=>this.fail(e)),origin==='local'?4000:6500);
    };
    doc.on('update',this.update);
  }
  current(){return !this.closed && this.studio.account.user?.id===this.uid;}
  paint(){this.onStatus?.();const status=this.studio.root.querySelector('.save-state');if(status){status.textContent=this.status;status.classList.toggle('unsaved',this.version!==this.savedVersion);}}
  fail(error){if(!this.current())return;this.status=error.message+' · Exporte JSON para guardar uma cópia.';this.paint();}
  setEditing(editing){if(this.editing===editing)return;this.editing=editing;this.channel?.track({uid:this.uid,name:this.studio.account.user?.user_metadata?.display_name||'Colaborador',editing}).catch(()=>{});}
  async connect(){
    this.roleChannel=this.client.channel('sl-members:'+this.row.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'sl_group_members',filter:'group_id=eq.'+this.row.group_id},()=>this.studio.groups.refreshMembers().then(()=>this.studio.callbacks.render()).catch(()=>{})).subscribe();
    await this.client.realtime.setAuth();if(!this.current())return;
    this.channel=this.client.channel('sl-doc-v2:'+this.row.id,{config:{private:true,broadcast:{self:false,ack:true},presence:{key:this.uid}}});
    this.channel.on('broadcast',{event:'update'},({payload})=>{if(payload?.client!==this.clientId&&typeof payload?.data==='string'&&payload.data.length<33000){this.queue.push(payload.data);this.drain();}})
      .on('broadcast',{event:'saved'},()=>this.syncRemote().catch(e=>this.fail(e)))
      .on('presence',{event:'sync'},()=>{this.people=Object.values(this.channel.presenceState()).flat().filter(p=>typeof p.uid==='string').map(p=>({uid:p.uid,name:String(p.name||'Colaborador').slice(0,60),editing:Boolean(p.editing)}));this.paint();})
      .subscribe(async status=>{
        if(!this.current())return;
        if(status==='SUBSCRIBED'){
          this.status='Edição ao vivo conectada';this.paint();
          await this.channel.track({uid:this.uid,name:this.studio.account.user.user_metadata?.display_name||'Colaborador'});
          this.syncRemote().catch(e=>this.fail(e));
        }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){this.status='Reconectando ao grupo · alterações ainda não confirmadas';this.paint();}
      });
  }
  flush(){if(this.current()&&this.studio.groups.canEdit)writeLesson(this.doc,this.studio.draft);}
  async ensurePortable(){
    const pending=[];
    const visit=node=>{if(!node||typeof node!=='object')return;if(node.assetId){const id=node.assetId;pending.push(getPageImage(id).then(data=>{if(node.assetId===id){node[Object.hasOwn(node,'image')?'image':'data']=data;delete node.assetId;}}));}for(const value of Object.values(node))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(visit):visit(value);};
    visit(this.studio.draft);await Promise.all(pending);
  }
  schedule(){if(!this.current()||!this.studio.groups.canEdit)return;this.setEditing(true);clearTimeout(this.editTimer);this.editTimer=setTimeout(()=>this.setEditing(false),1800);queueMicrotask(()=>this.ensurePortable().then(()=>{if(this.current())this.flush();}).catch(e=>this.fail(e)));}
  async drain(){
    if(!this.current())return;
    if(this.studio.designer.drag || this.studio.designer.cropPointers?.size || this.composing){clearTimeout(this.queueTimer);this.queueTimer=setTimeout(()=>this.drain(),60);return;}
    await this.ensurePortable();if(!this.current())return;this.flush();const caret=this.captureCaret();
    try{for(const data of this.queue.splice(0))Y.applyUpdate(this.doc,decode(data),'remote');this.project(caret);}
    catch{this.status='Uma alteração não pôde ser aplicada. Recarregue a aula do grupo.';this.paint();}
  }
  captureCaret(){
    const element=document.activeElement;if(!element||!this.studio.root.contains(element))return null;
    const root=this.doc.getMap('root').get('lesson');let node,selector;
    const scope=element.dataset.scope,field=element.dataset.field;
    let contentId;
    if(element.matches('.canvas-text[contenteditable]')){
      contentId=element.closest('[data-object-id]')?.dataset.objectId;
      const slide=listItem(root.get('slides'),this.studio.draft.slides[this.studio.index]?.id,this.studio.index);node=listItem(slide?.get('elements'),contentId,0)?.get('text');
      selector=`[data-object-id="${contentId}"] .canvas-text`;
    }
    if(scope){const source=scope==='lesson'?root:scope==='slide'?listItem(root.get('slides'),this.studio.draft.slides[this.studio.index]?.id,this.studio.index):listItem(root.get('questions'),this.studio.draft.questions[this.studio.questionIndex]?.id,this.studio.questionIndex);node=source?.get(field);}
    if(element.id)selector='#'+CSS.escape(element.id);
    else if(element.dataset.elementField){selector=`[data-element-field="${element.dataset.elementField}"]`;const slide=listItem(root.get('slides'),this.studio.draft.slides[this.studio.index]?.id,this.studio.index);node=listItem(slide?.get('elements'),this.studio.designer.selected,0)?.get(element.dataset.elementField);}
    if(!selector)return null;
    let start=element.selectionStart,end=element.selectionEnd;
    if(contentId){const selection=window.getSelection();if(selection.rangeCount&&element.contains(selection.anchorNode)){const range=selection.getRangeAt(0).cloneRange();range.selectNodeContents(element);range.setEnd(selection.anchorNode,selection.anchorOffset);start=end=range.toString().length;}}
    return{selector,start,end,contentId,...(node instanceof Y.Text&&typeof start==='number'?{anchor:Y.createRelativePositionFromTypeIndex(node,start),head:Y.createRelativePositionFromTypeIndex(node,end)}:{})};
  }
  project(caret){
    if(!this.current())return;
    this.studio.receivingRemote=true;
    try {
    const slideId=this.studio.draft.slides[this.studio.index]?.id;
    this.studio.draft=validateLesson(readLesson(this.doc),{draft:true});
    this.studio.index=Math.max(0,this.studio.draft.slides.findIndex(s=>s.id===slideId));
    this.studio.questionIndex=Math.max(0,Math.min(this.studio.questionIndex,this.studio.draft.questions.length-1));
    this.studio.designer.derived.clear();this.studio.designer.histories.clear();
    this.studio.callbacks.render();
    if(caret){const input=this.studio.root.querySelector(caret.selector);if(input){const start=caret.anchor?Y.createAbsolutePositionFromRelativePosition(caret.anchor,this.doc)?.index:caret.start,end=caret.head?Y.createAbsolutePositionFromRelativePosition(caret.head,this.doc)?.index:caret.end;if(caret.contentId){input.contentEditable='plaintext-only';input.focus({preventScroll:true});if(input.firstChild){const range=document.createRange();range.setStart(input.firstChild,Math.min(start||0,input.firstChild.textContent.length));range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}}else{input.focus({preventScroll:true});if(typeof caret.start==='number'&&input.setSelectionRange)try{input.setSelectionRange(start??caret.start,end??caret.end);}catch{}}}}
    this.paint();
    } finally { this.studio.receivingRemote=false; }
  }
  async syncRemote(){
    if(!this.current())throw Error('A conta mudou.');this.flush();
    let latest,payload;
    // Old revisions may have been cleaned up just after metadata was read.
    for(let attempt=0;attempt<3;attempt++){latest=await getDocument(this.client,this.row.id);try{payload=await getSnapshot(this.client,latest);break;}catch(e){if(attempt===2)throw e;}}
    if(!this.current())throw Error('A conta mudou.');
    const remote=new Y.Doc();Y.applyUpdate(remote,decode(payload.state),'snapshot');
    const caret=this.captureCaret(),before=JSON.stringify(readLesson(this.doc));
    Y.applyUpdate(this.doc,Y.encodeStateAsUpdate(remote),'snapshot');this.row=latest;
    const equal=Y.equalSnapshots(Y.snapshot(this.doc),Y.snapshot(remote));remote.destroy();
    if(before!==JSON.stringify(readLesson(this.doc)))this.project(caret);
    return equal;
  }
  persist(){if(!this.studio.groups.canEdit)return Promise.resolve();if(this.saving)return this.saving;this.saving=this.saveLoop().finally(()=>{this.saving=null;});return this.saving;}
  async saveLoop(){
    clearTimeout(this.saveTimer);await this.ensurePortable();this.flush();
    for(let attempt=0;attempt<4;attempt++){
      if(!this.current())throw Error('A conta mudou.');
      if(await this.syncRemote()){this.savedVersion=this.version;this.studio.dirty=false;this.status='Salvo no grupo';this.paint();return;}
      validateLesson(readLesson(this.doc),{draft:true});const version=this.version;
      const revision=await putSnapshot(this.client,this.row.group_id,{format:'sl-yjs-v1',state:encode(Y.encodeStateAsUpdate(this.doc))});
      if(!this.current())throw Error('A conta mudou.');
      const old=this.row.revision;
      try{this.row=await rpc(this.client,'sl_publish_group_doc',{p_group_id:this.row.group_id,p_doc_id:this.row.id,p_expected_version:this.row.version,p_revision:revision,p_title:this.studio.draft.title});}
      catch(e){this.cleanup(revision);if(e.conflict)continue;throw e;}
      if(!this.current())return;
      this.cleanup(old);this.savedVersion=version;this.studio.dirty=this.version!==version;this.status=this.studio.dirty?'Alterações por salvar':'Salvo no grupo';this.paint();
      rpc(this.client,'sl_broadcast_document',{p_document_id:this.row.id,p_event:'saved',p_data:null,p_client:this.clientId}).catch(error=>this.fail(error));
      if(this.studio.dirty){this.saveTimer=setTimeout(()=>this.persist().catch(e=>this.fail(e)),4000);}return;
    }throw Error('O grupo está salvando muitas alterações. Tente salvar novamente.');
  }
  async cleanup(revision){try{await groupRequest(this.client,`/groups/${this.row.group_id}/${revision}`,{method:'DELETE'});}catch{/* Keep recovery possible when cleanup fails. */}}
  close(){this.closed=true;clearTimeout(this.saveTimer);clearTimeout(this.queueTimer);clearTimeout(this.editTimer);if(this.roleChannel)this.client.removeChannel(this.roleChannel);this.doc.off('update',this.update);if(this.channel)this.client.removeChannel(this.channel);this.doc.destroy();}
}
