import {test,expect} from '@playwright/test';
import {Y,writeLesson,encode,decode,readLesson} from '../../src/collaboration-core.js';
import {unpackLesson} from '../../src/codec-core.js';
import {canvasFromSlide} from '../../src/canvas-data.js';
import {newLesson,validateLesson} from '../../src/lessons.js';

test('duas contas editam o mesmo texto ao vivo, salvam versões concorrentes e recuperam a aula ao recarregar',async({browser})=>{
  const group='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333',revision='44444444-4444-4444-8444-444444444444';
  const lesson=validateLesson(newLesson());lesson.slides[0].title='AB';lesson.slides=lesson.slides.map(canvasFromSlide);const doc=new Y.Doc();writeLesson(doc,lesson);
  let row={id,group_id:group,revision,version:1,title:lesson.title,updated_at:new Date().toISOString()};
  const files=new Map([[`/groups/${group}/${revision}`,Buffer.from(JSON.stringify({format:'sl-yjs-v1',state:encode(Y.encodeStateAsUpdate(doc))}))]]);
  const sockets=new Set();let delayed=false;let secondRole="editor";const pending=[];
  const deliver=(source,event,payload)=>{for(const peer of sockets)if(peer!==source&&peer.topic===source.topic)peer.ws.send(JSON.stringify([null,null,peer.topic,event,payload]));};
  async function makeUser(n,name){
    const uid=`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`,email=name.toLowerCase()+'@example.com';
    const user={id:uid,email,aud:'authenticated',app_metadata:{provider:'email'},user_metadata:{display_name:name}};
    const token=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'test'].join('.');
    const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
    await page.addInitScript(({user,token})=>{if(!localStorage.getItem('sb-qkpgiwjsqtocvjmqinii-auth-token'))localStorage.setItem('sb-qkpgiwjsqtocvjmqinii-auth-token',JSON.stringify({access_token:token,refresh_token:'refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,user}));},{user,token});
    await page.routeWebSocket('wss://qkpgiwjsqtocvjmqinii.supabase.co/**',ws=>{
      const socket={ws,topic:''};sockets.add(socket);
      ws.onMessage(raw=>{
        let message;
        if(typeof raw!=='string' && raw[0]===3){
          const bytes=Buffer.from(raw),sizes=[...bytes.subarray(1,6)];let offset=7;const fields=sizes.map(size=>{const value=bytes.subarray(offset,offset+size).toString();offset+=size;return value;});
          message=[fields[0],fields[1],fields[2],'broadcast',{type:'broadcast',event:fields[3],payload:JSON.parse(bytes.subarray(offset).toString())}];
        }else message=JSON.parse(String(raw));
        const [joinRef,ref,topic,event,payload]=message;
        const reply=()=>ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]));
        if(event==='phx_join'){socket.topic=topic;reply();ws.send(JSON.stringify([null,null,topic,'presence_state',{}]));}
        else if(event==='broadcast'){reply();if(delayed)pending.push(()=>deliver(socket,'broadcast',payload));else deliver(socket,'broadcast',payload);}
        else if(event==='presence'){reply();ws.send(JSON.stringify([null,null,topic,'presence_state',{[uid]:{metas:[{phx_ref:uid,...payload.payload}]}}]));}
        else reply();
      });ws.onClose(()=>sockets.delete(socket));
    });
    await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/**',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.pathname.endsWith('/user'))return route.fulfill({json:user});
      if(url.pathname.endsWith('/sl_group_documents'))return route.fulfill({json:url.searchParams.has('id')?row:[row]});
      if(url.pathname.endsWith('/sl_broadcast_document')){const args=request.postDataJSON(),topic='realtime:sl-doc-v2:'+id;const send=()=>{for(const peer of sockets)if(peer.topic===topic)peer.ws.send(JSON.stringify([null,null,topic,'broadcast',{type:'broadcast',event:args.p_event,payload:args.p_data?{data:args.p_data,client:args.p_client}:{}}]));};if(delayed)pending.push(send);else send();return route.fulfill({json:null});}
      if(url.pathname.endsWith('/sl_set_collaborator_role')){expect(n).toBe(1);secondRole=request.postDataJSON().p_role;return route.fulfill({json:null});}
      if(url.pathname.endsWith('/sl_collaborators'))return route.fulfill({json:[{user_id:'11111111-1111-4111-8111-000000000001',display_name:'Ana',role:'owner'},{user_id:'11111111-1111-4111-8111-000000000002',display_name:'Bruno',role:secondRole}]});
      if(url.pathname.endsWith('/sl_groups'))return route.fulfill({json:[{id:group,name:'Grupo',owner_id:'11111111-1111-4111-8111-000000000001'}]});
      if(url.pathname.endsWith('/sl_publish_group_doc')){
        const args=request.postDataJSON();if(args.p_expected_version!==row.version)return route.fulfill({status:409,json:{code:'40001',message:'Versão mudou'}});
        row={...row,version:row.version+1,revision:args.p_revision,title:args.p_title};return route.fulfill({json:row});
      }
      return route.fulfill({json:[]});
    });
    await page.route('https://storage-lab-files.lagujf.workers.dev/**',async route=>{
      const request=route.request(),path=new URL(request.url()).pathname;
      if(request.method()==='PUT'){files.set(path,request.postDataBuffer());return route.fulfill({json:{ok:true}});}
      if(request.method()==='DELETE'){if(!path.endsWith(row.revision))files.delete(path);return route.fulfill({json:{ok:true}});}
      const file=files.get(path);return file?route.fulfill({body:file,contentType:'application/octet-stream'}):route.fulfill({status:404,json:{error:'not_found'}});
    });
    await page.goto('/?page=editor&collab='+id);
    await expect(page.locator('[data-collab-status]')).toContainText(/Edição ao vivo conectada|Salvo no grupo|Alterações por salvar/);
    await page.getByRole('button',{name:'Campos',exact:true}).click();
    return{page,context};
  }
  const ana=await makeUser(1,'Ana'),bruno=await makeUser(2,'Bruno');
  try{
    delayed=true;
    await ana.page.getByLabel('Texto do elemento',{exact:true}).fill('AxB');
    await bruno.page.getByLabel('Texto do elemento',{exact:true}).fill('AyB');
    await expect.poll(()=>pending.length).toBeGreaterThanOrEqual(2);
    delayed=false;pending.splice(0).forEach(fn=>fn());
    await expect(ana.page.getByLabel('Texto do elemento',{exact:true})).toHaveValue(/A[xy]{2}B/);
    await expect(bruno.page.getByLabel('Texto do elemento',{exact:true})).toHaveValue(await ana.page.getByLabel('Texto do elemento',{exact:true}).inputValue());
    await Promise.all([ana.page.keyboard.press('Control+s'),bruno.page.getByRole('button',{name:'Salvar aula',exact:true}).click()]);
    await expect.poll(()=>row.version).toBeGreaterThan(1);
    await expect(ana.page.locator('.save-state')).toHaveText('Salvo no grupo');
    const stored=await unpackLesson(new Blob([files.get(`/groups/${group}/${row.revision}`)])),saved=new Y.Doc();Y.applyUpdate(saved,decode(stored.state));
    expect(readLesson(saved).slides[0].title).toMatch(/A[xy]{2}B/);saved.destroy();
    await bruno.page.reload();await expect(bruno.page.locator('.slide-designer')).toBeVisible();
    await bruno.page.getByRole('button',{name:'Campos',exact:true}).click();await expect(bruno.page.getByLabel('Texto do elemento',{exact:true})).toHaveValue(/A[xy]{2}B/);
    await ana.page.screenshot({path:'test-results/collaboration-editor.png',fullPage:true,animations:'disabled'});
    await ana.page.getByRole('button',{name:'Colaborar',exact:true}).click();await ana.page.getByLabel('Permissão de Bruno').selectOption('commenter');await expect.poll(()=>secondRole).toBe('commenter');await bruno.page.reload();await expect(bruno.page.locator('.designer-workspace')).toHaveJSProperty('inert',true);await expect(ana.page.getByLabel('Permissão de Bruno')).toHaveValue('commenter');
  }finally{await ana.context.close();await bruno.context.close();doc.destroy();}
});
