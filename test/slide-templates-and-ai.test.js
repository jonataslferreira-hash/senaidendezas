import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  slideTemplates, deckTemplates, externalTemplateSites, openSourceLicenses,
  createSlideFromTemplate, createDeckFromTemplate, getDeckTemplate, detectDeckTheme,
  searchDecks, findSimilarDecks, deckCoverPreview, deckPreviewSlides, templateCategories
} from '../src/slide-templates.js';
import { communitySlideThemes } from '../src/open-community-themes.js';
import { applyCanvasTheme, canvasThemes, creativeArtPrefix } from '../src/canvas-data.js';
import { newLesson, validateLesson } from '../src/lessons.js';
import { composeAISlide, fitPhoto } from '../src/storage-ai-layouts.js';
import { createR2Handler } from '../cloudflare/r2-worker.js';
import { isCatalogPhoto } from '../src/catalog-photos.js';
import importedSourceDecks from '../src/creative-slide-imported-data.json' with {type: 'json'};

const PERMISSIVE_LICENSES = new Set(['MIT', 'CC0 1.0', 'BSD', 'Apache 2.0', 'CC-BY 3.0', 'CC BY 4.0', 'BSD / Apache 2.0 / CC-BY 3.0']);
const expectedCreativeDecks = [
  ['strawberry-party', 'Festa de Morango', '16:9'],
  ['strawberry-poster', 'Festa de Morango · Cartaz', '16:9'],
  ['strawberry-album', 'Festa de Morango · Álbum', '16:9'],
  ['coastal-postcards', 'Cartões do Litoral', '16:9'],
  ['moonlight-playlist', 'Playlist de Meia-Noite', '16:9'],
  ['indie-arcade', 'Pequeno Arcade', '16:9'],
  ['sunset-at-home', 'Cinema no Quintal', '16:9'],
  ['clay-studio', 'Ateliê de Barro', '16:9'],
  ['easy-brunch', 'Brunch sem Pressa', '16:9'],
  ['rainy-book-club', 'Clube da Janela', '16:9'],
  ['neighborhood-art', 'Museu do Meu Bairro', '16:9'],
  ['picnic-with-friends', 'Piquenique de Domingo', '16:9'],
  ['birthday-story', 'Parabéns em Stories', '16:9'],
  ['morning-vlog', 'Manhã em Cenas', '16:9'],
  ['roadtrip-vertical', 'Diário de Estrada', '16:9'],
  ['moon-zine', 'Zine da Lua', '16:9'],
  ['market-story', 'Feirinha no Bolso', '16:9'],
  ['pet-story', 'Diário de Patinhas', '4:3'],
  ['outfit-stories', 'Vitrine de Looks', '16:9'],
  ['matcha-recipe', 'Receita de Matchá', '16:9'],
  ['concert-pocket', 'Ingresso de Bolso', '16:9'],
  ['pocket-quest', 'Missão de Bolso', '16:9'],
  ['friends-scrapbook', 'Colagem de Amizade', '16:9'],
  ['bloom-feed', 'Flores na Varanda', '16:9'],
  ['tiny-bakery', 'Confeitaria em Miniatura', '16:9'],
  ['ocean-photo-dump', 'Álbum de Água Salgada', '16:9'],
  ['after-dark-gallery', 'Galeria Depois do Escuro', '16:9'],
  ['sunset-invite', 'Convite Pôr do Sol', '16:9'],
  ['lemonade-cards', 'Clube da Limonada', '16:9'],
  ['vinyl-swap', 'Troca de Discos', '16:9'],
  ['kitchen-letters', 'Caderno de Receitas de Casa', '16:9'],
  ['pixel-stickers', 'Figurinhas Pixel', '16:9']
];
const expectedOnlineCreativeDecks = [
  ['analog-film-notes', 'Caderno de Filme', '16:9'],
  ['slow-coffee-ritual', 'Café em Camadas', '16:9'],
  ['city-window-gallery', 'Janelas da Cidade', '16:9'],
  ['garden-seed-swap', 'Troca de Sementes', '16:9'],
  ['vinyl-side-stories', 'Lados do Vinil', '16:9'],
  ['weekend-market-route', 'Rota da Feira', '9:16'],
  ['night-bus-postcards', 'Último Ônibus', '9:16'],
  ['backstage-show-diary', 'Bastidores do Show', '9:16'],
  ['pet-park-moments', 'Passeio de Patinhas', '9:16'],
  ['thrift-store-lookbook', 'Achados de Brechó', '9:16'],
  ['recipe-zine-oven', 'Zine de Fornada', '1:1'],
  ['sea-glass-collection', 'Coleção à Beira-Mar', '1:1'],
  ['board-game-night', 'Noite de Jogos de Mesa', '1:1'],
  ['flower-color-club', 'Arranjo de Estação', '1:1'],
  ['rooftop-movie-night', 'Cinema no Terraço', '1:1']
];
const expectedRepositoryDeckIds = [
  'coastal-postcards', 'moonlight-playlist', 'indie-arcade', 'rainy-book-club', 'neighborhood-art',
  'birthday-story', 'morning-vlog', 'roadtrip-vertical', 'moon-zine', 'market-story', 'pet-story',
  'outfit-stories', 'matcha-recipe', 'concert-pocket', 'pocket-quest', 'friends-scrapbook',
  'bloom-feed', 'tiny-bakery', 'ocean-photo-dump', 'after-dark-gallery', 'sunset-invite',
  'lemonade-cards', 'vinyl-swap', 'kitchen-letters', 'pixel-stickers'
];
const expectedVisibleRepositoryDeckIds = [
  'indie-arcade', 'morning-vlog', 'concert-pocket', 'bloom-feed',
  'after-dark-gallery', 'sunset-invite', 'lemonade-cards', 'pixel-stickers'
];
const removedCatalogDeckIds = new Set([
  ...[2, 3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 24, 25]
    .map(position => expectedRepositoryDeckIds[position - 2]),
  'city-window-gallery', 'vinyl-side-stories', 'strawberry-poster'
]);
const retainedOriginalDeckIds = [
  'strawberry-party', 'strawberry-album',
  'sunset-at-home', 'clay-studio', 'easy-brunch', 'picnic-with-friends'
];

