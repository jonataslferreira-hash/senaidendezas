import {createProject} from './project-fixture.js';
import {test,expect} from '@playwright/test';
test('player do editor tem cinco faixas, volume inicial de 35%, slowed, capa e CD; arquivo pessoal persiste',async({page})=>{
  // A short local WAV keeps this test independent from music hosting and silent.
  const wav=Buffer.alloc(44+160000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(160000,40);
  await page.route('https://**.vgmtreasurechest.com/**',route=>route.fulfill({contentType:'audio/wav',body:wav}));
  await page.addInitScript(()=>{if(!localStorage.getItem('sl-music-shuffle'))localStorage.setItem('sl-music-shuffle','false');});
  await page.goto('/');
  await expect(page.locator('.create-import-card [data-studio-action=new]')).toBeVisible();
  await expect(page.locator('.create-import-card [data-studio-action=upload-slides]')).toBeVisible();
  await expect(page.locator('.experience-tags')).toHaveCount(0);
  await createProject(page);
  await expect(page.locator('[data-editor-music]')).toBeVisible();
  await expect(page.locator('audio[data-editor-soundtrack]')).toHaveJSProperty('volume',.35);
  await expect(page.locator('audio[data-editor-soundtrack]')).toHaveJSProperty('playbackRate',.85);
  await page.getByRole('button',{name:'Abrir músicas do editor'}).click();
  await expect(page.locator('.music-track-list>div')).toHaveCount(5);
  await expect(page.getByRole('button',{name:'Reprodução aleatória',exact:true})).toHaveCount(0);
  const seen=new Set([await page.locator('.music-info strong').textContent()]);for(let i=0;i<4;i++){await page.getByRole('button',{name:'Próxima música',exact:true}).click();seen.add(await page.locator('.music-info strong').textContent());}expect(seen.size).toBe(5);
  await page.locator('[data-music-upload]').setInputFiles({name:'Meu som.wav',mimeType:'audio/wav',buffer:wav});
  await expect(page.locator('.music-info strong')).toHaveText('Meu som');
  await page.reload();await expect(page.locator('.music-info strong')).toBeVisible();
  await page.getByRole('button',{name:'Abrir músicas do editor'}).click();
  await expect(page.locator('.music-track-list>div')).toHaveCount(6);
  await page.locator('.music-track-list').getByRole('button',{name:/Meu som Sua biblioteca/}).click();await expect(page.locator('.music-info strong')).toHaveText('Meu som');
  await page.screenshot({path:'test-results/editor-music.png',fullPage:true,animations:'disabled'});
});

test('Spotify atrasado não toca após trocar de faixa ou sair do editor',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sl-editor-music',JSON.stringify([{id:'spotify-a',kind:'spotify',title:'Spotify A',artist:'Artista',url:'https://open.spotify.com/track/05TXKw2pxqf8ETIUdvEy6C'},{id:'spotify-b',kind:'spotify',title:'Spotify B',artist:'Artista',url:'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'}])));
 await page.route('https://**.vgmtreasurechest.com/**',route=>route.fulfill({status:204}));
 await page.route('https://open.spotify.com/embed/iframe-api/v1',route=>route.fulfill({contentType:'application/javascript',body:`window.spotifyJobs=[];window.releaseSpotify=()=>window.onSpotifyIframeApiReady({createController(host,options,callback){const job={uri:options.uri,plays:0,pauses:0,destroyed:false,listeners:{}};job.finish=()=>{callback({addListener(name,fn){job.listeners[name]=fn;},play(){job.plays++;job.listeners.playback_update?.({data:{isPaused:false,position:0,duration:10000}});},pause(){job.pauses++;},destroy(){job.destroyed=true;}});job.listeners.playback_update?.({data:{isPaused:true,position:0,duration:10000}});job.listeners.ready?.();};window.spotifyJobs.push(job);}});`}));
 await page.goto('/');await createProject(page);await page.getByRole('button',{name:'Abrir músicas do editor'}).click();
 await page.locator('[data-music-action=select][data-track="5"]').click();await page.getByRole('button',{name:'Tocar música',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof window.releaseSpotify)).toBe('function');
 await page.locator('[data-music-action=select][data-track="0"]').click();await page.evaluate(()=>window.releaseSpotify());
 await expect(page.locator('.music-info strong')).toHaveText('Title (Wii Play)');expect(await page.evaluate(()=>window.spotifyJobs.length)).toBe(0);await expect(page.locator('.spotify-editor-player')).toHaveCount(0);
 // Controller creation itself can also finish after a newer track was chosen.
 await page.locator('[data-music-action=select][data-track="5"]').click();await expect.poll(()=>page.evaluate(()=>window.spotifyJobs.length)).toBe(1);
 await page.locator('[data-music-action=select][data-track="6"]').click();await expect.poll(()=>page.evaluate(()=>window.spotifyJobs.length)).toBe(2);
 await page.evaluate(()=>window.spotifyJobs[1].finish());await expect(page.getByRole('button',{name:'Pausar música',exact:true})).toBeVisible();
 await page.evaluate(()=>window.spotifyJobs[0].finish());expect(await page.evaluate(()=>window.spotifyJobs[0].plays)).toBe(0);expect(await page.evaluate(()=>window.spotifyJobs[0].destroyed)).toBe(true);expect(await page.evaluate(()=>window.spotifyJobs[1].plays)).toBe(1);await expect(page.locator('.music-info strong')).toHaveText('Spotify B');
 await page.locator('[data-music-action=select][data-track="5"]').click();await expect.poll(()=>page.evaluate(()=>window.spotifyJobs.length)).toBe(3);
 await page.getByRole('button',{name:'Voltar',exact:true}).click();await page.evaluate(()=>window.spotifyJobs[2].finish());expect(await page.evaluate(()=>window.spotifyJobs[2].plays)).toBe(0);expect(await page.evaluate(()=>window.spotifyJobs[2].destroyed)).toBe(true);await expect(page.locator('.spotify-editor-player')).toHaveCount(0);
});
