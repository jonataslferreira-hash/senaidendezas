import { storePages, getPageImage } from './assets.js';
const allowed = /\.(glb|gltf|obj|mtl|bin|png|jpe?g|webp|gif|ktx2)$/i;
export function validateCustomModel(model, draft = false) {
  if (!model) return null;
  if (!['glb', 'gltf', 'obj'].includes(model.format)) throw Error('Use um modelo GLB, GLTF ou OBJ.');
  const assetId = typeof model.assetId === 'string' && /^asset-[a-f0-9-]{36}$/.test(model.assetId) ? model.assetId : '';
  if (model.assetId && !assetId) throw Error('Referência de modelo 3D inválida.');
  const data = typeof model.data === 'string' ? model.data : '';
  if (data.length > 23 * 1024 * 1024) throw Error('O modelo 3D é grande demais. Use até 15 MB de arquivos.');
  if (data) {
    let bundle;
    try { bundle = JSON.parse(data); } catch { throw Error('Os arquivos do modelo estão inválidos.'); }
    if (!bundle || !Array.isArray(bundle.files) || !bundle.files.length || bundle.files.length > 80 || !bundle.files.some(f => f.name === bundle.main)) throw Error('O modelo precisa de um arquivo principal e até 80 arquivos associados.');
    for (const file of bundle.files) if (typeof file.name !== 'string' || !allowed.test(file.name) || file.name.length > 300 || typeof file.data !== 'string' || !/^data:[a-z0-9/+.-]+;base64,[A-Za-z0-9+/=\r\n]+$/i.test(file.data)) throw Error('Um arquivo associado ao modelo é inválido.');
  }
  if (!data && !assetId && !draft) throw Error('Envie o arquivo do modelo 3D.');
  return { name: String(model.name || 'Meu modelo').slice(0, 160), format: model.format, data, ...(assetId ? { assetId } : {}) };
}
export async function importModelFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return null;
  if (files.length > 80 || files.reduce((total, f) => total + f.size, 0) > 15 * 1024 * 1024) throw Error('Selecione até 80 arquivos, com no máximo 15 MB no total.');
  if (files.some(f => !allowed.test(f.name))) throw Error('Use GLB, GLTF ou OBJ e seus arquivos BIN, MTL e texturas.');
  const mains = files.filter(f => /\.(glb|gltf|obj)$/i.test(f.name));
  if (mains.length !== 1) throw Error('Selecione um modelo principal por vez, junto com seus materiais e texturas.');
  const main = mains[0], format = main.name.split('.').pop().toLowerCase();
  const bytes = new Uint8Array(await main.arrayBuffer());
  if (format === 'glb' && (bytes.length < 20 || new DataView(bytes.buffer).getUint32(0, true) !== 0x46546c67)) throw Error('Este arquivo GLB está incompleto ou inválido.');
  if (format === 'gltf') {
    try { const json = JSON.parse(new TextDecoder().decode(bytes)); if (!String(json.asset?.version).startsWith('2') || !json.meshes?.length) throw Error(); }
    catch { throw Error('Use um arquivo GLTF 2.0 com geometria.'); }
  }
  if (format === 'obj' && !/^v\s+[-+.\deE]+\s+[-+.\deE]+\s+[-+.\deE]+/m.test(new TextDecoder().decode(bytes))) throw Error('Este OBJ não contém vértices válidos.');
  const packed = await Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.webkitRelativePath || file.name, data: reader.result });
    reader.onerror = () => reject(Error('Não foi possível ler ' + file.name));
    reader.readAsDataURL(file);
  })));
  const data = JSON.stringify({ main: main.webkitRelativePath || main.name, files: packed });
  const result = validateCustomModel({ name: main.name, format, data });
  const [assetId] = await storePages([data]);
  return { ...result, assetId, data: '' };
}
export async function modelBundle(model) {
  const checked = validateCustomModel(model);
  return JSON.parse(checked.data || await getPageImage(checked.assetId));
}
