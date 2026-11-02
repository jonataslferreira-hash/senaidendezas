import { ChatTyping } from './chat-typing.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class LessonChat {
  constructor(studio){
    this.studio=studio;this.open=false;this.messages=[];this.documentId='';this.draft='';this.status='';this.generation=0;this.typing=new ChatTyping(studio,()=>this.paintTyping());
    studio.root.addEventListener('click',e=>{const button=e.target.closest('[data-chat-action]');if(!button)return;this.action(button).catch(error=>{this.status=error.message;this.paint();});});
    studio.root.addEventListener('input',e=>{if(e.target.id==='chat-message'){this.draft=e.target.value;this.typing.send(Boolean(this.draft.trim()));}});
    studio.root.addEventListener('change',e=>{if(e.target.id==='chat-document')this.select(e.target.value);if(e.target.id==='chat-reference')this.reference=e.target.checked;});
    studio.root.addEventListener('submit',e=>{if(e.target.id==='chat-form'){e.preventDefault();this.send();}});
    studio.root.addEventListener('account-changed',()=>{this.typing.close();this.generation++;this.channel?.unsubscribe();this.channel=null;this.sending=false;this.open=false;this.messages=[];this.documentId='';this.draft='';this.paint();});
  }
  markup(){if(!this.open)return '';return `<aside class="lesson-chat" aria-label="Chat da aula"><header><div><span>CONVERSAS DA EQUIPE</span><h2>${this.studio.people.avatar(this.studio.account.user?.id,this.studio.account.user?.user_metadata?.display_name||'Você')} ${esc(this.studio.account.user?.user_metadata?.display_name||'Chat')}</h2></div><button type="button" data-chat-action="close" aria-label="Fechar chat">×</button></header><label for="chat-document">Aula compartilhada</label><select id="chat-document"><option value="">Escolha uma aula</option>${this.studio.groups.documents.map(d=>`<option value="${esc(d.id)}" ${d.id===this.documentId?'selected':''}>${esc(d.title)}</option>`).join('')}</select>${!this.studio.groups.documents.length?'<p>Compartilhe uma aula pelo botão Colaborar para conversar com a equipe.</p>':''}<div class="chat-messages" role="log" aria-label="Mensagens da aula">${this.messages.map(m=>`<article class="chat-message ${m.author_id===this.studio.account.user?.id?'mine':''}" ${this.studio.people.bubble(m.author_id)}>${m.author_id===this.studio.account.user?.id?'':this.studio.people.avatar(m.author_id,m.author_name||'Colaborador')}<div><header><strong>${m.author_id===this.studio.account.user?.id?'Você':esc(m.author_name||'Colaborador')}</strong><time>${esc(new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</time></header><p>${esc(m.body)}</p>${m.slide_id?`<button type="button" data-chat-action="slide" data-slide="${esc(m.slide_id)}">Ver slide citado ↗</button>`:''}</div></article>`).join('')}</div><p class="chat-typing" data-lesson-typing></p><p role="status" class="chat-status">${esc(this.status)}</p><form id="chat-form"><label for="chat-message">Mensagem</label><textarea id="chat-message" maxlength="2000" rows="3" placeholder="Converse sobre a aula…" ${!this.documentId||this.sending||(this.studio.groups.live?.row.id===this.documentId&&!this.studio.groups.canComment)?'disabled':''}>${esc(this.draft)}</textarea><label class="chat-reference"><input type="checkbox" id="chat-reference" ${(this.reference??(this.studio.groups.live?.row.id===this.documentId))?'checked':''}> Citar o slide atual</label><button class="studio-btn accent" ${!this.documentId||this.sending||(this.studio.groups.live?.row.id===this.documentId&&!this.studio.groups.canComment)?'disabled':''}>${this.sending?'Enviando…':'Enviar mensagem'}</button></form></aside>`;}
  paintTyping(){const node=this.studio.root.querySelector('[data-lesson-typing]');if(node)node.textContent=this.typing.names.length?this.typing.names.join(', ')+' está digitando…':'';}
  paint(){const slot=this.studio.root.querySelector('[data-chat-slot]');if(!slot)return;const focused=document.activeElement?.id==='chat-message',start=focused?document.activeElement.selectionStart:0,end=focused?document.activeElement.selectionEnd:0;slot.innerHTML=this.markup();if(focused){const input=slot.querySelector('#chat-message');input?.focus();input?.setSelectionRange(start,end);}const log=slot.querySelector('.chat-messages');if(log)log.scrollTop=log.scrollHeight;this.paintTyping();if(this.open)for(const m of this.messages)this.studio.people.load(m.author_id);}
  async action(button){
    if(button.dataset.chatAction==='close'){this.typing.send(false);this.typing.close();this.open=false;this.paint();return;}
    if(button.dataset.chatAction==='open'){
      if(!this.studio.account.user){this.studio.account.show('login');return;}
      this.open=true;this.status='Carregando aulas…';this.paint();await this.studio.groups.refresh();this.status=this.studio.groups.message||'';this.paint();const localEditor=this.studio.view==='editor'&&!this.studio.groups.live;const id=this.studio.groups.live?.row.id||(localEditor?'':this.documentId||this.studio.groups.documents[0]?.id);if(id)await this.select(id);else if(localEditor){this.documentId='';this.messages=[];this.status='Esta conversa será da aula '+this.studio.draft.title+'. Adicione colaboradores para começar.';this.paint();}return;
    }
    if(button.dataset.chatAction==='slide'){
      if(this.studio.groups.live?.row.id!==this.documentId)await this.studio.groups.open(this.documentId);
      const index=this.studio.draft.slides.findIndex(s=>s.id===button.dataset.slide);if(index<0){this.status='O slide citado foi removido.';this.paint();return;}
      this.studio.index=index;this.studio.callbacks.render();
    }
  }
  async select(id){
    const generation=++this.generation;this.channel?.unsubscribe();this.channel=null;this.documentId=id;this.reference=null;this.messages=[];this.draft='';this.status=id?'Conectando conversa…':'';this.paint();if(!id){this.typing.close();return;}this.typing.connect('doc',id);
    const client=this.studio.account.client;
    try{
      this.channel=client.channel('sl-chat:'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'sl_chat_messages',filter:'document_id=eq.'+id},event=>{if(this.generation!==generation)return;this.merge([event.new]);this.paint();}).subscribe(status=>{if(status==='SUBSCRIBED')this.syncHistory(id,generation).catch(()=>{});if(this.generation===generation&&['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){this.status='A conexão ao vivo foi interrompida. Reabra o chat para reconectar.';this.paint();}});
      const {data,error}=await client.from('sl_chat_messages').select('*').eq('document_id',id).order('created_at',{ascending:false}).limit(100);if(this.generation!==generation)return;if(error)throw error;
      this.merge(data||[]);this.status=this.messages.length?'':'Envie a primeira mensagem.';this.paint();
    }catch{if(this.generation!==generation)return;this.status='Para ativar o chat, execute supabase/chat.sql no SQL Editor do Supabase. Confira também sua conexão e o acesso à aula.';this.paint();}
  }
  async syncHistory(id,generation){const {data,error}=await this.studio.account.client.from('sl_chat_messages').select('*').eq('document_id',id).order('created_at',{ascending:false}).limit(100);if(this.generation!==generation||error)return;this.merge(data||[]);this.paint();}
  merge(rows){const messages=new Map(this.messages.map(m=>[m.id,m]));for(const m of rows)if(m&&m.document_id===this.documentId&&typeof m.body==='string')messages.set(m.id,m);this.messages=[...messages.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)).slice(-100);}
  async send(){
    if(this.sending||!this.documentId||!this.draft.trim())return;
    const generation=this.generation,body=this.draft.trim(),slide=this.studio.root.querySelector('#chat-reference')?.checked&&this.studio.groups.live?.row.id===this.documentId?this.studio.draft.slides[this.studio.index].id:null;
    if(this.studio.groups.live?.row.id===this.documentId&&!this.studio.groups.canComment){this.status='Sua permissão permite apenas visualizar.';this.paint();return;}this.typing.send(false);
    this.sending=true;this.status='';this.paint();
    try{const {data,error}=await this.studio.account.client.rpc('sl_send_chat_message',{p_document_id:this.documentId,p_body:body,p_slide_id:slide});if(generation!==this.generation)return;if(error)throw error;this.merge(Array.isArray(data)?data:[data]);this.draft='';this.status='';}
    catch{if(generation===this.generation)this.status='A mensagem não foi enviada. Confira a conexão e se o SQL do chat foi ativado.';}
    finally{this.sending=false;if(generation===this.generation)this.paint();}
  }
}
