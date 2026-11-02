const key='sl-account-sessions-v1';
export class AccountVault {
  constructor(storage=localStorage){this.storage=storage;}
  list(){try{const data=JSON.parse(this.storage.getItem(key)||'[]');return Array.isArray(data)?data.filter(s=>s?.user?.id&&typeof s.refresh_token==='string').slice(0,8):[];}catch{return [];}}
  save(session){if(!session?.user?.id||!session.refresh_token)return;const previous=this.list().find(s=>s.user.id===session.user.id);const rows=this.list().filter(s=>s.user.id!==session.user.id);rows.unshift({access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at,user:{id:session.user.id,email:session.user.email,user_metadata:{display_name:session.user.user_metadata?.display_name,avatar_path:session.user.user_metadata?.avatar_path}},...(previous?.avatar_thumbnail&&session.user.user_metadata?.avatar_path?{avatar_thumbnail:previous.avatar_thumbnail}:{})});this.storage.setItem(key,JSON.stringify(rows.slice(0,8)));}
  thumbnail(uid,value){if(!/^data:image\/(webp|png|jpeg|gif);base64,/.test(value)||value.length>80000)return;const rows=this.list();const row=rows.find(s=>s.user.id===uid);if(row){row.avatar_thumbnail=value;this.storage.setItem(key,JSON.stringify(rows));}}
  remove(uid){this.storage.setItem(key,JSON.stringify(this.list().filter(s=>s.user.id!==uid)));}
}
