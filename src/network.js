import { createUuid } from './uuid.js';
import Peer from 'peerjs';
import { Room } from './room.js';
import {issueIdentityProof,verifyIdentityProof} from './classroom-identity.js';
import { compactLesson, hydrateLesson } from './assets.js';

const prefix = 'senai-storage-lab-v1-';
const storage = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* navegação privada */ } }
};
const playerStorage={get(k){try{return JSON.parse(localStorage.getItem(k))||storage.get(k);}catch{return storage.get(k);}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{storage.set(k,v);}}};
// Servidores ICE adicionais são configuráveis para redes que exigem TURN.
// Valores VITE ficam públicos no navegador: use apenas credenciais temporárias
// ou dedicadas, nunca uma senha administrativa.
export function parseIceServers(value) {
  if (!value) return undefined;
  try {
    const servers=JSON.parse(value);
    if (!Array.isArray(servers) || !servers.length) return undefined;
    const valid=servers.filter(s=>s && (typeof s.urls==='string'||Array.isArray(s.urls)) &&
      (Array.isArray(s.urls)?s.urls:[s.urls]).every(url=>typeof url==='string' && /^(stun|stuns|turn|turns):/i.test(url)));
    return valid.length ? valid.map(s=>({urls:s.urls,...(typeof s.username==='string'?{username:s.username}:{}),...(typeof s.credential==='string'?{credential:s.credential}:{})})) : undefined;
  } catch { return undefined; }
}
function options() {
  // Somente no desenvolvimento: sinalizador local para testes reais de WebRTC.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('localSignal')) return { host: location.hostname, port: 9000, path: '/', secure: false, debug: 0 };
  const iceServers=parseIceServers(import.meta.env.VITE_WEBRTC_ICE_SERVERS);
  // Um sinalizador próprio pode ser autorizado pela TI; sem configuração mantém PeerJS público.
  let signaling = {};
  try {
    const url = new URL(import.meta.env.VITE_PEER_SIGNAL_URL);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash)
      signaling = {host:url.hostname,port:Number(url.port)||(url.protocol==='https:'?443:80),path:url.pathname,secure:url.protocol==='https:'};
  } catch { /* valor ausente ou inválido: mantém o padrão */ }
  return { debug: 0, ...signaling, ...(iceServers ? {config:{iceServers}} : {}) };
}
export class Classroom {
  constructor(onState, onStatus) {
    this.onState = onState; this.onStatus = onStatus;
    this.connections = new Map(); this.pending = new Map(); this.stopped = false;
  }
  async create(resume = false, lesson, startIndex, fromEditor = false) {
    this.host = true;
    const saved = resume && storage.get('sl-host');
    this.code = saved?.code || String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
    if (saved?.data?.lesson) saved.data.lesson = await hydrateLesson(saved.data.lesson);
    this.room = new Room(this.code, saved?.data, Date.now, lesson, startIndex);
    this.peer = new Peer(prefix + this.code, options());
    await this.open();
    this.peer.on('connection', conn => this.accept(conn));
    storage.set('sl-mode', { host: true, code: this.code, fromEditor });
    this.timer = setInterval(() => { const key = () => this.room.data.phase + ':' + (this.room.data.game?.state || '') + ':' + (this.room.data.game?.round ?? '') + ':' + (this.room.data.podiumStep || 0), before = key(); this.room.tick(); if (before !== key()) this.broadcast(); }, 100);
    this.broadcast();
    return this.code;
  }
  open() {
    // Falhas transitórias de sinalização (servidor ocupado, oscilação de rede,
    // sala antiga ainda registrada no servidor) ganham novas chances antes de
    // virar erro para quem clicou em Apresentar ou Entrar na sala.
    const transient = new Set(['network', 'server-error', 'socket-error', 'socket-closed', 'ssl-unavailable', 'unavailable-id', 'timeout']);
    const wait = ms => new Promise(done => setTimeout(done, ms));
    const attempt = () => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { const err = Error('Não foi possível acessar a sinalização. Verifique a internet e tente outra rede.'); err.type = 'timeout'; this.peer.destroy(); reject(err); }, 15_000);
      let opened = false;
      const tryReconnect = () => {
        if (this.stopped || this.peer.destroyed) return;
        if (this.peer.disconnected) setTimeout(() => { if (!this.stopped && this.peer.disconnected && !this.peer.destroyed) this.peer.reconnect(); }, 1500);
      };
      this.peer.once('open', () => { opened = true; clearTimeout(timeout); this.onStatus('online'); resolve(); });
      this.peer.on('error', err => {
        if (!opened) {
          clearTimeout(timeout);
          const text = err.type === 'unavailable-id' ? 'Esta sala ainda está conectada em outra aba. Feche a outra aba ou crie uma nova sala.' : err.type === 'peer-unavailable' ? 'Sala não encontrada ou apresentador desconectado. Confira o código.' : 'Não foi possível conectar ao serviço da sala. Verifique se esta rede permite acessar o serviço de sinalização e WebRTC; tente outra rede.';
          reject(Object.assign(Error(text), { type: err.type }));
          return;
        }
        // Depois de aberto, falhas transitórias não encerram a sala: a apresentação
        // continua com quem está conectado e a sinalização reconecta sozinha.
        if (this.stopped || this.peer.destroyed) return;
        this.onStatus('reconnecting');
        tryReconnect();
      });
      this.peer.on('disconnected', () => {
        this.onStatus('reconnecting');
        tryReconnect();
      });
      this.peer.on('open', () => { if (opened) this.onStatus('online'); });
    });
    return (async () => {
      for (let tries = 0; ; tries++) {
        try { return await attempt(); }
        catch (err) {
          if (tries >= 2 || !transient.has(err.type)) { this.onStatus('error', err.message); throw err; }
          this.onStatus('reconnecting');
          await wait(tries ? 1600 : 900);
          if (this.stopped) throw Error('Conexão encerrada.');
          try { this.peer.destroy(); } catch { /* peer já encerrado */ }
          this.peer = this.host ? new Peer(prefix + this.code, options()) : new Peer(options());
        }
      }
    })();
  }
  accept(conn) {
    if (this.connections.size >= 65) { conn.close(); return; }
    const timeout = setTimeout(() => { if (!conn.playerId) conn.close(); }, 12_000);
    conn.on('data', msg => {
      // A foto do time viaja dentro da resposta (até 30 KB). Com o limite antigo
      // de 4 KB ela era descartada em silêncio: o líder salvava, o cartão dele
      // mostrava a prévia e o telão continuava sem foto — e, na renderização
      // seguinte, a prévia voltava para a inicial do nome.
      const limit = msg?.type === 'answer' ? 48000 : msg?.type === 'join' ? 56000 : msg?.type === 'profile' ? 32768 : 4096;
      if (!msg || typeof msg !== 'object' || JSON.stringify(msg).length > limit) return;
      const time = Date.now();
      conn.actions = (conn.actions || []).filter(t => t > time - 10_000);
      if (conn.actions.length > 40) return;
      conn.actions.push(time);
      try {
        if (msg.type === 'join' && !conn.playerId) {
          const joined = this.room.join(msg.payload);
          const previous = this.connections.get(joined.id);
          conn.playerId = joined.id;
          const player=this.room.data.players.find(p=>p.id===joined.id);if(player)delete player.googleUserId;
          this.connections.set(joined.id, conn);
          if (previous && previous !== conn) previous.close();
          clearTimeout(timeout);
          conn.send({ type: 'joined', ...joined });
          if(msg.payload?.identifyGoogle===true)this.challengeIdentity(conn);
          this.broadcast();
        } else if(msg.type==='identity-request'&&conn.playerId){this.challengeIdentity(conn);
        } else if(msg.type==='identity-clear'&&conn.playerId){conn.identityNonce=null;conn.identityVersion=(conn.identityVersion||0)+1;const player=this.room.data.players.find(p=>p.id===conn.playerId);if(player)delete player.googleUserId;this.broadcast();
        } else if(msg.type==='identity-proof'&&conn.playerId&&conn.identityNonce){
          const nonce=conn.identityNonce;conn.identityNonce=null;const playerId=conn.playerId,version=conn.identityVersion;
          verifyIdentityProof(this.code,nonce,msg.proof).then(googleUserId=>{if(this.stopped||this.connections.get(playerId)!==conn||conn.identityVersion!==version)return;const player=this.room.data.players.find(p=>p.id===playerId);if(!player)return;player.googleUserId=googleUserId;conn.send({type:'identity-result',ok:true,nonce});this.broadcast();}).catch(()=>{if(conn.open&&conn.identityVersion===version)conn.send({type:'identity-result',ok:false,nonce});});
        } else if(msg.type==='identity-failed'&&conn.playerId){conn.identityNonce=null;
        } else if(msg.type==='profile'&&conn.playerId){this.room.updateProfile(conn.playerId,msg.payload);conn.send({type:'ack',request:msg.request});this.broadcast();
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
  challengeIdentity(conn){conn.identityVersion=(conn.identityVersion||0)+1;conn.identityNonce=createUuid();const player=this.room.data.players.find(p=>p.id===conn.playerId);if(player)delete player.googleUserId;conn.send({type:'identity-challenge',nonce:conn.identityNonce});this.broadcast();}
  enableIdentity(client,uid){if(!this.conn?.open)throw Error('Aguarde a reconexão à sala.');this.identity=client;this.identityUid=uid;this.identityVerified=false;this.identityPending=true;clearTimeout(this.identityTimer);this.identityTimer=setTimeout(()=>{if(!this.identityPending)return;this.clearIdentity();this.onStatus('identity','Não foi possível confirmar seu Google. Avise o professor; ele poderá identificar você manualmente.');},30000);this.conn.send({type:'identity-request'});}
  clearIdentity(){clearTimeout(this.identityTimer);this.identity=null;this.identityUid=null;this.identityVerified=false;this.identityPending=false;this.identityNonce=null;if(this.conn?.open)this.conn.send({type:'identity-clear'});}
  broadcast() {
    if (this.stopped) return;
    storage.set('sl-host', { code: this.code, data: { ...this.room.data, lesson: compactLesson(this.room.data.lesson) } });
    this.onState(this.room.snapshot());
    for (const [id, conn] of this.connections) if (conn.open) {
      if (!conn.lessonSent) { conn.send({ type: 'lesson', lesson: this.room.publicLesson() }); conn.lessonSent = true; }
      conn.send({ type: 'state', state: this.room.snapshot(id, false) });
      if (this.lastLive && this.lastLive.slide === this.room.data.slide && conn.liveSent !== this.lastLive) { conn.send(this.lastLive); conn.liveSent = this.lastLive; }
    }
  }
  // Estado do experimento/modelo 3D que o professor está controlando no slide atual.
  live(payload, transient = false) {
    if (!this.host || this.stopped || !this.room) return;
    const message = { type: 'live', slide: this.room.data.slide, payload };
    // Gestos soltos (transient) não são guardados: quem chega depois recebe só o estado.
    if (!transient) this.lastLive = message;
    for (const conn of this.connections.values()) if (conn.open && conn.lessonSent) { conn.send(message); if (!transient) conn.liveSent = message; }
  }
  async join(code, name, avatar, accountPhoto, identity = null) {
    this.host = false; this.code = code; this.name = name; this.avatar = avatar; this.accountPhoto = accountPhoto; this.identity=identity;
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
      let ready = false, closed = false;
      const unavailable = err => { if(err.type==='peer-unavailable' && !ready && this.conn===conn) { closed=true; clearTimeout(timeout); this.peer.off('error',unavailable); conn.close(); reject(Error('Sala não encontrada na sinalização. Confira o código e se o apresentador está conectado.')); } };
      this.peer.on('error', unavailable);
      let timeout = setTimeout(() => { closed=true; this.peer.off('error',unavailable); conn.close(); reject(Error('Sinalização acessada, mas a conexão direta com a sala não foi concluída. Confira o código e o apresentador; teste outra rede ou peça à TI para verificar WebRTC e TURN.')); }, 18_000);
      conn.on('open', () => {
        const saved = playerStorage.get('sl-player-' + this.code);
        conn.send({ type: 'join', payload: { name: this.name, avatar: this.avatar, accountPhoto: this.accountPhoto, token: saved?.token, identifyGoogle:Boolean(this.identity) } });
      });
      conn.on('data', msg => {
        if (msg.type === 'joined') {
          clearTimeout(timeout);
          timeout = setTimeout(() => { closed=true; this.peer.off('error',unavailable); conn.close(); reject(Error('Conexão com a sala aberta, mas a aula não terminou de carregar. Tente novamente, outra rede ou uma apresentação menor.')); }, 120_000);
          playerStorage.set('sl-player-' + this.code, { token: msg.token, name: this.name, avatar: this.avatar, accountPhoto: this.accountPhoto });
          storage.set('sl-mode', { host: false, code: this.code, name: this.name, avatar: this.avatar, accountPhoto: this.accountPhoto });
          playerStorage.set('sl-active-player',{host:false,code:this.code,name:this.name,avatar:this.avatar,accountPhoto:this.accountPhoto});
          this.onStatus('online');
        } else if(msg.type==='identity-challenge'&&this.identity){
          const nonce=msg.nonce,identity=this.identity;this.identityNonce=nonce;this.identityPending=true;this.identityVerified=false;
          issueIdentityProof(identity,this.code,nonce).then(proof=>{if(conn.open&&this.conn===conn&&this.identity===identity&&this.identityNonce===nonce)conn.send({type:'identity-proof',proof});}).catch(()=>{if(this.identity!==identity||this.identityNonce!==nonce)return;if(conn.open)conn.send({type:'identity-failed'});clearTimeout(this.identityTimer);this.identityPending=false;this.identityVerified=false;this.onStatus('identity','Não foi possível confirmar seu Google. Avise o professor; ele poderá identificar você manualmente.');});
        } else if(msg.type==='identity-result'&&this.identity&&this.identityNonce===msg.nonce){this.identityNonce=null;clearTimeout(this.identityTimer);this.identityPending=false;this.identityVerified=msg.ok===true;this.onStatus('identity',msg.ok?'Identidade Google confirmada para o professor.':'Não foi possível confirmar seu Google. Avise o professor; ele poderá identificar você manualmente.');
        } else if(msg.type==='ended'){this.stopped=true;clearTimeout(timeout);try{localStorage.removeItem('sl-active-player');sessionStorage.removeItem('sl-mode');}catch{}this.onStatus('ended','O professor encerrou a apresentação.');conn.close();
        } else if(msg.type==='kicked'){this.stopped=true;clearTimeout(timeout);try{localStorage.removeItem('sl-active-player');sessionStorage.removeItem('sl-mode');}catch{}this.onStatus('removed','Você foi removido da sala pelo professor.');conn.close();
        } else if (msg.type === 'lesson') this.lesson = msg.lesson;
        else if (msg.type === 'slide-updated' && this.lesson && Number.isInteger(msg.index) && this.lesson.slides[msg.index]) {
          this.lesson = { ...this.lesson, slides: this.lesson.slides.map((slide, i) => i === msg.index ? { ...slide, ...msg.slide } : slide) };
        }
        else if (msg.type === 'live') this.onLive?.(msg);
        else if (msg.type === 'state') {
          this.onState({ ...msg.state, lesson: this.lesson });
          if (!ready) { ready = true; clearTimeout(timeout); this.peer.off('error', unavailable); resolve(); }
        }
        else if (msg.type === 'ack' || msg.type === 'error') {
          const pending = this.pending.get(msg.request);
          if (pending) { clearTimeout(pending.timeout); this.pending.delete(msg.request); msg.type === 'error' ? pending.reject(Error(msg.message)) : pending.resolve(); }
          else if (msg.type === 'error') { clearTimeout(timeout); reject(Error(msg.message)); this.onStatus('error', msg.message); }
        }
      });
      const reconnect = () => {
        if (closed || this.stopped || this.conn !== conn) return;
        closed = true; clearTimeout(timeout); this.peer.off('error', unavailable); this.onStatus('reconnecting');
        if (!ready) reject(Error('A conexão foi interrompida ao carregar a aula. Tente entrar novamente.'));
        this.retry = setTimeout(() => this.connect().catch(err => this.onStatus('error', err.message)), 2500);
      };
      conn.on('close', reconnect); conn.on('error', reconnect);
    });
  }
  control(action, value) {
    const previous = action === 'edit-slide' ? this.room.slides[value?.index] : null;
    this.room.control(action, value);
    if(action==='kick'){const conn=this.connections.get(value);if(conn){conn.send({type:'kicked'});this.connections.delete(value);setTimeout(()=>conn.close(),100);}}
    if (action === 'edit-slide') {
      const slide = { ...this.room.publicLesson().slides[value.index] };
      if (slide.image === previous.image) delete slide.image;
      for (const conn of this.connections.values()) if (conn.open && conn.lessonSent) conn.send({ type: 'slide-updated', index: value.index, slide });
    }
    this.broadcast();
  }
  async updateProfile(name,avatar){await this.request('profile',{name,avatar});this.name=name;this.avatar=avatar;const saved=playerStorage.get('sl-player-'+this.code);playerStorage.set('sl-player-'+this.code,{...saved,name,avatar});const mode={host:false,code:this.code,name,avatar};playerStorage.set('sl-active-player',mode);storage.set('sl-mode',mode);}
  request(type,payload){if(!this.conn?.open)return Promise.reject(Error('Aguarde a reconexão.'));const request=createUuid();return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{this.pending.delete(request);reject(Error('Não recebemos confirmação.'));},7000);this.pending.set(request,{resolve,reject,timeout});this.conn.send({type,payload,request});});}
  answer(choice, questionIndex) {
    if (!this.conn?.open) return Promise.reject(Error('Reconectando à sala. Aguarde.'));
    const request = createUuid();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(request); reject(Error('Não recebemos confirmação. Verifique a conexão.')); }, 5000);
      this.pending.set(request, { resolve, reject, timeout });
      this.conn.send({ type: 'answer', payload: { choice, questionIndex }, request });
    });
  }
  // Professor saiu de vez: bloqueia novos broadcasts e avisa os alunos para voltarem à tela inicial.
  end() {
    this.stopped = true;
    clearInterval(this.timer);
    if (this.host) {
      const open = [...(this.connections?.values?.() || [])];
      this.connections?.clear?.();
      for (const conn of open) { try { conn.send({ type: 'ended' }); } catch { /* conexão já caiu */ } }
    }
    try { sessionStorage.removeItem('sl-mode'); } catch { /* ignore */ }
  }
  stop() {
    this.stopped = true; clearInterval(this.timer); clearTimeout(this.retry); clearTimeout(this.identityTimer);
    for (const p of this.pending.values()) { clearTimeout(p.timeout); p.reject(Error('Você saiu da sala.')); }
    this.pending.clear(); this.conn?.close(); this.peer?.destroy();
    try { sessionStorage.removeItem('sl-mode');if(!this.host)localStorage.removeItem('sl-active-player'); } catch { /* ignore */ }
  }
  static resume() { const saved=storage.get('sl-mode')||playerStorage.get('sl-active-player');const code=new URLSearchParams(location.search).get('s');return code&&saved?.code!==code?null:saved; }
}
