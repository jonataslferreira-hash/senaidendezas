export async function optimizeImage(file, { avatar = false, maxSide = 1600 } = {}) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 15 * 1024 * 1024) throw Error('Escolha PNG, JPEG, WebP ou GIF de até 15 MB.');
  if (file.type === 'image/gif' && !avatar) return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw Error('Não foi possível abrir esta imagem.'); }
  try {
    const side = avatar ? 256 : maxSide, scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = avatar ? side : Math.max(1, Math.round(bitmap.width * scale)); canvas.height = avatar ? side : Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    if (avatar) { const crop = Math.min(bitmap.width, bitmap.height); ctx.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, side, side); }
    else ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
    if (!blob) throw Error('Não foi possível otimizar a imagem.');
    if (!avatar && blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.png'), { type: blob.type });
  } finally { bitmap.close(); }
}
