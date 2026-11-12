import {themes,styles,validTheme,validStyle} from './personalization.js';
import { PhotoEditor } from './photo-editor.js';
import { putAvatar, getAvatar, removeAvatar } from './cloud-files.js';
import './profile.css';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safe = message => Object.assign(Error(message), { userMessage: message });
export class ProfileSettings {
  constructor(account) { this.account = account; this.avatarUrl = ''; this.avatarKey = ''; this.draft = null; this.pending = null; this.photo = new PhotoEditor(this); }
  reset() { this.photo.reset(); this.photoVersion = (this.photoVersion || 0) + 1; if (this.pending?.url) URL.revokeObjectURL(this.pending.url); if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl); this.avatarUrl = ''; this.avatarKey = ''; this.draft = null; this.pending = null; }
  begin() { this.photoVersion = (this.photoVersion || 0) + 1; if (this.pending?.url) URL.revokeObjectURL(this.pending.url); this.draft = { ...this.account.user?.user_metadata }; this.pending = null; this.removing = false; }
  cancel() { this.photo.reset(); this.photoVersion = (this.photoVersion || 0) + 1; if (this.pending?.url && this.pending.url !== this.avatarUrl) URL.revokeObjectURL(this.pending.url); this.pending = null; this.removing = false; }
  applyPreferences() {
    const m = this.account.user?.user_metadata || {};
    const previous = document.documentElement.dataset.motion;
    const theme=validTheme(m.theme);
    document.documentElement.dataset.uiStyle=validStyle(m.ui_style);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.motion = this.account.user ? (m.reduced_motion ? 'reduced' : 'normal') : 'system';
    if (previous !== document.documentElement.dataset.motion) document.dispatchEvent(new Event('motion-preference-changed'));
  }
  avatar(big = false) {
    const m = this.account.user?.user_metadata || {}, initial = String(m.display_name || this.account.user?.email || 'P').slice(0, 1).toUpperCase();
    const url = this.removing ? '' : this.pending?.url || this.avatarUrl || (m.avatar_path?this.account.vault.list().find(s=>s.user.id===this.account.user?.id)?.avatar_thumbnail:'');
    return `<span class="profile-avatar ${big ? 'large' : ''}" aria-hidden="${!big}" data-initial="${esc(initial)}">${url ? `<img src="${esc(url)}" alt="${big ? 'Foto de perfil' : ''}">` : ''}</span>`;
  }
  card() {
    const m = this.account.user?.user_metadata || {};
    return `<div class="profile-card">${this.avatar(true)}<h3>${esc(m.display_name || 'Seu espaço de professor')}</h3><p>${esc(this.account.user?.email)}</p>${m.school ? `<span class="profile-school">⌂ ${esc(m.school)}</span>` : ''}${m.bio ? `<p class="profile-bio">${esc(m.bio)}</p>` : ''}</div><div class="profile-shortcuts"><button type="button" data-account-action="profile">✎ Editar perfil</button><button type="button" data-account-action="password">⌑ Alterar senha</button></div>`;
  }
  form() {
    if (this.photo.bitmap || this.photo.stream || this.photo.processing) return this.photo.markup();
    const m = this.draft || {};
    return `<div class="profile-photo-edit">${this.avatar(true)}<div class="profile-photo-actions" role="group" aria-label="Foto de perfil"><label class="profile-photo-button" title="Escolher uma foto" aria-label="Escolher uma foto"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><circle cx="9" cy="10" r="1.8"/><path d="m4.5 17.5 4.2-4.2a2 2 0 0 1 2.8 0L20 21"/></svg><span>Escolher</span><input type="file" id="profile-photo" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"></label><button type="button" class="profile-photo-button" data-photo-action="camera" title="Tirar uma foto" aria-label="Tirar uma foto"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.6"/></svg><span>Tirar</span></button><button type="button" class="profile-photo-button danger" data-account-action="remove-photo" title="Remover a foto" aria-label="Remover a foto"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7h14M10 4h4l1 3H9l1-3Z"/><path d="m7 7 1 12.5h8L17 7"/><path d="M10.5 10.5v6M13.5 10.5v6"/></svg><span>Remover</span></button><input type="file" id="profile-camera-file" accept="image/*" capture="user" hidden></div></div>${this.photo.markup()}<label for="profile-name">Nome de exibição</label><input id="profile-name" name="display_name" autocomplete="nickname" maxlength="60" value="${esc(m.display_name)}" required><label for="profile-school">Escola ou instituição (opcional)</label><input id="profile-school" name="school" maxlength="80" value="${esc(m.school)}"><label for="profile-bio">Sobre você (opcional)</label><textarea id="profile-bio" name="bio" maxlength="240" placeholder="O que você gosta de ensinar?">${esc(m.bio)}</textarea><input type="hidden" id="profile-theme" name="theme" value="${validTheme(m.theme)}"><div class="profile-swatches" role="group" aria-label="Cores do meu espaço">${themes.map(([id,name,color])=>{const gradient=/gradient/.test(color);return `<button type="button" class="profile-swatch ${gradient?'is-gradient':''}" data-profile-theme="${id}" style="--swatch:${color}" title="${esc(name)}" aria-label="Cor ${esc(name)}" aria-pressed="${validTheme(m.theme)===id}"></button>`;}).join('')}</div><label for="profile-style">Estilo do meu espaço</label><select id="profile-style" name="ui_style">${styles.map(([id,name])=>`<option value="${id}" ${validStyle(m.ui_style)===id?'selected':''}>${name}</option>`).join('')}</select><label class="profile-checkbox"><input type="checkbox" name="reduced_motion" ${m.reduced_motion ? 'checked' : ''}> Reduzir animações e movimento</label>`;
  }
  capture(form) { if (!form?.querySelector('[name=display_name]')) return this.draft; const values = new FormData(form); this.draft = { ...this.draft, display_name: values.get('display_name') || '', school: values.get('school') || '', bio: values.get('bio') || '', theme: validTheme(values.get('theme')), ui_style:validStyle(values.get('ui_style')), reduced_motion: values.has('reduced_motion') }; return this.draft; }
  removePhoto() { this.photo.reset(); this.photoVersion = (this.photoVersion || 0) + 1; this.capture(this.account.root.querySelector('#account-form')); if (this.pending?.url) URL.revokeObjectURL(this.pending.url); this.pending = null; this.removing = true; this.account.paint(); }
  async save(values) {
    const uid = this.account.user?.id;
    const name = String(values.get('display_name') || '').trim().slice(0, 60);
    if (!name) throw safe('Escolha um nome para seu perfil.');
    const previousAvatar = this.account.user.user_metadata?.avatar_path || null;
    let avatar = previousAvatar;
    if (this.pending) {
      try { avatar = await putAvatar(this.account.client, this.pending.file); }
      catch(error){throw safe(error.message?.includes('GIF')?error.message:'A foto não foi salva. Confira o armazenamento da conta e tente novamente.');}
    }
    if (this.removing) avatar = null;
    if (!uid || this.account.user?.id !== uid) throw safe('A conta mudou. Abra o perfil novamente.');
    const result = await this.account.client.auth.updateUser({ data: { display_name: name, school: String(values.get('school') || '').trim().slice(0, 80), bio: String(values.get('bio') || '').trim().slice(0, 240), theme:validTheme(values.get('theme')),ui_style:validStyle(values.get('ui_style')), reduced_motion: values.has('reduced_motion'), avatar_path: avatar } });
    if (this.account.user?.id !== uid) throw safe('A conta mudou. Abra o perfil novamente.');
    if (!result.error) {
      if (previousAvatar && avatar && previousAvatar !== avatar) await removeAvatar(this.account.client, previousAvatar).catch(() => {});
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
      if (!blob.size || !blob.type.startsWith('image/')) throw Error('Foto indisponível.');
      if (this.avatarUrl) URL.revokeObjectURL(this.avatarUrl); this.avatarUrl = URL.createObjectURL(blob);
      try{const bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=canvas.height=64;const side=Math.min(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,64,64);bitmap.close();this.account.vault.thumbnail(user.id,canvas.toDataURL('image/webp',.7));}catch{}
      this.account.updateProfile(this.account.root);
      if (this.account.mode === 'account') this.account.paint();
    } catch { if (this.avatarKey === key) this.avatarKey = ''; /* Allow retry instead of caching a failed request. */ }
  }
}
