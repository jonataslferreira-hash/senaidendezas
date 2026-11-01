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
async function pptxPages(bytes, { signal, progress }) {
  const [{ loadPresentation, getSlides }, { renderSlideToSvg }] = await Promise.all([import('@office-kit/pptx'), import('@office-kit/pptx-preview')]);
  checkSignal(signal);
  const presentation = await loadPresentation(bytes, { limits: { maxEntries: 10000, maxTotalUncompressedBytes: 150 * 1024 * 1024, maxXmlPartBytes: 8 * 1024 * 1024, maxTotalXmlBytes: 40 * 1024 * 1024 } }), slides = getSlides(presentation);
  checkCount(slides.length);
  const measure = document.createElement('canvas').getContext('2d');
  const result = []; let total = 0;
  for (const [i, slide] of slides.entries()) {
    checkSignal(signal); progress(i, slides.length); await breathe();
    const svg = renderSlideToSvg(presentation, slide, { textLayout: 'svg', resolveFamily: family => family || 'Arial',
      measureText: (text, spec) => {
        measure.font = (spec.italic ? 'italic ' : '') + (spec.bold ? 'bold ' : '') + spec.sizePx + 'px "' + spec.family.replace(/["\\]/g, '') + '"';
        const metrics = measure.measureText(text);
        return { widthPx: metrics.width + Math.max(0, [...text].length - 1) * spec.letterSpacingPx,
          ascentPx: metrics.fontBoundingBoxAscent || spec.sizePx * .8, descentPx: metrics.fontBoundingBoxDescent || spec.sizePx * .2 };
      } });
    const xml = new DOMParser().parseFromString(svg, 'image/svg+xml'), root = xml.documentElement;
    if (xml.querySelector('parsererror')) throw Error('Não foi possível desenhar um slide deste PPTX. Exporte-o como PDF e tente novamente.');
    // Never insert imported SVG markup into the page. Rasterizing an <img>
    // isolates the SVG and excludes active slide content.
    if ([...xml.querySelectorAll('[href], [xlink\\:href]')].some(el => /^https?:/i.test(el.getAttribute('href') || el.getAttribute('xlink:href') || ''))) throw Error('O PPTX usa imagens externas. Incorpore as imagens ou exporte como PDF.');
    const box = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const width = box[2] || parseFloat(root.getAttribute('width')), height = box[3] || parseFloat(root.getAttribute('height'));
    const canvas = canvasFor(width, height), context = canvas.getContext('2d');
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const img = new Image(); img.src = url; await img.decode(); checkSignal(signal);
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const image = encode(canvas); total += image.length;
      if (total > 44 * 1024 * 1024) throw Error('Os slides renderizados excedem 44 MB. Divida o PPTX em partes menores.');
      const content = [...xml.querySelectorAll('text')].map(el => el.textContent).join(' ').slice(0, 6000);
      result.push(pageSlide(image, 'Slide ' + (i + 1), content, 'pptx', canvas.width, canvas.height));
      progress(i + 1, slides.length);
    } finally { URL.revokeObjectURL(url); canvas.width = canvas.height = 0; }
  }
  return result;
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
  lesson.slides = await (extension === 'pdf' ? pdfPages : pptxPages)(bytes, { signal, progress });
  lesson.description = file.name.slice(0, 400) + ' · ' + lesson.slides.length + ' slides importados';
  checkSignal(signal);
  return lesson;
}
