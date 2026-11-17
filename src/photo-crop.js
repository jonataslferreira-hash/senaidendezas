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
    const move = (dx, dy) => { const box = rect(); x += dx * (box.side / bitmap.width); y += dy * (box.side / bitmap.height); clamp(); paint(); };
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
    dialog.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      move(drag.x - e.clientX, drag.y - e.clientY);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    const end = e => { if (drag?.id === e.pointerId) drag = null; };
    dialog.addEventListener('pointerup', end);
    dialog.addEventListener('pointercancel', end);
    dialog.addEventListener('wheel', e => {
      if (!e.target.closest('.photo-crop-preview')) return;
      e.preventDefault();
      const box = canvas.getBoundingClientRect();
      zoomBy(Math.exp(-Math.max(-300, Math.min(300, e.deltaY)) * .002), (e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
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
