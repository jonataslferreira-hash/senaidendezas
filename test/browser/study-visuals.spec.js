import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));});
for(const theme of ['dark','light']) test(`revisão legível em modo ${theme}`,async({page})=>{
 await page.goto('/');await page.locator('.studio-shell > .studio-rail [data-studio-action=review]').click();await page.getByRole('button',{name:/HDD e SSD/}).click();
 await page.evaluate(theme=>{document.documentElement.dataset.appearance=theme;document.documentElement.dataset.uiStyle='classic';},theme);
 const info=await page.locator('.review-card').evaluate(el=>{const c=getComputedStyle(el),t=getComputedStyle(el.querySelector('h2'));return {background:c.backgroundColor,text:t.color}});
 const rgb=v=>v.match(/[\d.]+/g).slice(0,3).map(Number);const luminance=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const [a,b]=[luminance(info.background),luminance(info.text)].sort((x,y)=>y-x);expect((a+.05)/(b+.05),JSON.stringify(info)).toBeGreaterThan(4.5);
 await page.locator('[data-studio-action=review-answer]').first().click();await expect(page.locator('.review-card [role=status]')).toBeVisible();
});

test('cartão 3D gira frente e verso, preserva foco e respeita movimento reduzido',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sl-flashcards-v1:guest',JSON.stringify([{id:'deck',title:'Revisão',cards:[{id:'one',front:'O que é RAM?',back:'Memória temporária.'}]}])));await page.goto('/?page=flashcards');
 await expect(page.getByText('SUA BIBLIOTECA',{exact:true})).toHaveCount(0);await expect(page.getByText(/Salvos apenas neste navegador/)).toHaveCount(0);await page.getByRole('button',{name:'Estudar Revisão'}).click();
 const card=page.locator('.fc-card'),inner=card.locator('.fc-card-inner');await expect(card.locator('.fc-face-front')).toHaveAttribute('aria-hidden','false');await expect(card.locator('.fc-face-back')).toHaveAttribute('aria-hidden','true');
 await card.focus();await page.keyboard.press('Enter');await expect(card).toBeFocused();await expect(card).toHaveClass(/is-flipped/);await expect(card.locator('.fc-face-back')).toHaveAttribute('aria-hidden','false');await expect(card.locator('.fc-face-front')).toHaveAttribute('aria-hidden','true');await expect(page.locator('[data-fc-live]')).toHaveText('Resposta: Memória temporária.');
 await expect.poll(()=>inner.evaluate(e=>getComputedStyle(e).transform),{timeout:4000}).not.toBe('none');
 await page.evaluate(()=>document.documentElement.dataset.motion='reduced');await expect(inner).toHaveCSS('transition-duration','0s');await page.keyboard.press('Enter');await expect(card).toBeFocused();await expect(card.locator('.fc-face-front')).toHaveAttribute('aria-hidden','false');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('música externa continua direta, sem MediaElementSource que bloqueia áudio sem CORS',async({page})=>{
 const wav=Buffer.alloc(44+32000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);for(let i=0;i<16000;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/8000)*15000),44+i*2);
 await page.addInitScript(()=>{const p=AudioContext.prototype,original=p.createMediaElementSource;window.editorGraphs=0;p.createMediaElementSource=function(el){if(el.dataset.editorSoundtrack!==undefined)window.editorGraphs++;return original.call(this,el);};});
 await page.route('https://**.vgmtreasurechest.com/**',r=>r.fulfill({contentType:'audio/wav',body:wav}));await page.goto('/');await page.locator('.lesson-card [data-studio-action=edit]').first().click();const audio=page.locator('audio[data-editor-soundtrack]');await expect(audio).toHaveJSProperty('paused',false);await expect.poll(()=>audio.evaluate(e=>e.currentTime)).toBeGreaterThan(.05);
 await page.getByRole('button',{name:'Abrir músicas do editor'}).click();await page.getByLabel('Volume',{exact:true}).fill('1');await expect(audio).toHaveJSProperty('volume',1);await page.getByLabel('Velocidade',{exact:true}).selectOption('1');expect(await page.evaluate(()=>window.editorGraphs)).toBe(0);await expect(audio).toHaveJSProperty('playbackRate',1);
});
