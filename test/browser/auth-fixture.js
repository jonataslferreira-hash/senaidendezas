export const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
export async function mockAccounts(page){
  const users=ids.map((id,i)=>({id,email:['ana@example.com','bia@example.com'][i],aud:'authenticated',app_metadata:{},user_metadata:{display_name:['Ana','Bia'][i]}}));
  const token=id=>[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
  const session=user=>({user,access_token:token(user.id),refresh_token:'refresh-'+user.id,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600});
  await page.addInitScript(s=>{if(!localStorage.getItem('sl-test-initialized')){localStorage.setItem('sl-test-initialized','true');localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify(s));}},session(users[0]));
  await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url()),auth=req.headers().authorization||'',user=users.find(u=>auth.endsWith(token(u.id)))||users[0];
    if(url.pathname.endsWith('/token')){const body=req.postDataJSON();return route.fulfill({json:session(users.find(u=>u.email===body.email)||user)});}
    if(url.pathname.endsWith('/user')){if(req.method()==='PUT')Object.assign(user.user_metadata,req.postDataJSON().data);return route.fulfill({json:user});}
    return route.fulfill({json:[]});
  });
  await page.route('https://storage-lab-files.lagujf.workers.dev/lessons',route=>route.fulfill({json:[]}));
  return users;
}
