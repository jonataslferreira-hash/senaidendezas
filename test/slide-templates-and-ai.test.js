import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slideTemplates, deckTemplates, externalTemplateSites, openSourceLicenses,
  createSlideFromTemplate, createDeckFromTemplate, detectDeckTheme,
  searchDecks, findSimilarDecks, deckCoverPreview, deckPreviewSlides
} from '../src/slide-templates.js';
import { communitySlideThemes } from '../src/open-community-themes.js';
import { canvasThemes } from '../src/canvas-data.js';
import { newLesson, validateLesson } from '../src/lessons.js';
import { composeAISlide, fitPhoto } from '../src/storage-ai-layouts.js';
import { createR2Handler } from '../cloudflare/r2-worker.js';

const PERMISSIVE_LICENSES = new Set(['MIT', 'CC0 1.0', 'BSD', 'Apache 2.0', 'CC-BY 3.0', 'BSD / Apache 2.0 / CC-BY 3.0']);

function textBoxesOverlap(a, b) {
  return !(a.x + a.w <= b.x + 0.1 || b.x + b.w <= a.x + 0.1 || a.y + a.h <= b.y + 0.1 || b.y + b.h <= a.y + 0.1);
}

test('modelos prontos de slides e apresentações geram aulas válidas, sem sobreposição e preservam o template básico', () => {
  assert.equal(slideTemplates[0].id, 'basic', 'template básico do site aparece primeiro');
  assert.equal(deckTemplates[0].id, 'basic', 'template básico é o padrão ao criar nova aula');
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

    const lesson = createDeckFromTemplate(deck.id, { title: 'Aula ' + deck.name, description: 'Descrição teste' });
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

  const orbitDeck = createDeckFromTemplate('modern-class', { title: 'Órbita' });
  assert.equal(detectDeckTheme(orbitDeck.slides, orbitDeck.slides[0]), 'studio-orbit');
});

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

test('Worker v24 expõe novos provedores gratuitos (Mistral e NVIDIA NIM) e faz fallback entre modelos', async t => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email_confirmed_at: '2026-11-01' };
  const auth = { Authorization: 'Bearer test-token-1234567890' };
  const handle = createR2Handler(async () => user);

  const healthRes = await handle(new Request('https://files.example/health'), {
    AI_LIMIT: { limit: async () => ({ success: true }) },
    GROQ_API_KEY: 'g', GEMINI_API_KEY: 'm', MISTRAL_API_KEY: 'ms', NVIDIA_API_KEY: 'nv'
  });
  const health = await healthRes.json();
  assert.equal(health.version, 24);
  assert.equal(health.mistralConfigured, true);
  assert.equal(health.nvidiaConfigured, true);

  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(String(url));
    if (String(url).includes('api.mistral.ai')) {
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
});
