// Recorte de foto com a mão e com a roda do mouse — o mesmo gesto do editor de
// foto do perfil, agora reaproveitável (convite, perfil da sala, etc.).
import { cropRectangle } from './photo-editor.js';

export function cropSheet(bitmap, { title = 'Ajuste sua foto', output = 480 } = {}) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'photo-crop-sheet';
    dialog.innerHTML = `<section>
      <header><h3>${title}</h3><button type="button" data-crop="cancel" aria-label="Fechar">×</button></header>
      <p>Arraste com a mão (ou o mouse) para enquadrar. Use a roda do mouse ou dois dedos para ampliar.</p>
      <div class="photo-crop-preview"><canvas width="300" height="300" data-crop-canvas aria-label="Prévia do recorte"></canvas></div>
      <div class="photo-zoom-controls">
        <button type="button" data-crop="out" aria-label="Diminuir zoom">−</button>
        <output data-crop-zoom>100%</output>
        <button type="button" data-crop="in" aria-label="Aumentar zoom">+</button>
        <button type="button" data-crop="reset">Centralizar</button>
      </div>
      <footer><button type="button" class="btn secondary" data-crop="cancel">Cancelar</button><button type="button" class="btn primary" data-crop="apply">Usar esta foto</button></footer>
    </section>`;
    document.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    const canvas = dialog.querySelector('[data-crop-canvas]');
    const zoomOut = dialog.querySelector('[data-crop-zoom]');
    let zoom = 1, x = .5, y = .5, drag = null;
    const rect = () => cropRectangle(bitmap.width, bitmap.height, zoom, x, y);
    const paint = () => {
      const box = rect(), ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, box.x, box.y, box.side, box.side, 0, 0, canvas.width, canvas.height);
      zoomOut.textContent = Math.round(zoom * 100) + '%';
    };
    const clamp = () => { x = Math.min(1, Math.max(0, x)); y = Math.min(1, Math.max(0, y)); };
    // Arrastar 1 px na TELA tem de mover exatamente 1 px da imagem na escala em
    // que ela aparece. Antes o deslocamento era multiplicado direto por
    // side/bitmap.width — como o canvas da prévia tem 300 px de lado e a foto
    // do celular tem ~4000 px, cada pixel de dedo valia ~13 px de imagem: o
    // recorte disparava ("sensibilidade muito alta"). Aqui a conversão passa
    // pela escala real (canvas:bitmap) e o resultado fica 1:1 com o dedo.
    const move = (dx, dy) => {
      const box = rect();
      // A prévia mostra `box.side` pixels da imagem dentro de `canvas.width`
      // pixels de tela. Logo, 1 px de tela = box.side/canvas.width px de
      // imagem, e o deslocamento em fração da imagem é esse valor / width.
      const imagePerScreen = box.side / Math.max(1, canvas.width);
      x += (dx * imagePerScreen) / Math.max(1, bitmap.width);
      y += (dy * imagePerScreen) / Math.max(1, bitmap.height);
      clamp(); paint();
    };
    const zoomBy = (factor, cx = .5, cy = .5) => {
      const before = rect();
      zoom = Math.max(1, Math.min(6, zoom * factor));
      const after = rect();
      // Mantém o ponto sob o cursor no lugar enquanto amplia.
      x += (after.side - before.side) * (cx - .5) / bitmap.width;
      y += (after.side - before.side) * (cy - .5) / bitmap.height;
      clamp(); paint();
    };
    const close = value => { dialog.close?.(); dialog.remove(); bitmap.close?.(); resolve(value); };
    const toBlob = async () => {
      const box = rect(), out = document.createElement('canvas');
      out.width = out.height = output;
      out.getContext('2d').drawImage(bitmap, box.x, box.y, box.side, box.side, 0, 0, output, output);
      return new Promise(r => out.toBlob(r, 'image/webp', .86));
    };
    dialog.addEventListener('pointerdown', e => {
      if (!e.target.matches('[data-crop-canvas]')) return;
      canvas.setPointerCapture?.(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    // Passa o delta do evento direto para move(): a posição é lida do próprio
    // evento (não de um acumulador), então o arrasto não "dispara" quando o
    // navegador coalesce eventos de dedo.
    dialog.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (dx || dy) move(dx, dy);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    const end = e => { if (drag?.id === e.pointerId) drag = null; };
    dialog.addEventListener('pointerup', end);
    dialog.addEventListener('pointercancel', end);
    dialog.addEventListener('wheel', e => {
      if (!e.target.closest('.photo-crop-preview')) return;
      e.preventDefault();
      const box = canvas.getBoundingClientRect();
      // .002 -> .0009: a roda ampliava quase 2x por "tick" em mouse/trackpad
      // rápido. Agora um giro completo (~300) dá ~1,3x, o que se controla.
      zoomBy(Math.exp(-Math.max(-300, Math.min(300, e.deltaY)) * .0009), (e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
    }, { passive: false });
    dialog.addEventListener('click', async e => {
      const action = e.target.closest('[data-crop]')?.dataset.crop;
      if (!action) return;
      if (action === 'in') zoomBy(1.2);
      else if (action === 'out') zoomBy(1 / 1.2);
      else if (action === 'reset') { zoom = 1; x = y = .5; paint(); }
      else if (action === 'cancel') close(null);
      else if (action === 'apply') close(await toBlob());
    });
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    paint();
  });
}
