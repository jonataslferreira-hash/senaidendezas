import { newLesson, newSlide } from './lessons.js';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 80;
function checkSignal(signal) { signal?.throwIfAborted(); }
const breathe = () => new Promise(resolve => setTimeout(resolve, 0));
function canvasFor(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw Error('O arquivo contém uma página com tamanho inválido.');
  const scale = Math.min(1920 / width, 1920 / height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
  return canvas;
}
function encode(canvas) {
  for (const quality of [.9, .8, .65, .5]) {
    const image = canvas.toDataURL('image/jpeg', quality);
    if (image.length <= 1_900_000) return image;
  }
  throw Error('Uma página é detalhada demais para importar. Exporte o arquivo como PDF otimizado e tente novamente.');
}
function checkCount(count) {
  if (!count || count > MAX_PAGES) throw Error('Importe um arquivo com 1 a 80 páginas ou slides. Divida apresentações maiores.');
}
function pageSlide(image, title, content, type, width, height) {
  return { ...newSlide(), kind: 'document', title, tag: 'Slide importado', image, imageAlt: content.slice(0, 500) || title, sourceType: type, pageWidth: width, pageHeight: height };
}
async function pdfPages(bytes, { signal, progress }) {
  const pdf = await import('pdfjs-dist');
  const { default: workerURL } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdf.GlobalWorkerOptions.workerSrc = workerURL;
  const base = new URL('pdfjs-assets/', document.baseURI).href;
  const loading = pdf.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true,
    cMapUrl: base + 'cmaps/', cMapPacked: true, standardFontDataUrl: base + 'standard_fonts/', wasmUrl: base + 'wasm/' });
  const abort = () => { loading.destroy().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  let doc;
  try {
    doc = await loading.promise; checkSignal(signal); checkCount(doc.numPages);
    const result = []; let total = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      checkSignal(signal); progress(i - 1, doc.numPages); await breathe();
      const page = await doc.getPage(i), size = page.getViewport({ scale: 1 });
      const canvas = canvasFor(size.width, size.height);
      const viewport = page.getViewport({ scale: canvas.width / size.width });
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport, background: '#ffffff' }).promise;
      checkSignal(signal);
      const text = await page.getTextContent();
      const content = text.items.map(item => item.str || '').join(' ').slice(0, 6000);
      const image = encode(canvas); total += image.length;
      if (total > 44 * 1024 * 1024) throw Error('As páginas renderizadas excedem 44 MB. Divida o PDF em partes menores.');
      result.push(pageSlide(image, 'Página ' + i, content, 'pdf', canvas.width, canvas.height));
      canvas.width = canvas.height = 0; page.cleanup(); progress(i, doc.numPages);
    }
    return result;
  } catch (error) {
    checkSignal(signal);
    if (error.name === 'PasswordException') throw Error('Este PDF exige senha. Exporte uma cópia sem senha para apresentar.');
    if (['InvalidPDFException', 'MissingPDFException'].includes(error.name)) throw Error('Não foi possível abrir este PDF. Verifique se o arquivo está completo.');
    throw error;
  } finally { signal?.removeEventListener('abort', abort); await loading.destroy().catch(() => {}); }
}
export async function importSlides(file, { signal, progress = () => {} } = {}) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'pptx'].includes(extension)) throw Error('Escolha PDF ou PPTX. Para PPT, ODP, Keynote ou Google Slides, exporte como PDF primeiro.');
  if (!file.size || file.size > MAX_FILE_BYTES) throw Error('Escolha um arquivo de até 25 MB.');
  progress(0, 0); await breathe(); checkSignal(signal);
  const bytes = new Uint8Array(await file.arrayBuffer()); checkSignal(signal);
  if (extension === 'pdf' && !new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw Error('Este arquivo não parece ser um PDF válido.');
  if (extension === 'pptx' && (bytes[0] !== 0x50 || bytes[1] !== 0x4b)) throw Error('Este arquivo não parece ser um PPTX válido.');
  const lesson = newLesson();
  lesson.title = file.name.replace(/\.[^.]+$/, '').slice(0, 140);
  lesson.slides = extension==='pptx'?await (await import('./pptx-import.js')).editablePptx(bytes,{signal,progress}):await pdfPages(bytes,{signal,progress});
  lesson.description = file.name.slice(0, 400) + ' · ' + lesson.slides.length + ' slides importados';
  checkSignal(signal);
  return lesson;
}
