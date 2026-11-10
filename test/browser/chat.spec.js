import {decodeRealtime} from './realtime-fixture.js';
import {test,expect} from '@playwright/test';
test('chat entrega mensagens entre duas contas, escapa HTML e recupera histórico',async({browser})=>{
  const documentId='33333333-3333-4333-8333-333333333333',groupId='44444444-4444-4444-8444-444444444444',rows=[],sockets=new Set(),contexts=[];
  async function user(name,n){
    const uid=`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`,person={id:uid,email:name+'@example.com',aud:'authenticated',app_metadata:{},user_metadata:{display_name:name}};
    const token=[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
    const context=await browser.newContext({viewport:{width:1280,height:900}});contexts.push(context);const page=await context.newPage();
    await page.addInitScript(({person,token})=>localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({user:person,access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600})),{person,token});
    await page.routeWebSocket('wss://qkpgiwjsqtocvjmqinii.supabase.co/**',ws=>{
      const socket={ws,topic:'',joinRef:null};sockets.add(socket);ws.onClose(()=>sockets.delete(socket));
      ws.onMessage(raw=>{const [joinRef,ref,topic,event,payload]=decodeRealtime(raw);if(event==='phx_join'){if(topic.endsWith('sl-chat:'+documentId)){socket.topic=topic;socket.joinRef=joinRef;}ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:(payload.config?.postgres_changes||[]).map(c=>({...c,id:1}))}}]));}else ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]));});
    });
    await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',async route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      if(path.endsWith('/user'))return route.fulfill({json:person});
      if(path.endsWith('/sl_group_documents'))return route.fulfill({json:[{id:documentId,group_id:groupId,title:'Aula em equipe'}]});
      if(path.endsWith('/sl_document_role'))return route.fulfill({json:n===1?'owner':'commenter'});
      if(path.endsWith('/sl_groups'))return route.fulfill({json:[{id:groupId,name:'Equipe'}]});
      if(path.endsWith('/sl_chat_messages'))return route.fulfill({json:[...rows].reverse()});
      if(path.endsWith('/sl_send_chat_message')){
        const body=req.postDataJSON();expect(body.p_document_id).toBe(documentId);
        const row={id:crypto.randomUUID(),document_id:documentId,author_id:uid,author_name:name,body:body.p_body,slide_id:body.p_slide_id,created_at:new Date().toISOString()};rows.push(row);
        for(const s of sockets)if(name==='Ana'&&s.topic.endsWith('sl-chat:'+documentId))s.ws.send(JSON.stringify([s.joinRef,null,s.topic,'postgres_changes',{ids:[1],data:{schema:'public',table:'sl_chat_messages',commit_timestamp:row.created_at,columns:Object.keys(row).map(name=>({name,type:'text'})),type:'INSERT',record:row,old_record:{},errors:null}}]));
        return route.fulfill({json:row});
      }
      return route.fulfill({json:[]});
    });
    await page.goto('/');await expect(page.getByRole('button',{name,exact:true})).toBeVisible();await page.locator('.studio-rail [data-social-action=open]').click();await page.getByRole('button',{name:'Conversas de aulas',exact:true}).click();await expect(page.locator('#chat-message')).toBeEnabled();return page;
  }
  try{
    const ana=await user('Ana',1),bia=await user('Bia',2);
    await ana.getByLabel('Mensagem',{exact:true}).fill('Vamos melhorar este slide?');await ana.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await expect(bia.locator('.chat-messages')).toContainText('Vamos melhorar este slide?');
    await bia.getByLabel('Mensagem',{exact:true}).fill('<img src=x onerror=alert(1)>');await bia.getByRole('button',{name:'Enviar mensagem',exact:true}).click();await expect(ana.locator('.chat-messages')).toContainText('<img src=x onerror=alert(1)>');await expect(ana.locator('.chat-messages img')).toHaveCount(0);
    await ana.reload();await ana.locator('.studio-rail [data-social-action=open]').click();await ana.getByRole('button',{name:'Conversas de aulas',exact:true}).click();await expect(ana.locator('.chat-message')).toHaveCount(2);await ana.setViewportSize({width:390,height:844});expect(await ana.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await ana.screenshot({path:'test-results/chat-mobile.png',animations:'disabled'});
  }finally{for(const context of contexts)await context.close();}
});
