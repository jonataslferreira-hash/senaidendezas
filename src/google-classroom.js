// Token temporário guardado apenas na sessão desta aba; nunca enviado ao servidor Storage Lab.
const API='https://classroom.googleapis.com/v1';
export const DRIVE_FILE_SCOPE='https://www.googleapis.com/auth/drive.file';
export const CLASSROOM_SCOPES=['https://www.googleapis.com/auth/classroom.courses.readonly','https://www.googleapis.com/auth/classroom.coursework.students','https://www.googleapis.com/auth/classroom.rosters.readonly'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=v=>encodeURIComponent(String(v));
export function classroomShareUrl(link){
 const url=new URL(link);if(!['https:','http:'].includes(url.protocol))throw Error('Link de apresentação inválido.');
 const share=new URL('https://classroom.google.com/share');share.searchParams.set('url',url.href);return share.href;
}
export function quizGrade(correct,total,max=100){
 if(!Number.isInteger(correct)||!Number.isInteger(total)||total<1||correct<0||correct>total||!Number.isFinite(max)||max<=0)throw Error('Resultado ou pontuação máxima inválida.');
 return Math.round(correct/total*max*100)/100;
}
export class ClassroomApi {
 constructor(token,fetcher=fetch){this.token=token;this.fetcher=fetcher;}
 async request(path,options={}){
  let res;const fetcher=this.fetcher;try{res=await fetcher(API+path,{...options,headers:{Authorization:'Bearer '+this.token,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},signal:AbortSignal.timeout(20000)});}catch{throw Error('Não foi possível acessar o Google Classroom. Confira sua conexão.');}
  if(!res.ok){const detail=await res.json().catch(()=>({}));const msg=detail?.error?.message||'';
   if(res.status===401){const error=Error('A autorização do Google expirou. Conecte novamente.');error.code='authorization_expired';throw error;}
   if(res.status===403)throw Error('O Google não permitiu esta ação. Confira a conta, as permissões e as regras da escola. '+msg);
   if(res.status===404)throw Error('Turma ou atividade não encontrada no Classroom.');
   throw Error('O Classroom não concluiu a operação'+(msg?': '+msg:'.'));
  }
  return res.status===204?{}:res.json();
 }
 async all(path,key,params={}){let all=[],token='';do{const q=new URLSearchParams({...params,pageSize:'100'});if(token)q.set('pageToken',token);const data=await this.request(path+'?'+q);all.push(...(data[key]||[]));token=data.nextPageToken||'';if(all.length>3000)throw Error('Esta turma é grande demais para carregar de uma vez.');}while(token);return all;}
 courses(){return this.all('/courses','courses',{teacherId:'me',courseStates:'ACTIVE'});}
 async activities(course){const list=await this.all('/courses/'+id(course)+'/courseWork','courseWork',{courseWorkStates:'PUBLISHED',});const drafts=await this.all('/courses/'+id(course)+'/courseWork','courseWork',{courseWorkStates:'DRAFT'});return [...list,...drafts].filter((a,i,arr)=>a.associatedWithDeveloper===true&&a.workType==='ASSIGNMENT'&&arr.findIndex(x=>x.id===a.id)===i);}
 students(course){return this.all('/courses/'+id(course)+'/students','students');}
 submissions(course,activity){return this.all('/courses/'+id(course)+'/courseWork/'+id(activity)+'/studentSubmissions','studentSubmissions');}
 create(course,{title,description,link,fileId,maxPoints=100,scheduledTime}){const materials=fileId?[{driveFile:{driveFile:{id:fileId},shareMode:'VIEW'}},...(link?[{link:{url:link}}]:[])]:[{link:{url:link}}];return this.request('/courses/'+id(course)+'/courseWork',{method:'POST',body:JSON.stringify({title,description,materials,workType:'ASSIGNMENT',state:scheduledTime?'DRAFT':'PUBLISHED',maxPoints,...(scheduledTime?{scheduledTime}:{})})});}
 update(course,activity,values){return this.request('/courses/'+id(course)+'/courseWork/'+id(activity)+'?updateMask='+encodeURIComponent(Object.keys(values).join(',')),{method:'PATCH',body:JSON.stringify(values)});}
 delete(course,activity){return this.request('/courses/'+id(course)+'/courseWork/'+id(activity),{method:'DELETE'});}
 async uploadFile({blob,name}){
  if(!(blob instanceof Blob)||!blob.size)throw Error('Não foi possível montar o arquivo.');
  const boundary='storage-lab-'+crypto.randomUUID();
  const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify({name,mimeType:blob.type}),'\r\n--'+boundary+'\r\nContent-Type: '+blob.type+'\r\n\r\n',blob,'\r\n--'+boundary+'--\r\n']);
  let response;const fetcher=this.fetcher;try{response=await fetcher('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'multipart/related; boundary='+boundary},body,signal:AbortSignal.timeout(120000)});}catch{throw Error('Não foi possível enviar o arquivo ao Google Drive. Confira sua conexão e o Drive antes de tentar novamente.');}
  if(!response.ok){const error=await response.json().catch(()=>({}));throw Error('O Google Drive não aceitou o arquivo. Confira as permissões e a configuração do projeto. '+(error.error?.message||''));}
  const file=await response.json();if(typeof file.id!=='string'||!file.id)throw Error('O Drive não confirmou o arquivo. Confira seu Drive antes de tentar novamente.');return file;
 }
 grade(course,activity,submission,grade){return this.request('/courses/'+id(course)+'/courseWork/'+id(activity)+'/studentSubmissions/'+id(submission)+'?updateMask=draftGrade',{method:'PATCH',body:JSON.stringify({draftGrade:grade})});}
}
let scriptPromise;
function loadGoogle(){
 if(globalThis.google?.accounts?.oauth2)return Promise.resolve();
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>globalThis.google?.accounts?.oauth2?resolve():reject(Error('Não foi possível iniciar a autorização do Google.'));s.onerror=()=>reject(Error('Não foi possível carregar o Google. Confira a conexão.'));document.head.append(s);}).catch(e=>{scriptPromise=null;throw e;});
 return scriptPromise;
}
function validClientId(value){return /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value);}
function savedClient(){try{return localStorage.getItem('sl-classroom-client-id')||'';}catch{return '';}}
// ID OAuth é público; segredos do cliente nunca entram no navegador.
const DEFAULT_CLIENT_ID='865628950020-b2mff73uuh3b594ag7sgsqsp06j92epj.apps.googleusercontent.com';
const configuredClient=()=>String(import.meta.env?.VITE_GOOGLE_CLASSROOM_CLIENT_ID||savedClient()||DEFAULT_CLIENT_ID).trim();

