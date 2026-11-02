export const isPhotoAvatar=value=>typeof value==='string'&&value.length<=24576&&/^data:image\/(webp|png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function avatarContent(value){return isPhotoAvatar(value)?`<img class="player-profile-photo" src="${value}" alt="">`:esc(value);}
