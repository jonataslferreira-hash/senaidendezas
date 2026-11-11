// Busca de imagens livres para o Storage Lab.
//
// A Custom Search JSON API do Google foi fechada para novos clientes e encerra
// em 1º de janeiro de 2027. Aqui a busca usa três catálogos gratuitos e sem
// chave: Wikimedia Commons, páginas da Wikipédia e Openverse. O Worker centraliza
// as chamadas (evita CORS e timeouts no navegador), guarda o resultado no cache
// para não repetir consultas e devolve a origem e a licença de cada imagem.

const UPSTREAM_TIMEOUT = 12000;
const CACHE_TTL_SECONDS = 1800;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;
const MAX_QUERY = 160;
const MAX_PROXY_BYTES = 8 * 1024 * 1024;
const USER_AGENT = 'StorageLab/1.0 (open educational slide tool)';

const clean = value => String(value ?? '').trim();
const clip = (value, max) => clean(value).slice(0, max);
// Remove os parâmetros de rastreamento que o Wikimedia acrescenta nas miniaturas.
const untagged = value => clean(value).replace(/[?&]utm_[^=]+=[^&]*/g, '').replace(/[?&]$/, '');
const tokens = value => clean(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').match(/[\p{L}\p{N}]+/gu) || [];

// Documentos e digitalizações aparecem no Commons quando se busca "ícone" ou
// "sistema operacional": são PDFs, DJVUs e TIFFs de páginas escaneadas. Eles
// nunca servem como foto de slide.
const DOCUMENT_MIME = /^(?:application\/|image\/(?:vnd\.djvu|tiff|x-tiff|x-ms-bmp))/i;
const DOCUMENT_FILE = /\.(?:pdf|djvu|djv|tiff?|bmp|docx?|pptx?|xlsx?|odt|ods|odp|epub|txt|zip|gz|ogg|ogv|webm|mp4)$/i;
function isDocument(item) {
  return DOCUMENT_MIME.test(clean(item?.kind)) || DOCUMENT_FILE.test(clean(item?.file || item?.title));
}


async function fetchJSON(url, timeout = UPSTREAM_TIMEOUT) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw Error('upstream_' + response.status);
  return response.json();
}

// ---------------------------------------------------------------------------
// Licença e autoria
// ---------------------------------------------------------------------------

function plainText(value) {
  return clean(String(value ?? '')).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

function licenseInfo(meta = {}) {
  const raw = plainText(meta.LicenseShortName?.value || meta.License?.value || meta.UsageTerms?.value || '');
  const url = clip(meta.LicenseUrl?.value, 300);
  const required = plainText(meta.AttributionRequired?.value) === 'true';
  if (!raw) return { license: '', licenseUrl: url };
  if (/cc[ -]?0|cc[ -]?zero/i.test(raw)) return { license: 'CC0', licenseUrl: url || 'https://creativecommons.org/publicdomain/zero/1.0/' };
  if (/public domain|dom[ií]nio p[uú]blico|pd-(old|art|us|self|gov)|^pd$/i.test(raw)) return { license: 'Domínio público', licenseUrl: url };
  const match = /cc[ -]?(by[ -]?(?:sa|nd|nc)?)?[ -]?([1-4]\.[0-9])/i.exec(raw);
  if (match) {
    const variant = (match[1] || 'by').replace(/\s+/g, '-').toLowerCase();
    return { license: 'CC ' + variant.toUpperCase() + ' ' + match[2], licenseUrl: url || 'https://creativecommons.org/licenses/' + variant + '/' + match[2] + '/' };
  }
  return { license: clip(raw, 60), licenseUrl: url, attributionRequired: required || undefined };
}

function authorInfo(meta = {}) {
  const author = plainText(meta.Artist?.value || meta.Attribution?.value || meta.Credit?.value || '');
  return clip(author, 200);
}

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

async function commonsSearch(query, limit) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', generator: 'search',
    gsrsearch: query, gsrnamespace: '6', gsrlimit: String(limit),
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '640',
    iiextmetadatafilter: 'License|LicenseShortName|LicenseUrl|AttributionRequired|Artist|Attribution|Credit|ImageDescription'
  });
  const payload = await fetchJSON('https://commons.wikimedia.org/w/api.php?' + params);
  const items = [];
  for (const page of payload?.query?.pages || []) {
    const info = page.imageinfo?.[0];
    const thumb = untagged(info?.thumburl);
    const original = untagged(info?.url);
    if (!thumb || !original) continue;
    const meta = info.extmetadata || {};
    const file = page.title?.replace(/^File:/, '') || '';
    const description = plainText(meta.ImageDescription?.value);
    const candidate = {
      id: 'commons:' + page.pageid,
      title: clip(file.replace(/_/g, ' '), 200),
      file: clip(file, 200),
      description,
      thumbnail: thumb,
      url: original,
      source: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(page.title || ''),
      catalog: 'Wikimedia Commons',
      author: authorInfo(meta),
      license: licenseInfo(meta).license,
      licenseUrl: licenseInfo(meta).licenseUrl,
      width: Number(info.width) || 0,
      height: Number(info.height) || 0,
      kind: clip(info.mime, 40)
    };
    if (!isDocument(candidate)) items.push(candidate);
  }
  return items;
}

