import * as THREE from 'three';
import { modelBundle } from './model-files.js';
export function disposeObject(object) {
  object.traverse(o => {
    o.geometry?.dispose();
    for (const material of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
}
export async function loadCustomObject(model, renderer) {
  const bundle = await modelBundle(model), manager = new THREE.LoadingManager();
  const files = new Map(bundle.files.map(file => [file.name.replace(/\\/g, '/'), file.data]));
  manager.setURLModifier(url => {
    if (/^(data:|blob:)/.test(url)) return url;
    let name;
    try { name = decodeURIComponent(url).replace(/\\/g, '/').replace(/^\.\//, ''); } catch { name = url; }
    if (files.has(name)) return files.get(name);
    const matches = [...files].filter(([key]) => key.split('/').pop() === name.split('/').pop());
    if (matches.length === 1 && !/^https?:/i.test(url)) return matches[0][1];
    throw Error('Falta o arquivo ' + name.split('/').pop() + '. Envie o modelo junto com BIN, MTL e texturas.');
  });
  const data = files.get(bundle.main), base64 = data.split(',')[1], raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  let object;
  if (model.format === 'obj') {
    const [{ OBJLoader }, { MTLLoader }] = await Promise.all([import('three/addons/loaders/OBJLoader.js'), import('three/addons/loaders/MTLLoader.js')]);
    const loader = new OBJLoader(manager), mtl = bundle.files.find(f => /\.mtl$/i.test(f.name));
    let loading = false, finish;
    const loaded = new Promise(resolve => { finish = resolve; });
    manager.onStart = () => { loading = true; }; manager.onLoad = () => finish();
    if (mtl) {
      const bytes = Uint8Array.from(atob(mtl.data.split(',')[1]), c => c.charCodeAt(0));
      const materials = new MTLLoader(manager).parse(new TextDecoder().decode(bytes), '');
      materials.preload(); loader.setMaterials(materials);
    }
    object = loader.parse(new TextDecoder().decode(raw));
    if (loading) await Promise.race([loaded, new Promise((_, reject) => setTimeout(() => reject(Error('Uma textura do OBJ não carregou. Confira os arquivos associados.')), 15000))]);
  } else {
    const [{ GLTFLoader }, { DRACOLoader }, { KTX2Loader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js'), import('three/addons/loaders/KTX2Loader.js'), import('three/addons/libs/meshopt_decoder.module.js')
    ]);
    const base = new URL('model-codecs/', document.baseURI).href;
    const draco = new DRACOLoader().setDecoderPath(base + 'draco/');
    const ktx = new KTX2Loader().setTranscoderPath(base + 'basis/').detectSupport(renderer);
    const loader = new GLTFLoader(manager).setDRACOLoader(draco).setKTX2Loader(ktx).setMeshoptDecoder(MeshoptDecoder);
    try { object = (await loader.parseAsync(model.format === 'glb' ? raw.buffer : new TextDecoder().decode(raw), '')).scene; }
    finally { draco.dispose(); ktx.dispose(); }
  }
  let vertices = 0;
  object.traverse(o => { if (o.isMesh) { vertices += o.geometry?.attributes.position?.count || 0; o.userData.customPart = o.name || 'Peça do modelo'; } });
  if (!vertices || vertices > 1_500_000) { disposeObject(object); throw Error('Use um modelo com geometria e até 1,5 milhão de vértices para manter a aula fluida.'); }
  const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(largest) || largest <= 0) { disposeObject(object); throw Error('O modelo tem dimensões inválidas.'); }
  const wrapper = new THREE.Group(); wrapper.add(object); object.position.sub(center); wrapper.scale.setScalar(5.6 / largest);
  return wrapper;
}
