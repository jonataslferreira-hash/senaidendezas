// Diálogo em elemento separado para não desaparecer enquanto o professor muda o slide.
export class RoomClassroomIdentity {
 constructor({getAccount,getClassroom,openAccount}){this.getAccount=getAccount;this.getClassroom=getClassroom;this.openAccount=openAccount;this.dialog=null;}
 open(){
  if(this.dialog?.open)return;
  const dialog=document.createElement('dialog');dialog.className='room-classroom-dialog';dialog.setAttribute('aria-labelledby','room-classroom-title');document.body.append(dialog);this.dialog=dialog;
  dialog.addEventListener('close',()=>{dialog.remove();if(this.dialog===dialog)this.dialog=null;});
  dialog.addEventListener('click',e=>{const action=e.target.closest('[data-room-id-action]')?.dataset.roomIdAction;if(!action)return;
   if(action==='close')dialog.close();
   else if(action==='account'){dialog.close();this.openAccount();}
   else if(action==='identify'){
    const account=this.getAccount(),classroom=this.getClassroom();
    if(!account.user||!account.googleConnected()||!classroom)return;
    try{this.error='';classroom.enableIdentity(account.client,account.user.id);}catch(error){this.error=error.message;}this.paint();
   } else if(action==='clear'){this.getClassroom()?.clearIdentity();this.paint();}
  });
  this.error='';this.paint();dialog.showModal();
 }
 close(){this.dialog?.close();}
 paint(){const d=this.dialog;if(!d?.isConnected)return;const account=this.getAccount(),room=this.getClassroom();
  let body;if(!account.user)body=`<p>Para identificar sua nota no Classroom, <strong>crie uma conta ou entre</strong> e conecte seu Google. Depois, volte aqui para confirmar a identificação.</p><p>Se preferir continuar como convidado, o professor poderá identificar você manualmente.</p><button type="button" class="room-id-primary" data-room-id-action="account">Criar conta ou entrar</button>`;
  else if(!account.googleConnected())body=`<p>Conecte seu Google à sua conta e volte aqui para confirmar sua identificação. Seu nome e avatar da sala não serão alterados.</p><button type="button" class="room-id-primary" data-room-id-action="account">Conectar Google à conta</button>`;
  else if(room?.identityVerified)body=`<p class="room-id-success">Identidade Google confirmada para o professor nesta sala.</p><p>O professor ainda precisa conferir e confirmar a nota no Classroom.</p><button type="button" class="room-id-secondary" data-room-id-action="clear">Parar de compartilhar identificação</button>`;
  else if(room?.identityPending)body=`<p role="status">Confirmando sua identificação com segurança…</p>`;
  else body=`<p>Compartilhe seu identificador Google com o professor para ajudar a localizar sua entrega no Classroom. Seu nome e avatar da sala não mudam.</p><p>A nota só será enviada após revisão e confirmação do professor.</p><button type="button" class="room-id-primary" data-room-id-action="identify">Confirmar identificação</button><p class="room-id-note">Opcional: sem identificação, o professor poderá associar sua nota manualmente.</p>`;
  d.innerHTML=`<div class="room-id-head"><div><span>NA SUA SALA</span><h2 id="room-classroom-title">Identificar para o Classroom</h2></div><button type="button" aria-label="Fechar identificação" data-room-id-action="close">×</button></div>${body}${this.error?`<p role="alert">${String(this.error).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</p>`:''}`;
 }
}
