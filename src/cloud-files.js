import { packLesson, unpackLesson } from './file-codec.js';
export const r2ApiUrl = (import.meta.env?.VITE_R2_API_URL || '').replace(/\/$/, '');
export const cloudConfigured = true;
export const CLOUD_BUCKET = 'storage-lab-lessons';
export const MAX_CLOUD_BYTES = 50 * 1024 * 1024;
let generation = 0;
export async function disconnectCloud() { generation++; }
async function authenticated(client) {
  const requestGeneration = generation, { data, error } = await client.auth.getSession();
  if (error || !data.session) throw Error('Entre na sua conta para acessar os arquivos.');
  if (requestGeneration !== generation) throw Error('A conta mudou. Tente novamente.');
  return { uid: data.session.user.id, token: data.session.access_token, requestGeneration };
}
function unchanged(s) { if (s.requestGeneration !== generation) throw Error('A conta mudou. Tente novamente.'); }
function cloudError(error) {
  if (['404', '42P01', 'PGRST205'].includes(String(error.statusCode || error.code)) || /bucket not found|relation .* does not exist/i.test(error.message || '')) return Error('Seu espaço na nuvem ainda precisa ser ativado pelo administrador do site.');
  if (String(error.statusCode) === '413') return Error('O arquivo é grande demais para o espaço da conta.');
  return Error('Não foi possível acessar a nuvem. Confira a conexão, a sessão e o espaço disponível.');
}
export async function saveCloudLesson(client, lesson) {
  const s = await authenticated(client), id = /^[a-zA-Z0-9_-]{1,100}$/.test(lesson.id) ? lesson.id : crypto.randomUUID();
  const packed = await packLesson(lesson); unchanged(s);
  const blob = new Blob([packed.buffer], { type: packed.compressed ? 'application/gzip' : 'application/json' });
  if (blob.size > MAX_CLOUD_BYTES) throw Error('A aula ultrapassa 50 MB. Divida os arquivos antes de enviar.');
  if (r2ApiUrl) { await r2Request(s, '/lessons/' + id, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type, 'X-Lesson-Title': encodeURIComponent(lesson.title.slice(0, 140)), 'X-Original-Bytes': String(packed.originalBytes) } }); return { bytes: blob.size, originalBytes: packed.originalBytes, compressed: packed.compressed }; }
  const path = `${s.uid}/lessons/${id}.json${packed.compressed ? '.gz' : ''}`;
  const { error } = await client.storage.from(CLOUD_BUCKET).upload(path, blob, { contentType: blob.type, upsert: true });
  if (error) throw cloudError(error); unchanged(s);
  const result = await client.from('lesson_files').upsert({ user_id: s.uid, id, title: lesson.title.slice(0, 140), path, bytes: blob.size, updated_at: new Date().toISOString() }, { onConflict: 'user_id,id' });
  if (result.error) throw cloudError(result.error); unchanged(s);
  return { bytes: blob.size, originalBytes: packed.originalBytes, compressed: packed.compressed };
}
export async function listCloudLessons(client) {
  const s = await authenticated(client);
  if (r2ApiUrl) { const response = await r2Request(s, '/lessons'); return response.json(); }
  const { data, error } = await client.from('lesson_files').select('id,title,path,bytes,updated_at').eq('user_id', s.uid).order('updated_at', { ascending: false }).limit(500);
  if (error) throw cloudError(error); unchanged(s);
  return (data || []).map(item => ({ ...item, updatedAt: item.updated_at }));
}
export async function readCloudLesson(client, path) {
  const s = await authenticated(client);
  if (path.startsWith('r2:')) { if (!/^r2:[a-zA-Z0-9_-]{1,100}$/.test(path)) throw Error('Arquivo inválido.'); const response = await r2Request(s, '/lessons/' + path.slice(3)); return unpackLesson(await response.blob()); }
  if (!path.startsWith(`${s.uid}/lessons/`) || !/^[a-f0-9-]{36}\/lessons\/[a-zA-Z0-9_-]{1,100}\.json(?:\.gz)?$/i.test(path)) throw Error('O arquivo não pertence a esta conta.');
  const { data, error } = await client.storage.from(CLOUD_BUCKET).download(path);
  if (error) throw cloudError(error); unchanged(s);
  if (data.size > MAX_CLOUD_BYTES) throw Error('Esta aula ultrapassa 50 MB.');
  const lesson = await unpackLesson(data); unchanged(s); return lesson;
}

async function r2Request(s, path, options = {}) {
  if (!r2ApiUrl || !r2ApiUrl.startsWith('https://')) throw Error('O endereço seguro do R2 ainda não foi configurado.');
  const response = await fetch(r2ApiUrl + path, { ...options, headers: { ...options.headers, Authorization: 'Bearer ' + s.token } });
  unchanged(s); if (!response.ok) throw Error('Não foi possível acessar o R2. Confira a conexão e a configuração da conta.'); return response;
}
export async function putAvatar(client, file) {
  const s = await authenticated(client);
  if (file.size > 256 * 1024) throw Error('Foto grande demais.');
  if (r2ApiUrl) { await r2Request(s, '/profile/avatar', { method: 'PUT', body: file, headers: { 'Content-Type': file.type } }); return 'r2:avatar'; }
  const path = s.uid + '/avatar.webp';
  const { error } = await client.storage.from('storage-lab-avatars').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '0' });
  if (error) throw cloudError(error); unchanged(s); return path;
}
export async function getAvatar(client, path) {
  const s = await authenticated(client);
  if (path === 'r2:avatar') { const response = await r2Request(s, '/profile/avatar'); return response.blob(); }
  if (path !== s.uid + '/avatar.webp') throw Error('Foto de outra conta.');
  const { data, error } = await client.storage.from('storage-lab-avatars').download(path);
  if (error) throw cloudError(error); unchanged(s); return data;
}
export async function removeAvatar(client, path) {
  const s = await authenticated(client);
  if (path === 'r2:avatar') { await r2Request(s, '/profile/avatar', { method: 'DELETE' }); return; }
  const { error } = await client.storage.from('storage-lab-avatars').remove([s.uid + '/avatar.webp']);
  if (error) throw cloudError(error);
}
