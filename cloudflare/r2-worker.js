const MAX_FILE = 50 * 1024 * 1024;
const defaults = ['https://jonataslferreira-hash.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];
export function createR2Handler(verifyUser = async (token, env) => {
  const response = await fetch((env.SUPABASE_URL || 'https://qkpgiwjsqtocvjmqinii.supabase.co') + '/auth/v1/user', { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-CT7iCR3355qijcVioyRkA_-Njn3Q4e', Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('unauthorized'); return response.json();
}) {
  return async function handle(request, env) {
    const origin = request.headers.get('Origin'), allowed = (env.ALLOWED_ORIGINS || defaults.join(',')).split(',').map(s => s.trim());
    if (origin && !allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 });
    const headers = { 'Access-Control-Allow-Origin': origin || allowed[0], 'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Lesson-Title,X-Original-Bytes', 'Cache-Control': 'private, no-store', Vary: 'Origin' };
    const json = (body, status = 200) => Response.json(body, { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const token = /^Bearer ([A-Za-z0-9_.-]{20,16384})$/.exec(request.headers.get('Authorization') || '')?.[1];
    if (!token) return json({ error: 'unauthorized' }, 401);
    let user;
    try { user = await verifyUser(token, env); } catch { return json({ error: 'unauthorized' }, 401); }
    if (!user || !/^[a-f0-9-]{36}$/i.test(user.id) || !user.email_confirmed_at || user.is_anonymous) return json({ error: 'unauthorized' }, 401);
    if (!env.FILES) return json({ error: 'storage_not_configured' }, 503);
    const url = new URL(request.url), avatar = url.pathname === '/profile/avatar', match = /^\/lessons\/([a-zA-Z0-9_-]{1,100})$/.exec(url.pathname);
    try {
      if (url.pathname === '/lessons' && request.method === 'GET') {
        const items = []; let cursor;
        do {
          const page = await env.FILES.list({ prefix: user.id + '/lessons/', include: ['customMetadata'], limit: 100, cursor });
          for (const object of page.objects) items.push({ path: 'r2:' + object.key.split('/').pop(), title: object.customMetadata?.title || 'Minha aula', bytes: object.size, updatedAt: object.uploaded.toISOString() });
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
      if (avatar && request.method === 'DELETE') { await env.FILES.delete(key); return json({ ok: true }); }
      if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, 405);
      const length = Number(request.headers.get('Content-Length')), type = request.headers.get('Content-Type');
      if (!Number.isSafeInteger(length) || length < 1) return json({ error: 'content_length_required' }, 411);
      if (length > (avatar ? 256 * 1024 : MAX_FILE)) return json({ error: 'too_large' }, 413);
      if (!(avatar ? ['image/webp', 'image/png', 'image/jpeg'] : ['application/json', 'application/gzip']).includes(type)) return json({ error: 'invalid_type' }, 415);
      let title = 'Minha aula'; try { title = decodeURIComponent(request.headers.get('X-Lesson-Title') || title).slice(0, 140); } catch { return json({ error: 'invalid_title' }, 400); }
      await env.FILES.put(key, request.body, { httpMetadata: { contentType: avatar ? type : 'application/json' }, customMetadata: { title, format: type === 'application/gzip' ? 'gzip' : 'raw' } });
      return json({ ok: true });
    } catch { return json({ error: 'storage_unavailable' }, 503); }
  };
}
export default { fetch: createR2Handler() };
