import {r2ApiUrl} from './cloud-files.js';
async function request(path,body,token){
 if(!r2ApiUrl)throw Error('A identificação para o Classroom ainda não está configurada.');
 let response;try{response=await fetch(r2ApiUrl+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}catch{throw Error('Não foi possível confirmar sua identidade Google.');}
 if(!response.ok)throw Error(response.status===403?'Conecte o Google à sua conta antes de identificar-se.':'Não foi possível confirmar sua identidade Google.');
 return response.json();
}
export async function issueIdentityProof(client,code,nonce){const {data,error}=await client.auth.getSession();if(error||!data.session)throw Error('Entre na sua conta para identificar-se.');const result=await request('/classroom-identity/proof',{code,nonce},data.session.access_token);if(typeof result.proof!=='string')throw Error('Não foi possível confirmar sua identidade Google.');return result.proof;}
export async function verifyIdentityProof(code,nonce,proof){const result=await request('/classroom-identity/verify',{code,nonce,proof});if(!/^\d{5,40}$/.test(result.googleUserId||''))throw Error('Identidade inválida.');return result.googleUserId;}