async function wikipediaSearch(query, limit, host = 'pt.wikipedia.org') {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', generator: 'search',
    gsrsearch: query, gsrnamespace: '0', gsrlimit: String(limit),
    prop: 'pageimages|info', piprop: 'original|thumbnail|name', pithumbsize: '640', inprop: 'url'
  });
  const payload = await fetchJSON('https://' + host + '/w/api.php?' + params);
  const items = [];
  for (const page of payload?.query?.pages || []) {
    const original = untagged(page.original?.source);
    const thumbnail = untagged(page.thumbnail?.source || original);
    if (!thumbnail) continue;
    items.push({
      id: 'wikipedia:' + page.pageid,
      title: clip(page.title, 200),
      file: clip(page.pageimage, 200),
      description: '',
      thumbnail,
      url: original || thumbnail,
      source: clip(page.fullurl, 600) || 'https://' + host + '/wiki/' + encodeURIComponent(page.title || ''),
      catalog: host.startsWith('en.') ? 'Wikipédia (en)' : 'Wikipédia',
      author: '',
      license: '',
      licenseUrl: '',
      width: Number(page.original?.width || page.thumbnail?.width) || 0,
      height: Number(page.original?.height || page.thumbnail?.height) || 0,
      kind: 'image',
      fileTitle: clip(page.pageimage, 200)
    });
  }
  return items;
}

async function openverseSearch(query, limit) {
  const params = new URLSearchParams({ q: query, license: 'cc0,pdm,by,by-sa', page_size: String(limit), mature: 'false' });
  const payload = await fetchJSON('https://api.openverse.org/v1/images/?' + params, 15000);
  const items = [];
  for (const result of payload?.results || []) {
    const thumbnail = clip(result.thumbnail, 600);
    const original = clip(result.url, 600);
    if (!thumbnail) continue;
    items.push({
      id: 'openverse:' + (result.id || original),
      title: clip(String(result.title || query).replace(/^File:/i, '').replace(/_/g, ' '), 200),
      file: clip(String(result.title || ''), 200),
      description: clip((result.tags || []).map(tag => tag?.name).filter(Boolean).join(' '), 300),
      thumbnail,
      url: original || thumbnail,
      source: clip(result.foreign_landing_url, 600),
      catalog: 'Openverse',
      author: clip(result.creator, 200),
      license: clip(result.license, 20).toUpperCase() + (result.license_version ? ' ' + clip(result.license_version, 8) : ''),
      licenseUrl: clip(result.license_url, 300),
      width: Number(result.width) || 0,
      height: Number(result.height) || 0,
      kind: 'image'
    });
  }
  return items;
}

// Resolve a licença dos arquivos usados nas páginas da Wikipédia em uma única
// consulta ao Commons, para não repetir a busca arquivo por arquivo.
// A Wikipédia devolve o nome do arquivo com underscore e o Commons devolve
// o título com espaço. A comparação normaliza os dois.
const fileKey = value => clean(value).replace(/^File:/i, '').replace(/_/g, ' ').trim().toLowerCase();

async function resolveWikipediaLicenses(items) {
  const files = items.filter(item => item.id.startsWith('wikipedia:')).map(item => item.fileTitle).filter(Boolean);
  if (!files.length) return items;
  try {
    const params = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', origin: '*',
      titles: files.map(file => 'File:' + file).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata',
      iiextmetadatafilter: 'License|LicenseShortName|LicenseUrl|AttributionRequired|Artist|Attribution'
    });
    const payload = await fetchJSON('https://commons.wikimedia.org/w/api.php?' + params);
    const byTitle = new Map();
    for (const page of payload?.query?.pages || []) {
      const meta = page.imageinfo?.[0]?.extmetadata || {};
      byTitle.set(fileKey(page.title), { ...licenseInfo(meta), author: authorInfo(meta) });
    }
    for (const item of items) {
      const found = byTitle.get(fileKey(item.fileTitle));
      if (!found) continue;
      item.license = found.license;
      item.licenseUrl = found.licenseUrl;
      item.author = found.author || item.author;
    }
  } catch { /* a licença continua desconhecida, o que é aceitável */ }
  return items;
}

