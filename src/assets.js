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
function copiedSlides(lesson) {
  return lesson.slides.map(s => ({ ...s, audio: s.audio ? { ...s.audio } : null, customModel: s.customModel ? { ...s.customModel } : null, elements: s.elements?.map(e => ({ ...e, audio:e.audio?{...e.audio}:undefined, customModel: e.customModel ? { ...e.customModel } : null })) }));
}
function nodes(slides) { return slides.flatMap(s => [s, ...(s.elements || [])]); }
function audioResources(lesson) { return [lesson.quizAudio,lesson.lobbyAudio,lesson.questionAudio, ...nodes(lesson.slides).map(s => s.audio)].filter(Boolean); }
export function lessonAssetIds(lesson) { return [...nodes(lesson.slides).flatMap(n => [n.assetId, n.customModel?.assetId]), ...audioResources(lesson).map(a => a.assetId),...(lesson.customFonts||[]).map(f=>f.assetId)].filter(Boolean); }
export function compactLesson(lesson) {
  const slides = copiedSlides(lesson), result = { ...lesson, slides,...(lesson.customFonts?{customFonts:lesson.customFonts.map(f=>({...f}))}:{}), quizAudio: lesson.quizAudio ? { ...lesson.quizAudio } : null,lobbyAudio:lesson.lobbyAudio?{...lesson.lobbyAudio}:null,questionAudio:lesson.questionAudio?{...lesson.questionAudio}:null };
  for (const node of nodes(slides)) {
    if (node.assetId) node.image = '';
    if (node.customModel?.assetId) node.customModel.data = '';
  }
  for (const audio of audioResources(result)) if (audio.assetId) audio.data = '';
  for(const font of result.customFonts||[])if(font.assetId)font.data='';
  return result;
}
export async function hydrateLesson(lesson, portable = false) {
  const slides = copiedSlides(lesson), result = { ...lesson, slides,...(lesson.customFonts?{customFonts:lesson.customFonts.map(f=>({...f}))}:{}), quizAudio: lesson.quizAudio ? { ...lesson.quizAudio } : null,lobbyAudio:lesson.lobbyAudio?{...lesson.lobbyAudio}:null,questionAudio:lesson.questionAudio?{...lesson.questionAudio}:null };
  await Promise.all(nodes(slides).map(async node => {
    if (node.assetId && !node.image) node.image = await getPageImage(node.assetId);
    if (node.customModel?.assetId && !node.customModel.data) node.customModel.data = await getPageImage(node.customModel.assetId);
    if (portable) { delete node.assetId; if (node.customModel) delete node.customModel.assetId; }
  }));
  await Promise.all(audioResources(result).map(async audio => { if (audio.assetId && !audio.data) audio.data = await getPageImage(audio.assetId); if (portable) delete audio.assetId; }));
  await Promise.all((result.customFonts||[]).map(async font=>{if(font.assetId&&!font.data)font.data=await getPageImage(font.assetId);if(portable)delete font.assetId;}));
  return result;
}
export async function archiveImportedPages(lesson) {
  const slides = copiedSlides(lesson), pending = [], result = { ...lesson, slides,...(lesson.customFonts?{customFonts:lesson.customFonts.map(f=>({...f}))}:{}), quizAudio: lesson.quizAudio ? { ...lesson.quizAudio } : null,lobbyAudio:lesson.lobbyAudio?{...lesson.lobbyAudio}:null,questionAudio:lesson.questionAudio?{...lesson.questionAudio}:null };
  for (const node of nodes(slides)) {
    if (node.image && (['document', 'image'].includes(node.kind || node.type)||node.kind==='canvas'&&node.sourceType==='pptx')) pending.push({ node, field: 'image' });
    if (node.customModel?.data) pending.push({ node: node.customModel, field: 'data' });
  }
  for (const audio of audioResources(result)) if (audio.data) pending.push({ node: audio, field: 'data' });
  for(const font of result.customFonts||[])if(font.data)pending.push({node:font,field:'data'});
  if (!pending.length) return { lesson, ids: [] };
  const ids = await storePages(pending.map(({ node, field }) => node[field]));
  pending.forEach(({ node, field }, i) => { node.assetId = ids[i]; node[field] = ''; });
  return { lesson: result, ids };
}
export function fillAssetAudio(root) {
  for (const audio of root.querySelectorAll('audio[data-audio-asset]')) {
    const id = audio.dataset.audioAsset;
    getPageImage(id).then(src => { if (audio.isConnected && audio.dataset.audioAsset === id) audio.src = src; }).catch(() => { if (audio.isConnected) audio.insertAdjacentText('afterend', 'Áudio indisponível neste navegador. Importe o JSON completo.'); });
  }
}
export function fillAssetImages(root) {
  for (const image of root.querySelectorAll('img[data-asset-id]')) {
    const id = image.dataset.assetId;
    getPageImage(id).then(src => { if (image.isConnected && image.dataset.assetId === id) image.src = src; }).catch(error => { if (image.isConnected) image.alt = error.message; });
  }
}
