import { compressJSONText } from './codec-core.js';
export { compressJSONText, unpackLesson } from './codec-core.js';
export async function packLesson(lesson) {
  const text = JSON.stringify(lesson);
  if (typeof Worker === 'undefined') return compressJSONText(text);
  const worker = new Worker(new URL('./file-codec.worker.js', import.meta.url), { type: 'module' });
  try { return await new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => data.error ? reject(Error(data.error)) : resolve(data);
    worker.onerror = () => reject(Error('Não foi possível comprimir a aula. Tente novamente.'));
    worker.postMessage(text);
  }); } finally { worker.terminate(); }
}
