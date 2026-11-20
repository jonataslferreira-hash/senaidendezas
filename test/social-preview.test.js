import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('prévia social tem imagem absoluta, metadados e tamanho para compartilhamento', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const url = 'https://jonataslferreira-hash.github.io/senaidendezas/social-preview.jpg';
  const tags = new Map([...html.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"/g)].map(match => [match[1], match[2]]));
  for (const [key,value] of [
    ['og:title','Storage Lab — Aulas que ganham vida'], ['og:type','website'],
    ['og:image',url], ['og:image:width','1200'], ['og:image:height','630'],
    ['twitter:card','summary_large_image'], ['twitter:image',url]
  ]) assert.equal(tags.get(key), value, key);
  assert.match(html, /property="og:image:alt"/);
  const image = readFileSync(new URL('../public/social-preview.jpg', import.meta.url));
  assert.equal(image.readUInt16BE(0), 0xffd8, 'arquivo é JPEG');
  let offset=2, size;
  while(offset < image.length) {
    if(image[offset] !== 0xff) break;
    const marker=image[offset+1], length=image.readUInt16BE(offset+2);
    if([0xc0,0xc1,0xc2].includes(marker)) {size=[image.readUInt16BE(offset+7),image.readUInt16BE(offset+5)];break;}
    offset += 2 + length;
  }
  assert.deepEqual(size,[1200,630]);
  assert.ok(image.length < 1_000_000, 'imagem leve para compartilhamento');
});
