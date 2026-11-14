// Vídeo no slide: o link fica salvo no elemento; o player só é carregado na apresentação.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function videoSource(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  const startParam = url.searchParams.get('t') || url.searchParams.get('start') || '';
  const clock = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(startParam);
  const start = clock ? Number(clock[1] || 0) * 3600 + Number(clock[2] || 0) * 60 + Number(clock[3] || 0) : 0;
  let id = '';
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.pathname === '/watch' ? url.searchParams.get('v') || '' : /^\/(?:embed|shorts|live|v)\/([^/?]+)/.exec(url.pathname)?.[1] || '';
  }
  if (id) {
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    return { kind: 'youtube', id, label: 'YouTube', embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0${start ? '&start=' + start : ''}`, poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeo = /(?:^|\/)(\d{5,12})(?:\/|$)/.exec(url.pathname)?.[1];
    return vimeo ? { kind: 'vimeo', id: vimeo, label: 'Vimeo', embed: `https://player.vimeo.com/video/${vimeo}`, poster: '' } : null;
  }
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(url.pathname)) return { kind: 'file', id: '', label: 'Arquivo de vídeo', embed: url.href, poster: '' };
  return null;
}

export const validVideo = value => (videoSource(value) ? String(value).trim().slice(0, 600) : '');

// Na edição aparece só a capa (o player roubaria o clique de mover e redimensionar).
export function videoMarkup(element, playable) {
  const source = videoSource(element.video);
  if (!source) return '<div class="canvas-video canvas-video-empty"><i aria-hidden="true">▶</i><span>Cole o link do vídeo nos ajustes</span></div>';
  if (playable && source.kind === 'file') return `<div class="canvas-video"><video src="${escapeHtml(source.embed)}" controls playsinline preload="metadata"></video></div>`;
  if (playable) return `<div class="canvas-video"><iframe src="${escapeHtml(source.embed)}" title="Vídeo do slide (${source.label})" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  return `<div class="canvas-video canvas-video-poster"${source.poster ? ` style="background-image:url('${escapeHtml(source.poster)}')"` : ''}><i aria-hidden="true">▶</i><span>${source.label}</span></div>`;
}
