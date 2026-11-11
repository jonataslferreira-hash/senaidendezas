// Provedor OpenRouter para o Storage AI.
//
// O usuário não quer comprar créditos nem ativar cobrança. As variantes
// `:free` do OpenRouter atendem sem saldo e têm cota padrão de 50 chamadas por
// dia (20 por minuto) enquanto a conta não tiver créditos comprados. Este
// módulo consulta a cota antes de gastar uma chamada, guarda o resultado no
// cache para não repetir pedidos e aviso quando o limite do dia acabou.

const FREE_DAILY_LIMIT = 50;
const FREE_MINUTE_LIMIT = 20;
const QUOTA_TTL_SECONDS = 60;
const RESPONSE_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 2;

// `openrouter/free` é o roteador que escolhe, entre os modelos gratuitos
// disponíveis, um que aceite JSON e imagens. As demais opções entram como
// reserva quando o roteador ou o modelo principal falham.
const DEFAULT_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-26b-a4b-it:free'
];

// Modelos que aceitam `response_format` com saída JSON.
const JSON_MODELS = new Set([
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'liquid/lfm-3-1.7b:free',
  'dots-studio/dots-3-note-preview:free',
  'recursive/flint-v1.0:free',
  'thinkingmachines/inkling-2-small:free',
  'baidu/ernie-5.5-flash-preview:free'
]);

// Modeles que aceitam imagem de entrada (fotos enviadas pela pessoa).
const VISION_MODELS = new Set([
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free'
]);

const clean = value => String(value ?? '').trim();
const clip = (value, max) => clean(value).slice(0, max);

export function openRouterModels(env, { photos = false } = {}) {
  const configured = clean(env.OPENROUTER_MODEL).split(',').map(value => value.trim()).filter(Boolean);
  const list = configured.length ? configured : DEFAULT_MODELS;
  const filtered = photos ? list.filter(model => VISION_MODELS.has(model)) : list;
  return (filtered.length ? filtered : list).slice(0, 4);
}

export function openRouterEnabled(env) {
  return Boolean(env.OPENROUTER_API_KEY);
}

function nextUtcMidnight() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

async function readQuota(key) {
  const response = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw Error('key_status_' + response.status);
  const payload = await response.json();
  const free = payload?.data?.free_model_daily_requests || {};
  const used = Number(free.used || 0);
  const limit = Number(free.limit || FREE_DAILY_LIMIT);
  const remaining = Number.isFinite(free.remaining) ? Number(free.remaining) : Math.max(0, limit - used);
  return { used, limit, remaining, resetAt: nextUtcMidnight() };
}

// A cota muda devagar. Consultar /api/v1/key a cada pedido gasta o limite de
// requisições do próprio endpoint, por isso o resultado fica em cache por um
// minuto e é ajustado localmente a cada chamada que realmente usa o modelo.
const quotaCache = new Map();

export async function openRouterQuota(env, { force = false } = {}) {
  if (!openRouterEnabled(env)) return null;
  const key = env.OPENROUTER_API_KEY;
  const cached = quotaCache.get(key);
  if (!force && cached && Date.now() - cached.at < QUOTA_TTL_SECONDS * 1000) return cached.value;
  try {
    const value = await readQuota(key);
    quotaCache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return cached?.value || null;
  }
}

export function isQuotaExhausted(quota) {
  return Boolean(quota) && Number.isFinite(quota.remaining) && quota.remaining <= 0;
}

export function quotaNotice(quota) {
  const remaining = Math.max(0, Number(quota?.remaining ?? 0));
  if (!remaining) return 'A cota gratuita diária do OpenRouter acabou. Ela renova às 00h UTC (21h em Brasília).';
  return 'Restam ' + remaining + ' de ' + (quota?.limit || FREE_DAILY_LIMIT) + ' chamadas gratuitas hoje no OpenRouter.';
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Repetir exatamente o mesmo pedido não precisa consumir cota: a resposta fica
// guardada por alguns minutos no cache do Worker.
export async function cachedAnswer(env, user, payload, loader) {
  let key;
  try { key = await sha256(user.id + '|' + JSON.stringify(payload)); } catch { return { payload: await loader(), cached: false }; }
  const url = new URL('https://storage-lab.internal/ai/' + key);
  try {
    const hit = await caches.default.match(url);
    if (hit) return { payload: await hit.json(), cached: true };
  } catch { /* cache indisponível */ }
  const value = await loader();
  // Falhas não ficam no cache: o próximo pedido precisa tentar de novo.
  if (!value?.__error) {
    try {
      await caches.default.put(url, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + RESPONSE_TTL_SECONDS } }));
    } catch { /* cache indisponível */ }
  }
  return { payload: value, cached: false };
}

// Cada chamada que realmente usa o modelo reduz a cota restante conhecida.
export function spendQuota(env, amount = 1) {
  const key = env.OPENROUTER_API_KEY;
  const cached = quotaCache.get(key);
  if (!cached) return;
  const value = cached.value;
  const remaining = Math.max(0, (value.remaining ?? FREE_DAILY_LIMIT) - amount);
  quotaCache.set(key, { at: cached.at, value: { ...value, remaining, used: (value.used ?? 0) + amount } });
}

export async function runOpenRouter(env, messages, maxTokens, model, { photos = false } = {}) {
  const key = env.OPENROUTER_API_KEY;
  const body = {
    model,
    messages,
    temperature: 0.25,
    max_tokens: maxTokens,
    ...(JSON_MODELS.has(model) ? { response_format: { type: 'json_object' } } : {}),
    ...(photos ? { plugins: [] } : {})
  };
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'HTTP-Referer': clip(env.OPENROUTER_REFERER || 'https://jonataslferreira-hash.github.io/senaidendezas/', 300),
      'X-Title': clip(env.OPENROUTER_TITLE || 'Storage Lab', 80)
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000)
  });
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = Number(response.headers.get('X-RateLimit-Reset') || 0);
  if (!response.ok) {
    let detail = '';
    try {
      const payload = await response.json();
      detail = clip(payload?.error?.message || payload?.error?.metadata?.raw || '', 400);
    } catch { /* resposta sem corpo */ }
    // A cota do dia e o limite por minuto chegam como 429. O cabeçalho
    // `X-RateLimit-Remaining` zerado indica o dia; a mensagem "per day"
    // também. O resto é limite por minuto (20 chamadas).
    const daily = response.status === 429 && (remaining === '0' || /per day|daily|quotas? di[áa]ri/i.test(detail));
    const perMinute = response.status === 429 && !daily;
    const reason = daily ? 'quota' : perMinute ? 'minute' : response.status === 402 ? 'credits' :
      response.status === 401 || response.status === 403 ? 'access_denied' :
      response.status === 404 ? 'model_unavailable' : response.status === 400 ? 'rejected' : 'unavailable';
    return { ok: false, reason, status: response.status, detail, resetAt: reset ? reset * 1000 : nextUtcMidnight() };
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) return { ok: false, reason: 'invalid_response', status: response.status };
  return { ok: true, content, model: payload?.model || model };
}

export const openRouterFreeLimits = { daily: FREE_DAILY_LIMIT, minute: FREE_MINUTE_LIMIT, maxAttempts: MAX_ATTEMPTS };
