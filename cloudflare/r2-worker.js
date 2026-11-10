import { handleStorageAI, storageAIEnabled } from './storage-ai-worker.js';
import {handleStorageAIHistory} from './storage-ai-history-worker.js';
import {handleChatAudio} from './chat-audio-worker.js';
import { handleCollaboration } from './collaboration-worker.js';
import { handleMusic } from './music-worker.js';
import { readPublicPresentation, writePublicPresentation } from './presentation-worker.js';
const MAX_FILE = 50 * 1024 * 1024;
const defaults = ['https://jonataslferreira-hash.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];
export function createR2Handler(verifyUser = async (token, env) => {
  const response = await fetch((env.SUPABASE_URL || 'https://qkpgiwjsqtocvjmqinii.supabase.co') + '/auth/v1/user', { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-CT7iCR3355qijcVioyRkA_-Njn3Q4e', Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('unauthorized'); return response.json();
}, callRpc = async (token, env, name, args) => {
  const response = await fetch((env.SUPABASE_URL || 'https://qkpgiwjsqtocvjmqinii.supabase.co') + '/rest/v1/rpc/' + name, { method:'POST', headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-CT7iCR3355qijcVioyRkA_-Njn3Q4e', Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000) });
  if(!response.ok)throw Error('rpc_failed'); return response.json();
}) {
  return async function handle(request, env) {
    const origin = request.headers.get('Origin'), allowed = (env.ALLOWED_ORIGINS || defaults.join(',')).split(',').map(s => s.trim());
    if (origin && !allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 });
    const headers = { 'Access-Control-Allow-Origin': origin || allowed[0], 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Lesson-Title,X-Original-Bytes,X-Lesson-Origin', 'Cache-Control': 'private, no-store', Vary: 'Origin' };
    const json = (body, status = 200) => Response.json(body, { status, headers });
    if(new URL(request.url).pathname==='/health'&&request.method==='GET')return json({version:16,storageAI:storageAIEnabled(env),storageAIMedia:storageAIEnabled(env),storageAIHistory:Boolean(env.FILES),lessonCovers:true,lessonDeletion:true,voiceChat:true,collaboration:true,animatedAvatars:true,roles:true,people:true});
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const publicPresentation=await readPublicPresentation(request,env,headers);if(publicPresentation)return publicPresentation;
    const token = /^Bearer ([A-Za-z0-9_.-]{20,16384})$/.exec(request.headers.get('Authorization') || '')?.[1];
    if (!token) return json({ error: 'unauthorized' }, 401);
    let user;
    try { user = await verifyUser(token, env); } catch { return json({ error: 'unauthorized' }, 401); }
    if (!user || !/^[a-f0-9-]{36}$/i.test(user.id) || !user.email_confirmed_at || user.is_anonymous) return json({ error: 'unauthorized' }, 401);
    const ai=await handleStorageAI(request,env,user,headers);
    if(ai)return ai;
    const aiHistory=await handleStorageAIHistory(request,env,user,headers);if(aiHistory)return aiHistory;
    const chatAudio=await handleChatAudio(request,env,user,headers,(name,args)=>callRpc(token,env,name,args));if(chatAudio)return chatAudio;
    const person=/^\/people\/([a-f0-9-]{36})\/avatar$/i.exec(new URL(request.url).pathname);
    if(person){
      if(request.method!=='GET')return json({error:'method_not_allowed'},405);
      try{
        const uid=person[1].toLowerCase();
        if(await callRpc(token,env,'sl_profile_access',{p_user_id:uid})!==true)return json({error:'forbidden'},403);
        const object=await env.FILES?.get(uid+'/profile/avatar');if(!object)return json({error:'not_found'},404);
        return new Response(object.body,{headers:{...headers,'Content-Type':object.httpMetadata?.contentType||'image/webp'}});
      }catch{return json({error:'profiles_not_configured'},503);}
    }
    const published=await writePublicPresentation(request,env,user,headers);if(published)return published;
    const music = await handleMusic(request, env, headers); if (music) return music;
    const collaboration = await handleCollaboration(request, env, user, headers, (name,args) => callRpc(token,env,name,args));
    if (collaboration) return collaboration;
    if (!env.FILES) return json({ error: 'storage_not_configured' }, 503);
    const url = new URL(request.url), avatar = url.pathname === '/profile/avatar', match = /^\/lessons\/([a-zA-Z0-9_-]{1,100})$/.exec(url.pathname);
    const cover=/^\/lessons\/([a-zA-Z0-9_-]{1,100})\/cover$/.exec(url.pathname);
    try {
      if(cover){
        const key=user.id+'/lesson-covers/'+cover[1];
        if(request.method==='GET'){
          const object=await env.FILES.get(key);
          return object?new Response(object.body,{headers:{...headers,'Content-Type':object.httpMetadata?.contentType||'image/webp'}}):json({error:'not_found'},404);
        }
        if(request.method!=='PUT')return json({error:'method_not_allowed'},405);
        const length=Number(request.headers.get('Content-Length')), type=request.headers.get('Content-Type');
        if(length<1||length>50000||!['image/webp','image/png','image/jpeg'].includes(type))return json({error:'invalid_cover'},400);
        const bytes=await request.arrayBuffer();
        if(bytes.byteLength!==length)return json({error:'invalid_cover'},400);
        await env.FILES.put(key,bytes,{httpMetadata:{contentType:type}});
        return json({ok:true});
      }
      if (url.pathname === '/lessons' && request.method === 'GET') {
        const items = []; let cursor;
        do {
          const page = await env.FILES.list({ prefix: user.id + '/lessons/', include: ['customMetadata'], limit: 100, cursor });
          for (const object of page.objects) items.push({ path: 'r2:' + object.key.split('/').pop(), title: object.customMetadata?.title || 'Minha aula', bytes: object.size, updatedAt: object.uploaded.toISOString(), generatedByAI:object.customMetadata?.origin==='ai' });
          cursor = page.truncated ? page.cursor : undefined;
        } while (cursor && items.length < 500);
        return json(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      }
      if (!avatar && !match) return json({ error: 'not_found' }, 404);
      const key = user.id + (avatar ? '/profile/avatar' : '/lessons/' + match[1]);
      if (request.method === 'GET') {
        const object = await env.FILES.get(key); if (!object) return json({ error: 'not_found' }, 404);
        const responseHeaders = new Headers(headers); responseHeaders.set('Content-Type', object.httpMetadata?.contentType || (avatar ? 'image/webp' : 'application/json'));
        if (!avatar && object.customMetadata?.format === 'gzip') responseHeaders.set('Content-Encoding', 'gzip');
        return new Response(object.body, { headers: responseHeaders, encodeBody: 'manual' });
      }
      if (request.method === 'DELETE') { await env.FILES.delete(key); if(match)await env.FILES.delete(user.id+'/lesson-covers/'+match[1]);return json({ ok: true }); }
      if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, 405);
      const length = Number(request.headers.get('Content-Length')), type = request.headers.get('Content-Type');
      if (!Number.isSafeInteger(length) || length < 1) return json({ error: 'content_length_required' }, 411);
      if (length > (avatar ? 256 * 1024 : MAX_FILE)) return json({ error: 'too_large' }, 413);
      if (!(avatar ? ['image/webp','image/png','image/jpeg','image/gif'] : ['application/json', 'application/gzip']).includes(type)) return json({ error: 'invalid_type' }, 415);
      let title = 'Minha aula'; try { title = decodeURIComponent(request.headers.get('X-Lesson-Title') || title).slice(0, 140); } catch { return json({ error: 'invalid_title' }, 400); }
      await env.FILES.put(key, request.body, { httpMetadata: { contentType: avatar ? type : 'application/json' }, customMetadata: { title, format: type === 'application/gzip' ? 'gzip' : 'raw', ...(request.headers.get('X-Lesson-Origin')==='ai'?{origin:'ai'}:{}) } });
      return json({ ok: true });
    } catch { return json({ error: 'storage_unavailable' }, 503); }
  };
}
export default { fetch: createR2Handler() };
