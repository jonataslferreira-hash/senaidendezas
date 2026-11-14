// Experimentos importados: um arquivo HTML feito fora (por exemplo com ajuda de
// uma IA) que roda isolado dentro do slide. O código fica em um iframe sem
// acesso à página, à conta, à sala nem à internet.
import { simulationGroups, simulationNames, simulationSubjects, simulationMarkup } from './simulations.js';

export const CUSTOM_SIM_MAX = 120_000;
const STORE = 'sl-custom-experiments';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export const experimentCategories = () => simulationGroups.map(([subject]) => subject);

// Devolve o experimento limpo ou null quando o conteúdo não serve.
export function validCustomSim(value) {
  if (!value || typeof value !== 'object' || typeof value.html !== 'string') return null;
  const html = value.html.trim();
  if (!html || html.length > CUSTOM_SIM_MAX || !/<[a-z][\s\S]*>/i.test(html)) return null;
  const categories = experimentCategories();
  return {
    name: clean(value.name, 80) || 'Experimento importado',
    category: categories.includes(value.category) ? value.category : categories[0],
    html
  };
}

// Lê o arquivo escolhido: aceita o HTML do modelo (nome e categoria nas metas).
export function parseExperimentFile(text, fileName = '') {
  const source = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!source) throw Error('O arquivo está vazio.');
  if (source.length > CUSTOM_SIM_MAX) throw Error(`O experimento passou do limite de ${Math.round(CUSTOM_SIM_MAX / 1000)} mil caracteres. Peça uma versão mais simples, sem imagens embutidas.`);
  if (!/<(?:html|body|script|svg|canvas|div|style)\b/i.test(source)) throw Error('Este arquivo não parece um experimento. Use o modelo .html do Storage Lab.');
  const meta = name => new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i').exec(source)?.[1]
    || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i').exec(source)?.[1] || '';
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(source)?.[1] || '';
  const categories = experimentCategories(), wanted = clean(meta('storagelab-categoria'), 40).toLowerCase();
  const sim = validCustomSim({
    name: meta('storagelab-nome') || title || fileName.replace(/\.[^.]+$/, ''),
    category: categories.find(item => item.toLowerCase() === wanted) || categories[0],
    html: source
  });
  if (!sim) throw Error('Não consegui ler este experimento. Use o modelo .html do Storage Lab.');
  return sim;
}

// Documento que vai para dentro do iframe: a política abaixo bloqueia rede,
// formulários e qualquer recurso externo, mesmo que o arquivo peça.
const POLICY = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; form-action 'none'; base-uri 'none'">`;
export function sandboxDocument(html) {
  const source = String(html || '');
  if (/<head[^>]*>/i.test(source)) return source.replace(/<head[^>]*>/i, match => match + POLICY);
  if (/<html[^>]*>/i.test(source)) return source.replace(/<html[^>]*>/i, match => match + '<head>' + POLICY + '</head>');
  return '<!doctype html><html><head><meta charset="utf-8">' + POLICY + '</head><body>' + source + '</body></html>';
}

export const isCustomExperiment = element => element?.simulation === 'custom' && Boolean(element.customSim?.html);
export const experimentName = element => isCustomExperiment(element) ? element.customSim.name : simulationNames[element?.simulation] || 'Experimento';
export const experimentSubject = element => isCustomExperiment(element) ? element.customSim.category : simulationSubjects[element?.simulation] || 'Ciências';

export function customSimMarkup(sim, { interactive = true } = {}) {
  // Miniaturas não carregam o experimento: mostram só a ficha dele.
  if (!interactive) return `<section class="simulation-widget custom-sim custom-sim-card"><header><strong>${esc(sim.name)}</strong><span>${esc(String(sim.category).toUpperCase())}</span></header><p>Experimento importado</p></section>`;
  return `<section class="simulation-widget custom-sim" data-custom-sim${interactive ? '' : ' data-static'}><header><strong>${esc(sim.name)}</strong><span>${esc(String(sim.category).toUpperCase())}</span></header><iframe sandbox="allow-scripts" referrerpolicy="no-referrer" loading="lazy" title="Experimento: ${esc(sim.name)}" srcdoc="${esc(sandboxDocument(sim.html))}"></iframe></section>`;
}

// Um ponto único para desenhar o experimento de um elemento, nativo ou importado.
export function experimentMarkup(element, options = {}) {
  return isCustomExperiment(element) ? customSimMarkup(element.customSim, options) : simulationMarkup(element.simulation, options);
}

