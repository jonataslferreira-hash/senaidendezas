import { cloudConfigured, disconnectCloud } from './cloud-files.js';
import { ProfileSettings } from './profile.js';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './auth-config.js';
import './auth.css';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { login: 'Entrar na conta', signup: 'Criar conta', forgot: 'Recuperar senha', recovery: 'Definir nova senha', account: 'Minha conta', profile: 'Editar perfil', password: 'Alterar senha' };
export function authError(error) {
  const code = error?.code;
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
    this.settings = new ProfileSettings(this);
    this.client = createClient(supabaseUrl, supabaseKey);
    this.client.auth.onAuthStateChange((event, session) => {
      const previousUid = this.user?.id;
      this.user = session?.user || null;
      if (previousUid !== this.user?.id) this.settings.reset();
      if (event === 'PASSWORD_RECOVERY') { this.mode = 'recovery'; this.message = ''; this.error = ''; }
      if (event === 'SIGNED_OUT') this.mode = '';
      // Keep SDK callbacks synchronous; render outside its internal auth lock.
      queueMicrotask(() => {
        this.updateProfile(root);
        this.settings.applyPreferences(); this.settings.refreshAvatar();
        if (previousUid !== this.user?.id) {
          disconnectCloud().catch(() => {});
          root.dispatchEvent(new CustomEvent('account-changed'));
        }
        if (event === 'PASSWORD_RECOVERY') this.show('recovery');
      });
    });
    root.addEventListener('click', e => {
      const button = e.target.closest('[data-account-action]'); if (!button || this.busy) return;
      const action = button.dataset.accountAction;
      if (action === 'close') this.close();
      else if (action === 'logout') this.logout();
      else if (action === 'remove-photo') this.settings.removePhoto();
      else this.show(action === 'open' ? (this.user ? 'account' : 'login') : action);
    });
    root.addEventListener('change', e => { if (e.target.id === 'profile-photo') this.settings.choosePhoto(e.target.files[0]).catch(error => { this.error = error.userMessage || error.message; this.paint(); }); });
    root.addEventListener('submit', e => { if (e.target.id === 'account-form') { e.preventDefault(); this.submit(e.target); } });
    root.addEventListener('keydown', e => { if (this.mode && e.key === 'Escape' && !this.busy && this.mode !== 'recovery') { e.preventDefault(); this.close(); } });
    this.root = root;
  }
  profile() { return `<button type="button" class="studio-account-button" data-account-action="open">${this.user ? this.settings.avatar() + `<span>${esc(this.user.user_metadata?.display_name || this.user.email)}</span>` : 'Entrar / Criar conta'}</button>`; }
  updateProfile(root) { const slot = root.querySelector('[data-account-profile]'); if (slot) slot.innerHTML = this.profile(); }
  show(mode) { this.returnFocus ||= document.activeElement; if (this.mode === 'profile' && mode !== 'profile') this.settings.cancel(); this.mode = mode; if (mode === 'profile') this.settings.begin(); this.error = ''; this.message = ''; this.paint(); }
  close() { if (this.busy) return; if (this.mode === 'profile') this.settings.cancel(); this.mode = ''; this.paint(); this.returnFocus?.focus?.(); this.returnFocus = null; }
  markup() {
    if (!this.mode) return '';
    const mode = this.mode, email = ['login', 'signup', 'forgot'].includes(mode), password = ['login', 'signup', 'recovery', 'password'].includes(mode);
    return `<dialog class="account-dialog" aria-labelledby="account-title"><form id="account-form"><header><span class="studio-kicker">SEU ESPAÇO DE ENSINO</span><button type="button" data-account-action="close" aria-label="Fechar conta" ${this.busy ? 'disabled' : ''}>×</button></header><h2 id="account-title">${labels[mode]}</h2>
      ${mode === 'account' ? `${this.settings.card()}<p>${cloudConfigured ? 'Use Salvar na nuvem no editor para acessar uma aula em outros dispositivos.' : 'As aulas ficam neste navegador. Exporte uma cópia em JSON para levar com você.'}</p>` : mode === 'profile' ? this.settings.form() : mode === 'password' ? '<p>Confirme sua senha atual e escolha uma nova senha.</p><label for="account-current-password">Senha atual</label><input id="account-current-password" name="current_password" type="password" autocomplete="current-password" required>' : `<p>${mode === 'forgot' ? 'Enviaremos um link para você escolher uma nova senha.' : mode === 'recovery' ? 'Escolha uma nova senha para sua conta.' : 'Entre com seu e-mail e senha. Os alunos continuam participando sem cadastro.'}</p>`}
      ${email ? `<label for="account-email">E-mail</label><input id="account-email" name="email" type="email" autocomplete="email" maxlength="254" required value="${esc(this.email)}" ${this.busy ? 'disabled' : ''}>` : ''}
      ${password ? `<label for="account-password">${['recovery', 'password'].includes(mode) ? 'Nova senha' : 'Senha'}</label><input id="account-password" name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" ${mode === 'login' ? '' : 'minlength="8"'} maxlength="128" required ${this.busy ? 'disabled' : ''}>${mode !== 'login' ? '<small>Use pelo menos 8 caracteres.</small>' : ''}` : ''}
      ${mode === 'password' ? '<label for="account-password-confirm">Repita a nova senha</label><input id="account-password-confirm" name="password_confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>' : ''}
      ${this.error ? `<p class="account-error" role="alert">${esc(this.error)}</p>` : ''}${this.message ? `<p class="account-message" role="status">${esc(this.message)}</p>` : ''}
      ${mode === 'account' ? '<button type="button" class="studio-btn quiet" data-account-action="logout">Sair da conta</button>' : `<button class="studio-btn accent" type="submit" ${this.busy ? 'disabled' : ''}>${this.busy ? 'Aguarde…' : mode === 'profile' ? 'Salvar perfil' : labels[mode]}</button>`}
      <footer>${mode === 'login' ? '<button type="button" data-account-action="signup">Criar conta</button><button type="button" data-account-action="forgot">Esqueci minha senha</button>' : ['signup', 'forgot'].includes(mode) ? '<button type="button" data-account-action="login">Voltar para entrar</button>' : ['profile', 'password'].includes(mode) ? '<button type="button" data-account-action="account">← Minha conta</button>' : ''}</footer>
      </form></dialog>`;
  }
  paint() {
    const slot = this.root.querySelector('[data-account-dialog]'); if (!slot) return;
    slot.innerHTML = this.markup(); const dialog = slot.querySelector('dialog');
    if (dialog) { dialog.showModal(); dialog.addEventListener('cancel', e => { e.preventDefault(); if (!this.busy && this.mode !== 'recovery') this.close(); }); }
  }
  async submit(form) {
    if (this.busy) return;
    const values = new FormData(form), password = values.get('password'), mode = this.mode;
    if (mode === 'profile') this.settings.capture(form);
    this.email = String(values.get('email') || this.email).trim();
    this.busy = true; this.error = ''; this.message = '';
    // Disable in place so passwords remain in the field only while this request runs.
    for (const input of form.querySelectorAll('input,button')) input.disabled = true;
    try {
      const redirectTo = new URL(location.pathname, location.origin).href;
      let result;
      if (mode === 'login') result = await this.client.auth.signInWithPassword({ email: this.email, password });
      else if (mode === 'signup') result = await this.client.auth.signUp({ email: this.email, password, options: { emailRedirectTo: redirectTo } });
      else if (mode === 'forgot') result = await this.client.auth.resetPasswordForEmail(this.email, { redirectTo });
      else if (mode === 'recovery') result = await this.client.auth.updateUser({ password });
      else if (mode === 'profile') result = await this.settings.save(values);
      else if (mode === 'password') result = await this.settings.changePassword(values);
      else return;
      if (result.error) throw result.error;
      if (mode === 'forgot') this.message = 'Se este e-mail tiver uma conta, você receberá um link de recuperação.';
      else if (mode === 'signup' && !result.data.session) { this.mode = 'login'; this.message = 'Confira seu e-mail para confirmar o cadastro. Depois, entre na sua conta.'; }
      else { this.user = result.data.user || this.user; this.mode = 'account'; this.message = ['recovery', 'password'].includes(mode) ? 'Senha atualizada.' : mode === 'profile' ? 'Perfil atualizado.' : 'Você está conectado.'; this.settings.applyPreferences(); this.settings.refreshAvatar(); }
    } catch (error) { this.error = error.userMessage || authError(error); }
    finally { this.busy = false; this.updateProfile(this.root); this.paint(); }
  }
  async logout() {
    this.busy = true;
    try { const { error } = await this.client.auth.signOut({ scope: 'local' }); if (error) throw error; this.user = null; this.mode = ''; }
    catch (error) { this.error = authError(error); }
    finally { this.busy = false; this.updateProfile(this.root); this.paint(); }
  }
  afterRender() { this.paint(); }
}
