import { chatComposer, paintChatPanel } from './chat-panel.js';
import {chatMessageBody,chatDate} from './chat-audio.js';
import { ChatTyping } from './chat-typing.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class LessonChat {
  constructor(studio){
    this.studio=studio;this.open=false;this.messages=[];this.documentId='';this.draft='';this.status='';this.generation=0;this.typing=new ChatTyping(studio,()=>this.paintTyping());
    studio.root.addEventListener('click',e=>{const button=e.target.closest('[data-chat-action]');if(!button)return;this.action(button).catch(error=>{this.status=error.message;this.paint();});});
    studio.root.addEventListener('input',e=>{if(e.target.id==='chat-message'){this.draft=e.target.value;this.typing.send(Boolean(this.draft.trim()));}});
    studio.root.addEventListener('change',e=>{if(e.target.id==='chat-document')this.select(e.target.value);if(e.target.id==='chat-reference')this.reference=e.target.checked;});
    studio.root.addEventListener('submit',e=>{if(e.target.id==='chat-form'){e.preventDefault();this.send();}});
    studio.root.addEventListener('account-changed',()=>{this.stopConnection();this.open=false;this.messages=[];this.documentId='';this.draft='';this.paint();});
  }
  get canComment(){
    if(!this.documentId)return false;
    return this.studio.groups.live?.row.id===this.documentId?this.studio.groups.canComment:['owner','editor','commenter'].includes(this.role);
  }
  stopConnection(){
    clearInterval(this.historyTimer);
    this.generation++;
    this.typing.close();
    if(this.channel)this.studio.account.client.removeChannel(this.channel);
    this.channel=null;
    this.sending=false;
  }
  markup(){if(!this.open)return '';return `<aside class="lesson-chat" aria-label="Chat da aula" data-chat-view="${esc(this.documentId)}"><header class="chat-panel-header" data-chat-part="header"><h2>${this.studio.people.avatar(this.studio.account.user?.id,this.studio.account.user?.user_metadata?.display_name||'Você')} <span>${esc(this.studio.account.user?.user_metadata?.display_name||'Chat')}</span></h2><button type="button" data-chat-action="close" aria-label="Fechar chat">×</button></header><div class="chat-document-choice" data-chat-part="documents"><label for="chat-document">Aula compartilhada</label><select id="chat-document"><option value="">Escolha uma aula</option>${this.studio.groups.documents.map(d=>`<option value="${esc(d.id)}" ${d.id===this.documentId?'selected':''}>${esc(d.title)}</option>`).join('')}</select>${!this.studio.groups.documents.length?'<p>Compartilhe uma aula pelo botão Colaborar para conversar com a equipe.</p>':''}</div><div class="chat-messages" data-chat-part="messages" role="log" aria-label="Mensagens da aula">${this.messages.map(m=>`<article data-message-id="${esc(m.id)}" class="chat-message ${m.author_id===this.studio.account.user?.id?'mine':''}" ${this.studio.people.bubble(m.author_id)}>${m.author_id===this.studio.account.user?.id?'':this.studio.people.avatar(m.author_id,m.author_name||'Colaborador')}<div><header><strong>${m.author_id===this.studio.account.user?.id?'Você':esc(m.author_name||'Colaborador')}</strong><time>${esc(chatDate(m.created_at))}</time></header>${chatMessageBody(m.body,'doc',m.document_id)}${m.slide_id?`<button type="button" data-chat-action="slide" data-slide="${esc(m.slide_id)}">Ver slide citado ↗</button>`:''}</div></article>`).join('')}</div><p class="chat-typing" data-lesson-typing data-chat-part="typing"></p><p role="status" class="chat-status" data-chat-part="status">${esc(this.status)}</p>${chatComposer({id:'chat-form',field:'chat-message',action:'data-chat-action',draft:this.draft,placeholder:'Converse sobre a aula…',disabled:!this.canComment,sending:this.sending,reference:`<label class="chat-reference"><input type="checkbox" id="chat-reference" ${(this.reference??(this.studio.groups.live?.row.id===this.documentId))?'checked':''}> Citar o slide atual</label>`})}</aside>`;}
  paintTyping(){const node=this.studio.root.querySelector('[data-lesson-typing]');if(node)node.textContent=this.typing.names.length?this.typing.names.join(', ')+' está digitando…':'';}
  paint(){
    paintChatPanel(this.studio.root.querySelector('[data-chat-slot]'),this.markup());
    this.paintTyping();
    if(this.open)for(const m of this.messages)this.studio.people.load(m.author_id);
  }
  async action(button){
    if(button.dataset.chatAction==='voice'){if(!this.canComment)return;const id=this.documentId,generation=this.generation;await this.studio.chatAudio.send('doc',id,async body=>{const {data,error}=await this.studio.account.client.rpc('sl_send_chat_message',{p_document_id:id,p_body:body,p_slide_id:null});if(error)throw error;if(generation===this.generation){this.merge(Array.isArray(data)?data:[data]);this.paint();}});return;}
    if(button.dataset.chatAction==='close'){this.typing.send(false);this.stopConnection();this.open=false;this.paint();return;}
    if(button.dataset.chatAction==='open'){
      if(!this.studio.account.user){this.studio.account.show('login');return;}
      this.open=true;
      const liveId=this.studio.groups.live?.row.id;
      if(liveId){await this.select(liveId);return;}
      if(this.studio.view==='editor'){
        await this.select('');
        this.status='Adicione colaboradores para começar a conversa desta aula.';
        this.paint();
        return;
      }
      const generation=this.generation;
      this.status='Carregando aulas…';
      this.paint();
      await this.studio.groups.refresh();
      if(!this.open||generation!==this.generation)return;
      const documents=this.studio.groups.documents;
      const id=documents.find(doc=>doc.id===this.documentId)?.id||documents[0]?.id;
      await this.select(id||'');
      if(!id){this.status=this.studio.groups.message||'';this.paint();}
      return;
    }
    if(button.dataset.chatAction==='slide'){
      if(this.studio.groups.live?.row.id!==this.documentId)await this.studio.groups.open(this.documentId);
      const index=this.studio.draft.slides.findIndex(s=>s.id===button.dataset.slide);if(index<0){this.status='O slide citado foi removido.';this.paint();return;}
      this.studio.index=index;this.studio.callbacks.render();
    }
  }
  async select(id){
    this.stopConnection();const generation=this.generation;this.role=null;this.documentId=id;this.sending=false;this.reference=null;this.messages=[];this.draft='';this.status=id?'Conectando conversa…':'';this.paint();if(!id){this.typing.close();return;}this.typing.connect('doc',id);
    const client=this.studio.account.client;
    this.channel=client.channel('sl-chat:'+id).on('postgres_changes',{
      event:'INSERT',schema:'public',table:'sl_chat_messages',filter:'document_id=eq.'+id
    },event=>{
      if(this.generation!==generation)return;
      this.merge([event.new]);this.status='';this.paint();
    }).subscribe(status=>{if(status==='SUBSCRIBED')this.syncHistory(id,generation).catch(()=>{});});
    this.historyTimer=setInterval(()=>{
      if(this.open&&!document.hidden)this.syncHistory(id,generation).catch(()=>{});
    },5000);
    try{await this.syncHistory(id,generation);}
    catch(error){if(this.generation===generation){this.status=this.chatError(error);this.paint();}}
  }
  async syncHistory(id,generation){
    if(this.generation!==generation||this.historyPending===generation)return;
    this.historyPending=generation;
    try{
      const client=this.studio.account.client;
      const [history,access]=await Promise.all([
        client.from('sl_chat_messages').select('*').eq('document_id',id).order('created_at',{ascending:false}).limit(100),
        this.studio.groups.live?.row.id===id?null:client.rpc('sl_document_role',{p_document_id:id})
      ]);
      if(this.generation!==generation)return;
      if(history.error)throw history.error;
      if(access&&!access.error)this.role=access.data;
      this.merge(history.data||[]);
      if(!this.status||this.status==='Conectando conversa…'||this.status==='Envie a primeira mensagem.'||this.status==='Você pode acompanhar esta conversa.'||this.historyError){
        this.status=this.messages.length?'':this.canComment?'Envie a primeira mensagem.':'Você pode acompanhar esta conversa.';
      }
      this.historyError=false;
      this.paint();
    }catch(error){
      if(this.generation===generation){this.historyError=true;this.status=this.chatError(error);this.paint();}
    }finally{if(this.historyPending===generation)this.historyPending=null;}
  }
  chatError(error){
    if(['PGRST202','PGRST205','42P01'].includes(error.code))return 'O chat desta aula precisa da atualização do SQL no Supabase.';
    if(error.code==='42501')return 'Sua conta não tem permissão para esta ação. Confira sua função nesta aula.';
    return 'Falha na conexão do chat. A mensagem digitada fica disponível para tentar novamente.';
  }
  merge(rows){const messages=new Map(this.messages.map(m=>[m.id,m]));for(const m of rows)if(m&&m.document_id===this.documentId&&typeof m.body==='string')messages.set(m.id,m);this.messages=[...messages.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)).slice(-100);}
  async send(){
    if(this.sending||!this.documentId||!this.draft.trim())return;
    const generation=this.generation,body=this.draft.trim(),slide=this.studio.root.querySelector('#chat-reference')?.checked&&this.studio.groups.live?.row.id===this.documentId?this.studio.draft.slides[this.studio.index]?.id||null:null;
    if(!this.canComment){this.status='Sua permissão permite apenas visualizar.';this.paint();return;}this.typing.send(false);
    this.sending=true;this.status='';this.paint();
    try{const {data,error}=await this.studio.account.client.rpc('sl_send_chat_message',{p_document_id:this.documentId,p_body:body,p_slide_id:slide});if(generation!==this.generation)return;if(error)throw error;this.merge(Array.isArray(data)?data:[data]);if(this.draft.trim()===body)this.draft='';this.status='';}
    catch(error){if(generation===this.generation)this.status=this.chatError(error);}
    finally{if(generation===this.generation){this.sending=false;this.paint();}}
  }
}
