// Vídeo do YouTube sincronizado na sala: o professor dá play, pausa ou pula, e
// o player de cada aluno acompanha. O aluno só pode silenciar o próprio vídeo.
// A conversa com o player é a API de mensagens do YouTube (enablejsapi=1).
const YOUTUBE = /^https:\/\/www\.youtube(?:-nocookie)?\.com$/;
const PLAYING = 1, PAUSED = 2, BUFFERING = 3;

// Posição atual estimada (o player só avisa a posição de tempos em tempos).
export function videoPosition(player, now) {
  return player.time + (player.state === PLAYING ? Math.max(0, now - player.at) / 1000 : 0);
}
// O que o professor transmite. Tocando: a diferença entre a posição e o relógio
// (constante enquanto o vídeo roda), para não precisar reenviar a cada instante.
export function videoState(player, now, hostNow) {
  if (player.state === PLAYING || player.state === BUFFERING) {
    const offset = videoPosition(player, now) - hostNow / 1000;
    if (!Number.isFinite(player.sent) || Math.abs(offset - player.sent) > .8) player.sent = Math.round(offset * 10) / 10;
    return { s: 1, o: player.sent };
  }
  player.sent = NaN;
  return player.state === PAUSED || player.state === 0 ? { s: 2, t: Math.round(player.time * 10) / 10 } : { s: 0 };
}
// O que o aluno precisa fazer para alcançar o professor.
export function videoCommands(player, target, now, hostNow) {
  const commands = [];
  if (!target || typeof target !== 'object') return commands;
  if (target.s === 1 && Number.isFinite(target.o)) {
    const wanted = Math.max(0, target.o + hostNow / 1000);
    if (Math.abs(videoPosition(player, now) - wanted) > 1.5) commands.push(['seekTo', [Math.round(wanted * 10) / 10, true]]);
    if (player.state !== PLAYING && player.state !== BUFFERING) commands.push(['playVideo', []]);
  } else if (target.s === 2 && Number.isFinite(target.t)) {
    if (player.state === PLAYING || player.state === BUFFERING) commands.push(['pauseVideo', []]);
    if (Math.abs(player.time - target.t) > 1.5) commands.push(['seekTo', [target.t, true]]);
  }
  return commands;
}

export class VideoSync {
  constructor(hostNow = () => Date.now()) {
    this.hostNow = hostNow; this.players = new Map(); this.targets = null; this.follow = false; this.timer = 0;
    if (typeof window !== 'undefined') window.addEventListener('message', event => this.message(event));
  }
  frames(root = this.root) { return [...(root?.querySelectorAll('.canvas-presenting .canvas-video iframe[src*="youtube"]') || [])]; }
  post(frame, message) { try { frame.contentWindow?.postMessage(JSON.stringify(message), '*'); } catch { /* player ainda carregando */ } }
  command(frame, func, args = []) { this.post(frame, { event: 'command', func, args }); }
  // follow = true para o aluno dentro da sala (player travado, com botão de silenciar).
  mount(root, { follow = false } = {}) {
    this.root = root; this.follow = follow;
    for (const frame of [...this.players.keys()]) if (!frame.isConnected) { clearInterval(this.players.get(frame).listen); this.players.delete(frame); }
    for (const frame of this.frames()) {
      if (!this.players.has(frame)) {
        const player = { state: -1, time: 0, at: 0, sent: NaN, muted: false, heard: false, asked: 0, tries: 0 };
        this.players.set(frame, player);
        // O player só responde depois de carregar: insiste até a primeira resposta.
        const listen = () => { if (player.heard || player.tries++ > 40) { clearInterval(player.listen); return; } this.post(frame, { event: 'listening', id: 1, channel: 'widget' }); };
        frame.addEventListener('load', listen); player.listen = setInterval(listen, 1000); listen();
      }
      const box = frame.closest('.canvas-video'), button = box?.querySelector('[data-video-mute]');
      if (!box) continue;
      box.toggleAttribute('data-following', follow);
      if (follow && !button) {
        const mute = document.createElement('button');
        mute.type = 'button'; mute.dataset.videoMute = ''; mute.className = 'canvas-video-mute';
        mute.addEventListener('click', () => { const player = this.players.get(frame); player.muted = !player.muted; player.forced = false; this.command(frame, player.muted ? 'mute' : 'unMute'); this.paintMute(frame); });
        box.append(mute); this.paintMute(frame);
      } else if (!follow && button) button.remove();
    }
    clearInterval(this.timer); this.timer = 0;
    if (follow && this.players.size) this.timer = setInterval(() => this.apply(), 1000);
    if (!this.players.size) this.targets = null;
  }
  paintMute(frame) {
    const player = this.players.get(frame), button = frame.closest('.canvas-video')?.querySelector('[data-video-mute]');
    if (!button || !player) return;
    button.textContent = player.muted ? (player.forced ? '🔇 Toque para ouvir' : '🔇 Sem som') : '🔊 Silenciar';
    button.setAttribute('aria-pressed', String(player.muted));
    button.setAttribute('aria-label', player.muted ? 'Ativar o som do vídeo' : 'Silenciar o vídeo só para mim');
  }
  message(event) {
    if (!YOUTUBE.test(event.origin)) return;
    const frame = [...this.players.keys()].find(item => item.contentWindow === event.source), player = this.players.get(frame);
    if (!player) return;
    let data = event.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
    const info = data?.info;
    player.heard = true;
    if (!info || typeof info !== 'object') return;
    if (Number.isFinite(info.currentTime)) { player.time = info.currentTime; player.at = performance.now(); }
    if (Number.isInteger(info.playerState)) { if (player.state === PLAYING && info.playerState !== PLAYING) player.time = videoPosition(player, performance.now()); player.state = info.playerState; player.at = performance.now(); }
    if (this.follow && typeof info.muted === 'boolean' && info.muted !== player.muted) { player.muted = info.muted; this.paintMute(frame); }
  }
  capture() { const now = performance.now(), hostNow = this.hostNow(); return this.frames().map(frame => videoState(this.players.get(frame) || { state: -1, time: 0, at: 0 }, now, hostNow)); }
  setTargets(list) { this.targets = Array.isArray(list) ? list.slice(0, 6) : null; this.apply(); }
  apply() {
    if (!this.follow || !this.targets) return;
    const now = performance.now(), hostNow = this.hostNow();
    this.frames().forEach((frame, index) => {
      const player = this.players.get(frame), target = this.targets[index];
      if (!player?.heard || !target || now - player.asked < 1200) return;
      const commands = videoCommands(player, target, now, hostNow);
      if (!commands.length) { player.waiting = 0; return; }
      // O navegador pode barrar o som automático: depois de duas tentativas, toca sem som.
      if (commands.some(([name]) => name === 'playVideo') && ++player.waiting > 2 && !player.muted) { player.muted = true; player.forced = true; this.command(frame, 'mute'); this.paintMute(frame); }
      for (const [name, args] of commands) this.command(frame, name, args);
      player.asked = now;
    });
  }
}