// Biblioteca pessoal, guardada neste navegador.
export function loadCustomSims() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE) || '[]');
    return (Array.isArray(list) ? list : []).map(item => { const sim = validCustomSim(item); return sim && typeof item.id === 'string' ? { id: item.id.slice(0, 60), ...sim } : null; }).filter(Boolean).slice(0, 40);
  } catch { return []; }
}
export function saveCustomSims(list) {
  try { localStorage.setItem(STORE, JSON.stringify(list.slice(0, 40))); return true; } catch { return false; }
}

export const experimentTemplate = () => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!--
  MODELO DE EXPERIMENTO · STORAGE LAB
  ===================================
  Como usar: envie este arquivo inteiro para uma IA (ChatGPT, Claude, Gemini...)
  junto com o pedido, por exemplo:

    "Usando este modelo, crie um experimento interativo sobre <ASSUNTO> para
     alunos do <ANO>. Devolva o arquivo .html completo, seguindo as regras."

  Depois salve a resposta como .html e importe em
  Inserir mais > Simulação > Importar experimento.

  REGRAS (a IA precisa seguir todas):
  1. Um único arquivo .html. Todo o CSS fica em <style> e todo o JavaScript em <script>.
  2. Nada de fora: sem links para bibliotecas, fontes, imagens ou APIs. O experimento
     roda isolado e sem internet; qualquer endereço externo é bloqueado.
     Desenhe com SVG, <canvas> ou HTML/CSS. Imagem só embutida (data:) e pequena.
  3. Não use localStorage, cookies, alert(), prompt(), janelas novas nem formulários.
  4. Ocupe 100% da largura e da altura disponíveis e funcione de 320x240 até tela cheia
     (use unidades relativas: %, vw, vh, clamp()). Não crie barra de rolagem.
  5. Funcione com toque e com mouse. Controles grandes (pelo menos 36px de altura).
  6. Mostre sempre o resultado em texto, numa frase simples, além do desenho.
  7. Textos em português do Brasil, com linguagem de sala de aula.
  8. Mantenha as duas metas abaixo: nome do experimento e categoria.
     Categorias aceitas: ${experimentCategories().join(', ')}.
  9. Arquivo final com no máximo ${Math.round(CUSTOM_SIM_MAX / 1000)} mil caracteres.
-->
<meta name="storagelab-nome" content="Queda livre">
<meta name="storagelab-categoria" content="Física">
<title>Queda livre</title>
<style>
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { display: grid; grid-template-rows: minmax(0, 1fr) auto auto; gap: 2vh; padding: 3vh 4vw; background: #171c2c; color: #e8eefc; font: clamp(12px, 2.6vmin, 18px)/1.4 system-ui, sans-serif; overflow: hidden; }
  svg { width: 100%; height: 100%; min-height: 0; }
  label { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; font-weight: 600; }
  input[type=range] { grid-column: 1 / 3; width: 100%; height: 36px; accent-color: #a78bfa; }
  output { color: #c4b5fd; font-variant-numeric: tabular-nums; }
  p { margin: 0; color: #a7f3d0; }
</style>
</head>
<body>
  <svg viewBox="0 0 400 220" role="img" aria-label="Bola caindo de uma altura">
    <line x1="40" y1="200" x2="360" y2="200" stroke="#64748b" stroke-width="2"/>
    <line x1="120" y1="20" x2="120" y2="200" stroke="#334155" stroke-width="2" stroke-dasharray="4 4"/>
    <text id="rotulo" x="135" y="30" fill="#e8eefc" font-size="13">altura</text>
    <circle id="bola" cx="200" cy="20" r="12" fill="#fbbf24"/>
  </svg>
  <label>Altura da queda (m) <output id="valor">20</output>
    <input id="altura" type="range" min="1" max="100" value="20">
  </label>
  <p id="resultado"></p>
<script>
  const altura = document.getElementById('altura'), valor = document.getElementById('valor');
  const resultado = document.getElementById('resultado'), bola = document.getElementById('bola'), rotulo = document.getElementById('rotulo');
  let inicio = performance.now();
  function calcular() {
    const h = Number(altura.value), g = 9.8;
    const tempo = Math.sqrt(2 * h / g), velocidade = g * tempo;
    valor.textContent = h;
    rotulo.textContent = h + ' m';
    resultado.textContent = 'De ' + h + ' m, a bola leva ' + tempo.toFixed(1).replace('.', ',') + ' s para cair e chega a ' + (velocidade * 3.6).toFixed(0) + ' km/h.';
    return tempo;
  }
  function animar(agora) {
    const tempo = calcular(), ciclo = tempo + 1;
    const t = Math.min(tempo, ((agora - inicio) / 1000) % ciclo);
    bola.setAttribute('cy', 20 + 168 * (t / tempo) ** 2);
    requestAnimationFrame(animar);
  }
  altura.addEventListener('input', () => { inicio = performance.now(); });
  requestAnimationFrame(animar);
</script>
</body>
</html>
`;