export class GoogleClassroomDialog {
 constructor(){this.dialog=null;this.token='';this.expires=0;this.granted=[];this.owner='';try{const saved=JSON.parse(sessionStorage.getItem('sl-classroom-session')||'null');if(saved?.client===configuredClient()&&typeof saved.token==='string'&&saved.expires>Date.now()+10000&&Array.isArray(saved.granted)){this.token=saved.token;this.expires=saved.expires;this.granted=saved.granted;this.owner=saved.owner||'';}}catch{}this.ready=false;this.loadingGoogle=false;this.reset();}
 saveAuthorization(){try{sessionStorage.setItem('sl-classroom-session',JSON.stringify({client:configuredClient(),owner:this.owner,token:this.token,expires:this.expires,granted:this.granted}));}catch{}}
 setOwner(uid){uid=uid||'';if(this.owner!==uid&&this.token)this.clearAuthorization();this.owner=uid;}
 reset(){this.context={};this.courses=[];this.course='';this.activities=[];this.activity='';this.students=[];this.submissions=[];this.error='';this.message='';this.busy=false;this.mode='';this.manageId='';this.outcomes=[];this.uploadedFile=null;this.published=false;}
 open(context){
  if(this.busy&&this.dialog?.open)return;
  if(this.dialog?.open)this.dialog.close();this.dialog?.remove();this.reset();this.context=context;
  const dialog=document.createElement('dialog');dialog.className='gclass-dialog';dialog.setAttribute('aria-labelledby','gclass-title');document.body.append(dialog);this.dialog=dialog;
  dialog.addEventListener('click',e=>{const button=e.target.closest('[data-gclass]');if(button&&!button.disabled)this.click(button.dataset.gclass);});
  dialog.addEventListener('input',e=>{const t=e.target;if(t.matches('[data-gclass-title]'))this.context.title=t.value;if(t.matches('[data-gclass-description]'))this.context.description=t.value;if(t.matches('[data-gclass-points]'))this.context.points=t.value;if(t.matches('[data-gclass-schedule]'))this.context.schedule=t.value;});dialog.addEventListener('change',e=>this.change(e));dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});dialog.addEventListener('close',()=>{dialog.remove();if(this.dialog===dialog)this.dialog=null;});
  this.paint();dialog.showModal();
  if(this.connected)this.loadCourses();
  this.loadingGoogle=true;loadGoogle().then(()=>{this.ready=true;this.loadingGoogle=false;this.paint();}).catch(()=>{this.ready=false;this.loadingGoogle=false;this.paint();});
 }
 close(){if(!this.busy)this.dialog?.close();}
 clearAuthorization(){try{sessionStorage.removeItem('sl-classroom-session');}catch{}this.token='';this.expires=0;this.granted=[];this.uploadedFile=null;if(!this.busy){this.courses=[];this.course='';this.activities=[];this.activity='';this.students=[];this.submissions=[];this.message='Conexão Google removida desta página.';this.paint();}}
 get scopes(){return this.context.file?[CLASSROOM_SCOPES[0],CLASSROOM_SCOPES[1],DRIVE_FILE_SCOPE]:CLASSROOM_SCOPES;}
 get connected(){return Boolean(this.token&&Date.now()<this.expires-10000&&this.scopes.every(scope=>this.granted.includes(scope)));}
 paint(){
  const d=this.dialog;if(!d?.isConnected)return;
  const link=this.context.link,quiz=this.context.quiz,file=this.context.file,client=configuredClient();
  const courses=this.courses.map(c=>`<option value="${esc(c.id)}" ${c.id===this.course?'selected':''}>${esc(c.name)}${c.section?' · '+esc(c.section):''}</option>`).join('');
  const activities=this.activities.filter(a=>Number(a.maxPoints)>0).map(a=>`<option value="${esc(a.id)}" ${a.id===this.activity?'selected':''}>${esc(a.title)} · ${esc(a.maxPoints)} pontos</option>`).join('');
  let body='';
  if(!this.connected){body=`<div class="gclass-intro"><p>Conecte sua conta Google para acessar suas turmas, criar atividades e preparar notas.</p><p>${file?'O Google solicitará acesso às turmas, às atividades e aos arquivos criados pelo Storage Lab no Drive.':'O Google solicitará acesso às suas turmas, atividades e alunos.'} A autorização é temporária e fica apenas nesta aba até expirar ou desconectar.</p>${client?'':`<label>ID do cliente OAuth do Google<input data-gclass-client autocomplete="off" placeholder="…apps.googleusercontent.com"></label><small>É necessário configurar um projeto Google Cloud com a API Classroom e a origem deste site. O ID é público; não use uma senha ou segredo aqui.</small>`}<button type="button" class="gclass-primary" data-gclass="connect" ${this.busy||this.loadingGoogle?'disabled':''}>${this.loadingGoogle?'Carregando Google…':'Conectar Google'}</button>${!this.ready&&!this.loadingGoogle?'<p role="status">Não foi possível carregar o Google. Tente conectar novamente.</p>':''}</div>`;}
  else {body=`<div class="gclass-connected"><div class="gclass-account"><span>● Conta Google autorizada</span><button type="button" data-gclass="disconnect" ${this.busy?'disabled':''}>Desconectar</button></div><label>Turma<select data-gclass-course ${this.busy?'disabled':''}><option value="">Escolha uma turma</option>${courses}</select></label>${!this.courses.length&&!this.busy?'<p>Nenhuma turma ativa encontrada para esta conta.</p>':''}
   ${this.course&&(link||file)?`<div class="gclass-create"><h3>Criar atividade</h3><label>Título<input data-gclass-title ${this.busy?'disabled':''} maxlength="300" value="${esc(this.context.title||'Atividade Storage Lab')}"></label><label>Orientações<textarea data-gclass-description ${this.busy?'disabled':''} maxlength="3000" rows="2" placeholder="Opcional">${esc(this.context.description||'')}</textarea></label><label>Pontos<input type="number" min="0" max="100000" step="1" value="${esc(this.context.points??100)}" data-gclass-points ${this.busy?'disabled':''}></label><label>Agendar publicação (opcional)<input type="datetime-local" value="${esc(this.context.schedule||'')}" data-gclass-schedule ${this.busy?'disabled':''}></label><p>${file?`O ${esc(file.format.toUpperCase())} será criado no seu Drive e anexado à atividade. Confira a turma antes de publicar.${link?' O link criado anteriormente também será anexado; ele contém a versão da aula no momento em que foi criado.':''}`:'A atividade incluirá o link da apresentação.'}</p><button type="button" class="gclass-primary" data-gclass="create" ${this.busy||this.published?'disabled':''}>${file?'Enviar arquivo e publicar atividade':'Publicar atividade'}</button></div>`:''}
   ${this.course?this.manageMarkup():''}${this.course&&quiz?`<div class="gclass-grades"><h3>Preparar notas do quiz</h3><p>Selecione uma atividade criada por este aplicativo no mesmo projeto Google. Confira cada aluno: quem autorizou a identificação Google pode aparecer pré-selecionado; apelidos não confirmam identidade.</p><label>Atividade<select data-gclass-activity ${this.busy?'disabled':''}><option value="">Escolha uma atividade</option>${activities}</select></label>${!this.activities.length&&!this.busy?'<p>Nenhuma atividade compatível encontrada nesta turma.</p>':''}${this.activity&&this.submissions.length?this.mappingMarkup():this.activity&&!this.busy?'<p>Não há entregas disponíveis nesta atividade.</p>':''}</div>`:''}</div>`;}
  d.innerHTML=`<div class="gclass-head"><div><h2 id="gclass-title">Google Classroom</h2></div><button type="button" data-gclass="close" aria-label="Fechar" ${this.busy?'disabled':''}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>${link&&!file?`<div class="gclass-share"><div><strong>Compartilhar apresentação</strong><small>Escolha a turma no próprio Google Classroom.</small></div><a href="${esc(classroomShareUrl(link))}" target="_blank" rel="noopener noreferrer">Compartilhar ↗</a></div>`:''}${body}${this.busy?'<p role="status">Aguarde…</p>':''}${this.error?`<p class="gclass-error" role="alert">${esc(this.error)}</p>`:''}${this.message?`<p class="gclass-message" role="status">${esc(this.message)}</p>`:''}${this.outcomes.length?`<ul class="gclass-outcomes">${this.outcomes.map(o=>`<li>${esc(o)}</li>`).join('')}</ul>`:''}`;
 }
 manageMarkup(){
  const selected=this.activities.find(a=>a.id===this.manageId);
  const opts=this.activities.map(a=>`<option value="${esc(a.id)}" ${a.id===this.manageId?'selected':''}>${esc(a.title)} · ${a.state==='DRAFT'?'Rascunho':'Publicada'}</option>`).join('');
  const local=selected?.scheduledTime?new Date(new Date(selected.scheduledTime).getTime()-new Date(selected.scheduledTime).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  return `<section class="gclass-manage"><h3>Gerenciar atividades</h3><p>Atividades criadas por este aplicativo neste projeto Google.</p><label>Atividade<select data-gclass-manage><option value="">Escolha uma atividade</option>${opts}</select></label>${selected?`<label>Título<input data-gclass-edit-title value="${esc(selected.title)}"></label><label>Descrição<textarea data-gclass-edit-description>${esc(selected.description||'')}</textarea></label><label>Pontos<input type="number" min="0" max="100000" step="1" data-gclass-edit-points value="${esc(selected.maxPoints??0)}"></label>${selected.state==='DRAFT'?`<label>Agendar publicação (opcional)<input type="datetime-local" data-gclass-edit-schedule value="${esc(local)}"></label>`:''}<div class="gclass-manage-actions"><button type="button" class="gclass-primary" data-gclass="update" ${this.busy?'disabled':''}>Salvar alterações</button><button type="button" class="gclass-delete" data-gclass="delete" ${this.busy?'disabled':''}>Excluir atividade</button></div>`:''}</section>`;
 }
 mappingMarkup(){
  const quiz=this.context.quiz,activity=this.activities.find(a=>a.id===this.activity);if(!quiz||!activity)return '';
  const optionFor=(player)=>this.students.map(s=>{const submission=this.submissions.find(x=>x.userId===s.userId);if(!submission)return '';const label=(s.profile?.name?.fullName||'Aluno')+' · '+(s.profile?.emailAddress||s.userId);const existing=submission.draftGrade!=null||submission.assignedGrade!=null?' · já tem nota':'';const matched=player.googleUserId===s.userId&&quiz.players.filter(p=>p.googleUserId&&p.googleUserId===s.userId).length===1;return `<option value="${esc(submission.id)}" ${matched?'selected':''}>${esc(label+existing)}</option>`;}).join('');
  return `<p>Notas calculadas por acertos, de 0 a ${esc(activity.maxPoints)}. Serão salvas como rascunho; o professor revisa e devolve no Classroom. Notas anteriores podem ser substituídas.</p><div class="gclass-mapping">${quiz.players.map((p,i)=>`<label><span><strong>${esc(p.name)}</strong><small>${p.correct}/${quiz.total} acertos · ${quizGrade(p.correct,quiz.total,Number(activity.maxPoints))} pontos${p.googleUserId?' · Google confirmado':''}</small></span><select data-gclass-map="${i}"><option value="">Não enviar</option>${optionFor(p)}</select></label>`).join('')}</div><button type="button" class="gclass-primary" data-gclass="review" ${this.busy?'disabled':''}>Revisar notas</button>`;
 }
 async click(action){
  if(action==='close'){this.close();return;}
  if(action==='disconnect'){this.clearAuthorization();return;}
  if(action==='connect'){
   let client=configuredClient()||this.dialog.querySelector('[data-gclass-client]')?.value.trim();
   if(!validClientId(client||'')){this.error='Informe um ID de cliente OAuth válido do Google.';return this.paint();}
   try{localStorage.setItem('sl-classroom-client-id',client);}catch{}
   if(!this.ready){this.error='Carregando o Google. Tente novamente em instantes.';this.loadingGoogle=true;this.paint();try{await loadGoogle();this.ready=true;this.error='';}catch(e){this.error=e.message;}finally{this.loadingGoogle=false;this.paint();}return;}
   this.error='';this.message='';const activeDialog=this.dialog,scopes=this.scopes;
   try{
    const auth=google.accounts.oauth2.initTokenClient({client_id:client,scope:scopes.join(' '),callback:response=>{if(this.dialog!==activeDialog||!activeDialog.open)return;if(response.error||!response.access_token){this.error='Autorização do Google não concluída.';this.paint();return;}if(!google.accounts.oauth2.hasGrantedAllScopes(response,...scopes)){this.error=this.context.file?'Para enviar o arquivo, conceda as permissões de turmas, atividades e Drive.':'Para usar turmas e notas, conceda as permissões solicitadas.';this.paint();return;}this.token=response.access_token;this.granted=scopes;this.uploadedFile=null;this.expires=Date.now()+Number(response.expires_in||0)*1000;this.saveAuthorization();this.loadCourses();},error_callback:()=>{if(this.dialog!==activeDialog||!activeDialog.open)return;this.error='A janela do Google foi fechada ou bloqueada. Tente novamente.';this.paint();}});
    auth.requestAccessToken({prompt:'select_account'});
   }catch(e){this.error=e.message||'Não foi possível abrir a autorização do Google.';this.paint();}return;
  }
  if(action==='create'){
   const title=this.dialog.querySelector('[data-gclass-title]')?.value.trim(),description=this.dialog.querySelector('[data-gclass-description]')?.value.trim()||'';
   if(!title){this.error='Dê um título à atividade.';return this.paint();}
   const course=this.courses.find(c=>c.id===this.course);
   const maxPoints=Number(this.dialog.querySelector('[data-gclass-points]')?.value),schedule=this.dialog.querySelector('[data-gclass-schedule]')?.value;
   if(!Number.isInteger(maxPoints)||maxPoints<0||maxPoints>100000){this.error='Informe pontos entre 0 e 100000.';return this.paint();}const scheduledTime=schedule?new Date(schedule).toISOString():undefined;if(scheduledTime&&Date.parse(scheduledTime)<=Date.now()){this.error='Escolha um horário de publicação futuro.';return this.paint();}
   const file=this.context.file;this.context.title=title;this.context.description=description;
   if(!confirm(`${scheduledTime?'Agendar':'Publicar'} “${title}” na turma “${course?.name||this.course}”? ${file?'O arquivo será criado no Google Drive e compartilhado com a turma.':'O link da apresentação ficará disponível para a turma.'}`))return;
   await this.run(async api=>{
    let fileId;
    if(file){if(!this.uploadedFile){const generated=await file.generate();this.uploadedFile=await api.uploadFile(generated);}fileId=this.uploadedFile.id;}
    let result;try{result=await api.create(this.course,{title,description,link:this.context.link,fileId,maxPoints,scheduledTime});}catch(error){if(fileId)throw Error(error.message+' O arquivo já está no Drive; confira o Classroom antes de tentar novamente, pois a publicação pode ter ocorrido.');throw error;}
    this.published=true;try{this.activities=await api.activities(this.course);}catch{/* criação já concluída; lista pode ser atualizada ao reabrir */}this.message=(scheduledTime?'Atividade agendada no Classroom':'Atividade publicada no Classroom')+(file?' com o arquivo anexado.':'.');if(result.alternateLink)this.message+=' Abra o Classroom para conferir.';
   });return;
  }
  if(action==='update'||action==='delete'){
   const current=this.activities.find(a=>a.id===this.manageId);if(!current)return;
   if(action==='delete'){if(!confirm(`Excluir a atividade “${current.title}” no Classroom? Esta ação não pode ser desfeita.`))return;await this.run(async api=>{await api.delete(this.course,current.id);this.activities=this.activities.filter(a=>a.id!==current.id);this.manageId='';this.message='Atividade excluída no Classroom.';});return;}
   const title=this.dialog.querySelector('[data-gclass-edit-title]').value.trim(),description=this.dialog.querySelector('[data-gclass-edit-description]').value.trim(),points=Number(this.dialog.querySelector('[data-gclass-edit-points]').value),schedule=this.dialog.querySelector('[data-gclass-edit-schedule]')?.value;
   if(!title||!Number.isInteger(points)||points<0||points>100000){this.error='Informe um título e pontos entre 0 e 100000.';return this.paint();}
   const values={title,description,maxPoints:points};if(current.state==='DRAFT'){if(schedule&&Date.parse(schedule)<=Date.now()){this.error='Escolha um horário futuro.';return this.paint();}values.scheduledTime=schedule?new Date(schedule).toISOString():null;}
   if(!confirm(`Salvar alterações de “${current.title}” no Classroom?`))return;await this.run(async api=>{const updated=await api.update(this.course,current.id,values);Object.assign(current,updated,values);this.message='Atividade atualizada no Classroom.';});return;
  }
  if(action==='review'){
   const a=this.activities.find(x=>x.id===this.activity), selections=[...this.dialog.querySelectorAll('[data-gclass-map]')].filter(x=>x.value).map(x=>({player:this.context.quiz.players[Number(x.dataset.gclassMap)],submission:this.submissions.find(s=>s.id===x.value)}));
   if(!selections.length){this.error='Escolha pelo menos um aluno para revisar as notas.';return this.paint();}
   if(new Set(selections.map(x=>x.submission?.id)).size!==selections.length||selections.some(x=>!x.player||!x.submission)){this.error='Cada aluno do Classroom pode ser escolhido apenas uma vez.';return this.paint();}
   const rows=selections.map(({player,submission})=>{const student=this.students.find(s=>s.userId===submission.userId);return {...submission,name:(student?.profile?.name?.fullName||'Aluno')+' · '+(student?.profile?.emailAddress||student?.userId),player:player.name,grade:quizGrade(player.correct,this.context.quiz.total,Number(a.maxPoints))};});
   const summary=rows.map(r=>`${r.player} → ${r.name}: ${r.grade}/${a.maxPoints}${r.draftGrade!=null||r.assignedGrade!=null?' (já possui nota)':''}`).join('\n');
   const course=this.courses.find(c=>c.id===this.course);
   if(!confirm(`Turma: ${course?.name||this.course}\nAtividade: ${a.title}\n\nConfira com atenção. Os rascunhos existentes serão substituídos. Nada será devolvido aos alunos automaticamente.\n\n${summary}\n\nSalvar estas notas como rascunho?`))return;
   const courseId=this.course,activity=this.activity,token=this.token;this.busy=true;this.error='';this.message='';this.outcomes=[];this.paint();const api=new ClassroomApi(this.token);
   for(const row of rows){try{if(this.token!==token||!this.connected)throw Error('Autorização encerrada. Conecte novamente.');await api.grade(courseId,activity,row.id,row.grade);this.outcomes.push(`${row.name}: rascunho ${row.grade} salvo.`);}catch(e){this.outcomes.push(`${row.name}: não enviado — ${e.message}`);}}
   this.busy=false;this.message='Confira o resultado de cada envio. As notas não foram devolvidas automaticamente.';this.paint();return;
  }
 }
 async run(fn){this.busy=true;this.error='';this.message='';this.outcomes=[];this.paint();try{if(!this.connected)throw Error('A autorização expirou. Conecte novamente.');await fn(new ClassroomApi(this.token));}catch(e){if(e.code==='authorization_expired')this.clearAuthorization();this.error=e.message;}finally{this.busy=false;this.paint();}}
 async loadCourses(){await this.run(async api=>{this.courses=await api.courses();});}
 async change(e){
  if(e.target.matches('[data-gclass-course]')){this.course=e.target.value;this.activity='';this.manageId='';this.activities=[];this.students=[];this.submissions=[];if(this.course)await this.run(async api=>{this.activities=await api.activities(this.course);});else this.paint();}
  if(e.target.matches('[data-gclass-manage]')){this.manageId=e.target.value;this.paint();}
  if(e.target.matches('[data-gclass-activity]')){this.activity=e.target.value;this.students=[];this.submissions=[];if(this.activity)await this.run(async api=>{[this.students,this.submissions]=await Promise.all([api.students(this.course),api.submissions(this.course,this.activity)]);});else this.paint();}
 }
}
export const googleClassroom=new GoogleClassroomDialog();
