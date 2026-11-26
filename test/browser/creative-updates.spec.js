import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('sl-tour','done'));});
test('catálogo mantém fundo montado e avança slides',async({page})=>{
 await page.goto('/');
 const catalog=page.locator('.studio-shell > .studio-rail [data-studio-action="templates"]');
 if(await catalog.count()) await catalog.click(); else await page.goto('/?page=templates');
 await expect(page.locator('[data-template-store]')).toBeVisible();
 const card=page.locator('.tstore-card[data-deck-id="modern-class"]');await expect(card).toBeVisible();await card.locator('[data-tstore-action=open-detail]').first().click();
 await expect(page.locator('.eshop-slide-counter')).toHaveText('1 / 7');const preview=await page.locator('.eshop-hero-canvas .slide-canvas').boundingBox();expect(preview.width).toBeGreaterThan(100);expect(preview.width/preview.height).toBeCloseTo(16/9,1);await expect(page.locator('.eshop-specs')).toContainText('16:9');
 await expect(page.locator('[data-tstore-action=toggle-autoplay]')).toHaveCount(0);
 const sizes=await page.locator('.eshop-hero-stage').evaluate(e=>{const hero=e.querySelector('.eshop-hero-canvas').getBoundingClientRect(),peek=e.querySelector('.eshop-peek').getBoundingClientRect(),slide=e.querySelector('.eshop-peek-canvas').getBoundingClientRect(),style=getComputedStyle(e.querySelector('.eshop-peek-canvas'));return {hero:hero.width,peek:peek.width,slide:slide.width,filter:style.filter,opacity:parseFloat(style.opacity)}});expect(Math.abs(sizes.slide-sizes.hero)).toBeLessThan(3);expect(sizes.slide).toBeGreaterThan(sizes.peek*2);expect(sizes.filter).toContain('blur');expect(sizes.opacity).toBeLessThan(1);
 await page.locator('[data-tstore-fluid]').evaluate(el=>el.dataset.testRetained='yes');
 await expect(page.locator('.eshop-slide-counter')).not.toHaveText('1 / 7',{timeout:5000});
 await page.locator('[data-tstore-action=detail-next]').first().click();const selected=await page.locator('.eshop-slide-counter').innerText();await page.waitForTimeout(3600);await expect(page.locator('.eshop-slide-counter')).toHaveText(selected);await expect(page.locator('[data-tstore-fluid]')).toHaveAttribute('data-test-retained','yes');
 await page.locator('[data-tstore-action=use-deck]').click();
 await expect(page.locator('.designer-stage .slide-canvas')).toBeVisible();
 const rect=await page.locator('.designer-stage .slide-canvas').boundingBox();expect(rect.width/rect.height).toBeCloseTo(16/9,1);
});
test('flashcards sem rótulos pedidos e revisão com progresso',async({page})=>{
 await page.goto('/?page=flashcards');await expect(page.getByText('SEU ESPAÇO DE ESTUDO',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'✦ Criar com Storage AI'}).click();await expect(page.getByText('STORAGE AI · FLASHCARDS',{exact:true})).toHaveCount(0);
 await page.locator('.studio-shell > .studio-rail [data-studio-action=review]').click();await page.getByRole('button',{name:/HDD e SSD/}).click();await expect(page.getByRole('progressbar',{name:'Progresso das questões'})).toBeVisible();await page.locator('[data-studio-action=review-answer]').first().click();await expect(page.locator('.review-card [role=status]')).toBeVisible();
});
test('carrossel respeita movimento reduzido e seleção manual de miniatura',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.locator('.studio-shell > .studio-rail [data-studio-action=templates]').click();await page.locator('.tstore-card[data-deck-id="modern-class"] [data-tstore-action=open-detail]').first().click();
 await expect(page.locator('.eshop-slide-counter')).toHaveText('1 / 7');await page.waitForTimeout(3300);await expect(page.locator('.eshop-slide-counter')).toHaveText('1 / 7');
 await page.locator('.eshop-thumb[data-index="2"]').click();await expect(page.locator('.eshop-slide-counter')).toHaveText('3 / 7');
});
test('controles ficam fora do preview vertical',async({page})=>{
 await page.goto('/?page=templates');
 await page.locator('.tstore-card[data-deck-id="matcha-recipe"] [data-tstore-action="open-detail"]').first().click();
 const preview=await page.locator('.eshop-hero-canvas .slide-canvas').boundingBox();
 const previous=await page.locator('.eshop-nav.eshop-prev').boundingBox();
 const next=await page.locator('.eshop-nav.eshop-next').boundingBox();
 expect(previous.x+previous.width).toBeLessThan(preview.x);
 expect(next.x).toBeGreaterThan(preview.x+preview.width);
});
