// Imported pages live in IndexedDB; the lightweight library stays in localStorage.
let database;
const cache = new Map();
function openDatabase() {
  database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('storage-lab-assets-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('pages', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(Error('Não foi possível abrir o armazenamento dos slides neste navegador.')); };
    request.onblocked = () => { database = null; reject(Error('Feche outras abas antigas do site e tente novamente.')); };
  });
  return database;
}
export async function storePages(images) {
  const db = await openDatabase();
  const entries = images.map(image => ({ id: 'asset-' + crypto.randomUUID(), image }));
  await new Promise((resolve, reject) => {
    const tx = db.transaction('pages', 'readwrite');
    for (const entry of entries) tx.objectStore('pages').put(entry);
    tx.oncomplete = resolve;
    tx.onerror = tx.onabort = () => reject(Error('Não foi possível guardar os slides. Libere espaço no navegador e tente novamente.'));
  });
  for (const entry of entries) cache.set(entry.id, entry.image);
  return entries.map(entry => entry.id);
}
export async function getPageImage(id) {
  if (cache.has(id)) return cache.get(id);
  const db = await openDatabase();
  const image = await new Promise((resolve, reject) => {
    const request = db.transaction('pages').objectStore('pages').get(id);
    request.onsuccess = () => request.result ? resolve(request.result.image) : reject(Error('Uma imagem desta aula não está neste navegador. Importe novamente o PDF, PPTX ou JSON completo.'));
    request.onerror = () => reject(Error('Não foi possível ler a imagem do slide.'));
  });
  cache.set(id, image);
  return image;
}
export async function removePageAssets(ids) {
  if (!ids.length) return;
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('pages', 'readwrite');
    for (const id of ids) tx.objectStore('pages').delete(id);
    tx.oncomplete = resolve; tx.onerror = tx.onabort = reject;
  });
  for (const id of ids) cache.delete(id);
}
export function compactLesson(lesson) {
  return { ...lesson, slides: lesson.slides.map(s => s.assetId ? { ...s, image: '' } : { ...s }) };
}
export async function hydrateLesson(lesson, portable = false) {
  const slides = await Promise.all(lesson.slides.map(async s => {
    const result = { ...s, image: s.image || (s.assetId ? await getPageImage(s.assetId) : '') };
    if (portable) delete result.assetId;
    return result;
  }));
  return { ...lesson, slides };
}
export async function archiveImportedPages(lesson) {
  const positions = lesson.slides.flatMap((s, i) => s.kind === 'document' && s.image ? [i] : []);
  if (!positions.length) return { lesson, ids: [] };
  const ids = await storePages(positions.map(i => lesson.slides[i].image));
  const slides = lesson.slides.map(s => ({ ...s }));
  positions.forEach((position, i) => { slides[position].assetId = ids[i]; slides[position].image = ''; });
  return { lesson: { ...lesson, slides }, ids };
}
export function fillAssetImages(root) {
  for (const image of root.querySelectorAll('img[data-asset-id]')) {
    const id = image.dataset.assetId;
    getPageImage(id).then(src => { if (image.isConnected && image.dataset.assetId === id) image.src = src; }).catch(error => { if (image.isConnected) image.alt = error.message; });
  }
}