// ---------------------------------------------------------------------------
// Relevância
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set('de da do das dos em para por com a o as os um uma uns umas the of and on in'.split(' '));
// Palavras genéricas não devem dominating a comparação: "Microsoft Copilot AI"
// precisa casar com "Microsoft Copilot", não com qualquer coisa com "AI".
const GENERIC_TOKENS = new Set([
  'ai', 'ia', 'image', 'images', 'imagem', 'imagens', 'photo', 'photos', 'foto', 'fotos', 'picture', 'pictures',
  'logo', 'logotipo', 'icon', 'icons', 'technology', 'tecnologia', 'tech', 'background', 'wallpaper', 'free',
  'png', 'svg', 'illustration', 'ilustracao', 'vector', 'model', 'models', 'concept', 'concepto', 'slide',
  'slides', 'page', 'pagina', 'aula', 'class', 'online', 'gratis', 'download',
  'future', 'futuro', 'conclusion', 'conclusao', 'introduction', 'introducao', 'evolution', 'evolucao',
  'presentation', 'apresentacao'
]);
// Marcas e palavras de duplo sentido: no Commons, "windows" é janela de prédio
// e "apple" é a fruta. Elas nunca decidem sozinhas a relevância.
const AMBIGUOUS_TOKENS = new Set([
  'windows', 'window', 'office', 'word', 'excel', 'powerpoint', 'teams', 'edge', 'chrome', 'drive',
  'cloud', 'mouse', 'apple', 'python', 'java', 'swift', 'rust', 'system', 'sistema', 'operating',
  'desktop', 'interface', 'update', 'store', 'photos', 'camera'
]);

const normalizeTitle = value => tokens(value).join(' ');

function scoreItem(item, queryTokens, { transparent = false, wantsIcon = false } = {}) {
  const label = (item.title || '') + ' ' + (item.file || '');
  const titleTokens = new Set(tokens(label));
  const haystack = new Set(tokens(label + ' ' + (item.description || '')));
  const significant = queryTokens.filter(token => !GENERIC_TOKENS.has(token) && !AMBIGUOUS_TOKENS.has(token));
  const base = significant.length ? significant : queryTokens;
  let matched = 0;
  for (const token of base) if (titleTokens.has(token)) matched++;
  let score = base.length ? matched / base.length : 0;
  for (const token of queryTokens) if (!base.includes(token) && haystack.has(token)) score += 0.15;
  const normalized = normalizeTitle(item.title);
  const phrase = base.join(' ');
  if (phrase && normalized === phrase) score += 1.2;
  else if (phrase && normalized.startsWith(phrase)) score += 0.8;
  if (base.length > 1 && matched === base.length) score += 0.6;
  // Pedido de fundo transparente: PNG, WebP e SVG têm chance de ter alfa.
  if (transparent && /svg|png|webp/i.test(item.kind || '')) score += 0.45;
  // Ícone, logo ou símbolo: vetor/PNG recortado é melhor que uma foto.
  if (wantsIcon && /svg|png/i.test(item.kind || '')) score += 0.5;
  // Formato de slide (paisagem) rende mais que uma foto em pé ou panorâmica.
  if (item.width && item.height) {
    const ratio = item.width / item.height;
    if (ratio >= 1.2 && ratio <= 2.1) score += 0.18;
    else if (ratio < 0.75 || ratio > 3) score -= 0.12;
  }
  if (item.license) score += 0.05;
  if (item.width && item.height) score += 0.05;
  return score;
}

// Depois do ranqueamento: um mesmo arquivo pode aparecer no Commons e na
// Wikipédia. Fica o primeiro (o de maior pontuação) e o outro sai da lista.
function dedupe(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = normalizeTitle(item.title).replace(/\.[a-z0-9]+$/, '');
    const url = (item.url || '').split('?')[0];
    if((!key&&!url)||seen.has(key)||seen.has(url))continue;
    seen.add(key); seen.add(url);
    unique.push(item);
  }
  return unique;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

async function cached(key, loader) {
  const url = new URL('https://storage-lab.internal/images/' + key);
  try {
    const hit = await caches.default.match(url);
    if (hit) return await hit.json();
  } catch { /* cache indisponível */ }
  const value = await loader();
  try {
    await caches.default.put(url, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + CACHE_TTL_SECONDS } }));
  } catch { /* cache indisponível */ }
  return value;
}