function textBoxesOverlap(a, b) {
  return !(a.x + a.w <= b.x + 0.1 || b.x + b.w <= a.x + 0.1 || a.y + a.h <= b.y + 0.1 || b.y + b.h <= a.y + 0.1);
}

function colorContrast(a, b) {
  const luminance = hex => {
    const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

async function withLocalImportedDecks(run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' || input instanceof URL ? input : input.url;
    const url = new URL(requestUrl, 'http://localhost/');
    const match = url.pathname.match(/^\/assets\/slidescarnival\/decks\/([a-z0-9-]+)\.json$/);
    if (!match) return originalFetch(input, init);
    const file = new URL(`../public/assets/slidescarnival/decks/${match[1]}.json`, import.meta.url);
    return new Response(await readFile(file), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('modelos de repositórios ficam no fim, preservando IDs, nomes e formatos dos 32 antigos', async () => withLocalImportedDecks(async () => {
  const collection = deckTemplates.filter(deck => deck.pages);
  assert.equal(collection.length, 27);
  assert.deepEqual(Object.keys(importedSourceDecks).sort(), [...expectedVisibleRepositoryDeckIds].sort());
  const repositoryDecks = collection.slice(-expectedVisibleRepositoryDeckIds.length);
  assert.deepEqual(repositoryDecks.map(deck => deck.id), expectedVisibleRepositoryDeckIds);
  assert.ok([...removedCatalogDeckIds].every(id => !deckTemplates.some(deck => deck.id === id)));
  assert.equal(deckTemplates[0].id, 'basic');
  assert.deepEqual(deckTemplates.slice(-expectedVisibleRepositoryDeckIds.length).map(deck => deck.id), expectedVisibleRepositoryDeckIds);
  const visibleOnlineCreativeDecks = expectedOnlineCreativeDecks.filter(([id]) => !removedCatalogDeckIds.has(id));
  assert.deepEqual(collection.slice(0, visibleOnlineCreativeDecks.length)
    .map(({id, name, format}) => [id, name, format]), visibleOnlineCreativeDecks);
  assert.deepEqual(collection.slice(visibleOnlineCreativeDecks.length, -expectedVisibleRepositoryDeckIds.length)
    .map(deck => deck.id), retainedOriginalDeckIds);
  assert.deepEqual(searchDecks().filter(deck => deck.pages), collection);
  for (const [id, name, format] of expectedCreativeDecks.filter(([id]) => !removedCatalogDeckIds.has(id))) {
    const deck = collection.find(item => item.id === id);
    const expectedFormat = expectedVisibleRepositoryDeckIds.includes(id) ? importedSourceDecks[id].format : format;
    assert.deepEqual(deck && [deck.id, deck.name, deck.format], [id, name, expectedFormat]);
  }
  const onlineDecks = collection.filter(deck => visibleOnlineCreativeDecks.some(([id]) => id === deck.id));
  assert.ok(onlineDecks.every(deck => deck.source === 'open-source'));
  assert.ok(onlineDecks.every(deck => deck.license === 'MIT' && deck.sourceUrl && deck.licenseUrl));
  assert.equal(new Set(onlineDecks.map(deck => deck.sourceUrl)).size, visibleOnlineCreativeDecks.length);
  assert.equal(repositoryDecks.length, 8);
  assert.ok(repositoryDecks.every(deck => deck.source === 'open-source' && deck.license === 'CC BY 4.0'));
  assert.ok(repositoryDecks.every(deck => deck.sourceDeckUrl && deck.sourceSlideCount >= 8));
  assert.ok(repositoryDecks.every(deck => deck.selectedSlideIndexes?.length >= 8 && deck.selectedSlideIndexes[0] === 0));
  assert.ok(repositoryDecks.every(deck => deck.sourceUrl && deck.licenseUrl && !/reveal\.js|slidev/i.test(deck.sourceUrl)));
  assert.deepEqual(collection.filter(deck => deck.source !== 'open-source').map(deck => deck.id), retainedOriginalDeckIds);
  assert.deepEqual(
    searchDecks({sourceTab: 'open-source'}).filter(deck => deck.pages).map(({id, name, format}) => [id, name, format]),
    [...visibleOnlineCreativeDecks, ...repositoryDecks.map(({id, name, format}) => [id, name, format])]
  );
  for (const deck of collection) {
    assert.ok(deck.slidesCount >= 8, `${deck.id} tem pelo menos oito slides`);
    const lesson = await createDeckFromTemplate(deck.id);
    assert.equal(lesson.slides.length, deck.slidesCount);
    assert.ok(lesson.slides.every(slide => slide.kind === 'canvas'));
    assert.ok(lesson.slides.every(slide => slide.elements.some(element => element.type === 'text' || element.type === 'image')));
  }
}));

test('capas escuras mantêm contraste legível no título do painel', () => {
  for (const id of ['indie-arcade', 'concert-pocket', 'pixel-stickers']) {
    const deck = deckTemplates.find(item => item.id === id);
    if (deck.sourceDeckUrl) {
      assert.match(deck.previewSlides[0].url, /^assets\/slidescarnival\/previews\//);
      continue;
    }
    const title = deckCoverPreview(deck).elements.find(element =>
      element.type === 'text' && element.text.toLocaleLowerCase().includes(deck.name.toLocaleLowerCase()));
    assert.ok(title, `capa ${id} tem título editável`);
    assert.ok(colorContrast(title.color, canvasThemes[deck.theme].background) >= 4.5, `título de ${id} contrasta com o painel escuro`);
  }
});

test('catálogo criativo preserva proporção, ilustrações e paleta ao abrir e salvar', async () => withLocalImportedDecks(async () => {
  const formats = {'16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1};
  const collection = deckTemplates.filter(deck => deck.pages);
  assert.ok(collection.length >= 25);
  assert.deepEqual(searchDecks().filter(deck => deck.pages), collection);
  for (const [format, ratio] of Object.entries(formats)) {
    const matching = searchDecks({format});
    const newDecks = matching.filter(deck => deck.pages);
    assert.ok(newDecks.length >= 5);
    assert.ok(matching.every(deck => deck.format === format));
    for (const deck of newDecks) {
      assert.ok(templateCategories.some(category => category.id === deck.category && category.label === deck.categoryLabel));
      const theme = 'atelier-blue';
      const cover = deckCoverPreview(deck, theme);
      const preview = deckPreviewSlides(deck, theme);
      const saved = validateLesson(await createDeckFromTemplate(deck.id, {theme}));
      assert.equal(saved.slides.length, deck.slideOutline.length);
      assert.equal(saved.slides.length, deck.slidesCount);
      if (!deck.sourceDeckUrl) assert.ok(new Set(deck.pages.map(page => page[2])).size >= 3);
      assert.equal(cover.title, preview.slides[0].title);
      if (!deck.sourceDeckUrl) assert.deepEqual(cover.backgroundFill, saved.slides[0].backgroundFill);
      for (const slide of [cover, ...preview.slides, ...saved.slides]) {
        assert.equal(slide.pageWidth / slide.pageHeight, ratio);
        assert.equal(slide.visualTheme, theme);
        assert.ok(slide.elements.some(e => e.type === 'image' || e.type === 'shape'));
        if (deck.sourceDeckUrl) {
          assert.ok(slide.elements.filter(e => e.type === 'image').every(e =>
            e.image.startsWith('data:image/webp') || e.image.startsWith('assets/slidescarnival/previews/')));
        } else {
          assert.ok(slide.elements.filter(e => e.type === 'image').every(e => isCatalogPhoto(e.image) && e.imageSource && e.imageLicense));
        }
        const copy = slide.elements.filter(e => e.type === 'text');
        if (!deck.sourceDeckUrl) assert.ok(copy.every(e => e.x >= 0 && e.y >= 0 && e.x + e.w <= 100 && e.y + e.h <= 100));
        if (!deck.sourceDeckUrl) assert.ok(copy.every((a, i) => copy.slice(i + 1).every(b => !textBoxesOverlap(a, b))));
      }
      const [savedCover] = saved.slides;
      if (deck.sourceDeckUrl) continue;
      const art = () => savedCover.elements.filter(e => e.id.startsWith(creativeArtPrefix));
      const illustration = structuredClone(art());
      assert.ok(illustration.length > 0);
      assert.ok(applyCanvasTheme(savedCover, 'atelier-lilac'));
      assert.equal(savedCover.background, canvasThemes['atelier-lilac'].background);
      assert.deepEqual(art(), illustration);
    }
  }
}));

test('modelos prontos de slides e apresentações geram aulas válidas, sem sobreposição e preservam o template básico', async () => withLocalImportedDecks(async () => {
  assert.equal(slideTemplates[0].id, 'basic', 'template básico do site aparece primeiro');
  assert.equal(deckTemplates[0].id, 'basic', 'template básico de apresentações permanece fixo em primeiro');
  assert.equal(getDeckTemplate('missing-template').id, 'basic', 'template básico continua sendo o padrão de fallback');
  assert.ok(slideTemplates.length >= 18, 'galeria expandida de modelos de slide');
  assert.ok(deckTemplates.length >= 100, `catálogo gigante com 100+ modelos legais (atual: ${deckTemplates.length})`);
  const basic = createSlideFromTemplate('basic');
  assert.equal(basic.kind, 'text', 'template básico mantém o formato padrão do site');

  for (const themeId of Object.keys(communitySlideThemes)) {
    assert.ok(Object.hasOwn(canvasThemes, themeId), `tema Open Source ${themeId} está registrado em canvasThemes`);
  }

  const sampleThemes = ['studio-orbit', 'studio-journal', 'studio-signal', 'ocean', 'midnight', 'paper', 'lo-material-blue', 'lo-classy-red', 'lo-neuron', 'aoo-purple-arch', 'opf-luxury-dark', 'opf-forest-green-light'];
  for (const tpl of slideTemplates) {
    for (const themeId of sampleThemes) {
      const slide = createSlideFromTemplate(tpl.id, { themeId });
      const checked = validateLesson({ ...newLesson(), title: 'Teste', slides: [slide], questions: [] }, { draft: true });
      assert.equal(checked.slides.length, 1, `modelo ${tpl.id} no tema ${themeId} é válido`);
      if (tpl.id !== 'basic') {
        assert.equal(slide.kind, 'canvas');
        assert.ok(slide.elements.length >= 3, `modelo ${tpl.id} tem estrutura visual completa`);
        const texts = slide.elements.filter(el => el.type === 'text');
        for (let i = 0; i < texts.length; i++) {
          assert.ok(texts[i].x >= 0 && texts[i].y >= 0 && texts[i].x + texts[i].w <= 100 && texts[i].y + texts[i].h <= 100,
            `texto ${i} de ${tpl.id} cabe no slide`);
          for (let j = i + 1; j < texts.length; j++) {
            assert.equal(textBoxesOverlap(texts[i], texts[j]), false,
              `textos ${i} e ${j} não se sobrepõem no modelo ${tpl.id}`);
          }
        }
      }
    }
  }

  // Testa todas as 12 arquiteturas distintas de capa para garantir zero sobreposição e limites 0..100
  const coverStyles = new Set(deckTemplates.map(d => d.coverStyle));
  assert.ok(coverStyles.size >= 10, `pelo menos 10 estilos visuais distintos de capa (atual: ${coverStyles.size})`);
  for (const coverStyle of coverStyles) {
    const coverSlide = createSlideFromTemplate('cover', 'studio-orbit', { coverStyle, title: 'Capa ' + coverStyle, subtitle: 'Subtítulo de teste' });
    const texts = coverSlide.elements.filter(el => el.type === 'text');
    for (let i = 0; i < texts.length; i++) {
      assert.ok(texts[i].x >= 0 && texts[i].y >= 0 && texts[i].x + texts[i].w <= 100 && texts[i].y + texts[i].h <= 100,
        `texto ${i} da capa ${coverStyle} cabe no slide`);
      for (let j = i + 1; j < texts.length; j++) {
        assert.equal(textBoxesOverlap(texts[i], texts[j]), false,
          `textos ${i} e ${j} não se sobrepõem na capa ${coverStyle}`);
      }
    }
  }

  const nativeDecks = deckTemplates.filter(deck => deck.source === 'native');
  const ossDecks = deckTemplates.filter(deck => deck.source === 'open-source');
  assert.ok(nativeDecks.length >= 18, 'pelo menos 18 modelos nativos do Storage Lab');
  assert.ok(ossDecks.length >= 80, 'pelo menos 80 modelos Open Source com licenças permissivas verificadas');

  const uniqueIds = new Set();
  for (const deck of deckTemplates) {
    assert.ok(!uniqueIds.has(deck.id), `ID único para o deck ${deck.id}`);
    uniqueIds.add(deck.id);
    assert.ok(Object.hasOwn(canvasThemes, deck.theme), `tema ${deck.theme} do deck ${deck.id} existe em canvasThemes`);

    const lesson = await createDeckFromTemplate(deck.id, { title: 'Aula ' + deck.name, description: 'Descrição teste' });
    const checked = validateLesson(lesson, { draft: true });
    assert.equal(checked.slides.length, deck.slidesCount, `deck ${deck.id} gera ${deck.slidesCount} slide(s)`);
    assert.equal(checked.title, 'Aula ' + deck.name);
    if (deck.questionsCount) {
      assert.equal(checked.questions.length, deck.questionsCount, `deck ${deck.id} gera ${deck.questionsCount} perguntas de quiz`);
    }
    if (deck.source === 'open-source') {
      assert.ok(deck.credit?.author, `deck Open Source ${deck.id} informa autor`);
      assert.ok(PERMISSIVE_LICENSES.has(deck.credit?.license), `deck ${deck.id} usa licença permissiva verificada (${deck.credit?.license})`);
      assert.match(deck.credit.sourceUrl, /^https:\/\//, `deck ${deck.id} aponta para repositório HTTPS`);
      assert.match(deck.credit.licenseUrl, /^https:\/\//, `deck ${deck.id} aponta para licença HTTPS`);
      assert.ok(checked.slides[0].note.includes(deck.credit.author) || checked.slides[0].note.includes(deck.credit.license),
        `deck Open Source ${deck.id} preserva nota de crédito na aula gerada`);
    }
  }

  // Busca, filtros, preview em cache e similares do catálogo
  assert.ok(searchDecks({ query: 'material' }).length >= 11, 'busca encontra os 11 temas Material Simple');
  assert.ok(searchDecks({ category: 'ciencias', tone: 'light' }).length >= 5, 'filtro por categoria e tom funciona');
  const sampleDeck = deckTemplates.find(d => d.id === 'lo-cinema');
  assert.ok(deckCoverPreview(sampleDeck).kind === 'canvas');
  assert.equal(deckPreviewSlides(sampleDeck, 'lo-material-blue').slides[0].visualTheme, 'lo-material-blue', 'troca de paleta ao vivo aplica o novo tema');
  assert.equal(findSimilarDecks(sampleDeck, 4).length, 4, 'sugestão de modelos parecidos retorna 4 itens');

  const orbitDeck = await createDeckFromTemplate('modern-class', { title: 'Órbita' });
  assert.equal(detectDeckTheme(orbitDeck.slides, orbitDeck.slides[0]), 'studio-orbit');
}));

test('atalhos externos oficiais e créditos Open Source respeitam 100% as licenças', () => {
  assert.ok(externalTemplateSites.length >= 4, 'diretório oficial de sites externos preenchido');
  for (const site of externalTemplateSites) {
    const url = new URL(site.url);
    assert.equal(url.protocol, 'https:', `site externo ${site.id} usa HTTPS`);
    assert.doesNotMatch(url.pathname, /\.(pptx|ppt|odp|otp|zip|pdf)$/i,
      `site externo ${site.id} aponta para página oficial e nunca direto para arquivo redistribuído`);
  }
  assert.ok(openSourceLicenses.length >= 4, 'lista de créditos Open Source documentada');
  for (const item of openSourceLicenses) {
    assert.ok(PERMISSIVE_LICENSES.has(item.license), `licença permissiva: ${item.license}`);
    assert.match(item.url, /^https:\/\//);
    assert.match(item.licenseUrl, /^https:\/\//);
  }
});

test('composeAISlide varia layouts sem repetir, rejeita quadros sobrepostos e respeita proporção/transparência das fotos', () => {
  const layouts = [];
  let previous = null;
  const sampleBody = '• Velocidade: leitura muito mais rápida que discos mecânicos\n• Silêncio: sem peças móveis ou ruído\n• Durabilidade: maior resistência a impactos';
  for (let i = 1; i <= 6; i++) {
    const design = composeAISlide({ spec: { theme: 'ocean' }, index: i, title: 'Slide ' + i, body: sampleBody, images: [], model: null, previous });
    layouts.push(design.layout);
    previous = design;
  }
  assert.ok(new Set(layouts).size >= 5, '6 slides de texto usam pelo menos 5 layouts distintos: ' + layouts.join(', '));
  for (let i = 1; i < layouts.length; i++) {
    assert.notEqual(layouts[i], layouts[i - 1], 'nunca repete o mesmo layout em slides seguidos');
  }

  // Composição livre com sobreposição é rejeitada em favor de um layout seguro.
  const badCustom = composeAISlide({
    spec: { theme: 'paper', composition: { title: { x: 10, y: 10, w: 60, h: 30 }, body: { x: 10, y: 38, w: 60, h: 40 } } },
    index: 1, title: 'Título', body: '• Item A: detalhe\n• Item B: detalhe', images: [], model: null, previous: null
  });
  assert.equal(badCustom.customComposition, false, 'quadros colados/sobrepostos são rejeitados');

  // Foto 16:9 dentro de caixa alta ajusta altura com folga mínima (~4%) para não cortar.
  const [, , pw, ph] = fitPhoto([53, 13, 40, 74], 16 / 9);
  const frameRatio = (pw * 16) / (ph * 9);
  assert.ok(Math.abs(frameRatio - 16 / 9) / (16 / 9) <= 0.06, 'proporção do quadro acompanha a foto sem corte brusco');

  // Recorte PNG transparente usa contain e não coloca moldura sólida atrás.
  const transparentSlide = composeAISlide({
    spec: { theme: 'midnight' }, index: 2, title: 'Recorte', body: 'Explicação curta.',
    images: [{ data: 'data:image/png;base64,AA==', ratio: 1, transparent: true, alt: 'Ícone' }], model: null, previous: null
  });
  const imgEl = transparentSlide.elements.find(el => el.type === 'image');
  assert.equal(imgEl.imageFit, 'contain', 'imagem transparente nunca é cortada com cover');
  assert.equal(transparentSlide.elements.filter(el => el.id?.includes('-card-')).length, 0, 'recorte transparente não ganha cartão sólido atrás');
});

test('Worker v26 expõe provedores gratuitos, faz fallback e orienta agrupamento inteligente de conteúdo', async t => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email_confirmed_at: '2026-11-01' };
  const auth = { Authorization: 'Bearer test-token-1234567890' };
  const handle = createR2Handler(async () => user);

  const healthRes = await handle(new Request('https://files.example/health'), {
    AI_LIMIT: { limit: async () => ({ success: true }) },
    GROQ_API_KEY: 'g', GEMINI_API_KEY: 'm', MISTRAL_API_KEY: 'ms', NVIDIA_API_KEY: 'nv'
  });
  const health = await healthRes.json();
  assert.equal(health.version, 26);
  assert.equal(health.mistralConfigured, true);
  assert.equal(health.nvidiaConfigured, true);

  const urls = [];
  let capturedSystem = '';
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    urls.push(String(url));
    if (String(url).includes('api.mistral.ai')) {
      try { capturedSystem = JSON.parse(init.body).messages[0].content; } catch {}
      return Response.json({ choices: [{ message: { content: JSON.stringify({ title: 'Energia', slides: [{ title: 'Solar', body: '• Limpa: renovável' }] }) } }] });
    }
    return new Response('rate limit', { status: 429 });
  });

  const res = await handle(
    new Request('https://files.example/storage-ai', { method: 'POST', headers: auth, body: JSON.stringify({ mode: 'create', prompt: 'Energia solar', count: 1 }) }),
    { AI_LIMIT: { limit: async () => ({ success: true }) }, GROQ_API_KEY: 'g-key', GEMINI_API_KEY: 'gem-key', MISTRAL_API_KEY: 'mis-key' }
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.slides[0].title, 'Solar');
  assert.ok(urls.some(u => u.includes('api.groq.com')), 'tentou Groq primeiro');
  assert.ok(urls.some(u => u.includes('gemma-4-31b-it')), 'tentou Gemma 4 na mesma chave Gemini');
  assert.ok(urls.some(u => u.includes('api.mistral.ai')), 'caiu para Mistral automaticamente');
  assert.match(capturedSystem, /agrupe conteúdos relacionados/i, 'prompt orienta agrupar tópicos relacionados sem pular itens nem criar slides extras');
  assert.doesNotMatch(capturedSystem, /uma única ideia por slide/i, 'removeu restrição rígida de uma única ideia por slide');
});

test('Cabo de Guerra pré-distribui times no lobby, Relâmpago oculta pular-etapa durante rodadas e placar final destaca equipe campeã', async () => {
  const { Room } = await import('../src/room.js');
  const { gameMarkup } = await import('../src/stage-games-view.js');
  const { leaderboardMarkup, quizMarkup } = await import('../src/game-ui.js');
  const { newLesson, newSlide, newQuestion } = await import('../src/lessons.js');

  const lesson = newLesson();
  lesson.slides = [
    { ...newSlide(), id: 's-teams', title: 'Equipes', game: { type: 'teams', text: 'Formar equipes', count: 2, pick: false } },
    {
      ...newSlide(), id: 's-tug', title: 'Cabo de guerra',
      game: {
        type: 'tug', text: 'Cabo de guerra', seconds: 15, options: ['Time Sol', 'Time Lua'],
        rounds: [[
          { text: 'P1 muito longa para testar largura automática', options: ['Alternativa extremamente detalhada e comprida para verificar expansão lateral', 'Curta'], correct: 0 },
          { text: 'P2 muito longa para testar largura automática', options: ['Alternativa extremamente detalhada e comprida para verificar expansão lateral', 'Curta'], correct: 0 },
          { text: 'P3 muito longa para testar largura automática', options: ['Alternativa extremamente detalhada e comprida para verificar expansão lateral', 'Curta'], correct: 0 }
        ]]
      }
    },
    {
      ...newSlide(), id: 's-flash', title: 'Relâmpago',
      game: {
        type: 'flash', text: 'Desafio Relâmpago', seconds: 10,
        questions: [
          { text: 'Q1', options: ['Certo', 'Errado'], correct: 0 },
          { text: 'Q2', options: ['Certo', 'Errado'], correct: 0 }
        ]
      }
    }
  ];
  const q1 = newQuestion();
  q1.text = 'Pergunta de Quiz';
  q1.options = ['Uma alternativa de quiz propositalmente muito longa para testar data-wide-options', 'B'];
  q1.correct = 0;
  lesson.questions = [q1];
  lesson.activityBlocks = [
    { id: 'b-teams', type: 'teams', items: ['s-teams'] },
    { id: 'b-tug', type: 'tug', items: ['s-tug'] },
    { id: 'b-flash', type: 'flash', items: ['s-flash'] },
    { id: 'b-quiz', type: 'quiz', items: [q1.id] }
  ];

  let clock = 50000;
  const room = new Room('654321', null, () => clock, lesson);
  const ana = room.join({ name: 'Ana', avatar: '🚀' });
  const bia = room.join({ name: 'Bia', avatar: '⚡' });

  // Equipes já formadas; avançar para Cabo de Guerra já pré-distribui jogadores nos dois lados no lobby!
  room.control('next-stage');
  const tugReady = room.snapshot();
  assert.equal(tugReady.game.type, 'tug');
  assert.equal(tugReady.game.state, 'ready');
  assert.equal(tugReady.game.crews[0].length + tugReady.game.crews[1].length, 2, 'jogadores online aparecem nos lados da corda já na tela de espera');
  const caio = room.join({ name: 'Caio', avatar: '🔥' });
  assert.equal(room.snapshot().game.crews[0].length + room.snapshot().game.crews[1].length, 3, 'participante que entra tarde também já entra em um lado da corda');

  // Durante batalha aberta do Cabo de Guerra, telão mostra a batalha sem botão prematuro de pular etapa; aluno recebe as perguntas da rodada com texto e ativa data-wide-options para alternativa longa.
  const hostView = snap => gameMarkup(snap, { host: true, demo: false, header: () => '', now: clock });
  const studentView = snap => gameMarkup(snap, { host: false, demo: false, header: () => '', now: clock });
  room.control('game', { do: 'next' });
  const tugOpenHtml = hostView(room.snapshot());
  assert.doesNotMatch(tugOpenHtml, /data-action="next-stage"/, 'não polui com botão de pular etapa durante rodada ativa');
  assert.match(tugOpenHtml, /tug-scene/, 'telão do professor exibe a batalha ao vivo em tela cheia');
  const tugStudentHtml = studentView(room.snapshot(ana.id));
  assert.match(tugStudentHtml, /data-wide-options="true"/, 'ativa expansão lateral no aparelho do aluno quando há alternativa longa');
  assert.match(tugStudentHtml, /Rodada <b>1<\/b> de 1/, 'aluno vê em que rodada está');
  assert.match(tugStudentHtml, /Pergunta da rodada 1/, 'aluno responde uma pergunta sorteada');
  assert.match(tugOpenHtml, /tug-hidden-score/, 'apresentador oculta porcentagens antes do fim da puxada');
  assert.doesNotMatch(tugOpenHtml, /tug-grip-hands/, 'sem mãos extras sobrepostas aos braços do boneco');

  // Encerra Cabo de Guerra -> Relâmpago (2 rodadas) -> testa placar intermediário e pódio Top-3!
  room.control('game', { do: 'end' });
  assert.match(hostView(room.snapshot()), /data-action="next-stage"/, 'libera Próxima etapa após encerrar jogo');
  room.control('next-stage');
  room.control('game', { do: 'next' });
  room.answer(ana.id, { choice: { choice: 0, round: 0 } });
  room.answer(bia.id, { choice: { choice: 1, round: 0 } });
  room.answer(caio.id, { choice: { choice: 0, round: 0 } });
  room.control('game', { do: 'next' }); // reveal -> leaderboard
  const flashBoard = room.snapshot();
  assert.equal(flashBoard.game.state, 'leaderboard');
  const flashBoardHtml = hostView(flashBoard);
  assert.match(flashBoardHtml, /Placar da rodada/);
  assert.doesNotMatch(flashBoardHtml, /data-action="next-stage"/, 'oculta pular etapa no placar parcial entre rodadas');
  room.control('game', { do: 'next' }); // leaderboard -> round 1 open
  room.control('game', { do: 'next' }); // open -> reveal
  room.control('game', { do: 'next' }); // reveal -> done (pódio final do Relâmpago!)
  const flashDoneHtml = hostView(room.snapshot());
  assert.match(flashDoneHtml, /flash-podium/, 'Relâmpago exibe pódio Top-3 no final');
  assert.match(flashDoneHtml, /data-action="next-stage"/, 'exibe botão de próxima etapa ao concluir Relâmpago');

  const { totalQuestionCount } = await import('../src/lessons.js');
  assert.equal(totalQuestionCount(lesson), 4, 'totalQuestionCount soma Quiz (1) + Cabo de Guerra (1 rodada) + Relâmpago (2 perguntas)');

  // Avança para o Quiz: pontos das dinâmicas permanecem somados no ranking geral!
  room.control('next-stage');
  assert.equal(room.snapshot().phase, 'lobby');
  room.control('start-quiz');
  clock += 3500; room.tick();
  const qSnap = room.snapshot();
  assert.equal(qSnap.phase, 'question');
  assert.match(quizMarkup(qSnap, { header: () => '', host: true, demo: false, status: 'online', shareDialog: () => '', shareOpen: false }), /data-wide-options="true"/, 'Quiz ativa expansão lateral para alternativas compridas');
  room.answer(ana.id, { questionIndex: 0, choice: 0 });
  room.answer(bia.id, { questionIndex: 0, choice: 1 });
  room.answer(caio.id, { questionIndex: 0, choice: 0 });
  room.control('reveal');
  room.control('next'); // última pergunta -> finished!
  const finalSnap = room.snapshot();
  assert.equal(finalSnap.phase, 'finished');
  assert.equal(finalSnap.hasScoredStages, true);
  assert.ok(finalSnap.resultStartedAt > 0, 'placar final inicia cronômetro do pódio');
  const anaFinal = finalSnap.ranking.find(p => p.name === 'Ana');
  assert.ok(anaFinal.score > 1000, 'pontuação final acumula pontos das dinâmicas + quiz');
  const finalHtml = leaderboardMarkup({ ...finalSnap, podiumRevealed: true, podiumStep: 4 }, { header: () => '', host: true, final: true, now: clock + 10000 });
  assert.match(finalHtml, /PLACAR GERAL FINAL/, 'mostra título de placar geral final');
  assert.match(finalHtml, /final-team-champion/, 'destaca a equipe campeã no resultado geral final');
});
