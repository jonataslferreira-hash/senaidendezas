// QR é necessário apenas durante a apresentação ou ao compartilhar uma sala.
// Promessas também ficam em cache para vários renders não gerarem o mesmo QR em paralelo.
export function createRoomQrCache(load = () => import('qrcode'), limit = 8) {
  const cache = new Map();
  return function roomQr(url) {
    if (cache.has(url)) return cache.get(url);
    const pending = load().then(({default: QRCode}) => QRCode.toDataURL(url, {width:460, margin:2}));
    cache.set(url, pending);
    pending.catch(() => { if (cache.get(url) === pending) cache.delete(url); });
    if (cache.size > limit) cache.delete(cache.keys().next().value);
    return pending;
  };
}
