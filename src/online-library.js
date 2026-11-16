// Biblioteca online de modelos 3D gratuitos (NASA e Kenney, CC0).
// Os arquivos são baixados sob demanda do GitHub e entram na aula pelo
// mesmo caminho de um modelo enviado, ficando salvos para funcionar offline.
import { importModelFiles } from './model-files.js';
import { ONLINE_MODELS, ONLINE_MODEL_GROUPS, onlineGroupLabel, onlineModelUrl, onlineModelSizeLabel } from './online-catalog.js';

const MAX_MODEL_BYTES = 15 * 1024 * 1024;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normalize = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export async function importOnlineModel(model) {
  if (!model) throw Error('Escolha um modelo da biblioteca.');
  let response;
  try {
    response = await fetch(onlineModelUrl(model));
  } catch {
    throw Error('Não foi possível conectar à biblioteca. Verifique a internet e tente de novo.');
  }
  if (!response.ok) throw Error(`O arquivo não está disponível no momento (erro ${response.status}).`);
  const blob = await response.blob();
  if (!blob.size) throw Error('O arquivo baixado está vazio.');
  if (blob.size > MAX_MODEL_BYTES) throw Error('Este modelo passa de 15 MB e não pode ser inserido.');
  const fileName = model.file.split('/').pop();
  const file = new File([blob], fileName, { type: 'model/gltf-binary' });
  const imported = await importModelFiles([file]);
  if (!imported) throw Error('Não foi possível preparar o modelo baixado.');
  return imported;
}

/**
 * Abre o modal da biblioteca online. `onModel` recebe o modelo importado
 * (mesmo formato de um upload manual) depois do download concluído.
 */
export function openOnlineLibrary({ onModel } = {}) {
  const existing = document.getElementById('online-library-modal');
  if (existing?.open) return existing;
  existing?.remove();
  const byId = new Map(ONLINE_MODELS.map(m => [m.id, m]));
  const dialog = document.createElement('dialog');
  dialog.id = 'online-library-modal';
  dialog.className = 'online-library-modal';
  dialog.setAttribute('aria-labelledby', 'online-library-title');
  const shell = document.querySelector('.studio-shell');
  const accent = getComputedStyle(shell || document.documentElement).getPropertyValue('--studio-accent').trim();
  if (accent) dialog.style.setProperty('--ol-accent', accent);
  dialog.innerHTML = `<form method="dialog" class="online-library-head">
      <div>
        <strong id="online-library-title">Biblioteca online de modelos 3D</strong>
        <p>Gratuitos e sem cadastro — NASA (domínio público) e Kenney (CC0). Ao usar, o modelo é baixado e fica salvo na aula.</p>
      </div>
      <button type="submit" class="online-library-close" aria-label="Fechar">×</button>
    </form>
    <div class="online-library-body">
      <div class="online-library-tools">
        <input type="search" class="online-library-search" placeholder="Buscar (ex.: rover, árvore, telescópio)" aria-label="Buscar modelo" autocomplete="off">
        <div class="online-library-filters" role="tablist" aria-label="Filtrar por tema">${[['all', 'Todos'], ...ONLINE_MODEL_GROUPS.map(g => [g.id, g.label])].map(([key, label]) => `<button type="button" role="tab" class="online-library-filter" data-online-filter="${esc(key)}" aria-selected="${key === 'all'}">${esc(label)}</button>`).join('')}</div>
      </div>
      <div class="online-library-grid" role="list"></div>
      <p class="online-library-status" role="status" aria-live="polite"></p>
    </div>
    <footer class="online-library-foot"><span>${ONLINE_MODELS.length} modelos · servidos pelo GitHub</span><span>NASA 3D Resources (domínio público) · Kenney (CC0)</span></footer>`;
  const grid = dialog.querySelector('.online-library-grid');
  const search = dialog.querySelector('.online-library-search');
  const status = dialog.querySelector('.online-library-status');
  let filter = 'all', query = '', busy = false;
  const matches = m => (filter === 'all' || m.group === filter) && (!query || normalize(m.name).includes(query) || normalize(onlineGroupLabel(m.group)).includes(query));
  const render = () => {
    const items = ONLINE_MODELS.filter(matches);
    grid.innerHTML = items.length
      ? items.map(m => `<button type="button" class="online-library-card" role="listitem" data-online-model="${esc(m.id)}"><span class="online-library-card-name">${esc(m.name)}</span><span class="online-library-card-meta">${esc(onlineGroupLabel(m.group))} · ${esc(onlineModelSizeLabel(m.bytes))}</span><span class="online-library-card-cta">Baixar e usar</span></button>`).join('')
      : '<p class="online-library-empty">Nenhum modelo encontrado.</p>';
  };
  render();
  dialog.querySelector('.online-library-filters').addEventListener('click', e => {
    const tab = e.target.closest('[data-online-filter]');
    if (!tab) return;
    filter = tab.dataset.onlineFilter;
    for (const item of dialog.querySelectorAll('[data-online-filter]')) item.setAttribute('aria-selected', String(item === tab));
    render();
  });
  search.addEventListener('input', () => { query = normalize(search.value.trim()); render(); });
  grid.addEventListener('click', async e => {
    const card = e.target.closest('[data-online-model]');
    if (!card || busy) return;
    const model = byId.get(card.dataset.onlineModel);
    if (!model) return;
    busy = true;
    card.classList.add('is-loading');
    card.disabled = true;
    const cta = card.querySelector('.online-library-card-cta');
    const label = cta?.textContent;
    if (cta) cta.textContent = 'Baixando…';
    status.classList.remove('is-error');
    status.textContent = `Baixando “${model.name}”…`;
    try {
      const imported = await importOnlineModel(model);
      status.textContent = `“${model.name}” foi adicionado à aula.`;
      dialog.close();
      onModel?.(imported);
    } catch (err) {
      status.classList.add('is-error');
      status.textContent = err?.message || 'Não foi possível baixar este modelo.';
      card.classList.remove('is-loading');
      card.disabled = false;
      if (cta && label) cta.textContent = label;
    } finally {
      busy = false;
    }
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.appendChild(dialog);
  dialog.showModal();
  search.focus();
  return dialog;
}
