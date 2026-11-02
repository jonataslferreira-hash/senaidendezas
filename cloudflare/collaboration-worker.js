const uuid = '[a-f0-9-]{36}';
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function handleCollaboration(request, env, user, headers, rpc) {
  const path = new URL(request.url).pathname, json = (value,status=200) => Response.json(value,{status,headers});
  if(path==='/collaboration/status'){
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    try{const enabled=await rpc('sl_group_access',{p_group_id:'00000000-0000-0000-0000-000000000000'});if(typeof enabled!=='boolean')throw Error();return json({ready:true,emailConfigured:Boolean(env.RESEND_API_KEY&&env.INVITE_FROM)});}
    catch{return json({error:'groups_not_configured'},503);}
  }
  const file = new RegExp(`^/groups/(${uuid})/(${uuid})$`, 'i').exec(path);
  const avatar = new RegExp(`^/groups/(${uuid})/avatars/(${uuid})$`, 'i').exec(path);
  if (!file && !avatar && path !== '/collaboration/invite') return null;
  if (path === '/collaboration/invite') {
    if (request.method !== 'POST') return json({error:'method_not_allowed'},405);
    const reader = request.body?.getReader(); let size=0, chunks=[];
    if (!reader) return json({error:'invalid_request'},400);
    try {
      for (;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>4096){await reader.cancel();return json({error:'too_large'},413);} chunks.push(value); }
      const body=JSON.parse(await new Blob(chunks).text());
      if (!new RegExp(`^${uuid}$`,'i').test(body.documentId) || typeof body.email!=='string' || body.email.length>254) return json({error:'invalid_request'},400);
      const invite = body.role ? await rpc('sl_invite_with_role',{p_document_id:body.documentId,p_email:body.email,p_role:body.role}) : await rpc('sl_invite_collaborator',{p_document_id:body.documentId,p_email:body.email});
      const link = new URL(env.SITE_URL || 'https://jonataslferreira-hash.github.io/senaidendezas/'); link.searchParams.set('invite',invite.token);
      if (!env.RESEND_API_KEY || !env.INVITE_FROM) return json({sent:false,link:link.href,reason:'email_not_configured'});
      const response = await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.INVITE_FROM,to:[invite.email],subject:'Convite para colaborar: '+invite.title,html:`<h2>Vamos criar uma aula juntos?</h2><p>${esc(user.user_metadata?.display_name || 'Um professor')} convidou você para editar <strong>${esc(invite.title)}</strong>.</p><p><a href="${esc(link.href)}">Abrir aula compartilhada</a></p><p>Entre ou crie uma conta usando este mesmo e-mail. O convite expira em 7 dias.</p>`}),signal:AbortSignal.timeout(10000)});
      return json({sent:response.ok,link:link.href,...(!response.ok?{reason:'email_delivery_failed'}:{})});
    } catch { return json({error:'invitation_failed'},403); }
  }
  const groupId=(file||avatar)[1].toLowerCase();
  try { if (await rpc('sl_group_access',{p_group_id:groupId}) !== true) return json({error:'forbidden'},403); }
  catch { return json({error:'groups_not_configured'},503); }
  if (!env.FILES) return json({error:'storage_not_configured'},503);
  const key=avatar?avatar[2].toLowerCase()+'/profile/avatar':`groups/${groupId}/${file[2].toLowerCase()}`;
  try {
    if(!avatar && ['PUT','DELETE'].includes(request.method) && await rpc('sl_group_edit_access',{p_group_id:groupId})!==true)return json({error:'forbidden'},403);
    if(avatar && await rpc('sl_group_contains_user',{p_group_id:groupId,p_user_id:avatar[2].toLowerCase()}) !== true) return json({error:'forbidden'},403);
    if(request.method==='GET') {
      const object=await env.FILES.get(key); if(!object)return json({error:'not_found'},404);
      const responseHeaders=new Headers(headers); responseHeaders.set('Content-Type',object.httpMetadata?.contentType || (avatar?'image/webp':'application/json'));
      if(!avatar && object.customMetadata?.format==='gzip')responseHeaders.set('Content-Encoding','gzip');
      return new Response(object.body,{headers:responseHeaders,encodeBody:'manual'});
    }
    if(!avatar && request.method==='DELETE') {
      if(await rpc('sl_revision_unused',{p_group_id:groupId,p_revision:file[2].toLowerCase()})!==true)return json({error:'revision_in_use'},409);
      await env.FILES.delete(key);return json({ok:true});
    }
    if(avatar || request.method!=='PUT')return json({error:'method_not_allowed'},405);
    const length=Number(request.headers.get('Content-Length')),type=request.headers.get('Content-Type');
    if(!Number.isSafeInteger(length)||length<1||length>50*1024*1024)return json({error:'invalid_size'},413);
    if(!['application/json','application/gzip'].includes(type))return json({error:'invalid_type'},415);
    const object=await env.FILES.put(key,request.body,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'},customMetadata:{format:type==='application/gzip'?'gzip':'raw'}});
    return object?json({ok:true}):json({error:'revision_exists'},409);
  } catch { return json({error:'storage_unavailable'},503); }
}
