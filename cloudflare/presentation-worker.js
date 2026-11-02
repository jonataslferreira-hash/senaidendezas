const tokenPattern=/^\/presentations\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
export async function readPublicPresentation(request,env,headers){
  const match=tokenPattern.exec(new URL(request.url).pathname);if(!match||request.method!=='GET')return null;
  const json=(body,status)=>Response.json(body,{status,headers});
  if(!env.FILES)return json({error:'storage_not_configured'},503);
  try{const object=await env.FILES.get('presentations/'+match[1].toLowerCase());if(!object)return json({error:'not_found'},404);
    const result=new Headers(headers);result.set('Content-Type','application/json');if(object.customMetadata?.format==='gzip')result.set('Content-Encoding','gzip');
    return new Response(object.body,{headers:result,encodeBody:'manual'});
  }catch{return json({error:'storage_unavailable'},503);}
}
export async function writePublicPresentation(request,env,user,headers){
  const path=new URL(request.url).pathname,match=tokenPattern.exec(path),json=(body,status=200)=>Response.json(body,{status,headers});
  if(path!=='/presentations'&&!match)return null;
  if(!env.FILES)return json({error:'storage_not_configured'},503);
  try{
    if(request.method==='POST'&&path==='/presentations'){
      const length=Number(request.headers.get('Content-Length')),type=request.headers.get('Content-Type');
      if(!Number.isSafeInteger(length)||length<1||length>50*1024*1024)return json({error:'invalid_size'},413);
      if(!['application/json','application/gzip'].includes(type))return json({error:'invalid_type'},415);
      const token=crypto.randomUUID();await env.FILES.put('presentations/'+token,request.body,{httpMetadata:{contentType:'application/json'},customMetadata:{owner:user.id,format:type==='application/gzip'?'gzip':'raw'}});
      return json({token},201);
    }
    if(request.method==='DELETE'&&match){const key='presentations/'+match[1].toLowerCase(),object=await env.FILES.head(key);if(!object)return json({error:'not_found'},404);if(object.customMetadata?.owner!==user.id)return json({error:'forbidden'},403);await env.FILES.delete(key);return json({ok:true});}
    return json({error:'method_not_allowed'},405);
  }catch{return json({error:'storage_unavailable'},503);}
}
