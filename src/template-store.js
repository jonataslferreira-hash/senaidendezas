import {canvasThemes} from './canvas-data.js';
import {canvasMarkup, esc} from './canvas-view.js';
import {presentationSlide} from './slide-display.js';
import {
  deckCoverPreview,
  deckGalleryTabs,
  deckPreviewSlides,
  deckTemplates,
  externalTemplateSites,
  findSimilarDecks,
  getDeckTemplate,
  openSourceLicenses,
  searchDecks,
  templateCategories,
  themeVisuals
} from './slide-templates.js';
import {studioIcon as icon} from './studio-icons.js';
import './template-store.css';

const renderSlideCanvas = slide => canvasMarkup(presentationSlide(slide), {interactive: false});

const FAV_KEY = 'storage-lab-template-favorites-v1';
const PAGE_STEP = 24;

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = JSON.parse(raw || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(set) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  } catch {}
}

function licenseStampSub(deck) {
  if (deck.licenseShort === 'CC0') return 'DOMÍNIO PÚBLICO';
  if (deck.licenseShort === 'MIT') return 'CÓDIGO ABERTO';
  if (deck.licenseShort === 'BSD') return 'LICENÇA BSD';
  if (deck.licenseShort === 'APACHE') return 'APACHE 2.0';
  if (deck.licenseShort === 'CC-BY') return 'COM ATRIBUIÇÃO';
  return 'STORAGE LAB';
}

function quickPaletteOptions(deck) {
  const base = [
    deck.theme,
    'studio-orbit',
    'paper',
    'lo-material-blue',
    'lo-classy-red',
    'lo-neuron',
    'opf-forest-green-light',
    'opf-luxury-dark'
  ];
  const unique = [];
  for (const id of base) {
    if (canvasThemes[id] && !unique.includes(id)) unique.push(id);
    if (unique.length >= 7) break;
  }
  return unique;
}

