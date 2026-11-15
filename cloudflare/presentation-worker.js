const tokenPattern=/^\/presentations\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
// Código curto (6 caracteres fáceis de ler e digitar) que aponta para o token longo.
const codePattern=/^\/presentations\/code\/([a-z0-9]{6})$/i,codeForPattern=/^\/presentations\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\/code$/i;
const CODE_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function shortCode(random=crypto.getRandomValues(new Uint8Array(6))){return [...random].map(value=>CODE_ALPHABET[value%CODE_ALPHABET.length]).join('');}
async function createCode(env,token,owner){
  const saved=await env.FILES.get('presentation-code-of/'+token);if(saved)return (await saved.text()).trim();
  for(let attempt=0;attempt<6;attempt++){
    const code=shortCode();if(await env.FILES.head('presentation-codes/'+code))continue;
    await env.FILES.put('presentation-codes/'+code,token,{customMetadata:{owner}});
    await env.FILES.put('presentation-code-of/'+token,code,{customMetadata:{owner}});
    return code;
  }
  return '';
}
export async function readPublicPresentation(request,env,headers){
  const pathname=new URL(request.url).pathname,json=(body,status)=>Response.json(body,{status,headers});
  const code=codePattern.exec(pathname);
  if(code&&request.method==='GET'){
    if(!env.FILES)return json({error:'storage_not_configured'},503);
    try{const object=await env.FILES.get('presentation-codes/'+code[1].toUpperCase());if(!object)return json({error:'not_found'},404);return json({token:(await object.text()).trim()},200);}
    catch{return json({error:'storage_unavailable'},503);}
  }
  const match=tokenPattern.exec(pathname);if(!match||request.method!=='GET')return null;
  if(!env.FILES)return json({error:'storage_not_configured'},503);
  try{const object=await env.FILES.get('presentations/'+match[1].toLowerCase());if(!object)return json({error:'not_found'},404);
    const result=new Headers(headers);result.set('Content-Type','application/json');if(object.customMetadata?.format==='gzip')result.set('Content-Encoding','gzip');
    return new Response(object.body,{headers:result,encodeBody:'manual'});
  }catch{return json({error:'storage_unavailable'},503);}
}
export async function writePublicPresentation(request,env,user,headers){
  const path=new URL(request.url).pathname,match=tokenPattern.exec(path),codeFor=codeForPattern.exec(path),json=(body,status=200)=>Response.json(body,{status,headers});
  if(path!=='/presentations'&&!match&&!codeFor)return null;
  if(!env.FILES)return json({error:'storage_not_configured'},503);
  try{
    if(request.method==='POST'&&path==='/presentations'){
      const length=Number(request.headers.get('Content-Length')),type=request.headers.get('Content-Type');
      if(!Number.isSafeInteger(length)||length<1||length>50*1024*1024)return json({error:'invalid_size'},413);
      if(!['application/json','application/gzip'].includes(type))return json({error:'invalid_type'},415);
      const token=crypto.randomUUID();await env.FILES.put('presentations/'+token,request.body,{httpMetadata:{contentType:'application/json'},customMetadata:{owner:user.id,format:type==='application/gzip'?'gzip':'raw'}});
      const code=await createCode(env,token,user.id).catch(()=>'');
      return json({token,code},201);
    }
    // Link criado antes dos códigos curtos: o dono pode pedir um código para ele.
    if(request.method==='POST'&&codeFor){const token=codeFor[1].toLowerCase(),object=await env.FILES.head('presentations/'+token);if(!object)return json({error:'not_found'},404);if(object.customMetadata?.owner!==user.id)return json({error:'forbidden'},403);const code=await createCode(env,token,user.id);return code?json({token,code}):json({error:'code_unavailable'},503);}
    if(request.method==='DELETE'&&match){const key='presentations/'+match[1].toLowerCase(),object=await env.FILES.head(key);if(!object)return json({error:'not_found'},404);if(object.customMetadata?.owner!==user.id)return json({error:'forbidden'},403);await env.FILES.delete(key);try{const saved=await env.FILES.get('presentation-code-of/'+match[1].toLowerCase());if(saved){await env.FILES.delete('presentation-codes/'+(await saved.text()).trim());await env.FILES.delete('presentation-code-of/'+match[1].toLowerCase());}}catch{/* o link já foi revogado; o código órfão não abre nada */}return json({ok:true});}
    return json({error:'method_not_allowed'},405);
  }catch{return json({error:'storage_unavailable'},503);}
}
