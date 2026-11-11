import {test,expect} from '@playwright/test';
import {mockAccounts,ids} from './auth-fixture.js';
import {Y,writeLesson,encode} from '../../src/collaboration-core.js';
import {newLesson} from '../../src/lessons.js';
import {canvasFromSlide} from '../../src/canvas-data.js';
import {decodeRealtime} from './realtime-fixture.js';
test('convite aparece no chat, abre como leitor e mostra colaboradores com permissões e fotos',async({page})=>{
 const users=await mockAccounts(page);users[0].user_metadata.avatar_path='r2:avatar';
 const group='33333333-3333-4333-8333-333333333333',id='44444444-4444-4444-8444-444444444444',revision='55555555-5555-4555-8555-555555555555',token='66666666-6666-4666-8666-666666666666';
 const row={id,group_id:group,revision,version:1,title:'Equipe'},lesson=newLesson(),doc=new Y.Doc();lesson.slides=lesson.slides.map(canvasFromSlide);writeLesson(doc,lesson);let accepted=false;
 const members=[{user_id:ids[0],display_name:'Ana',role:'viewer'},{user_id:ids[1],display_name:'Bia',role:'owner'}];
 await page.route('https://qkpgiwjsqtocvjmqinii.supabase.co/rest/v1/**',async route=>{const url=new URL(route.request().url()),name=url.pathname.split('/').pop();let data=[];
  if(name==='sl_my_invites')data=accepted?[]:[{token,document_id:id,title:'Equipe',inviter_name:'Bia',role:'viewer'}];
  if(name==='sl_chat_badge')data=accepted?0:1;
  if(name==='sl_accept_invite'){expect(route.request().postDataJSON().p_token).toBe(token);accepted=true;data=row;}
  if(name==='sl_group_documents')data=url.searchParams.has('id')?row:accepted?[row]:[];
  if(name==='sl_groups')data=accepted?[{id:group,owner_id:ids[1]}]:[];
  if(name==='sl_collaborators')data=members;
  if(name==='sl_person_profile')data=[{display_name:'Bia',avatar_path:'r2:avatar',theme:'rose',ui_style:'glass'}];
  return route.fulfill({json:data});
 });
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 await page.route('https://storage-lab-files.lagujf.workers.dev/**',route=>new URL(route.request().url()).pathname.endsWith(revision)?route.fulfill({json:{format:'sl-yjs-v1',state:encode(Y.encodeStateAsUpdate(doc))}}):route.fulfill({contentType:'image/png',body:png}));
 await page.routeWebSocket('wss://qkpgiwjsqtocvjmqinii.supabase.co/**',ws=>ws.onMessage(raw=>{const [j,r,t,e,p]=decodeRealtime(raw);ws.send(JSON.stringify([j,r,t,'phx_reply',{status:'ok',response:{postgres_changes:(p?.config?.postgres_changes||[]).map((f,i)=>({...f,id:i}))}}]));if(e==='phx_join')ws.send(JSON.stringify([null,null,t,'presence_state',{}]));}));
 await page.goto('/');await expect(page.locator('[data-chat-badge]')).toHaveText('1');await page.locator('[data-social-action=open]').click();await expect(page.locator('.chat-invites')).toContainText('Bia convidou você');await page.getByRole('button',{name:'Aceitar e abrir aula'}).click();
 await expect(page.locator('.slide-designer')).toBeVisible();expect(accepted).toBe(true);await expect(page.locator('.designer-workspace')).toHaveJSProperty('inert',true);await expect(page.locator('[data-account-profile] img')).toBeVisible();
 await page.locator('.editor-sharing > summary').click();await page.getByRole('button',{name:'Colaborar',exact:true}).click();await expect(page.getByLabel('Permissão de Ana')).toHaveValue('viewer');await expect(page.getByLabel('Permissão de Ana')).toBeDisabled();await expect(page.locator('.collaborator-list [data-person="'+ids[1]+'"] img')).toBeVisible();
 await page.screenshot({path:'test-results/collaborator-roles.png',animations:'disabled'});doc.destroy();
});
