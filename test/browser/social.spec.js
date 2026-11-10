import {decodeRealtime} from './realtime-fixture.js';
import {test,expect} from '@playwright/test';
test('solicitação por e-mail notifica, exige aceite e libera conversa com marcação de leitura',async({browser})=>{
 const people=[{id:'11111111-1111-4111-8111-111111111111',name:'Ana',email:'ana@example.com'},{id:'22222222-2222-4222-8222-222222222222',name:'Bia',email:'bia@example.com'}],contacts=[],messages=[],reads=new Map(),sockets=new Set(),contexts=[];
 const publish=(table,row,event='INSERT')=>{for(const s of sockets){const contact=table==='sl_contacts'?row:contacts.find(c=>c.id===row.contact_id);if(!contact||![contact.requester_id,contact.recipient_id].includes(s.uid))continue;const binding=s.filters.find(f=>f.table===table);if(binding)s.ws.send(JSON.stringify([s.joinRef,null,s.topic,'postgres_changes',{ids:[binding.id],data:{schema:'public',table,commit_timestamp:new Date().toISOString(),type:event,columns:Object.keys(row).map(name=>({name,type:'text'})),record:row,old_record:{},errors:null}}]));}};
 async function account(person){const user={id:person.id,email:person.email,aud:'authenticated',app_metadata:{},user_metadata:{display_name:person.name}},jwt=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
  const context=await browser.newContext();contexts.push(context);const page=await context.newPage();await page.addInitScript(({user,jwt})=>localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({user,access_token:jwt,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600})),{user,jwt});
  await page.routeWebSocket('wss://qkpgiwjsqtocvjmqinii.supabase.co/**',ws=>{const s={ws,uid:user.id,topic:'',filters:[],topics:new Set()};sockets.add(s);ws.onClose(()=>sockets.delete(s));ws.onMessage(raw=>{const [joinRef,ref,topic,event,payload]=decodeRealtime(raw);if(event==='phx_join'){s.topics.add(topic);if(topic.includes('sl-social:')){s.topic=topic;s.joinRef=joinRef;s.filters=(payload.config.postgres_changes||[]).map((f,i)=>({...f,id:i+1}));}}if(event==='broadcast')for(const peer of sockets)if(peer!==s&&peer.topics.has(topic))peer.ws.send(JSON.stringify([null,null,topic,'broadcast',payload]));ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:event==='phx_join'?{postgres_changes:s.filters}:{}}]));});});
  await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,name=path.split('/').pop(),args=req.method()==='POST'?req.postDataJSON():{};let data=[];
   if(name==='user')data=user;
   if(name==='sl_person_profile')data=people.filter(p=>p.id===args.p_user_id).map(p=>({display_name:p.name,theme:p.name==='Bia'?'rose':'ocean',ui_style:p.name==='Bia'?'aero':'classic'}));
   if(name==='sl_list_contacts')data=contacts.filter(c=>[c.requester_id,c.recipient_id].includes(user.id)).map(c=>{const other=people.find(p=>p.id===(c.requester_id===user.id?c.recipient_id:c.requester_id));return {...c,other_id:other.id,other_name:other.name,other_email:other.email};});
   if(name==='sl_chat_badge')data=contacts.filter(c=>c.recipient_id===user.id&&c.status==='pending').length+messages.filter(m=>m.author_id!==user.id&&m.created_at>(reads.get(user.id+':'+m.contact_id)||'')&&contacts.some(c=>c.id===m.contact_id&&[c.requester_id,c.recipient_id].includes(user.id))).length;
   if(name==='sl_find_contact')data=people.filter(p=>p.email===args.p_email&&p.id!==user.id).map(p=>({user_id:p.id,display_name:p.name}));
   if(name==='sl_request_contact'){const row={id:crypto.randomUUID(),requester_id:user.id,recipient_id:people.find(p=>p.email===args.p_email).id,status:'pending'};contacts.push(row);data=row;publish('sl_contacts',row);}
   if(name==='sl_respond_contact'){const row=contacts.find(c=>c.id===args.p_id);expect(row.recipient_id).toBe(user.id);row.status=args.p_accept?'accepted':'declined';publish('sl_contacts',row,'UPDATE');data=null;}
   if(name==='sl_direct_messages'){const id=new URL(req.url()).searchParams.get('contact_id')?.slice(3);data=messages.filter(m=>m.contact_id===id).reverse();}
   if(name==='sl_mark_chat_read'){reads.set(user.id+':'+args.p_contact_id,new Date().toISOString());data=null;}
   if(name==='sl_send_direct_message'){const contact=contacts.find(c=>c.id===args.p_contact_id);if(contact.status!=='accepted')return route.fulfill({status:403,json:{code:'42501',message:'Aceite necessário'}});data={id:crypto.randomUUID(),contact_id:contact.id,author_id:user.id,author_name:person.name,body:args.p_body,created_at:new Date().toISOString()};messages.push(data);publish('sl_direct_messages',data);}
   return route.fulfill({json:data});
  });await page.goto('/');await expect(page.getByRole('button',{name:person.name,exact:true})).toBeVisible();return page;
 }
 try{const ana=await account(people[0]),bia=await account(people[1]);await ana.locator('[data-social-action=open]').click();await ana.getByLabel('Adicionar pessoa pelo e-mail',{exact:true}).fill('bia@example.com');await ana.getByRole('button',{name:'Buscar',exact:true}).click();await ana.getByRole('button',{name:'Enviar solicitação',exact:true}).click();await expect(bia.locator('[data-chat-badge]')).toHaveText('1');
  await bia.locator('[data-social-action=open]').click();await bia.getByRole('button',{name:'Aceitar',exact:true}).click();await bia.getByRole('button',{name:'Fechar conversas',exact:true}).click();
  await ana.getByRole('button',{name:'Conversar com Bia',exact:true}).click();await ana.getByLabel('Mensagem',{exact:true}).fill('Oi, vamos preparar a aula?');await ana.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await expect(bia.locator('[data-chat-badge]')).toHaveText('1');
  await bia.locator('[data-social-action=open]').click();await bia.getByRole('button',{name:'Conversar com Ana',exact:true}).click();await expect(bia.locator('.chat-messages')).toContainText('Oi, vamos preparar a aula?');await expect(bia.locator('[data-chat-badge]')).toBeHidden();
  const panel = await ana.locator('.social-chat').elementHandle();
  const composer = await ana.locator('#social-message').elementHandle();
  await ana.getByLabel('Mensagem',{exact:true}).fill('Rascunho');
  await bia.getByLabel('Mensagem',{exact:true}).fill('Vamos!');await bia.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await expect(ana.locator('.chat-messages')).toContainText('Vamos!');
  expect(await panel.evaluate(node=>node===document.querySelector('.social-chat'))).toBe(true);
  expect(await composer.evaluate(node=>node===document.activeElement&&node.value==='Rascunho')).toBe(true);
  await ana.getByLabel('Mensagem',{exact:true}).fill('Preparando');await expect(bia.locator('[data-social-typing]')).toContainText('Ana está digitando');await expect(ana.locator('.chat-message.mine strong')).toHaveText('Você');await expect(ana.locator('.chat-message.mine .person-avatar')).toHaveCount(0);await expect(ana.locator('.chat-message:not(.mine) .person-avatar')).toHaveCount(1);await expect(ana.locator('.chat-message:not(.mine)')).toHaveAttribute('data-sender-style','aero');
  const bubble=ana.locator('.chat-message:not(.mine) > div');
  const luminance=rgb=>rgb.map(n=>n/255).reduce((sum,c,i)=>sum+[.2126,.7152,.0722][i]*(c<=.04045?c/12.92:((c+.055)/1.055)**2.4),0);
  for(const appearance of ['light','dark']){
    await ana.evaluate(appearance=>document.documentElement.dataset.appearance=appearance,appearance);
    const colors=await bubble.evaluate(node=>[getComputedStyle(node).color,getComputedStyle(node.querySelector('strong')).color,getComputedStyle(node.querySelector('time')).color,getComputedStyle(node).backgroundImage]);
    expect(colors[0]).toBe(colors[1]);expect(colors[0]).toBe(colors[2]);
    const ink=luminance(colors[0].match(/\d+/g).map(Number));
    for(const match of colors[3].matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)){
      const background=luminance(match.slice(1).map(Number));
      expect((Math.max(ink,background)+.05)/(Math.min(ink,background)+.05)).toBeGreaterThan(4.5);
    }
  }

 }finally{for(const context of contexts)await context.close();}
});