export function createTemplateStore(callbacks) {
  const state = {
    query: '',
    sourceTab: 'all',
    category: 'all',
    tone: 'all',
    visibleCount: PAGE_STEP,
    detailId: '',
    detailSlideIndex: 0,
    detailTheme: '',
    favorites: loadFavorites()
  };

  function filteredDecks() {
    return searchDecks({
      query: state.query,
      sourceTab: state.sourceTab,
      category: state.category,
      tone: state.tone,
      favorites: state.favorites
    });
  }

  function deckCardMarkup(deck) {
    const cover = deckCoverPreview(deck);
    const isFav = state.favorites.has(deck.id);
    const badgeText = deck.source === 'open-source' ? deck.licenseShort : (deck.quizCount ? '+ Quiz' : deck.categoryLabel);
    return `<article class="tstore-card" data-store-open="${esc(deck.id)}" tabindex="0" role="button" aria-label="Ver detalhes do modelo ${esc(deck.name)}">
      <div class="tstore-card-media">
        ${renderSlideCanvas(cover, {interactive: false, decorative: true})}
        <span class="tstore-card-badge ${deck.source === 'open-source' ? 'is-oss' : ''}">${esc(badgeText)}</span>
        <button type="button" class="tstore-card-fav ${isFav ? 'is-fav' : ''}" data-store-fav="${esc(deck.id)}" aria-pressed="${isFav}" aria-label="${isFav ? 'Remover dos salvos' : 'Salvar modelo'}" title="${isFav ? 'Remover dos salvos' : 'Salvar modelo'}">
          ${icon(isFav ? 'heartFilled' : 'heart')}
        </button>
      </div>
      <div class="tstore-card-body">
        <strong>${esc(deck.name)}</strong>
        <p>${esc(deck.author)}</p>
        <footer>
          <span>${deck.slideCount} ${deck.slideCount === 1 ? 'slide' : 'slides'}${deck.quizCount ? ` · ${deck.quizCount} perguntas` : ''}</span>
          <span class="tstore-card-cat">${esc(deck.categoryLabel)}</span>
        </footer>
      </div>
    </article>`;
  }

  function externalDirectoryMarkup() {
    return `<section class="tstore-external">
      <div class="tstore-external-lead">
        <div>
          <h2>Bibliotecas externas gratuitas</h2>
          <p>O Storage Lab respeita os termos de uso de cada plataforma e não copia arquivos proprietários. Abra o site oficial, baixe o modelo gratuito em <strong>.pptx</strong> ou <strong>.pdf</strong> e importe aqui para editar slides e rodar quizzes com a turma.</p>
        </div>
        <button type="button" class="studio-btn accent" data-studio-action="upload-slides">${icon('upload')} Importar .pptx ou .pdf</button>
      </div>
      <div class="tstore-external-grid">
        ${externalTemplateSites.map(site => `<article class="tstore-ext-card">
          <div class="tstore-ext-head">
            <h3>${esc(site.name)}</h3>
            <span>${esc(site.category)}</span>
          </div>
          <p>${esc(site.note)}</p>
          <small>${esc(site.formats)}</small>
          <a class="studio-btn quiet" href="${esc(site.url)}" target="_blank" rel="noopener noreferrer">Abrir site oficial ${icon('external')}</a>
        </article>`).join('')}
      </div>
      <div class="tstore-licenses-box">
        <h3>Créditos e licenças dos modelos abertos integrados</h3>
        <p>Todos os ${deckTemplates.filter(d => d.source === 'open-source').length} modelos da aba <strong>Comunidade aberta</strong> usam licenças abertas permissivas que autorizam adaptação, uso em sala de aula e exportação em PowerPoint:</p>
        <ul>
          ${openSourceLicenses.map(item => `<li>
            <strong>${esc(item.project)}</strong> (${esc(item.license)}) — ${esc(item.notice)}.
            <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Repositório</a> ·
            <a href="${esc(item.licenseUrl)}" target="_blank" rel="noopener noreferrer">Licença</a>
          </li>`).join('')}
        </ul>
      </div>
    </section>`;
  }

  function catalogGridMarkup() {
    if (state.sourceTab === 'external') return externalDirectoryMarkup();
    const list = filteredDecks();
    const visible = list.slice(0, state.visibleCount);
    const remaining = Math.max(0, list.length - visible.length);

    if (!list.length) {
      return `<div class="tstore-empty">
        <h3>Nenhum modelo encontrado</h3>
        <p>${state.sourceTab === 'favorites'
          ? 'Você ainda não salvou modelos. Clique no coração em qualquer capa ou tela de detalhes para guardar aqui.'
          : 'Tente outro termo de busca ou limpe os filtros de categoria e tom.'}</p>
        <button type="button" class="studio-btn quiet" data-store-reset-filters>Limpar filtros</button>
      </div>`;
    }

    return `<div class="tstore-grid">${visible.map(deckCardMarkup).join('')}</div>
      ${remaining > 0 ? `<div class="tstore-more">
        <button type="button" class="studio-btn quiet" data-store-more>Mostrar mais modelos (${remaining} restantes)</button>
      </div>` : ''}`;
  }

  function catalogMarkup() {
    const totalCount = deckTemplates.length;
    const filteredCount = state.sourceTab === 'external' ? externalTemplateSites.length : filteredDecks().length;
    const counts = {
      all: totalCount,
      native: deckTemplates.filter(d => d.source === 'native').length,
      'open-source': deckTemplates.filter(d => d.source === 'open-source').length,
      favorites: state.favorites.size,
      external: externalTemplateSites.length
    };

    return `<section class="tstore-page" data-template-store>
      <header class="tstore-header">
        <div>
          <span class="tstore-eyebrow">CATÁLOGO DE APRESENTAÇÕES</span>
          <h1>Modelos prontos para editar</h1>
          <p>Explore ${totalCount} apresentações editáveis — entre modelos próprios do Storage Lab e coleções abertas da comunidade — ou importe arquivos .pptx de sites externos.</p>
        </div>
        <div class="tstore-header-actions">
          <button type="button" class="studio-btn quiet" data-studio-action="upload-slides">${icon('upload')} Importar .pptx</button>
          <button type="button" class="studio-btn accent" data-store-use="basic">${icon('plus')} Começar do zero</button>
        </div>
      </header>

      <div class="tstore-toolbar">
        <div class="tstore-tabs" role="tablist" aria-label="Origem dos modelos">
          ${deckGalleryTabs.map(tab => `<button type="button" role="tab" aria-selected="${state.sourceTab === tab.id}" data-store-tab="${tab.id}">
            ${esc(tab.label)} <span>${counts[tab.id] ?? 0}</span>
          </button>`).join('')}
        </div>
        ${state.sourceTab !== 'external' ? `<div class="tstore-search-row">
          <label class="tstore-search">
            ${icon('search')}
            <input type="search" data-store-search value="${esc(state.query)}" placeholder="Buscar por assunto, cor, estilo ou autor..." aria-label="Buscar modelos">
          </label>
          <div class="tstore-tone" role="group" aria-label="Filtrar por fundo">
            <button type="button" data-store-tone="all" aria-pressed="${state.tone === 'all'}">Todos</button>
            <button type="button" data-store-tone="light" aria-pressed="${state.tone === 'light'}">Claro</button>
            <button type="button" data-store-tone="dark" aria-pressed="${state.tone === 'dark'}">Escuro</button>
          </div>
        </div>` : ''}
      </div>

      ${state.sourceTab !== 'external' ? `<div class="tstore-categories" role="group" aria-label="Filtrar por categoria">
        ${templateCategories.map(cat => `<button type="button" data-store-cat="${cat.id}" aria-pressed="${state.category === cat.id}">${esc(cat.label)}</button>`).join('')}
        <span class="tstore-count" data-store-count>${filteredCount} ${filteredCount === 1 ? 'modelo' : 'modelos'}</span>
      </div>` : ''}

      <div data-store-results>${catalogGridMarkup()}</div>
    </section>`;
  }

  function carouselStageMarkup(slides, index) {
    const total = slides.length;
    const safeIdx = Math.max(0, Math.min(index, total - 1));
    const prevIdx = total > 1 ? (safeIdx - 1 + total) % total : -1;
    const nextIdx = total > 1 ? (safeIdx + 1) % total : -1;
    const currentSlide = slides[safeIdx];

    return `<div class="eshop-stage-viewport">
        ${prevIdx >= 0 ? `<button type="button" class="eshop-peek eshop-peek-prev" data-store-slide="${prevIdx}" aria-label="Slide anterior">
          ${renderSlideCanvas(slides[prevIdx], {interactive: false, decorative: true})}
        </button>` : '<div class="eshop-peek is-empty" aria-hidden="true"></div>'}

        <div class="eshop-hero-frame" aria-live="polite">
          ${renderSlideCanvas(currentSlide, {interactive: false, decorative: true})}
        </div>

        ${nextIdx >= 0 ? `<button type="button" class="eshop-peek eshop-peek-next" data-store-slide="${nextIdx}" aria-label="Próximo slide">
          ${renderSlideCanvas(slides[nextIdx], {interactive: false, decorative: true})}
        </button>` : '<div class="eshop-peek is-empty" aria-hidden="true"></div>'}
      </div>
      <div class="eshop-carousel-nav">
        <button type="button" class="eshop-nav-arrow" data-store-slide-step="-1" ${total <= 1 ? 'disabled' : ''} aria-label="Slide anterior">${icon('chevronLeft')}</button>
        <div class="eshop-dots" role="tablist" aria-label="Slides do modelo">
          ${slides.map((s, i) => `<button type="button" class="eshop-dot ${i === safeIdx ? 'is-active' : ''}" data-store-slide="${i}" aria-label="Slide ${i + 1}: ${esc(s.title)}" aria-selected="${i === safeIdx}"></button>`).join('')}
        </div>
        <button type="button" class="eshop-nav-arrow" data-store-slide-step="1" ${total <= 1 ? 'disabled' : ''} aria-label="Próximo slide">${icon('chevronRight')}</button>
      </div>
      <p class="eshop-slide-caption">Slide ${safeIdx + 1} de ${total} — <strong>${esc(currentSlide.title || 'Slide')}</strong></p>`;
  }

  function detailMarkup() {
    const deck = getDeckTemplate(state.detailId);
    const activeTheme = canvasThemes[state.detailTheme] ? state.detailTheme : deck.theme;
    const lesson = deckPreviewSlides(deck, activeTheme);
    const slides = lesson.slides;
    const safeIdx = Math.max(0, Math.min(state.detailSlideIndex, slides.length - 1));
    state.detailSlideIndex = safeIdx;
    const isFav = state.favorites.has(deck.id);
    const palettes = quickPaletteOptions(deck);
    const similar = findSimilarDecks(deck, 4);
    const statusLabel = deck.source === 'open-source'
      ? `Open Source · ${deck.license}`
      : 'Grátis · Editável agora';
    const activeThemeName = themeVisuals(activeTheme).name || activeTheme;

    return `<section class="eshop-page" data-template-detail="${esc(deck.id)}">
      <div class="eshop-topbar">
        <button type="button" class="eshop-back" data-store-back>${icon('back')} Voltar para o catálogo</button>
        <span class="eshop-crumb">${esc(deck.collectionLabel)} · ${esc(deck.categoryLabel)}</span>
      </div>

      <div class="eshop-layout">
        <div class="eshop-left">
          <header class="eshop-title-block">
            <h1>${esc(deck.name)}</h1>
            <p class="eshop-publisher">${esc(deck.author)}</p>
          </header>

          <div class="eshop-carousel" data-eshop-stage>
            ${carouselStageMarkup(slides, safeIdx)}
          </div>

          <div class="eshop-editorial">
            <h2>${esc(deck.description)}</h2>
            <p>Todos os textos, blocos, cores, fontes e imagens deste modelo são 100% editáveis direto no navegador. Você pode apresentar em tela cheia, alternar o tema visual com um clique, rodar quizzes ao vivo com a turma ou exportar para Microsoft PowerPoint (.pptx) e PDF.</p>
            ${deck.source === 'open-source' ? `<p class="eshop-oss-note">Adaptado da coleção aberta <strong>${esc(deck.collectionLabel)}</strong> (${esc(deck.author)}) sob licença <strong>${esc(deck.license)}</strong>, com atribuição preservada nas notas do slide inicial.</p>` : ''}
          </div>

          <div class="eshop-outline-section">
            <div class="eshop-section-head">
              <h3>Slides incluídos (${slides.length})</h3>
              <span>Clique em qualquer slide para ver em destaque acima</span>
            </div>
            <div class="eshop-thumbs" data-eshop-thumbs>
              ${slides.map((s, i) => `<button type="button" class="eshop-thumb ${i === safeIdx ? 'is-active' : ''}" data-store-slide="${i}">
                <span class="eshop-thumb-canvas">${renderSlideCanvas(s, {interactive: false, decorative: true})}</span>
                <span class="eshop-thumb-meta"><b>${String(i + 1).padStart(2, '0')}</b> ${esc(s.title || `Slide ${i + 1}`)}</span>
              </button>`).join('')}
            </div>
          </div>

          ${lesson.questions?.length ? `<div class="eshop-quiz-box">
            <h3>Quiz interativo incluído (${lesson.questions.length} perguntas)</h3>
            <ol>${lesson.questions.map(q => `<li>${esc(q.text)}</li>`).join('')}</ol>
          </div>` : ''}
        </div>

        <aside class="eshop-right" aria-label="Informações e ações do modelo">
          <div class="eshop-panel">
            <span class="eshop-status-pill ${deck.source === 'open-source' ? 'is-oss' : 'is-native'}">${esc(statusLabel)}</span>

            <div class="eshop-headline-stat">
              <strong>${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}</strong>
              <span>Formato 16:9 · ${deck.quizCount ? `${deck.quizCount} perguntas de quiz` : 'Editável e exportável'}</span>
            </div>

            <div class="eshop-cta-stack">
              <button type="button" class="eshop-btn-primary" data-store-use="${esc(deck.id)}" data-store-theme="${esc(activeTheme)}">
                ${icon('plus')} Usar este modelo
              </button>
              <button type="button" class="eshop-btn-secondary" data-store-download-pptx="${esc(deck.id)}" data-store-theme="${esc(activeTheme)}">
                ${icon('download')} Baixar em .pptx
              </button>
            </div>

            <div class="eshop-info-box">
              <div class="eshop-palette-block">
                <div class="eshop-palette-head">
                  <strong>Testar paleta de cores</strong>
                  <small data-eshop-theme-name>${esc(activeThemeName)}</small>
                </div>
                <div class="eshop-swatches" role="group" aria-label="Testar paleta no preview">
                  ${palettes.map(tid => {
                    const tv = themeVisuals(tid);
                    return `<button type="button" class="eshop-swatch ${tid === activeTheme ? 'is-active' : ''}" data-store-palette="${esc(tid)}" title="${esc(tv.name || tid)}" aria-label="Paleta ${esc(tv.name || tid)}" aria-pressed="${tid === activeTheme}">
                      <i style="background:${tv.background}"><b style="background:${tv.accent}"></b></i>
                    </button>`;
                  }).join('')}
                </div>
              </div>

              <dl class="eshop-specs">
                <div><dt>Categoria</dt><dd>${esc(deck.categoryLabel)}</dd></div>
                <div><dt>Tom visual</dt><dd>${deck.tone === 'dark' ? 'Fundo escuro' : 'Fundo claro'}</dd></div>
                <div><dt>Exportação</dt><dd>PowerPoint (.pptx) e PDF</dd></div>
                <div><dt>Sala ao vivo</dt><dd>Compatível com Quiz e Jogos</dd></div>
              </dl>

              ${deck.sourceUrl ? `<div class="eshop-source-links">
                <a href="${esc(deck.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver origem oficial ${icon('external')}</a>
                <a href="${esc(deck.licenseUrl)}" target="_blank" rel="noopener noreferrer">Ler licença ${esc(deck.license)} ${icon('external')}</a>
              </div>` : ''}
            </div>

            <div class="eshop-panel-footer">
              <button type="button" class="eshop-fav-btn ${isFav ? 'is-fav' : ''}" data-store-fav="${esc(deck.id)}" aria-pressed="${isFav}">
                ${icon(isFav ? 'heartFilled' : 'heart')}
                <span>${isFav ? 'Salvo nos favoritos' : 'Salvar modelo'}</span>
              </button>

              <div class="eshop-license-stamp" title="${esc(deck.license)}">
                <strong>${esc(deck.licenseShort)}</strong>
                <span>${esc(licenseStampSub(deck))}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      ${similar.length ? `<section class="eshop-similar">
        <div class="eshop-section-head">
          <h3>Modelos parecidos</h3>
          <button type="button" class="studio-btn link" data-store-back>Ver todos os ${deckTemplates.length}</button>
        </div>
        <div class="tstore-grid tstore-grid-4">${similar.map(deckCardMarkup).join('')}</div>
      </section>` : ''}
    </section>`;
  }

  function syncCarouselInPlace(root) {
    const deck = getDeckTemplate(state.detailId);
    const activeTheme = canvasThemes[state.detailTheme] ? state.detailTheme : deck.theme;
    const lesson = deckPreviewSlides(deck, activeTheme);
    const slides = lesson.slides;
    const safeIdx = Math.max(0, Math.min(state.detailSlideIndex, slides.length - 1));
    state.detailSlideIndex = safeIdx;

    const stage = root.querySelector('[data-eshop-stage]');
    if (stage) stage.innerHTML = carouselStageMarkup(slides, safeIdx);
    root.querySelectorAll('[data-eshop-thumbs] [data-store-slide]').forEach((btn, idx) => {
      btn.classList.toggle('is-active', idx === safeIdx);
    });
  }

  function syncCatalogInPlace(root) {
    const box = root.querySelector('[data-store-results]');
    if (box) box.innerHTML = catalogGridMarkup();
    const countEl = root.querySelector('[data-store-count]');
    if (countEl) {
      const n = filteredDecks().length;
      countEl.textContent = `${n} ${n === 1 ? 'modelo' : 'modelos'}`;
    }
  }

  return {
    state,
    openCatalog() {
      state.detailId = '';
      state.detailSlideIndex = 0;
      state.detailTheme = '';
    },
    openDetail(deckId) {
      const deck = getDeckTemplate(deckId);
      state.detailId = deck.id;
      state.detailSlideIndex = 0;
      state.detailTheme = deck.theme;
    },
    markup() {
      return state.detailId ? detailMarkup() : catalogMarkup();
    },
    handleClick(target, root) {
      const favBtn = target.closest('[data-store-fav]');
      if (favBtn) {
        const id = favBtn.dataset.storeFav;
        if (state.favorites.has(id)) state.favorites.delete(id);
        else state.favorites.add(id);
        saveFavorites(state.favorites);
        callbacks.render();
        return true;
      }

      const useBtn = target.closest('[data-store-use]');
      if (useBtn) {
        callbacks.useDeck(useBtn.dataset.storeUse, useBtn.dataset.storeTheme || '');
        return true;
      }

      const dlBtn = target.closest('[data-store-download-pptx]');
      if (dlBtn) {
        callbacks.downloadDeckPptx(dlBtn.dataset.storeDownloadPptx, dlBtn.dataset.storeTheme || '');
        return true;
      }

      const tabBtn = target.closest('[data-store-tab]');
      if (tabBtn) {
        state.sourceTab = tabBtn.dataset.storeTab;
        state.visibleCount = PAGE_STEP;
        callbacks.render();
        return true;
      }

      const catBtn = target.closest('[data-store-cat]');
      if (catBtn) {
        state.category = catBtn.dataset.storeCat;
        state.visibleCount = PAGE_STEP;
        callbacks.render();
        return true;
      }

      const toneBtn = target.closest('[data-store-tone]');
      if (toneBtn) {
        state.tone = toneBtn.dataset.storeTone;
        state.visibleCount = PAGE_STEP;
        callbacks.render();
        return true;
      }

      if (target.closest('[data-store-more]')) {
        state.visibleCount += PAGE_STEP;
        syncCatalogInPlace(root);
        return true;
      }

      if (target.closest('[data-store-reset-filters]')) {
        state.query = '';
        state.sourceTab = 'all';
        state.category = 'all';
        state.tone = 'all';
        state.visibleCount = PAGE_STEP;
        callbacks.render();
        return true;
      }

      if (target.closest('[data-store-back]')) {
        state.detailId = '';
        state.detailSlideIndex = 0;
        state.detailTheme = '';
        callbacks.onRouteChange();
        callbacks.render();
        window.scrollTo?.({top: 0, behavior: 'instant'});
        return true;
      }

      const slideStep = target.closest('[data-store-slide-step]');
      if (slideStep && state.detailId) {
        const deck = getDeckTemplate(state.detailId);
        const total = deckPreviewSlides(deck, state.detailTheme || deck.theme).slides.length;
        state.detailSlideIndex = (state.detailSlideIndex + Number(slideStep.dataset.storeSlideStep) + total) % total;
        syncCarouselInPlace(root);
        return true;
      }

      const slideBtn = target.closest('[data-store-slide]');
      if (slideBtn && state.detailId) {
        state.detailSlideIndex = Number(slideBtn.dataset.storeSlide) || 0;
        syncCarouselInPlace(root);
        return true;
      }

      const palBtn = target.closest('[data-store-palette]');
      if (palBtn && state.detailId) {
        state.detailTheme = palBtn.dataset.storePalette;
        callbacks.render();
        return true;
      }

      const openCard = target.closest('[data-store-open]');
      if (openCard) {
        this.openDetail(openCard.dataset.storeOpen);
        callbacks.onRouteChange();
        callbacks.render();
        window.scrollTo?.({top: 0, behavior: 'instant'});
        return true;
      }

      return false;
    },
    handleInput(target, root) {
      if (target.matches?.('[data-store-search]')) {
        state.query = target.value;
        state.visibleCount = PAGE_STEP;
        syncCatalogInPlace(root);
        return true;
      }
      return false;
    },
    handleKeydown(event, root) {
      if (event.target?.matches?.('input, textarea, select')) return false;
      if (state.detailId) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const deck = getDeckTemplate(state.detailId);
          const total = deckPreviewSlides(deck, state.detailTheme || deck.theme).slides.length;
          const step = event.key === 'ArrowRight' ? 1 : -1;
          state.detailSlideIndex = (state.detailSlideIndex + step + total) % total;
          syncCarouselInPlace(root);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          state.detailId = '';
          callbacks.onRouteChange();
          callbacks.render();
          return true;
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        const card = event.target?.closest?.('[data-store-open]');
        if (card) {
          event.preventDefault();
          this.openDetail(card.dataset.storeOpen);
          callbacks.onRouteChange();
          callbacks.render();
          window.scrollTo?.({top: 0, behavior: 'instant'});
          return true;
        }
      }
      return false;
    }
  };
}
