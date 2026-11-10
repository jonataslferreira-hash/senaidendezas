const types=new Set(['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav']);
export async function handleChatAudio(request,env,user,headers,rpc){
 const match=/^\/chat-audio\/(dm|doc)\/([a-f0-9-]{36})\/([a-f0-9-]{36})$/i.exec(new URL(request.url).pathname);if(!match)return null;
 const json=(data,status=200)=>Response.json(data,{status,headers}),write=request.method!=='GET',key='chat-audio/'+match.slice(1).join('/');
 if(!['GET','PUT','DELETE'].includes(request.method))return json({error:'method_not_allowed'},405);
 try{if(await rpc('sl_chat_audio_access',{p_scope:match[1],p_id:match[2],p_write:write})!==true)return json({error:'forbidden'},403);}catch{return json({error:'chat_audio_not_configured'},503);}
 if(!env.FILES)return json({error:'storage_not_configured'},503);
 const existing=await env.FILES.get(key);
 if(request.method==='GET')return existing?new Response(existing.body,{headers:{...headers,'Content-Type':existing.httpMetadata?.contentType||'audio/webm','X-Content-Type-Options':'nosniff'}}):json({error:'not_found'},404);
 if(request.method==='DELETE'){if(existing?.customMetadata?.author!==user.id)return json({error:'forbidden'},403);await env.FILES.delete(key);return json({ok:true});}
 if(existing)return json({error:'already_exists'},409);
 const type=request.headers.get('Content-Type')?.split(';')[0];if(!types.has(type))return json({error:'unsupported_audio'},415);
 if(Number(request.headers.get('Content-Length'))>6*1024*1024)return json({error:'too_large'},413);
 const bytes=await request.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>6*1024*1024)return json({error:'too_large'},413);
 const b=new Uint8Array(bytes),text=new TextDecoder().decode(b.slice(0,12));if(!(type==='audio/webm'&&b[0]===0x1a&&b[1]===0x45||type==='audio/ogg'&&text.startsWith('OggS')||type==='audio/mp4'&&text.slice(4,8)==='ftyp'||type==='audio/wav'&&text.startsWith('RIFF')||type==='audio/mpeg'&&(text.startsWith('ID3')||b[0]===255&&(b[1]&224)===224)))return json({error:'invalid_audio'},415);
 await env.FILES.put(key,bytes,{httpMetadata:{contentType:type},customMetadata:{author:user.id}});return json({ok:true});
}
