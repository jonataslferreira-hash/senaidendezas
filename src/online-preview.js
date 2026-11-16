// Previews giratórios em GIF para os modelos da biblioteca online.
// O GIF é renderizado no próprio navegador (three.js + gifenc) na primeira vez
// que o card fica visível e fica em cache no IndexedDB para as próximas vezes.
import * as THREE from 'three';
import * as gifencModule from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifencModule.GIFEncoder ? gifencModule : gifencModule.default;
import { loadCustomObject, disposeObject } from './model-loader.js';
import { onlineModelUrl } from './online-catalog.js';

const DB_NAME = 'sl-online-previews', STORE = 'gifs';
const SIZE = 132, FRAMES = 28, FRAME_MS = 130, MAX_COLORS = 96;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function cacheGet(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || '');
      request.onerror = () => reject(request.error);
    });
  } catch { return ''; }
}
async function cacheSet(key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* cache é opcional */ }
}

let sharedRenderer;
function renderer() {
  if (!sharedRenderer) sharedRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  sharedRenderer.setPixelRatio(1);
  sharedRenderer.setSize(SIZE, SIZE, false);
  return sharedRenderer;
}

function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/**
 * Devolve o data URL de um GIF com o modelo girando.
 * Baixa o GLB da fonte online, renderiza 28 quadros e codifica com gifenc.
 */
export async function onlinePreview(model) {
  const cached = await cacheGet(model.id);
  if (cached) return cached;
  const response = await fetch(onlineModelUrl(model));
  if (!response.ok) throw Error('A prévia não está disponível agora.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const name = model.file.split('/').pop();
  const data = JSON.stringify({ main: name, files: [{ name, data: 'data:model/gltf-binary;base64,' + base64(bytes) }] });
  const gl = renderer();
  const object = await loadCustomObject({ format: 'glb', name, data }, gl);
  try {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#171426');
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(4, 6, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0x9f7ff0, 1); fill.position.set(-5, 2, -4); scene.add(fill);
    scene.add(object);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 2.2, 7.6);
    camera.lookAt(0, 0.1, 0);
    const shot = document.createElement('canvas');
    shot.width = shot.height = SIZE;
    const ctx = shot.getContext('2d', { willReadFrequently: true });
    const gif = GIFEncoder();
    for (let frame = 0; frame < FRAMES; frame++) {
      object.rotation.y = (frame / FRAMES) * Math.PI * 2;
      gl.render(scene, camera);
      ctx.drawImage(gl.domElement, 0, 0, SIZE, SIZE);
      const { data: rgba } = ctx.getImageData(0, 0, SIZE, SIZE);
      const palette = quantize(rgba, MAX_COLORS, { format: 'rgb444' });
      const indexed = applyPalette(rgba, palette, 'rgb444');
      gif.writeFrame(indexed, SIZE, SIZE, { palette, delay: FRAME_MS, repeat: 0 });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    gif.finish();
    const url = 'data:image/gif;base64,' + base64(gif.bytes());
    await cacheSet(model.id, url);
    return url;
  } finally {
    disposeObject(object);
  }
}
