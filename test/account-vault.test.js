import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountVault} from '../src/account-vault.js';
import {newElement,normalizeElements} from '../src/canvas-data.js';
test('contas conservam sessões distintas, atualizam refresh e removem só a conta escolhida, sem guardar senha',()=>{
  let stored;const vault=new AccountVault({getItem:()=>stored,setItem:(key,value)=>{stored=value;}});
  const session=(id,refresh)=>({user:{id,email:id+'@example.com',user_metadata:{display_name:id}},access_token:'access-'+id,refresh_token:refresh,password:'never-store'});
  vault.save(session('ana','old'));vault.save(session('bia','bia-token'));vault.save(session('ana','rotated'));
  assert.equal(vault.list().length,2);assert.equal(vault.list()[0].refresh_token,'rotated');assert.ok(!stored.includes('never-store'));
  vault.remove('ana');assert.deepEqual(vault.list().map(s=>s.user.id),['bia']);stored='{broken';assert.deepEqual(vault.list(),[]);
});
test('enquadramento da imagem preserva pan fora da moldura e zoom acima de 4× ao normalizar',()=>{
  const image=newElement('image',{imageZoom:12,imageX:-140,imageY:270});
  const [saved]=normalizeElements([image],true,()=> '');assert.equal(saved.imageZoom,12);assert.equal(saved.imageX,-140);assert.equal(saved.imageY,270);
  const [safe]=normalizeElements([{...image,imageZoom:Infinity,imageX:NaN}],true,()=> '');assert.equal(safe.imageZoom,1);assert.equal(safe.imageX,0);
});
