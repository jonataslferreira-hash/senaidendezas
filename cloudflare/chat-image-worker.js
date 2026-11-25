const MAX_IMAGE = 6 * 1024 * 1024;
export async function handleChatImage(request, env, user, headers, rpc) {
  const match = /^\/chat-image\/(dm|doc)\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/i.exec(new URL(request.url).pathname);
  if (!match) return null;
  const json = (data, status = 200) => Response.json(data, {status, headers});
  if (!['GET','PUT','DELETE'].includes(request.method)) return json({error:'method_not_allowed'},405);
  try { if (await rpc('sl_chat_audio_access', {p_scope:match[1], p_id:match[2], p_write:request.method!=='GET'}) !== true) return json({error:'forbidden'},403); }
  catch { return json({error:'chat_not_configured'},503); }
  if (!env.FILES) return json({error:'storage_not_configured'},503);
  const key='chat-image/'+match.slice(1).join('/'), existing=await env.FILES.get(key);
  if (request.method==='GET') return existing ? new Response(existing.body,{headers:{...headers,'Content-Type':existing.httpMetadata.contentType,'X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}}) : json({error:'not_found'},404);
  if (request.method==='DELETE') { if (existing?.customMetadata?.author!==user.id) return json({error:'forbidden'},403); await env.FILES.delete(key); return json({ok:true}); }
  if (existing) return json({error:'already_exists'},409);
  const type=request.headers.get('Content-Type')?.split(';')[0];
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(type)) return json({error:'unsupported_image'},415);
  if (Number(request.headers.get('Content-Length'))>MAX_IMAGE) return json({error:'too_large'},413);
  const bytes=await request.arrayBuffer(); if (!bytes.byteLength||bytes.byteLength>MAX_IMAGE) return json({error:'too_large'},413);
  const b=new Uint8Array(bytes), text=new TextDecoder().decode(b.slice(0,12));
  const valid=type==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255 || type==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v) || type==='image/webp'&&text.startsWith('RIFF')&&text.slice(8,12)==='WEBP' || type==='image/gif'&&/^GIF8[79]a/.test(text);
  if (!valid) return json({error:'invalid_image'},415);
  await env.FILES.put(key,bytes,{httpMetadata:{contentType:type},customMetadata:{author:user.id}}); return json({ok:true});
}
