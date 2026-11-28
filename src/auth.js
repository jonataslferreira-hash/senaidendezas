import {AccountVault} from './account-vault.js';
import {googleClassroom} from './google-classroom.js';
import { prefersReducedMotion } from './motion-preference.js';
import { appearancePicker } from './appearance.js';
import { cloudConfigured, disconnectCloud } from './cloud-files.js';
import { ProfileSettings } from './profile.js';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './auth-config.js';
import './auth.css';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const googleIcon = `<svg class="account-google-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.04H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.39 13.91a6.01 6.01 0 0 1 0-3.82V7.5H3.05a10 10 0 0 0 0 9l3.34-2.59Z"/><path fill="#ea4335" d="M12 5.96c1.47 0 2.78.51 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.34 2.59C7.18 7.72 9.4 5.96 12 5.96Z"/></svg>`;
const labels = { login: 'Entrar na conta', signup: 'Criar conta', forgot: 'Recuperar senha', recovery: 'Definir nova senha', account: 'Minha Conta', profile: 'Editar perfil', password: 'Alterar senha' };
export function authError(error) {
  const code = error?.code;
  if (code === 'identity_already_exists') return 'Esta conta Google já está vinculada a outra conta. Entre nela ou desconecte o Google daquela conta primeiro.';
  if (code === 'provider_disabled' || /provider is not enabled|unsupported provider/i.test(error?.message || '')) return 'O login Google ainda não está configurado neste site.';
  if (code === 'manual_linking_disabled' || /manual linking.*disabled/i.test(error?.message || '')) return 'A conexão de contas ainda não está ativada no servidor.';
  if (code === 'single_identity_not_deletable') return 'Adicione outra forma de acesso antes de desconectar o Google.';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(error?.message || '')) return 'E-mail ou senha incorretos.';
  if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Confira também a pasta de spam.';
  if (code === 'user_already_exists') return 'Esta conta já existe. Entre ou recupere sua senha.';
  if (code === 'signup_disabled' || code === 'email_provider_disabled') return 'O cadastro por e-mail está desativado no projeto.';
  if (code === 'weak_password' || code === 'validation_failed') return 'Confira os dados. Use uma senha com pelo menos 8 caracteres.';
  if (error?.status === 429 || /rate.limit/i.test(code || '')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (/fetch|network/i.test(error?.message || '')) return 'Não foi possível conectar. Confira sua internet e tente novamente.';
  return 'Não foi possível concluir. Confira os dados e tente novamente.';
}
export class Account {
  constructor(root, render) {
    this.render = render; this.mode = ''; this.email = ''; this.message = ''; this.error = ''; this.busy = false; this.user = null;
    this.root=root;this.vault=new AccountVault();this.settings=new ProfileSettings(this);
    const authUrl=new URL(location.href),authFragment=new URLSearchParams(authUrl.hash.slice(1));
    this.googleReturn=Boolean(authFragment.has('access_token')||authFragment.has('error')||authUrl.searchParams.has('code')||authUrl.searchParams.has('error'));
    this.googleReturnError=authFragment.get('error_code')||authUrl.searchParams.get('error_code')||authFragment.get('error')||authUrl.searchParams.get('error')||'';
    this.client = createClient(supabaseUrl, supabaseKey);
    this.client.auth.onAuthStateChange((event, session) => {
      const previousUid = this.user?.id;if(event==='USER_UPDATED')this.preferencesVersion=(this.preferencesVersion||0)+1;
      try{this.vault.save(session);}catch{}
      this.user = session?.user || null;
      if (previousUid !== this.user?.id) this.settings.reset();
      if (event === 'PASSWORD_RECOVERY') { this.mode = 'recovery'; this.message = ''; this.error = ''; }
      if (event === 'SIGNED_OUT') this.mode = '';
      // Keep SDK callbacks synchronous; render outside its internal auth lock.
      queueMicrotask(() => {
        this.updateProfile(root);
        if (previousUid !== this.user?.id) {
          disconnectCloud().catch(() => {});googleClassroom.clearAuthorization();
          root.dispatchEvent(new CustomEvent('account-changed'));
        }
        this.settings.applyPreferences();this.settings.refreshAvatar();if(event==='SIGNED_IN'||event==='INITIAL_SESSION')setTimeout(()=>this.refreshPreferences(),0);
        if (event === 'PASSWORD_RECOVERY') this.show('recovery');
        if(this.googleReturn && (event==='SIGNED_IN'||event==='INITIAL_SESSION'&&this.googleReturnError))this.finishGoogleReturn(event);
      });
    });
    root.addEventListener('click', e => {
      const photo = e.target.closest('[data-photo-action]');
      if (photo && !this.busy) { this.settings.photo.action(photo.dataset.photoAction).catch(error => { this.error = error.message; this.paint(); }); return; }
      const button = e.target.closest('[data-account-action]'); if (!button || this.busy) return;
      const action=button.dataset.accountAction;
      if(action==='add-account'){this.addingAccount=true;this.email='';this.show('login');return;}
      if(action==='switch-account'){this.switchAccount(button.dataset.uid);return;}
      if(action==='forget-account'){try{this.vault.remove(button.dataset.uid);}catch{}this.paint();return;}
      if (action === 'google-login') this.googleAuth('login');
      else if (action === 'google-connect') this.googleAuth('connect');
      else if (action === 'google-disconnect') this.disconnectGoogle();
      else if (action === 'close') this.close();
      else if (action === 'diagnostics') this.measurePerformance();
      else if (action === 'copy-diagnostics') navigator.clipboard.writeText(JSON.stringify(this.diagnostics,null,2)).catch(()=>{});
      else if (action === 'logout') this.logout();
      else if (action === 'restart-tour') { this.close(); document.dispatchEvent(new CustomEvent('start-tour')); }
      else if (action === 'remove-photo') this.settings.removePhoto();
      else this.show(action === 'open' ? (this.user ? 'account' : 'login') : action);
    });
    root.addEventListener('click',e=>{
      const swatch=e.target.closest('[data-profile-theme]');if(swatch){const select=root.querySelector('#profile-theme');if(select){select.value=swatch.dataset.profileTheme;for(const b of root.querySelectorAll('[data-profile-theme]'))b.setAttribute('aria-pressed',String(b===swatch));this.settings.capture(root.querySelector('#account-form'));}}});
    root.addEventListener('change', e => { if(e.target.id==='profile-theme')for(const b of root.querySelectorAll('[data-profile-theme]'))b.setAttribute('aria-pressed',String(b.dataset.profileTheme===e.target.value));if (['profile-photo', 'profile-camera-file'].includes(e.target.id)) this.settings.photo.choose(e.target.files[0]).catch(error => { this.error = error.userMessage || error.message; this.paint(); }); });
    root.addEventListener('submit', e => { if (e.target.id === 'account-form') { e.preventDefault(); this.submit(e.target); } });
    root.addEventListener('keydown', e => { if (this.mode && e.key === 'Escape' && !this.busy && this.mode !== 'recovery') { e.preventDefault(); this.close(); } });
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.refreshPreferences();});
    this.root=root;
  }
  async refreshPreferences(){
    if(!this.user||this.fetchingPreferences||Date.now()-(this.preferencesFetched||0)<30000)return;this.fetchingPreferences=true;this.preferencesFetched=Date.now();const uid=this.user.id,version=this.preferencesVersion||0;
    try{const {data,error}=await this.client.auth.getUser();if(!error&&data.user?.id===uid&&this.user?.id===uid&&version===(this.preferencesVersion||0)){this.user=data.user;this.settings.applyPreferences();this.settings.refreshAvatar();this.updateProfile(this.root);}}catch{}finally{this.fetchingPreferences=false;}
  }
  profile() { return `<button type="button" class="studio-account-button" data-account-action="open">${this.user ? this.settings.avatar() + `<span>${esc(this.user.user_metadata?.display_name || this.user.email)}</span>` : 'Entrar / Criar conta'}</button>`; }
  updateProfile(root) { const slots = root.querySelectorAll('[data-account-profile]'); for (const slot of slots) slot.innerHTML = this.profile();root.dispatchEvent(new CustomEvent('profile-updated')); }
  show(mode) { this.panelVersion=(this.panelVersion||0)+1;this.closing=false;this.animatePanel=true;this.returnFocus ||= document.activeElement; if (this.mode === 'profile' && mode !== 'profile') this.settings.cancel(); this.mode = mode; if (mode === 'account') this.settings.refreshAvatar(); if (mode === 'profile') this.settings.begin(); this.error = ''; this.message = ''; this.paint(); }
  close() {
    if(this.busy||this.closing)return;
    const dialog=this.root.querySelector('.account-dialog'),version=this.panelVersion;
    const finish=()=>{if(this.panelVersion!==version)return;this.closing=false;if(this.mode==='profile')this.settings.cancel();this.mode='';this.returnRoomCode=undefined;this.returnToActiveRoom=false;this.paint();this.returnFocus?.focus?.();this.returnFocus=null;};
    if(!dialog){finish();return;}this.closing=true;
    const reduced=prefersReducedMotion();
    dialog.animate(reduced?[{opacity:1},{opacity:0}]:[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(16px) scale(.97)'}],{duration:reduced?100:190,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'}).finished.then(finish,finish);
  }

  googleConnected(){return Boolean(this.user?.identities?.some(i=>i.provider==='google')||this.user?.app_metadata?.providers?.includes('google'));}
  googleConnections(){const connected=this.googleConnected();return `<section class="account-connections"><div class="account-connections-heading"><div><h3>Conexões</h3></div></div><div class="account-connection-row">${googleIcon}<div><strong>Google</strong><small>${connected?'Conectado':'Não conectado'}</small></div><button type="button" data-account-action="${connected?'google-disconnect':'google-connect'}" ${this.busy?'disabled':''}>${connected?'Desconectar':'Conectar'}</button></div></section>`;}
  authRedirect(){const url=new URL(location.href),invite=url.searchParams.get('invite'),localSignal=url.searchParams.has('localSignal');url.search='';url.hash='';if(/^[a-f0-9-]{36}$/i.test(invite||''))url.searchParams.set('invite',invite);if(typeof this.returnRoomCode==='string'){url.searchParams.set('page',this.returnToActiveRoom?'present':'join');if(/^\d{6}$/.test(this.returnRoomCode))url.searchParams.set('s',this.returnRoomCode);if(import.meta.env.DEV&&localSignal)url.searchParams.set('localSignal','');}return url.href;}
  async googleAuth(intent){
    if(this.busy||intent==='connect'&&!this.user)return;
    this.busy=true;this.error='';this.message='';this.paint();
    try{
      if(this.user)await this.prepareAccountChange();
      const options={redirectTo:this.authRedirect(),skipBrowserRedirect:true};
      const result=intent==='connect'?await this.client.auth.linkIdentity({provider:'google',options}):await this.client.auth.signInWithOAuth({provider:'google',options});
      if(result.error)throw result.error;
      if(!result.data?.url)throw Error('O Google não retornou um endereço de autorização.');
      // A marca não contém credenciais nem dados do perfil. Serve apenas para informar o resultado ao voltar.
      try{sessionStorage.setItem('sl-google-auth-flow',JSON.stringify({intent,uid:intent==='connect'?this.user?.id:null,started:Date.now()}));}catch{}
      location.assign(result.data.url);
    }catch(error){this.error=authError(error);this.busy=false;this.paint();}
  }
  finishGoogleReturn(event){
    let flow;try{flow=JSON.parse(sessionStorage.getItem('sl-google-auth-flow')||'null');}catch{}if(!flow)return;if(!flow.started||Date.now()-flow.started>15*60*1000){try{sessionStorage.removeItem('sl-google-auth-flow');}catch{}return;}
    if(!this.googleReturnError&&event!=='SIGNED_IN')return;
    try{sessionStorage.removeItem('sl-google-auth-flow');}catch{}this.googleReturn=false;
    this.mode=this.user?'account':'login';this.error='';this.message='';
    if(this.googleReturnError){this.error=authError({code:this.googleReturnError});const url=new URL(location.href);url.hash='';for(const k of ['error','error_code','error_description'])url.searchParams.delete(k);history.replaceState(history.state,'',url);}
    else if(flow.intent==='connect'&&(this.user?.id!==flow.uid||!this.googleConnected()))this.error='Não foi possível confirmar a conexão Google. Confira em Conexões e tente novamente.';
    else this.message=flow.intent==='connect'?'Google conectado. Seu perfil foi mantido.':'Você entrou com Google.';
    this.addingAccount=false;this.paint();
  }
  async disconnectGoogle(){
    if(!this.user||this.busy)return;
    const identities=this.user.identities||[],google=identities.find(i=>i.provider==='google');
    if(!google){this.error='Não foi possível conferir as identidades da conta. Tente novamente.';this.paint();return;}
    if(identities.length<2){this.error='Adicione outra forma de acesso antes de desconectar o Google.';this.paint();return;}
    if(!confirm('Desconectar o Google desta conta? Você não poderá mais usá-lo para entrar nela.'))return;
    this.busy=true;this.error='';this.message='';this.paint();
    try{const {error}=await this.client.auth.unlinkIdentity(google);if(error)throw error;const result=await this.client.auth.getUser();if(result.error)throw result.error;this.user=result.data.user;this.message='Google desconectado desta conta.';this.updateProfile(this.root);}catch(error){this.error=authError(error);}finally{this.busy=false;this.paint();}
  }
  accountList(){return `<section class="account-switcher"><h3>Suas contas</h3>${this.vault.list().map(s=>`<div class="account-switch-row"><span class="account-initial" aria-hidden="true">${s.avatar_thumbnail?`<img src="${esc(s.avatar_thumbnail)}" alt="">`:esc((s.user.user_metadata?.display_name||s.user.email||'C').slice(0,1))}</span><span><strong>${esc(s.user.user_metadata?.display_name||s.user.email)}</strong><small>${esc(s.user.email)}</small></span>${s.user.id===this.user?.id?'<span class="account-current">Atual</span>':`<button type="button" data-account-action="switch-account" data-uid="${esc(s.user.id)}">Trocar</button><button type="button" data-account-action="forget-account" data-uid="${esc(s.user.id)}" aria-label="Remover conta ${esc(s.user.email)} desta lista">×</button>`}</div>`).join('')}<button type="button" class="studio-btn quiet" data-account-action="add-account">+ Adicionar outra conta</button></section>`;}
  async prepareAccountChange(){const detail={tasks:[]};this.root.dispatchEvent(new CustomEvent('before-account-change',{detail}));await Promise.all(detail.tasks);}
  async switchAccount(uid){
    const saved=this.vault.list().find(s=>s.user.id===uid);if(!saved||this.busy)return;
    this.busy=true;this.error='';this.paint();
    try{await this.prepareAccountChange();const {error}=await this.client.auth.setSession({access_token:saved.access_token,refresh_token:saved.refresh_token});if(error)throw error;this.mode='account';this.message='Conta alterada.';}
    catch{this.email=saved.user.email||'';this.mode='login';this.error='Entre novamente nesta conta para renovar o acesso.';}
    finally{this.busy=false;this.paint();}
  }
  async measurePerformance(){
    this.close();await new Promise(resolve=>setTimeout(resolve,300));
    const {collectDiagnostics}=await import('./diagnostics.js');this.diagnostics=await collectDiagnostics();this.show('diagnostics');
  }
  markup() {
    if (!this.mode) return '';
    if(this.mode==='diagnostics')return `<dialog class="account-dialog" aria-labelledby="account-title"><form id="account-form"><header><span>Diagnóstico do navegador</span><button type="button" data-account-action="close" aria-label="Fechar conta"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header><h2 id="account-title">Desempenho desta aba</h2><p>Medição de quatro segundos. Nenhum e-mail, senha ou conteúdo de aula está incluído. Copie o resultado para comparar com o teste.</p><textarea aria-label="Resultado do diagnóstico" readonly rows="15">${esc(JSON.stringify(this.diagnostics,null,2))}</textarea><button type="button" class="studio-btn accent" data-account-action="copy-diagnostics">Copiar diagnóstico</button></form></dialog>`;
    const mode = this.mode, email = ['login', 'signup', 'forgot'].includes(mode), password = ['login', 'signup', 'recovery', 'password'].includes(mode);
    return `<dialog class="account-dialog" aria-labelledby="account-title"><form id="account-form"><header><h2 id="account-title" ${mode==='account'?'class="account-brand-title"':''}>${mode === 'profile' && (this.settings.photo.bitmap || this.settings.photo.stream || this.settings.photo.processing) ? 'Sua foto de perfil' : labels[mode]}</h2><button type="button" data-account-action="close" aria-label="Fechar conta" ${this.busy ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>${mode==='profile' ? `<div class="account-appearance"><span>Aparência do site</span>${appearancePicker()}</div>` : ''}
      ${mode === 'account' ? `${this.settings.card()}${this.googleConnections()}${this.accountList()}` : mode === 'profile' ? this.settings.form() : mode === 'password' ? '<p>Confirme sua senha atual e escolha uma nova senha.</p><label for="account-current-password">Senha atual</label><input id="account-current-password" name="current_password" type="password" autocomplete="current-password" required>' : `<p>${mode === 'forgot' ? 'Enviaremos um link para você escolher uma nova senha.' : mode === 'recovery' ? 'Escolha uma nova senha para sua conta.' : 'Entre com seu e-mail e senha. Os alunos continuam participando sem cadastro.'}</p>`}
      ${['login','signup'].includes(mode)?`<button class="account-google-button" type="button" data-account-action="google-login" ${this.busy?'disabled':''}>${googleIcon}<span>Continuar com Google</span></button><div class="account-divider"><span>ou com e-mail</span></div>`:''}
      ${email ? `<label for="account-email">E-mail</label><input id="account-email" name="email" type="email" autocomplete="email" maxlength="254" required value="${esc(this.email)}" ${this.busy ? 'disabled' : ''}>` : ''}
      ${password ? `<label for="account-password">${['recovery', 'password'].includes(mode) ? 'Nova senha' : 'Senha'}</label><input id="account-password" name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" ${mode === 'login' ? '' : 'minlength="8"'} maxlength="128" required ${this.busy ? 'disabled' : ''}>${mode !== 'login' ? '<small>Use pelo menos 8 caracteres.</small>' : ''}` : ''}
      ${mode === 'password' ? '<label for="account-password-confirm">Repita a nova senha</label><input id="account-password-confirm" name="password_confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>' : ''}
      ${this.error ? `<p class="account-error" role="alert">${esc(this.error)}</p>` : ''}${this.message ? `<p class="account-message" role="status">${esc(this.message)}</p>` : ''}
      ${mode === 'account' ? '<div class="account-bottom-row"><button type="button" class="studio-btn quiet" data-account-action="restart-tour">✦ Rever tour</button><button type="button" class="studio-btn quiet" data-account-action="logout">Sair da conta</button></div>' : `<button class="studio-btn accent" type="submit" ${this.busy||this.settings.photo.processing ? 'disabled' : ''}>${this.busy ? 'Aguarde…' : mode === 'profile' ? 'Salvar perfil' : labels[mode]}</button>`}
      <footer>${mode === 'login' ? '<button type="button" data-account-action="signup">Criar conta</button><button type="button" data-account-action="forgot">Esqueci minha senha</button>' : ['signup', 'forgot'].includes(mode) ? '<button type="button" data-account-action="login">Voltar para entrar</button>' : mode === 'password' ? '<button type="button" data-account-action="account">← Minha conta</button>' : ''}</footer>
      </form></dialog>`;
  }
  paint() {
    const slot = this.root.querySelector('[data-account-dialog]'); if (!slot) return;
    this.root.dispatchEvent(new CustomEvent('account-panel-changed', { detail: { open: Boolean(this.mode) } }));
    const animatePanel=this.animatePanel||this.paintedMode!==this.mode;this.animatePanel=false;this.paintedMode=this.mode;
    slot.innerHTML = this.markup(); const dialog = slot.querySelector('dialog');
    if (dialog) { dialog.showModal();
      if(animatePanel){
        dialog.dataset.panelArriving='true';
        const reduced=prefersReducedMotion();
        dialog.animate(reduced?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(28px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:reduced?140:480,easing:'cubic-bezier(.22,1,.36,1)'});
        if(!reduced)for(const [i,el]of [...dialog.querySelector('form').children].entries())el.animate([{opacity:0,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:360,delay:Math.min(i*30,180)+50,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      }
      this.settings.photo.mount(); dialog.addEventListener('cancel', e => { e.preventDefault(); if (!this.busy && this.mode !== 'recovery') this.close(); }); }
  }
  async submit(form) {
    if (this.busy) return;
    const values = new FormData(form), password = values.get('password'), mode = this.mode;
    if (mode === 'profile') { if (this.settings.photo.bitmap || this.settings.photo.stream || this.settings.photo.processing) { this.error = 'Use o recorte da foto ou cancele antes de salvar.'; this.paint(); return; } this.settings.capture(form); }
    this.email = String(values.get('email') || this.email).trim();
    this.busy = true; this.error = ''; this.message = '';
    // Disable in place so passwords remain in the field only while this request runs.
    for (const input of form.querySelectorAll('input,button')) input.disabled = true;
    try {
      const redirectTo = this.authRedirect();
      let result;
      if(mode==='login'){if(this.user)await this.prepareAccountChange();result=await this.client.auth.signInWithPassword({email:this.email,password});}
      else if (mode === 'signup') result = await this.client.auth.signUp({ email: this.email, password, options: { emailRedirectTo: redirectTo } });
      else if (mode === 'forgot') result = await this.client.auth.resetPasswordForEmail(this.email, { redirectTo });
      else if (mode === 'recovery') result = await this.client.auth.updateUser({ password });
      else if (mode === 'profile') result = await this.settings.save(values);
      else if (mode === 'password') result = await this.settings.changePassword(values);
      else return;
      if (result.error) throw result.error;
      if (mode === 'forgot') this.message = 'Se este e-mail tiver uma conta, você receberá um link de recuperação.';
      else if (mode === 'signup' && !result.data.session) { this.mode = 'login'; this.message = 'Confira seu e-mail para confirmar o cadastro. Depois, entre na sua conta.'; }
      else { this.user = result.data.user || this.user; this.addingAccount=false; this.mode = 'account'; this.message = ['recovery', 'password'].includes(mode) ? 'Senha atualizada.' : mode === 'profile' ? 'Perfil atualizado.' : ''; this.settings.applyPreferences();this.settings.refreshAvatar(); }
    } catch (error) { this.error = error.userMessage || authError(error); }
    finally { this.busy = false; this.updateProfile(this.root); this.paint(); }
  }
  async logout() {
    this.busy = true;
    try { const uid=this.user?.id; const { error } = await this.client.auth.signOut({ scope: 'local' }); if(error)throw error;try{this.vault.remove(uid);}catch{}this.user=null;this.mode=''; }
    catch (error) { this.error = authError(error); }
    finally { this.busy = false; this.updateProfile(this.root); this.paint(); }
  }
  afterRender() { this.paint(); }
}
