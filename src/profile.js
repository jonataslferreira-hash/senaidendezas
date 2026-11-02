import { optimizeImage } from './image-optimize.js';
import { putAvatar, getAvatar, removeAvatar } from './cloud-files.js';
import './profile.css';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = message => Object.assign(Error(message), { userMessage: message });
export class ProfileSettings {
  constructor(account) { this.account = account; this.avatarUrl = ''; this.avatarKey = ''; this.draft = null; this.pending = null; }
  reset() { this.photoVersion = (this.photoVersion || 0) + 1; if (this.pending?.url) URL.revokeObjectURL(this.pending.url); if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl); this.avatarUrl = ''; this.avatarKey = ''; this.draft = null; this.pending = null; }
  begin() { this.photoVersion = (this.photoVersion || 0) + 1; if (this.pending?.url) URL.revokeObjectURL(this.pending.url); this.draft = { ...this.account.user?.user_metadata }; this.pending = null; this.removing = false; }
  cancel() { this.photoVersion = (this.photoVersion || 0) + 1; if (this.pending?.url && this.pending.url !== this.avatarUrl) URL.revokeObjectURL(this.pending.url); this.pending = null; this.removing = false; }
  applyPreferences() {
    const m = this.account.user?.user_metadata || {};
    const previous = document.documentElement.dataset.motion;
    const theme = ['violet', 'ocean', 'forest'].includes(m.theme) ? m.theme : 'violet';
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.motion = m.reduced_motion ? 'reduced' : 'normal';
    if (previous !== document.documentElement.dataset.motion) document.dispatchEvent(new Event('motion-preference-changed'));
  }
  avatar(big = false) {
    const m = this.account.user?.user_metadata || {}, initial = String(m.display_name || this.account.user?.email || 'P').slice(0, 1).toUpperCase();
    const url = this.removing ? '' : this.pending?.url || this.avatarUrl;
    return `<span class="profile-avatar ${big ? 'large' : ''}" aria-hidden="${!big}" data-initial="${esc(initial)}">${url ? `<img src="${esc(url)}" alt="${big ? 'Foto de perfil' : ''}">` : ''}</span>`;
  }
  card() {
    const m = this.account.user?.user_metadata || {};
    return `<div class="profile-card">${this.avatar(true)}<h3>${esc(m.display_name || 'Seu espaço de professor')}</h3><p>${esc(this.account.user?.email)}</p>${m.school ? `<span class="profile-school">⌂ ${esc(m.school)}</span>` : ''}${m.bio ? `<p class="profile-bio">${esc(m.bio)}</p>` : ''}</div><div class="profile-shortcuts"><button type="button" data-account-action="profile">✎ Editar perfil</button><button type="button" data-account-action="password">⌑ Alterar senha</button></div>`;
  }
  form() {
    const m = this.draft || {};
    return `<div class="profile-photo-edit">${this.avatar(true)}<div><label class="profile-photo-button">Escolher foto<input type="file" id="profile-photo" accept="image/png,image/jpeg,image/webp"></label><button type="button" data-account-action="remove-photo">Remover foto</button><small>A foto será recortada em quadrado e otimizada.</small></div></div><label for="profile-name">Nome de exibição</label><input id="profile-name" name="display_name" autocomplete="nickname" maxlength="60" value="${esc(m.display_name)}" required><label for="profile-school">Escola ou instituição (opcional)</label><input id="profile-school" name="school" maxlength="80" value="${esc(m.school)}"><label for="profile-bio">Sobre você (opcional)</label><textarea id="profile-bio" name="bio" maxlength="240" placeholder="O que você gosta de ensinar?">${esc(m.bio)}</textarea><label for="profile-theme">Cores do meu espaço</label><select id="profile-theme" name="theme">${[['violet', 'Violeta'], ['ocean', 'Oceano'], ['forest', 'Jardim']].map(([value, label]) => `<option value="${value}" ${m.theme === value ? 'selected' : ''}>${label}</option>`).join('')}</select><label class="profile-checkbox"><input type="checkbox" name="reduced_motion" ${m.reduced_motion ? 'checked' : ''}> Reduzir animações e movimento</label>`;
  }
  capture(form) { const values = new FormData(form); this.draft = { ...this.draft, display_name: values.get('display_name') || '', school: values.get('school') || '', bio: values.get('bio') || '', theme: values.get('theme') || 'violet', reduced_motion: values.has('reduced_motion') }; return this.draft; }
  async choosePhoto(file) {
    if (!file) return;
    const uid = this.account.user?.id, version = this.photoVersion = (this.photoVersion || 0) + 1;
    this.capture(this.account.root.querySelector('#account-form'));
    const image = await optimizeImage(file, { avatar: true });
    if (this.account.user?.id !== uid || this.account.mode !== 'profile' || this.photoVersion !== version) return;
    if (image.size > 256 * 1024) throw safe('Escolha outra foto; o resultado precisa ter até 256 KB.');
    if (this.pending?.url) URL.revokeObjectURL(this.pending.url);
    this.pending = { file: image, url: URL.createObjectURL(image) }; this.removing = false; this.account.paint();
  }
  removePhoto() { this.photoVersion = (this.photoVersion || 0) + 1; this.capture(this.account.root.querySelector('#account-form')); if (this.pending?.url) URL.revokeObjectURL(this.pending.url); this.pending = null; this.removing = true; this.account.paint(); }
  async save(values) {
    const uid = this.account.user?.id;
    const name = String(values.get('display_name') || '').trim().slice(0, 60);
    if (!name) throw safe('Escolha um nome para seu perfil.');
    const previousAvatar = this.account.user.user_metadata?.avatar_path || null;
    let avatar = previousAvatar;
    if (this.pending) {
      try { avatar = await putAvatar(this.account.client, this.pending.file); }
      catch { throw safe('A foto não foi salva. Ative o armazenamento da conta e tente novamente. Você já pode salvar o nome sem trocar a foto.'); }
    }
    if (this.removing) avatar = null;
    if (!uid || this.account.user?.id !== uid) throw safe('A conta mudou. Abra o perfil novamente.');
    const result = await this.account.client.auth.updateUser({ data: { display_name: name, school: String(values.get('school') || '').trim().slice(0, 80), bio: String(values.get('bio') || '').trim().slice(0, 240), theme: ['violet', 'ocean', 'forest'].includes(values.get('theme')) ? values.get('theme') : 'violet', reduced_motion: values.has('reduced_motion'), avatar_path: avatar } });
    if (this.account.user?.id !== uid) throw safe('A conta mudou. Abra o perfil novamente.');
    if (!result.error) {
      if (this.removing) await removeAvatar(this.account.client, previousAvatar).catch(() => {});
      if (this.pending?.url) { if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl); this.avatarUrl = this.pending.url; }
      else if (this.removing && this.avatarUrl) { URL.revokeObjectURL(this.avatarUrl); this.avatarUrl = ''; }
      this.pending = null; this.removing = false; this.avatarKey = '';
    }
    return result;
  }
  async changePassword(values) {
    if (values.get('password') !== values.get('password_confirm')) throw safe('As duas novas senhas precisam ser iguais.');
    const signed = await this.account.client.auth.signInWithPassword({ email: this.account.user.email, password: values.get('current_password') });
    if (signed.error) throw signed.error;
    return this.account.client.auth.updateUser({ password: values.get('password') });
  }
  async refreshAvatar() {
    const user = this.account.user, path = user?.user_metadata?.avatar_path;
    if (!path || this.pending) return;
    const key = `${user.id}:${path}:${user.updated_at}`;
    if (this.avatarKey === key) return; this.avatarKey = key;
    try {
      const blob = await getAvatar(this.account.client, path);
      if (this.account.user?.id !== user.id || this.avatarKey !== key) return;
      if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl); this.avatarUrl = URL.createObjectURL(blob);
      this.account.updateProfile(this.account.root);
      if (this.account.mode === 'account') this.account.paint();
    } catch { /* The account remains usable even if its private photo is unavailable. */ }
  }
}
