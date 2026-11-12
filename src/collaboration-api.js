import { createUuid } from './uuid.js';
import { r2ApiUrl } from './cloud-files.js';
import { packLesson, unpackLesson } from './file-codec.js';
export async function rpc(client,name,args) {
  const {data,error}=await client.rpc(name,args);
  if(error){ if(error.code==='40001')throw Object.assign(Error('Outra edição chegou; combinando alterações…'),{conflict:true}); throw Error(error.message && !['PGRST202','42P01'].includes(error.code)?error.message:'A colaboração ainda precisa ser ativada pelo administrador do site.'); }
  return data;
}
export async function groupRequest(client,path,options={}){
  const {data}=await client.auth.getSession();if(!data.session)throw Error('Entre na conta para colaborar.');
  if(!r2ApiUrl)throw Error('Configure o Worker do R2 para compartilhar aulas.');
  const response=await fetch(r2ApiUrl+path,{...options,signal:AbortSignal.timeout(30000),headers:{...options.headers,Authorization:'Bearer '+data.session.access_token}});
  if(!response.ok){let code='';try{code=(await response.json()).error||'';}catch{}
    if(response.status===404)throw Error('O Worker publicado está desatualizado. Publique cloudflare/wrangler.toml no Cloudflare para ativar a colaboração.');
    if(response.status===401)throw Error('Sua sessão expirou ou o Worker está com configuração antiga. Entre novamente; se continuar, republique o Worker atualizado.');
    if(response.status===403)throw Error('Esta conta não tem permissão para acessar essa aula.');
    if(['rpc_failed','groups_not_configured'].includes(code))throw Error('Ative a colaboração executando supabase/setup-chat.sql no SQL Editor do Supabase.');
    throw Error('O servidor de colaboração não respondeu. Tente novamente em instantes.');
  }return response;
}
export async function getDocument(client,id){const {data,error}=await client.from('sl_group_documents').select('*').eq('id',id).single();if(error||!data)throw Error('Documento indisponível para esta conta.');return data;}
export async function getSnapshot(client,row){const response=await groupRequest(client,`/groups/${row.group_id}/${row.revision}`);const payload=await unpackLesson(await response.blob());if(payload.format!=='sl-yjs-v1'||typeof payload.state!=='string')throw Error('Documento colaborativo inválido.');return payload;}
export async function putSnapshot(client,groupId,payload){const packed=await packLesson(payload),revision=createUuid();const blob=new Blob([packed.buffer],{type:packed.compressed?'application/gzip':'application/json'});if(blob.size>50*1024*1024)throw Error('A aula compartilhada ultrapassa 50 MB.');await groupRequest(client,`/groups/${groupId}/${revision}`,{method:'PUT',body:blob,headers:{'Content-Type':blob.type}});return revision;}