async function searchImages(query, page, limit, { transparent = false } = {}) {
  const term = clip(query, MAX_QUERY);
  const key = encodeURIComponent(term.toLowerCase()) + '-' + page + '-' + limit + (transparent ? '-png' : '');
  return cached(key, async () => {
    const queryTokens = tokens(term).filter(token => token.length > 1 && !STOP_WORDS.has(token));
    const wantsIcon = queryTokens.some(token => ['logo', 'logotipo', 'logomarca', 'icon', 'icone', 'simbolo', 'symbol'].includes(token));
    // Uma segunda busca sem preposições encontra o artigo do assunto quando o
    // pedido vem em português ("area de trabalho do windows" -> "windows").
    const meaningful = tokens(term).filter(token => token.length > 3 && !GENERIC_TOKENS.has(token) && !STOP_WORDS.has(token));
    const alternate = meaningful.length >= 2 ? meaningful.join(' ') : '';
    const [commons, wiki, wikiEn, openverse, commonsAlt, wikiAlt, wikiEnAlt] = await Promise.allSettled([
      commonsSearch(term, 30),
      wikipediaSearch(term, 6, 'pt.wikipedia.org'),
      wikipediaSearch(term, 6, 'en.wikipedia.org'),
      openverseSearch(term, 24),
      alternate ? commonsSearch(alternate, 18) : Promise.resolve([]),
      alternate ? wikipediaSearch(alternate, 4, 'pt.wikipedia.org') : Promise.resolve([]),
      alternate ? wikipediaSearch(alternate, 4, 'en.wikipedia.org') : Promise.resolve([])
    ]);
    const wikiItems = [
      ...(wiki.status === 'fulfilled' ? wiki.value : []),
      ...(wikiEn.status === 'fulfilled' ? wikiEn.value : []),
      ...(wikiAlt.status === 'fulfilled' ? wikiAlt.value : []),
      ...(wikiEnAlt.status === 'fulfilled' ? wikiEnAlt.value : [])
    ];
    const withLicenses = await resolveWikipediaLicenses(wikiItems);
    const all = [
      ...(commons.status === 'fulfilled' ? commons.value : []),
      ...(commonsAlt.status === 'fulfilled' ? commonsAlt.value : []),
      ...withLicenses,
      ...(openverse.status === 'fulfilled' ? openverse.value : [])
    ];
    const ranked = all
      .filter(item => !isDocument(item) && item.thumbnail && item.url)
      .map(item => ({ ...item, score: scoreItem(item, queryTokens, { transparent, wantsIcon }) }))
      .sort((a, b) => b.score - a.score || (b.width * b.height) - (a.width * a.height));
    const unique = dedupe(ranked);
    const start = (page - 1) * limit;
    return { query: term, page, items: unique.slice(start, start + limit).map(({ fileTitle, ...item }) => item), total: unique.length };
  });
}

// ---------------------------------------------------------------------------
// Proxy do arquivo original
// ---------------------------------------------------------------------------

const PROXY_HOSTS = [
  'wikimedia.org', 'wikipedia.org', 'openverse.org', 'flickr.com', 'staticflickr.com',
  'pexels.com', 'pixabay.com', 'wikimediafoundation.org', 'creativecommons.org'
];

function proxyAllowed(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return PROXY_HOSTS.some(allowed => host === allowed || host.endsWith('.' + allowed));
  } catch { return false; }
}

async function proxyImage(url) {
  if (!proxyAllowed(url)) throw Error('Origem não permitida.');
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error('upstream_' + response.status);
  const type = clip(response.headers.get('Content-Type'), 80).split(';')[0].trim();
  if (!type.startsWith('image/')) throw Error('tipo inválido');
  const length = Number(response.headers.get('Content-Length') || 0);
  if (length && length > MAX_PROXY_BYTES) throw Error('imagem grande demais');
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_PROXY_BYTES) throw Error('imagem grande demais');
  return { buffer, type };
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

export async function handleStorageAIImages(request, env, user, headers) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/storage-ai/images')) return null;
  const json = (value, status = 200) => Response.json(value, { status, headers });
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  if (url.pathname === '/storage-ai/images/raw') {
    const target = url.searchParams.get('url') || '';
    try {
      const { buffer, type } = await proxyImage(target);
      return new Response(buffer, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': headers['Access-Control-Allow-Origin'] || '*' } });
    } catch (error) {
      return json({ error: 'image_unavailable', detail: String(error?.message || '') }, 502);
    }
  }

  const query = clip(url.searchParams.get('q') || '', MAX_QUERY);
  const page = Math.max(1, Math.min(6, Number(url.searchParams.get('page')) || 1));
  const limit = Math.max(6, Math.min(MAX_LIMIT, Number(url.searchParams.get('limit')) || DEFAULT_LIMIT));
  const transparent = url.searchParams.get('transparent') === '1';
  if (!query) return json({ error: 'invalid_query', items: [] }, 400);
  try {
    const result = await searchImages(query, page, limit, { transparent });
    return json(result, 200, { 'Cache-Control': 'private, max-age=300' });
  } catch {
    return json({ error: 'search_unavailable', items: [] }, 502);
  }
}
