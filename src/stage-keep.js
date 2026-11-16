// Preservação do palco do editor entre renders e reconstruções.
// Em vez de trocar o canvas inteiro (o que remonta imagens, vídeos, modelos 3D
// e simulações — a "tela recarregando"), reconcilia objeto por objeto: só o
// que mudou de verdade é trocado; o resto continua vivo no DOM.

// Markup de origem de cada objeto, registrado antes das montagens (modelos 3D,
// simulações e preenchimento de imagens mutam o DOM depois). Comparar com o
// markup novo é imune a essas mutações.
const sourceMarkup = new WeakMap();

export function tagStageSources(scope) {
  for (const node of scope.querySelectorAll('[data-object-id]')) sourceMarkup.set(node, node.outerHTML);
}

export function reconcileCanvas(currentFrame, freshFrame) {
  if (!currentFrame || !freshFrame) return false;
  const curCanvas = currentFrame.querySelector('.slide-canvas');
  const frCanvas = freshFrame.querySelector('.slide-canvas');
  if (!curCanvas || !frCanvas) return false;
  // Atributos do canvas (fundo, tema, proporção) são atualizados sem trocar o nó.
  for (const name of curCanvas.getAttributeNames()) if (name !== 'class' && !frCanvas.hasAttribute(name)) curCanvas.removeAttribute(name);
  for (const name of frCanvas.getAttributeNames()) if (name !== 'class' && curCanvas.getAttribute(name) !== frCanvas.getAttribute(name)) curCanvas.setAttribute(name, frCanvas.getAttribute(name));
  const isObject = node => node.hasAttribute && node.hasAttribute('data-object-id');
  const freshObjects = [...frCanvas.children].filter(isObject);
  const byId = new Map([...curCanvas.children].filter(isObject).map(node => [node.dataset.objectId, node]));
  for (const fresh of freshObjects) {
    const id = fresh.dataset.objectId, cur = byId.get(id);
    if (cur && sourceMarkup.get(cur) === fresh.outerHTML) continue; // idêntico: mantém o nó vivo
    sourceMarkup.set(fresh, fresh.outerHTML);
    if (cur) cur.replaceWith(fresh); // mudou: troca só este objeto
    byId.delete(id);
  }
  for (const leftover of byId.values()) leftover.remove(); // objetos removidos
  // Ordem das camadas: só reposiciona quando a ordem de fato mudou
  // (mover nós recarrega iframes, então não mexe sem necessidade).
  const currentOrder = [...curCanvas.children].filter(isObject).map(node => node.dataset.objectId).join('|');
  if (currentOrder !== freshObjects.map(node => node.dataset.objectId).join('|')) {
    const anchor = [...curCanvas.children].find(node => !isObject(node)) || null;
    for (const fresh of freshObjects) {
      const node = [...curCanvas.children].find(child => child.dataset.objectId === fresh.dataset.objectId);
      if (node) anchor ? curCanvas.insertBefore(node, anchor) : curCanvas.append(node);
    }
  }
  return true;
}
