const engineId = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID?.trim();
export const hasGoogleImageSearch = Boolean(engineId);
let loadPromise;
const handlers = new Map();
let nextId = 0;

function loadSearchElement() {
  loadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => { clearTimeout(timeout); script.remove(); reject(new Error('A busca do Google não carregou.')); };
    const timeout = setTimeout(fail, 12000);
    window.__gcse = {
      parsetags: 'explicit',
      initializationCallback() { clearTimeout(timeout); resolve(window.google.search.cse.element); },
      searchCallbacks: { image: { ready: (name, query, promotions, results, container) => {
        handlers.get(name)?.(results, container);
        return false;
      } } }
    };
    script.src = 'https://cse.google.com/cse.js?cx=' + encodeURIComponent(engineId);
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  }).catch(error => { loadPromise = undefined; throw error; });
  return loadPromise;
}

export async function mountGoogleImageSearch(dialog, host, onChoose) {
  const api = await loadSearchElement();
  if (!dialog.open) return null;
  const name = `slide-images-${++nextId}`;
  host.id = name;
  handlers.set(name, results => {
    const choices = document.createElement('div');
    choices.className = 'google-image-choices';
    for (const result of results || []) {
      const url = result.unescapedUrl || result.url;
      const thumbnail = result.thumbnailImage?.url || result.tbUrl || url;
      if (!/^https:\/\//i.test(url) || !/^https:\/\//i.test(thumbnail)) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'image-search-choice';
      const image = new Image();
      image.loading = 'lazy';
      image.src = thumbnail;
      image.alt = result.titleNoFormatting || 'Imagem do Google';
      button.append(image, document.createTextNode('Prévia no slide'));
      button.onclick = () => onChoose(url);
      choices.append(button);
    }
    host.parentElement.querySelector('.google-image-choices')?.remove();
    if (choices.childElementCount) host.before(choices);
  });
  dialog.addEventListener('close', () => handlers.delete(name), { once: true });
  api.render({ div: name, tag: 'searchresults-only', gname: name, attributes: { enableImageSearch: true, defaultToImageSearch: true, disableWebSearch: true, autoSearchOnLoad: false } });
  return api.getElement(name);
}
