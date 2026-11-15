import { canvasMarkup, esc } from './canvas-view.js';
import { presentationSlide } from './slide-display.js';
import { canvasThemes } from './canvas-data.js';
import {
  deckTemplates,
  templateCategories as deckCategories,
  deckCoverPreview,
  deckPreviewSlides,
  externalTemplateSites,
  findSimilarDecks,
  getDeckTemplate,
  searchDecks,
  templateThemeChoices,
  themeVisuals
} from './slide-templates.js';
import './template-store.css';

const FAVORITES_KEY = 'sl-template-favorites-v1';
const BATCH_SIZE = 24;

function loadFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.filter(v => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(set) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set])); } catch {}
}

function heartIcon(filled = false) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.6C12 20.6 4 15.2 4 9.5a4.6 4.6 0 0 1 8-3.1 4.6 4.6 0 0 1 8 3.1c0 5.7-8 11.1-8 11.1z"/></svg>`;
}

function searchIcon() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>`;
}

function externalIcon() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M10 14L20 4"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>`;
}

function backIcon() {
  return `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>`;
}

function downloadIcon() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>`;
}

function renderSlideBox(slide) {
  return canvasMarkup(presentationSlide(slide), { interactive: false }).replace(/<button\b[\s\S]*?<\/button>/gi, '');
}

function themeSwatchColor(themeId) {
  const t = themeVisuals(themeId);
  return { bg: t.background || '#1e1b4b', accent: t.accent || '#7c5cff' };
}

function themeChoicesFor(deck) {
  const seen = new Set();
  const list = [];
  const add = (id, label) => {
    if (!id || seen.has(id) || !canvasThemes[id]) return;
    seen.add(id);
    list.push({ id, label: label || canvasThemes[id].label || id });
  };
  add(deck.theme, 'Original');
  for (const choice of templateThemeChoices) {
    if (list.length >= 9) break;
    add(choice.id, choice.label);
  }
  return list;
}

function ambientMarkup() {
  return `<div class="tstore-ambient" aria-hidden="true"><span class="tstore-blob tstore-blob-user"></span><span class="tstore-blob tstore-blob-brand"></span></div>`;
}

export function createTemplateStore({ render, useDeck, downloadDeckPptx, onRouteChange }) {
  const state = {
    sourceTab: 'all',
    category: 'all',
    tone: 'all',
    query: '',
    visibleCount: BATCH_SIZE,
    detailId: '',
    detailTheme: '',
    detailSlide: 0,
    favorites: loadFavorites(),
    busy: ''
  };

  let observer = null;
  let boundRoot = null;
  let pointerHandler = null;
  let rafId = 0;

  function filtered() {
    return searchDecks({
      query: state.query,
      sourceTab: state.sourceTab === 'external' ? 'all' : state.sourceTab,
      category: state.category,
      tone: state.tone,
      favorites: state.favorites
    });
  }

  function cardMarkup(deck) {
    const cover = deckCoverPreview(deck);
    const fav = state.favorites.has(deck.id);
    return `<article class="tstore-card" data-deck-id="${esc(deck.id)}">
      <div class="tstore-card-media" role="button" tabindex="0" data-tstore-action="open-detail" data-deck-id="${esc(deck.id)}" aria-label="Ver detalhes de ${esc(deck.name)}">
        <div class="tstore-card-canvas" inert aria-hidden="true">${renderSlideBox(cover)}</div>
        <div class="tstore-card-badges">
          ${deck.hasQuiz ? '<span class="tstore-pill tstore-pill-quiz">Quiz</span>' : ''}
          <span class="tstore-pill">${deck.slideCount} slides</span>
        </div>
        <button type="button" class="tstore-fav-btn ${fav ? 'is-saved' : ''}" data-tstore-action="toggle-favorite" data-deck-id="${esc(deck.id)}" aria-label="${fav ? 'Remover dos salvos' : 'Salvar apresentação'}" aria-pressed="${fav}">${heartIcon(fav)}</button>
      </div>
      <div class="tstore-card-body" data-tstore-action="open-detail" data-deck-id="${esc(deck.id)}">
        <div class="tstore-card-row">
          <h3>${esc(deck.name)}</h3>
          <span class="tstore-license">${esc(deck.source === 'native' ? 'Storage Lab' : deck.licenseShort)}</span>
        </div>
        <p>${esc(deck.description)}</p>
        <div class="tstore-card-foot">
          <span>${esc(deck.categoryLabel)}</span>
          <span>${deck.tone === 'dark' ? 'Escuro' : 'Claro'}</span>
        </div>
      </div>
    </article>`;
  }

  function gridSectionMarkup() {
    if (state.sourceTab === 'external') {
      return `<div class="tstore-external-panel">
        <div class="tstore-external-head">
          <h2>Sites externos gratuitos</h2>
          <p>Baixe em <strong>.pptx</strong> ou <strong>.pdf</strong> e clique em <strong>Importar PDF / PPTX</strong> na biblioteca para apresentar com quiz e jogos ao vivo.</p>
        </div>
        <div class="tstore-external-grid">
          ${externalTemplateSites.map(site => `<article class="tstore-ext-card">
            <div class="tstore-ext-top">
              <span class="tstore-ext-cat">${esc(site.category)}</span>
              <span class="tstore-ext-fmt">${esc(site.formats)}</span>
            </div>
            <h3>${esc(site.name)}</h3>
            <p>${esc(site.note)}</p>
            <a class="studio-btn quiet tstore-ext-link" href="${esc(site.url)}" target="_blank" rel="noopener noreferrer">Abrir site ↗</a>
          </article>`).join('')}
        </div>
      </div>`;
    }

    const items = filtered();
    const visible = items.slice(0, state.visibleCount);
    const hasMore = items.length > visible.length;

    if (!items.length) {
      return `<div class="tstore-empty">
        <h3>${state.sourceTab === 'favorites' ? 'Nenhuma apresentação salva ainda' : 'Nenhuma apresentação encontrada'}</h3>
        <p>${state.sourceTab === 'favorites'
          ? 'Toque no coração em qualquer capa para guardar suas favoritas aqui.'
          : 'Tente limpar a busca ou escolher outra categoria.'}</p>
        <button type="button" class="studio-btn quiet" data-tstore-action="reset-filters">Mostrar todo o catálogo</button>
      </div>`;
    }

    return `<div class="tstore-results-bar">
        <span data-tstore-count>${items.length} ${items.length === 1 ? 'apresentação' : 'apresentações'}</span>
        ${state.query || state.category !== 'all' || state.tone !== 'all' || state.sourceTab !== 'all'
          ? '<button type="button" class="tstore-clear-btn" data-tstore-action="reset-filters">Limpar filtros</button>'
          : ''}
      </div>
      <div class="tstore-grid" data-tstore-grid>${visible.map(cardMarkup).join('')}</div>
      ${hasMore ? `<div class="tstore-sentinel" data-tstore-sentinel aria-hidden="true"><span class="tstore-loading-dots">Carregando mais apresentações...</span></div>` : ''}`;
  }

  function catalogMarkup() {
    const sourceChips = [
      { id: 'all', label: 'Todos' },
      { id: 'native', label: 'Storage Lab' },
      { id: 'open-source', label: 'Comunidade' }
    ];
    const favActive = state.sourceTab === 'favorites';
    const extActive = state.sourceTab === 'external';

    return `<section class="tstore-page" data-template-store>
      ${ambientMarkup()}
      <div class="tstore-shell">
        <header class="tstore-header">
          <div class="tstore-title-row">
            <div class="tstore-title-copy">
              <h1>Catálogo de apresentações</h1>
            </div>
            <div class="tstore-header-tools">
              <label class="tstore-search" aria-label="Buscar apresentações">
                ${searchIcon()}
                <input type="search" data-tstore-search value="${esc(state.query)}" placeholder="Buscar por tema, estilo ou área..." autocomplete="off">
                ${state.query ? '<button type="button" class="tstore-search-clear" data-tstore-action="clear-search" aria-label="Limpar busca">×</button>' : ''}
              </label>
              <button type="button" class="tstore-icon-util ${favActive ? 'is-active' : ''}" data-tstore-action="source-tab" data-value="${favActive ? 'all' : 'favorites'}" aria-label="Apresentações salvas (${state.favorites.size})" title="Salvos" aria-pressed="${favActive}">
                ${heartIcon(favActive)}
                ${state.favorites.size ? `<span class="tstore-icon-badge">${state.favorites.size}</span>` : ''}
              </button>
              <button type="button" class="tstore-icon-util ${extActive ? 'is-active' : ''}" data-tstore-action="source-tab" data-value="${extActive ? 'all' : 'external'}" aria-label="Sites externos gratuitos" title="Sites externos" aria-pressed="${extActive}">
                ${externalIcon()}
              </button>
            </div>
          </div>

          <div class="tstore-toolbar">
            <div class="tstore-tabs" role="tablist" aria-label="Coleção">
              ${sourceChips.map(tab => `<button type="button" role="tab" class="tstore-tab ${state.sourceTab === tab.id ? 'is-active' : ''}" aria-selected="${state.sourceTab === tab.id}" data-tstore-action="source-tab" data-value="${tab.id}">${esc(tab.label)}</button>`).join('')}
            </div>

            ${state.sourceTab !== 'external' ? `<div class="tstore-tones" role="group" aria-label="Tom de fundo">
              ${[['all', 'Todos os tons'], ['light', 'Claros'], ['dark', 'Escuros']].map(([id, label]) =>
                `<button type="button" class="tstore-tone-btn ${state.tone === id ? 'is-active' : ''}" data-tstore-action="tone" data-value="${id}" aria-pressed="${state.tone === id}">${label}</button>`
              ).join('')}
            </div>` : ''}
          </div>

          ${state.sourceTab !== 'external' ? `<div class="tstore-cats" role="group" aria-label="Categorias">
            ${deckCategories.map(cat => `<button type="button" class="tstore-cat-chip ${state.category === cat.id ? 'is-active' : ''}" data-tstore-action="category" data-value="${cat.id}" aria-pressed="${state.category === cat.id}">${esc(cat.label)}</button>`).join('')}
          </div>` : ''}
        </header>

        <div class="tstore-results" data-tstore-results>${gridSectionMarkup()}</div>
      </div>
    </section>`;
  }

  function detailMarkup() {
    const deck = getDeckTemplate(state.detailId);
    const activeTheme = canvasThemes[state.detailTheme] ? state.detailTheme : deck.theme;
    const lesson = deckPreviewSlides(deck, activeTheme);
    const slides = lesson.slides || [];
    const slideIndex = Math.max(0, Math.min(state.detailSlide, slides.length - 1));
    const currentSlide = slides[slideIndex] || slides[0];
    const nextSlide = slides.length > 1 ? slides[(slideIndex + 1) % slides.length] : null;
    const fav = state.favorites.has(deck.id);
    const themes = themeChoicesFor(deck);
    const similar = findSimilarDecks(deck, 4);
    const toneLabel = deck.tone === 'dark' ? 'Tema escuro' : 'Tema claro';

    return `<section class="tstore-page tstore-detail-page" data-template-store data-detail-id="${esc(deck.id)}">
      ${ambientMarkup()}
      <div class="tstore-shell eshop-shell">
        <div class="eshop-topbar">
          <button type="button" class="eshop-back" data-tstore-action="back-catalog">${backIcon()}<span>Voltar ao catálogo</span></button>
        </div>

        <div class="eshop-main">
          <div class="eshop-gallery">
            <div class="eshop-hero-stage ${nextSlide ? 'has-peek' : ''}">
              <div class="eshop-hero-frame">
                <div class="eshop-hero-canvas" inert aria-hidden="true">${renderSlideBox(currentSlide)}</div>
                ${slides.length > 1 ? `<button type="button" class="eshop-nav eshop-prev" data-tstore-action="detail-prev" aria-label="Slide anterior">‹</button>
                  <button type="button" class="eshop-nav eshop-next" data-tstore-action="detail-next" aria-label="Próximo slide">›</button>` : ''}
                <span class="eshop-slide-counter">${slideIndex + 1} / ${slides.length}</span>
              </div>
              ${nextSlide ? `<button type="button" class="eshop-peek" data-tstore-action="detail-next" aria-label="Avançar para o próximo slide">
                <div class="eshop-peek-canvas" inert aria-hidden="true">${renderSlideBox(nextSlide)}</div>
              </button>` : ''}
            </div>

            <div class="eshop-thumbs" role="list" aria-label="Slides desta apresentação">
              ${slides.map((s, idx) => `<button type="button" class="eshop-thumb ${idx === slideIndex ? 'is-active' : ''}" data-tstore-action="detail-slide" data-index="${idx}" aria-label="Slide ${idx + 1}: ${esc(s.title || 'Slide')}" aria-current="${idx === slideIndex ? 'true' : 'false'}">
                <div class="eshop-thumb-canvas" inert aria-hidden="true">${renderSlideBox(s)}</div>
                <span class="eshop-thumb-idx">${String(idx + 1).padStart(2, '0')}</span>
              </button>`).join('')}
            </div>

            <div class="eshop-description-block">
              <h2>Sobre esta apresentação</h2>
              <p>${esc(deck.description)}</p>
              <div class="eshop-slide-list">
                <h3>Roteiro incluído (${slides.length} slides)</h3>
                <ol>
                  ${slides.map((s, idx) => `<li><button type="button" class="${idx === slideIndex ? 'is-active' : ''}" data-tstore-action="detail-slide" data-index="${idx}"><span>${String(idx + 1).padStart(2, '0')}</span><strong>${esc(s.title || `Slide ${idx + 1}`)}</strong></button></li>`).join('')}
                </ol>
              </div>
            </div>
          </div>

          <aside class="eshop-rail">
            <div class="eshop-rail-card">
              <div class="eshop-rail-head">
                <h1>${esc(deck.name)}</h1>
                <button type="button" class="eshop-rail-fav ${fav ? 'is-saved' : ''}" data-tstore-action="toggle-favorite" data-deck-id="${esc(deck.id)}" aria-label="${fav ? 'Remover dos salvos' : 'Salvar apresentação'}" title="${fav ? 'Remover dos salvos' : 'Salvar'}" aria-pressed="${fav}">
                  ${heartIcon(fav)}
                </button>
              </div>
              <p class="eshop-rail-sub">${esc(deck.description)}</p>

              <div class="eshop-meta-pills">
                <span>${esc(deck.categoryLabel)}</span>
                <span>${slides.length} slides</span>
                ${deck.hasQuiz ? '<span class="is-accent">Quiz incluso</span>' : ''}
                <span>${toneLabel}</span>
              </div>

              <div class="eshop-theme-picker">
                <span class="eshop-picker-label">Paleta de cores</span>
                <div class="eshop-swatches" role="radiogroup" aria-label="Escolher paleta de cores">
                  ${themes.map(th => {
                    const sw = themeSwatchColor(th.id);
                    const selected = th.id === activeTheme;
                    return `<button type="button" class="eshop-swatch ${selected ? 'is-active' : ''}" data-tstore-action="detail-theme" data-theme="${esc(th.id)}" title="${esc(th.label)}" aria-label="Paleta ${esc(th.label)}" aria-checked="${selected}" role="radio" style="--sw-bg:${sw.bg};--sw-ac:${sw.accent}"><i></i></button>`;
                  }).join('')}
                </div>
              </div>

              <div class="eshop-cta-stack">
                <button type="button" class="eshop-btn-primary" data-tstore-action="use-deck" data-deck-id="${esc(deck.id)}" ${state.busy ? 'disabled' : ''}>
                  ${state.busy === 'use' ? 'Abrindo no editor...' : 'Usar esta apresentação'}
                </button>
                <button type="button" class="eshop-btn-secondary" data-tstore-action="download-pptx" data-deck-id="${esc(deck.id)}" ${state.busy ? 'disabled' : ''}>
                  ${downloadIcon()}<span>${state.busy === 'pptx' ? 'Gerando PPTX...' : 'Baixar PPTX'}</span>
                </button>
              </div>

              <dl class="eshop-specs">
                <div><dt>Origem</dt><dd>${esc(deck.collectionLabel)}</dd></div>
                <div><dt>Licença</dt><dd>${deck.credit?.licenseUrl ? `<a href="${esc(deck.credit.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(deck.license)} ↗</a>` : esc(deck.license)}</dd></div>
                <div><dt>Autoria</dt><dd>${deck.credit?.sourceUrl ? `<a href="${esc(deck.credit.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(deck.author)} ↗</a>` : esc(deck.author)}</dd></div>
                <div><dt>Formato</dt><dd>16:9 · Editável + PPTX + PDF</dd></div>
              </dl>
            </div>
          </aside>
        </div>

        ${similar.length ? `<section class="eshop-similar">
          <h2>Apresentações parecidas</h2>
          <div class="tstore-grid tstore-grid-similar">${similar.map(cardMarkup).join('')}</div>
        </section>` : ''}
      </div>
    </section>`;
  }

  function disconnectObserver() {
    observer?.disconnect();
    observer = null;
  }

  function appendNextBatch(root) {
    if (state.detailId || state.sourceTab === 'external') return;
    const grid = root?.querySelector('[data-tstore-grid]');
    if (!grid) return;
    const items = filtered();
    if (state.visibleCount >= items.length) {
      root.querySelector('[data-tstore-sentinel]')?.remove();
      disconnectObserver();
      return;
    }
    const start = state.visibleCount;
    const end = Math.min(items.length, start + BATCH_SIZE);
    state.visibleCount = end;
    const fragment = document.createRange().createContextualFragment(items.slice(start, end).map(cardMarkup).join(''));
    grid.append(fragment);
    if (end >= items.length) {
      root.querySelector('[data-tstore-sentinel]')?.remove();
      disconnectObserver();
    }
  }

  function observeSentinel(root) {
    disconnectObserver();
    if (!root || state.detailId || state.sourceTab === 'external') return;
    const sentinel = root.querySelector('[data-tstore-sentinel]');
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) appendNextBatch(root);
    }, { rootMargin: '480px 0px' });
    observer.observe(sentinel);
  }

  function unbindPointer() {
    if (boundRoot && pointerHandler) boundRoot.removeEventListener('pointermove', pointerHandler);
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    boundRoot = null;
    pointerHandler = null;
  }

  function bindPointer(root) {
    unbindPointer();
    const page = root?.querySelector('[data-template-store]');
    if (!page) return;
    boundRoot = page;
    let targetX = 50, targetY = 26;
    pointerHandler = event => {
      if (event.pointerType === 'touch') return;
      const rect = page.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetX = Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100));
      targetY = Math.max(4, Math.min(96, ((event.clientY - rect.top) / rect.height) * 100));
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        page.style.setProperty('--mx', `${targetX.toFixed(1)}%`);
        page.style.setProperty('--my', `${targetY.toFixed(1)}%`);
      });
    };
    page.addEventListener('pointermove', pointerHandler, { passive: true });
  }

  function updateResultsOnly(root) {
    const slot = root?.querySelector('[data-tstore-results]');
    if (slot) {
      slot.innerHTML = gridSectionMarkup();
      observeSentinel(root);
      return true;
    }
    return false;
  }

  function openDetail(deckId) {
    const deck = getDeckTemplate(deckId);
    state.detailId = deck.id;
    state.detailTheme = deck.theme;
    state.detailSlide = 0;
    onRouteChange?.();
    render();
    window.scrollTo?.({ top: 0, behavior: 'instant' });
  }

  function openCatalog() {
    state.detailId = '';
    state.detailSlide = 0;
    onRouteChange?.();
  }

  function handleClick(target, root) {
    const el = target.closest('[data-tstore-action]');
    if (!el) return false;
    const action = el.dataset.tstoreAction;

    if (action === 'source-tab') {
      state.sourceTab = el.dataset.value || 'all';
      state.visibleCount = BATCH_SIZE;
      render();
      return true;
    }
    if (action === 'category') {
      state.category = el.dataset.value || 'all';
      state.visibleCount = BATCH_SIZE;
      render();
      return true;
    }
    if (action === 'tone') {
      state.tone = el.dataset.value || 'all';
      state.visibleCount = BATCH_SIZE;
      render();
      return true;
    }
    if (action === 'clear-search') {
      state.query = '';
      state.visibleCount = BATCH_SIZE;
      render();
      root.querySelector('[data-tstore-search]')?.focus();
      return true;
    }
    if (action === 'reset-filters') {
      state.sourceTab = 'all';
      state.category = 'all';
      state.tone = 'all';
      state.query = '';
      state.visibleCount = BATCH_SIZE;
      render();
      return true;
    }
    if (action === 'toggle-favorite') {
      const id = el.dataset.deckId;
      if (state.favorites.has(id)) state.favorites.delete(id);
      else state.favorites.add(id);
      saveFavorites(state.favorites);
      render();
      return true;
    }
    if (action === 'open-detail') {
      openDetail(el.dataset.deckId);
      return true;
    }
    if (action === 'back-catalog') {
      state.detailId = '';
      state.detailSlide = 0;
      onRouteChange?.();
      render();
      return true;
    }
    if (action === 'detail-slide') {
      state.detailSlide = Number(el.dataset.index) || 0;
      render();
      return true;
    }
    if (action === 'detail-prev' || action === 'detail-next') {
      const deck = getDeckTemplate(state.detailId);
      const total = deckPreviewSlides(deck, state.detailTheme || deck.theme).slides.length;
      if (total > 1) {
        state.detailSlide = (state.detailSlide + (action === 'detail-next' ? 1 : -1) + total) % total;
        render();
      }
      return true;
    }
    if (action === 'detail-theme') {
      state.detailTheme = el.dataset.theme || '';
      render();
      return true;
    }
    if (action === 'use-deck') {
      const deckId = el.dataset.deckId || state.detailId;
      const theme = state.detailTheme || undefined;
      state.busy = 'use';
      Promise.resolve(useDeck(deckId, theme)).finally(() => {
        state.busy = '';
        state.detailId = '';
      });
      return true;
    }
    if (action === 'download-pptx') {
      const deckId = el.dataset.deckId || state.detailId;
      const theme = state.detailTheme || undefined;
      state.busy = 'pptx';
      render();
      Promise.resolve(downloadDeckPptx(deckId, theme)).finally(() => {
        state.busy = '';
        render();
      });
      return true;
    }
    return false;
  }

  function handleInput(target, root) {
    if (!target.matches('[data-tstore-search]')) return false;
    state.query = target.value;
    state.visibleCount = BATCH_SIZE;
    if (!updateResultsOnly(root)) render();
    return true;
  }

  function handleKeydown(event, root) {
    if (event.key === 'Enter' && event.target.matches('[data-tstore-action="open-detail"]')) {
      event.preventDefault();
      openDetail(event.target.dataset.deckId);
      return true;
    }
    if (!state.detailId) return false;
    if (event.target.matches('input,textarea,select')) return false;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleClick({ closest: () => ({ dataset: { tstoreAction: 'detail-next' } }) }, root);
      return true;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleClick({ closest: () => ({ dataset: { tstoreAction: 'detail-prev' } }) }, root);
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClick({ closest: () => ({ dataset: { tstoreAction: 'back-catalog' } }) }, root);
      return true;
    }
    return false;
  }

  return {
    state,
    markup: () => (state.detailId ? detailMarkup() : catalogMarkup()),
    mount: root => {
      observeSentinel(root);
      bindPointer(root);
    },
    unmount: () => {
      disconnectObserver();
      unbindPointer();
    },
    openDetail,
    openCatalog,
    handleClick,
    handleInput,
    handleKeydown
  };
}
