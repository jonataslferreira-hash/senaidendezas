export async function handleStorageAIHistory(request,env,user,headers){
  if(new URL(request.url).pathname!=='/storage-ai/history')return null;
  const json=(value,status=200)=>Response.json(value,{status,headers});
  if(!env.FILES)return json({error:'storage_not_configured'},503);
  const key=user.id+'/storage-ai/history.json';
  try{
    if(request.method==='GET'){
      const object=await env.FILES.get(key);
      return json(object?JSON.parse(await object.text()):{sessions:[]});
    }
    if(request.method!=='PUT')return json({error:'method_not_allowed'},405);
    const body=await request.text();
    if(body.length>240000)return json({error:'too_large'},413);
    const payload=JSON.parse(body),sessions=payload?.sessions;
    if(!Array.isArray(sessions)||sessions.length>40||sessions.some(s=>!s||typeof s.id!=='string'||s.id.length>100||typeof s.title!=='string'||s.title.length>150||!Array.isArray(s.messages)||s.messages.length>60||s.messages.some(m=>!['user','assistant'].includes(m?.role)||typeof m.text!=='string'||m.text.length>5000)))return json({error:'invalid_history'},400);
    await env.FILES.put(key,body,{httpMetadata:{contentType:'application/json'}});
    return json({ok:true});
  }catch{return json({error:'history_unavailable'},503);}
}
