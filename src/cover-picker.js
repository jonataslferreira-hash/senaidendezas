// "Trocar capa": busca de imagens, link, colar (Ctrl+V), arrastar ou enviar um arquivo.
// Devolve a capa pronta (data URL 16:9), '' para remover ou null se a pessoa cancelar.
import { studioIcon } from './studio-icons.js';
import { cropLessonCover, coverFromImage } from './lesson-cover.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const looksLikeImageLink = text => /^https?:\/\/[^\s<>"']{4,2000}$/i.test(String(text || '').trim());
const okType = /^image\/(png|jpe?g|webp|gif)$/;

export function pickLessonCover({ current = '', query = '', toast = () => {} } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'studio-dialog cover-picker';
  dialog.innerHTML = `<form method="dialog">
    <header class="cp-head"><div><h2>Trocar capa</h2><p>Busque uma foto, cole um link ou uma imagem (Ctrl+V).</p></div><button class="cp-close" value="cancel" aria-label="Fechar">×</button></header>
    <div class="cp-body">
      <section class="cp-stage" data-drop>
        <div class="cp-preview" data-empty="${!current}"><img alt="Prévia da capa" ${current ? `src="${esc(current)}"` : 'hidden'}><div class="cp-empty">${studioIcon('image')}<strong>Sem capa</strong><span>Arraste uma imagem para cá</span></div><div class="cp-loading" hidden><i></i><span>Carregando imagem…</span></div></div>
        <div class="cp-stage-actions"><button type="button" class="studio-btn quiet" data-cp="adjust" disabled>Ajustar enquadramento</button><button type="button" class="studio-btn link" data-cp="clear" ${current ? '' : 'disabled'}>Remover capa</button></div>
        <label class="cp-link">${studioIcon('link')}<input type="url" inputmode="url" placeholder="Cole o link de uma imagem" aria-label="Link da imagem" autocomplete="off"><button type="button" data-cp="link">Usar</button></label>
        <label class="cp-upload">${studioIcon('upload')} Enviar do aparelho<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></label>
      </section>
      <section class="cp-search">
        <div class="cp-search-bar">${studioIcon('search')}<input type="search" placeholder="Buscar imagens" aria-label="Buscar imagens" value="${esc(String(query || '').slice(0, 80))}" autocomplete="off" enterkeyhint="search"><button type="button" class="studio-btn accent" data-cp="search">Buscar</button></div>
        <div class="cp-results" aria-live="polite"><p class="cp-hint">Digite um assunto e toque em Buscar. Fotos largas (16:9) ficam melhores na capa.</p></div>
      </section>
    </div>
    <footer class="cp-foot"><button class="studio-btn quiet" value="cancel">Cancelar</button><button class="studio-btn accent" value="apply">Salvar capa</button></footer>
  </form>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const image = $('.cp-preview img'), preview = $('.cp-preview'), loading = $('.cp-loading'), results = $('.cp-results');
  let thumbnail = current, source = null, job = 0, choices = [];
  const paint = () => {
    image.hidden = !thumbnail; if (thumbnail) image.src = thumbnail;
    preview.dataset.empty = String(!thumbnail);
    $('[data-cp=adjust]').disabled = !source; $('[data-cp=clear]').disabled = !thumbnail;
    preview.classList.remove('is-new'); void preview.offsetWidth; preview.classList.add('is-new');
  };
  // Qualquer origem (arquivo, colado, link, busca) passa por aqui.
  const useBlob = async (load, failure) => {
    const mine = ++job; loading.hidden = false;
    try {
      const blob = await load();
      if (mine !== job) return;
      if (!blob || !okType.test(blob.type)) throw Error(failure);
      if (blob.size > 15 * 1024 * 1024) throw Error('A imagem passa de 15 MB. Escolha uma menor.');
      const cover = await coverFromImage(blob);
      if (mine !== job) return;
      if (!cover) throw Error('Não foi possível preparar esta imagem.');
      source = blob; thumbnail = cover; paint();
    } catch (error) { if (mine === job) toast(error.message || failure); }
    finally { if (mine === job) loading.hidden = true; }
  };
  const fromLink = async url => {
    url = String(url || '').trim();
    if (!looksLikeImageLink(url)) { toast('Cole um link completo, começando com https://'); return; }
    const { fetchImageBlob } = await import('./storage-ai-image-search.js');
    await useBlob(() => fetchImageBlob(url), 'Não consegui abrir este link como imagem. Tente salvar a imagem e enviar o arquivo.');
  };
  const search = async () => {
    const term = $('.cp-search-bar input').value.trim();
    if (!term) { $('.cp-search-bar input').focus(); return; }
    const mine = ++job;
    results.innerHTML = '<div class="cp-grid">' + Array.from({ length: 9 }, (_, i) => `<i class="cp-skeleton" style="--i:${i}"></i>`).join('') + '</div>';
    try {
      const { searchImageChoices } = await import('./storage-ai-image-search.js');
      const list = await searchImageChoices(term, 1);
      if (mine !== job) return;
      // Fotos largas primeiro: combinam com a capa 16:9.
      const wide = item => item.width && item.height ? Math.abs(item.width / item.height - 16 / 9) : 1;
      choices = [...list].sort((a, b) => wide(a) - wide(b)).slice(0, 18);
      results.innerHTML = choices.length ? '<div class="cp-grid">' + choices.map((item, i) => `<button type="button" class="cp-result" data-choice="${i}" style="--i:${i}" title="${esc(item.title || '')}"><img src="${esc(item.thumbnail)}" alt="${esc(item.title || 'Resultado ' + (i + 1))}" loading="lazy" referrerpolicy="no-referrer"></button>`).join('') + '</div>' : '<p class="cp-hint">Nada encontrado. Tente outras palavras.</p>';
    } catch (error) { if (mine === job) results.innerHTML = `<p class="cp-hint is-error">${esc(error.message || 'A busca não respondeu. Tente de novo.')}</p>`; }
  };
  dialog.addEventListener('click', async event => {
    if (event.target === dialog) { dialog.close('cancel'); return; }
    const action = event.target.closest('[data-cp]')?.dataset.cp, result = event.target.closest('[data-choice]');
    if (action === 'clear') { job++; loading.hidden = true; thumbnail = ''; source = null; paint(); }
    else if (action === 'link') fromLink($('.cp-link input').value);
    else if (action === 'search') search();
    else if (action === 'adjust' && source) {
      const framed = await cropLessonCover(new File([source], 'capa', { type: source.type })).catch(error => { toast(error.message); return ''; });
      if (framed) { thumbnail = framed; paint(); }
    } else if (result) {
      const choice = choices[Number(result.dataset.choice)];
      if (!choice) return;
      results.querySelectorAll('.cp-result').forEach(item => item.setAttribute('aria-pressed', String(item === result)));
      const { importImageChoice } = await import('./storage-ai-image-search.js');
      await useBlob(async () => (await fetch((await importImageChoice(choice)).data)).blob(), 'Não consegui carregar esta imagem. Tente outra da lista.');
    }
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT') return;
    event.preventDefault();
    if (event.target.type === 'search') search(); else if (event.target.type === 'url') fromLink(event.target.value);
  });
  $('.cp-upload input').addEventListener('change', event => { const [file] = event.target.files; event.target.value = ''; if (file) useBlob(async () => file, 'Escolha uma imagem PNG, JPEG, WebP ou GIF.'); });
  // Ctrl+V: imagem copiada vira capa; um link copiado é carregado. Texto dentro da busca cola normalmente.
  dialog.addEventListener('paste', event => {
    const data = event.clipboardData; if (!data) return;
    const file = [...(data.files || [])].find(item => item.type.startsWith('image/')) || [...(data.items || [])].find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile();
    if (file) { event.preventDefault(); useBlob(async () => file, 'Não foi possível usar a imagem colada.'); return; }
    const text = data.getData('text/plain').trim();
    if (looksLikeImageLink(text) && event.target.type !== 'search') { event.preventDefault(); $('.cp-link input').value = text; fromLink(text); }
  });
  const stage = $('[data-drop]');
  stage.addEventListener('dragover', event => { event.preventDefault(); stage.classList.add('is-over'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('is-over'));
  stage.addEventListener('drop', event => {
    event.preventDefault(); stage.classList.remove('is-over');
    const file = [...(event.dataTransfer?.files || [])].find(item => item.type.startsWith('image/')), link = event.dataTransfer?.getData('text/uri-list') || '';
    if (file) useBlob(async () => file, 'Escolha uma imagem PNG, JPEG, WebP ou GIF.'); else if (link) fromLink(link.split('\n')[0]);
  });
  dialog.showModal();
  $('.cp-search-bar input').focus();
  return new Promise(resolve => dialog.addEventListener('close', () => { job++; const value = dialog.returnValue === 'apply' ? thumbnail : null; dialog.remove(); resolve(value); }, { once: true }));
}
