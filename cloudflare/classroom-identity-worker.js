// Prova temporária, vinculada à conexão P2P: nunca entrega o token do aluno ao professor.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const un64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function key(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function classroomIdentity(request,env,headers,user){
 const path=new URL(request.url).pathname;if(!['/classroom-identity/proof','/classroom-identity/verify'].includes(path))return null;
 const json=(body,status=200)=>Response.json(body,{status,headers});
 if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 if(!env.CLASSROOM_IDENTITY_SECRET||env.CLASSROOM_IDENTITY_SECRET.length<32)return json({error:'identity_not_configured'},503);
 let input;try{const raw=await request.text();if(raw.length>4096)throw Error();input=JSON.parse(raw);}catch{return json({error:'invalid_request'},400);}
 if(!/^\d{6}$/.test(input?.code||'')||!uuid.test(input?.nonce||''))return json({error:'invalid_request'},400);
 const hmac=await key(env.CLASSROOM_IDENTITY_SECRET);
 if(path.endsWith('/proof')){
  if(!user)return json({error:'unauthorized'},401);
  // A identidade vem da resposta autenticada do Supabase, nunca do corpo enviado pelo navegador.
  const identities=(user.identities||[]).filter(i=>i.provider==='google'),sub=identities[0]?.identity_data?.sub;
  if(identities.length!==1||typeof sub!=='string'||!/^\d{5,40}$/.test(sub))return json({error:'google_not_linked'},403);
  const data=b64(enc.encode(JSON.stringify({code:input.code,nonce:input.nonce,sub,exp:Date.now()+120000})));
  const sig=b64(new Uint8Array(await crypto.subtle.sign('HMAC',hmac,enc.encode(data))));return json({proof:data+'.'+sig});
 }
 if(typeof input.proof!=='string'||input.proof.length>2048)return json({error:'invalid_proof'},400);
 try{
  const [data,sig,...rest]=input.proof.split('.');if(rest.length||!data||!sig||!/^[-_a-zA-Z0-9]+$/.test(data)||!/^[-_a-zA-Z0-9]+$/.test(sig))throw Error();
  const sigBytes=un64(sig);if(b64(sigBytes)!==sig||!await crypto.subtle.verify('HMAC',hmac,sigBytes,enc.encode(data)))throw Error();
  const payload=JSON.parse(new TextDecoder().decode(un64(data))),now=Date.now();
  if(payload.code!==input.code||payload.nonce!==input.nonce||!/^\d{5,40}$/.test(payload.sub)||!Number.isSafeInteger(payload.exp)||payload.exp<now||payload.exp>now+120000)throw Error();
  return json({googleUserId:payload.sub});
 }catch{return json({error:'invalid_proof'},403);}
}
