export const isPhotoAvatar=value=>typeof value==='string'&&value.length<=24576&&/^data:image\/(webp|png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
  '🚀':['#bfb8ff','M8 15c1-6 5-10 12-11-1 7-5 11-11 12zM8 12H5l-2 5 5-1m4 0v3l-5 2 1-5m-3 2-2 3m11-10a2 2 0 1 0 0-.1'],
  '🤖':['#95e8ed','M4 8h16v12H4zm8 0V4m-5 9h1m8 0h1m-8 4h6M2 12v4m20-4v4'],
  '🦊':['#ffbc91','M3 4l6 4h6l6-4-1 10-8 7-8-7zm2 8 7 6 7-6M8 12h1m6 0h1'],
  '🐱':['#ffd99b','M5 13V5l5 4h4l5-4v8c0 4-3 7-7 7s-7-3-7-7zm3 1h1m6 0h1m-5 3h2m-9-2H2m20 0h-2'],
  '👾':['#f0a8ff','M6 8h12v3h3v7h-4v2h-3v-3h-4v3H7v-2H3v-7h3zm2 4h1m6 0h1M7 4l2 4m8-4-2 4'],
  '🐼':['#dedff5','M5 9a3 3 0 1 1 4-4m6 0a3 3 0 1 1 4 4M3 14c0-6 4-9 9-9s9 3 9 9-4 7-9 7-9-2-9-7zm5-1h1m6 0h1m-5 4h2'],
  '⚡':['#ffe17e','M14 2 4 14h7l-1 8 10-12h-7z'],
  '🧠':['#ffa9d3','M12 5c-2-4-7-2-7 1-3 1-4 6-1 8-1 4 2 7 6 6h4c4 1 7-2 6-6 3-2 2-7-1-8 0-3-5-5-7-1zm0 0v15M6 8l3 2m6 0 3-2M6 15l3-1m6 0 3 1'],
  '🦉':['#f3cbad','M5 8V4l5 3h4l5-3v4l2 4-2 7-7 2-7-2-2-7zm3 5h1m6 0h1m-5 3 1 2 1-2'],
  '🐸':['#abecaa','M4 10a4 4 0 0 1 7-4h2a4 4 0 0 1 7 4l2 4c0 4-4 7-10 7s-10-3-10-7zm3-1h1m8 0h1M6 15q6 5 12 0'],
  '🪐':['#a8c4ff','M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM5 10c-3 2-4 4-3 5 2 3 20-3 20-6 0-1-2-2-4-2'],
  '🎮':['#c4f3bd','M7 7h10c3 0 6 8 4 10-1 2-3 0-5-2H8c-2 2-4 4-5 2C1 15 4 7 7 7zm1 2v4m-2-2h4m5 0h.1m3 0h.1']
};
export function avatarContent(value){
  const icon=Object.hasOwn(icons,value)?icons[value]:null;
  if(icon)return `<svg class="rank-avatar-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${icon[1]}" stroke="${icon[0]}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
return isPhotoAvatar(value)?`<img class="player-profile-photo" src="${value}" alt="">`:esc(value);}
