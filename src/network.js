import Peer from 'peerjs';
import { Room } from './room.js';
import { compactLesson, hydrateLesson } from './assets.js';

const prefix = 'senai-storage-lab-v1-';
const storage = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* navegação privada */ } }
};
function options() {
  // Somente no desenvolvimento: sinalizador local para testes reais de WebRTC.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('localSignal')) return { host: location.hostname, port: 9000, path: '/', secure: false, debug: 0 };
  return { debug: 0 };
}
export class Classroom {
  constructor(onState, onStatus) {
    this.onState = onState; this.onStatus = onStatus;
    this.connections = new Map(); this.pending = new Map(); this.stopped = false;
  }
  async create(resume = false, lesson) {
    this.host = true;
    const saved = resume && storage.get('sl-host');
    this.code = saved?.code || String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
    if (saved?.data?.lesson) saved.data.lesson = await hydrateLesson(saved.data.lesson);
    this.room = new Room(this.code, saved?.data, Date.now, lesson);
    this.peer = new Peer(prefix + this.code, options());
    await this.open();
    this.peer.on('connection', conn => this.accept(conn));
    storage.set('sl-mode', { host: true, code: this.code });
    this.timer = setInterval(() => { const before = this.room.data.phase; this.room.tick(); if (before !== this.room.data.phase) this.broadcast(); }, 100);
    this.broadcast();
    return this.code;
  }
  open() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.peer.destroy(); reject(Error('Não foi possível acessar a sinalização. Verifique a internet e tente outra rede.')); }, 15_000);
      this.peer.once('open', () => { clearTimeout(timeout); this.onStatus('online'); resolve(); });
      this.peer.on('error', err => {
        clearTimeout(timeout);
        const text = err.type === 'unavailable-id' ? 'Esta sala ainda está conectada em outra aba. Feche a outra aba ou crie uma nova sala.' : err.type === 'peer-unavailable' ? 'Sala não encontrada ou apresentador desconectado. Confira o código.' : 'Falha de conexão. Verifique a internet; a rede pode bloquear WebRTC.';
        this.onStatus('error', text); reject(Error(text));
      });
      this.peer.on('disconnected', () => {
        this.onStatus('reconnecting');
        if (!this.stopped && !this.peer.destroyed) setTimeout(() => { if (this.peer.disconnected && !this.peer.destroyed) this.peer.reconnect(); }, 1500);
      });
      this.peer.on('open', () => this.onStatus('online'));
    });
  }
  accept(conn) {
    if (this.connections.size >= 65) { conn.close(); return; }
    const timeout = setTimeout(() => { if (!conn.playerId) conn.close(); }, 12_000);
    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object' || JSON.stringify(msg).length > 4096) return;
      const time = Date.now();
      conn.actions = (conn.actions || []).filter(t => t > time - 10_000);
      if (conn.actions.length > 40) return;
      conn.actions.push(time);
      try {
        if (msg.type === 'join' && !conn.playerId) {
          const joined = this.room.join(msg.payload);
          const previous = this.connections.get(joined.id);
          conn.playerId = joined.id;
          this.connections.set(joined.id, conn);
          if (previous && previous !== conn) previous.close();
          clearTimeout(timeout);
          conn.send({ type: 'joined', ...joined });
          this.broadcast();
        } else if (msg.type === 'answer' && conn.playerId) {
          this.room.answer(conn.playerId, msg.payload);
          conn.send({ type: 'ack', request: msg.request });
          this.broadcast();
        } else if (msg.type === 'ping') conn.send({ type: 'pong' });
      } catch (err) { conn.send({ type: 'error', request: msg.request, message: err.message }); }
    });
    const close = () => {
      clearTimeout(timeout);
      if (conn.playerId && this.connections.get(conn.playerId) === conn) {
        this.connections.delete(conn.playerId); this.room.disconnect(conn.playerId); this.broadcast();
      }
    };
    conn.on('close', close); conn.on('error', close);
  }
  broadcast() {
    if (this.stopped) return;
    storage.set('sl-host', { code: this.code, data: { ...this.room.data, lesson: compactLesson(this.room.data.lesson) } });
    this.onState(this.room.snapshot());
    for (const [id, conn] of this.connections) if (conn.open) {
      if (!conn.lessonSent) { conn.send({ type: 'lesson', lesson: this.room.publicLesson() }); conn.lessonSent = true; }
      conn.send({ type: 'state', state: this.room.snapshot(id, false) });
    }
  }
  async join(code, name, avatar) {
    this.host = false; this.code = code; this.name = name; this.avatar = avatar;
    this.peer = new Peer(options());
    await this.open();
    await this.connect();
  }
  connect() {
    return new Promise((resolve, reject) => {
      if (this.stopped) return reject(Error('Conexão encerrada.'));
      this.onStatus('reconnecting');
      const conn = this.peer.connect(prefix + this.code, { reliable: true });
      this.conn = conn;
      let ready = false;
      let timeout = setTimeout(() => { conn.close(); reject(Error('A sala não respondeu. Confira se o apresentador está online; tente outra rede se necessário.')); }, 18_000);
      conn.on('open', () => {
        const saved = storage.get('sl-player-' + this.code);
        conn.send({ type: 'join', payload: { name: this.name, avatar: this.avatar, token: saved?.token } });
      });
      conn.on('data', msg => {
        if (msg.type === 'joined') {
          clearTimeout(timeout);
          timeout = setTimeout(() => { conn.close(); reject(Error('A aula demorou demais para chegar. Tente uma conexão melhor ou uma apresentação menor.')); }, 120_000);
          storage.set('sl-player-' + this.code, { token: msg.token, name: this.name, avatar: this.avatar });
          storage.set('sl-mode', { host: false, code: this.code, name: this.name, avatar: this.avatar });
          this.onStatus('online');
        } else if (msg.type === 'lesson') this.lesson = msg.lesson;
        else if (msg.type === 'slide-updated' && this.lesson && Number.isInteger(msg.index) && this.lesson.slides[msg.index]) {
          this.lesson = { ...this.lesson, slides: this.lesson.slides.map((slide, i) => i === msg.index ? { ...slide, ...msg.slide } : slide) };
        }
        else if (msg.type === 'state') {
          this.onState({ ...msg.state, lesson: this.lesson });
          if (!ready) { ready = true; clearTimeout(timeout); resolve(); }
        }
        else if (msg.type === 'ack' || msg.type === 'error') {
          const pending = this.pending.get(msg.request);
          if (pending) { clearTimeout(pending.timeout); this.pending.delete(msg.request); msg.type === 'error' ? pending.reject(Error(msg.message)) : pending.resolve(); }
          else if (msg.type === 'error') { clearTimeout(timeout); reject(Error(msg.message)); this.onStatus('error', msg.message); }
        }
      });
      let closed = false;
      const reconnect = () => {
        if (closed || this.stopped || this.conn !== conn) return;
        closed = true; clearTimeout(timeout); this.onStatus('reconnecting');
        if (!ready) reject(Error('A conexão foi interrompida ao carregar a aula. Tente entrar novamente.'));
        this.retry = setTimeout(() => this.connect().catch(err => this.onStatus('error', err.message)), 2500);
      };
      conn.on('close', reconnect); conn.on('error', reconnect);
    });
  }
  control(action, value) {
    const previous = action === 'edit-slide' ? this.room.slides[value?.index] : null;
    this.room.control(action, value);
    if (action === 'edit-slide') {
      const slide = { ...this.room.publicLesson().slides[value.index] };
      if (slide.image === previous.image) delete slide.image;
      for (const conn of this.connections.values()) if (conn.open && conn.lessonSent) conn.send({ type: 'slide-updated', index: value.index, slide });
    }
    this.broadcast();
  }
  answer(choice, questionIndex) {
    if (!this.conn?.open) return Promise.reject(Error('Reconectando à sala. Aguarde.'));
    const request = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(request); reject(Error('Não recebemos confirmação. Verifique a conexão.')); }, 5000);
      this.pending.set(request, { resolve, reject, timeout });
      this.conn.send({ type: 'answer', payload: { choice, questionIndex }, request });
    });
  }
  stop() {
    this.stopped = true; clearInterval(this.timer); clearTimeout(this.retry);
    for (const p of this.pending.values()) { clearTimeout(p.timeout); p.reject(Error('Você saiu da sala.')); }
    this.pending.clear(); this.conn?.close(); this.peer?.destroy();
    try { sessionStorage.removeItem('sl-mode'); } catch { /* ignore */ }
  }
  static resume() { return storage.get('sl-mode'); }
}
