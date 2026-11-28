import {test,expect} from '@playwright/test';
import {mockAccounts} from './auth-fixture.js';

test('login Google é opcional e usa OAuth sem pedir acesso ao Classroom',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{const a=window.storageLabAccount;a.client.auth.signInWithOAuth=async opts=>{window.googleAuthOptions=opts;return {error:{code:'provider_disabled'}};};});
 await page.getByRole('button',{name:'Entrar / Criar conta',exact:true}).click();await page.getByRole('button',{name:'Continuar com Google'}).click();
 await expect(page.getByRole('alert')).toContainText('ainda não está configurado');
 const opts=await page.evaluate(()=>window.googleAuthOptions);expect(opts.provider).toBe('google');expect(opts.options.redirectTo).toBe('http://localhost:5173/');expect(opts.options.scopes).toBeUndefined();
});

test('conectar Google na conta existente mantém os dados do perfil e trata conflito',async({page})=>{
 await mockAccounts(page);await page.goto('/');await expect(page.locator('[data-account-profile]').first()).toContainText('Ana');
 await page.evaluate(()=>{const a=window.storageLabAccount;a.client.auth.linkIdentity=async opts=>{window.googleLinkOptions=opts;return {error:{code:'identity_already_exists'}};};});
 await page.locator('[data-account-profile] button').first().click();await expect(page.locator('.account-connections')).toContainText('Não conectado');await page.locator('[data-account-action=google-connect]').click();
 await expect(page.getByRole('alert')).toContainText('já está vinculada a outra conta');
 const opts=await page.evaluate(()=>window.googleLinkOptions);expect(opts.provider).toBe('google');expect(opts.options.scopes).toBeUndefined();await expect(page.locator('.profile-card')).toContainText('Ana');
});

test('mostra conexão existente e impede remover a única identidade',async({page})=>{
 await mockAccounts(page);await page.goto('/');await expect(page.locator('[data-account-profile]').first()).toContainText('Ana');
 await page.evaluate(()=>{const a=window.storageLabAccount;a.user.identities=[{id:'only',provider:'google'}];a.user.app_metadata.providers=['google'];});
 await page.locator('[data-account-profile] button').first().click();await expect(page.locator('.account-connections')).toContainText('Conectado');await page.locator('[data-account-action=google-disconnect]').click();
 await expect(page.getByRole('alert')).toContainText('outra forma de acesso');await expect(page.locator('.profile-card')).toContainText('Ana');
});

test('retorno confirma identidade na mesma conta e preserva nome e foto do perfil',async({page})=>{
 await mockAccounts(page);await page.goto('/');await expect(page.locator('[data-account-profile]').first()).toContainText('Ana');
 await page.evaluate(()=>{const a=window.storageLabAccount;a.user.user_metadata={display_name:'Ana do Storage Lab',avatar_path:'r2:foto',theme:'violet'};a.user.identities=[{id:'mail',provider:'email'},{id:'google',provider:'google'}];a.googleReturn=true;a.googleReturnError='';sessionStorage.setItem('sl-google-auth-flow',JSON.stringify({intent:'connect',uid:a.user.id,started:Date.now()}));a.finishGoogleReturn('SIGNED_IN');});
 await expect(page.locator('.account-message')).toHaveText('Google conectado. Seu perfil foi mantido.');await expect(page.locator('.profile-card')).toContainText('Ana do Storage Lab');await expect(page.locator('.account-connections')).toContainText('Conectado');
 expect(await page.evaluate(()=>window.storageLabAccount.user.user_metadata.avatar_path)).toBe('r2:foto');
});

test('desconexão pede confirmação e não altera o perfil',async({page})=>{
 await mockAccounts(page);await page.goto('/');await expect(page.locator('[data-account-profile]').first()).toContainText('Ana');
 await page.evaluate(()=>{const a=window.storageLabAccount;const mail={id:'mail',provider:'email'},google={id:'google',provider:'google'};a.user.identities=[mail,google];a.user.app_metadata.providers=['email','google'];a.client.auth.unlinkIdentity=async identity=>{window.removedIdentity=identity;return {error:null};};a.client.auth.getUser=async()=>({data:{user:{...a.user,identities:[mail],app_metadata:{providers:['email']}}},error:null});});
 await page.locator('[data-account-profile] button').first().click();page.once('dialog',d=>d.accept());await page.locator('[data-account-action=google-disconnect]').click();
 await expect(page.locator('.account-message')).toHaveText('Google desconectado desta conta.');await expect(page.locator('.account-connections')).toContainText('Não conectado');await expect(page.locator('.profile-card')).toContainText('Ana');expect((await page.evaluate(()=>window.removedIdentity)).id).toBe('google');
});
