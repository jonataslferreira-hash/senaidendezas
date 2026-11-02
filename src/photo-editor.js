import {animatedAvatar} from './animated-avatar.js';
export function cropRectangle(width,height,zoom=1,x=.5,y=.5){
  const safeZoom=Number.isFinite(zoom)?Math.max(1,zoom):Number.MAX_VALUE,side=Math.max(Number.EPSILON,Math.min(width,height)/safeZoom);
  return {x:(Number.isFinite(x)?x:.5)*width-side/2,y:(Number.isFinite(y)?y:.5)*height-side/2,side};
}
export class PhotoEditor {
  constructor(settings) {
    this.settings = settings; this.account = settings.account;
    const root = this.account.root;
    this.pointers = new Map();
    root.addEventListener('pointerdown', e => {
      if (!e.target.matches('[data-photo-canvas]')) return;
      e.preventDefault(); this.pointers.set(e.pointerId, {x:e.clientX,y:e.clientY}); e.target.setPointerCapture(e.pointerId); this.beginGesture();
    });
    root.addEventListener('pointermove', e => {
      if (!this.pointers.has(e.pointerId) || !this.bitmap) return;
      e.preventDefault(); this.pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
      const points=[...this.pointers.values()], rect=e.target.getBoundingClientRect();
      if(points.length>1){const distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);this.zoom=Math.max(1,this.gesture.zoom*distance/Math.max(1,this.gesture.distance));}
      const center={x:points.reduce((sum,p)=>sum+p.x,0)/points.length,y:points.reduce((sum,p)=>sum+p.y,0)/points.length},oldSide=Math.min(this.bitmap.width,this.bitmap.height)/this.gesture.zoom,newSide=cropRectangle(this.bitmap.width,this.bitmap.height,this.zoom).side;
      this.panX=(this.gesture.panX*this.bitmap.width+this.gesture.ratioX*oldSide-((center.x-rect.left)/rect.width-.5)*newSide)/this.bitmap.width;
      this.panY=(this.gesture.panY*this.bitmap.height+this.gesture.ratioY*oldSide-((center.y-rect.top)/rect.height-.5)*newSide)/this.bitmap.height;
      this.draw();
    });
    const end=e=>{this.pointers.delete(e.pointerId);this.beginGesture();};
    root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
    root.addEventListener('wheel',e=>{
      if(!e.target.matches('[data-photo-canvas]')||!this.bitmap)return;e.preventDefault();
      const rect=e.target.getBoundingClientRect(),oldSide=cropRectangle(this.bitmap.width,this.bitmap.height,this.zoom).side;
      this.zoom=Math.max(1,this.zoom*Math.exp(-Math.max(-300,Math.min(300,e.deltaY))*.002));const side=cropRectangle(this.bitmap.width,this.bitmap.height,this.zoom).side;
      this.panX+=((e.clientX-rect.left)/rect.width-.5)*(oldSide-side)/this.bitmap.width;this.panY+=((e.clientY-rect.top)/rect.height-.5)*(oldSide-side)/this.bitmap.height;this.draw();
    },{passive:false});
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stopCamera(); });
  }
  beginGesture(){const points=[...this.pointers.values()],canvas=this.account.root.querySelector('[data-photo-canvas]');if(!points.length||!canvas){this.gesture=null;return;}const rect=canvas.getBoundingClientRect(),x=points.reduce((s,p)=>s+p.x,0)/points.length,y=points.reduce((s,p)=>s+p.y,0)/points.length;this.gesture={x,y,panX:this.panX,panY:this.panY,zoom:this.zoom,ratioX:(x-rect.left)/rect.width-.5,ratioY:(y-rect.top)/rect.height-.5,distance:points.length>1?Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y):1};}
  reset() { this.avatarAbort?.abort();this.processing=false;this.pointers?.clear(); this.gesture=null; this.version = (this.version || 0) + 1; this.bitmap?.close(); this.bitmap = null; this.drag = null; this.stopCamera(); }
  stopCamera() { this.cameraVersion = (this.cameraVersion || 0) + 1; this.stream?.getTracks().forEach(track => track.stop()); this.stream = null; }
  async choose(file) {
    if (!file) return;
    if(file.type==='image/gif'||file.type.startsWith('video/')){
      this.settings.capture(this.account.root.querySelector('#account-form'));this.reset();const version=this.version;this.avatarAbort=new AbortController();this.processing=true;this.account.paint();
      try{const prepared=await animatedAvatar(file,this.avatarAbort.signal);if(version!==this.version||this.account.mode!=='profile')return;if(this.settings.pending?.url)URL.revokeObjectURL(this.settings.pending.url);this.settings.pending={file:prepared,url:URL.createObjectURL(prepared)};this.settings.removing=false;}catch(error){if(error.name!=='AbortError')throw error;}finally{if(version===this.version){this.processing=false;this.account.paint();}}return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) throw Error('Escolha uma foto PNG, JPEG ou WebP de até 15 MB.');
    this.settings.capture(this.account.root.querySelector('#account-form'));
    this.reset(); const version = this.version;
    const bitmap = await createImageBitmap(file);
    if (version !== this.version || this.account.mode !== 'profile') { bitmap.close(); return; }
    this.bitmap = bitmap; this.zoom = 1; this.panX = this.panY = .5;
    this.account.paint();
  }
  markup() {
    if(this.processing)return '<section class="photo-editor"><p role="status">Preparando animação… Usaremos até 3 segundos, com corte central quadrado.</p></section>';
    if (this.stream) return '<section class="photo-editor"><h3>Sua câmera</h3><video data-photo-camera autoplay muted playsinline></video><div><button type="button" data-photo-action="capture">Fotografar</button><button type="button" data-photo-action="cancel">Cancelar</button></div></section>';
    if (!this.bitmap) return '';
    return `<section class="photo-editor"><h3>Ajuste sua foto</h3><p>Arraste para enquadrar. Use dois dedos ou a roda do mouse para ampliar. Centralizar restaura a posição.</p><div class="photo-crop-preview"><canvas width="256" height="256" data-photo-canvas aria-label="Prévia do recorte da foto"></canvas></div><div class="photo-zoom-controls"><button type="button" data-photo-action="zoom-out" aria-label="Diminuir zoom">−</button><output data-photo-zoom>${Math.round(this.zoom*100)}%</output><button type="button" data-photo-action="zoom-in" aria-label="Aumentar zoom">+</button><button type="button" data-photo-action="reset">Centralizar</button></div><div><button type="button" data-photo-action="apply">Usar este recorte</button><button type="button" data-photo-action="cancel">Cancelar recorte</button></div></section>`;
  }
  mount() {
    this.draw(); const video = this.account.root.querySelector('[data-photo-camera]');
    if (video && this.stream) { video.srcObject = this.stream; video.play().catch(() => {}); }
  }
  draw() {
    const canvas = this.account.root.querySelector('[data-photo-canvas]'); if (!canvas || !this.bitmap) return;
    const output=this.account.root.querySelector('[data-photo-zoom]');if(output)output.textContent=Math.round(this.zoom*100)+'%';
    const rect = cropRectangle(this.bitmap.width, this.bitmap.height, this.zoom, this.panX, this.panY);
    const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,256,256); ctx.drawImage(this.bitmap, rect.x, rect.y, rect.side, rect.side, 0,0,256,256);
  }
  async action(name) {
    if (name === 'zoom-in' || name === 'zoom-out') { this.zoom=Math.max(1,this.zoom*(name === 'zoom-in' ? 1.2 : 1/1.2));this.draw();return; }
    if (name === 'reset') { this.zoom=1;this.panX=this.panY=.5;this.draw();return; }
    if (name === 'cancel') { this.reset(); this.account.paint(); return; }
    if (name === 'camera') {
      this.settings.capture(this.account.root.querySelector('#account-form')); this.reset();
      if (!navigator.mediaDevices?.getUserMedia) { this.account.root.querySelector('#profile-camera-file').click(); return; }
      const version = this.cameraVersion;
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false }); }
      catch { throw Error('A câmera não foi liberada. Permita o acesso no navegador ou use Escolher foto.'); }
      if (version !== this.cameraVersion || this.account.mode !== 'profile') { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream; this.account.paint(); return;
    }
    if (name === 'capture') {
      const video = this.account.root.querySelector('[data-photo-camera]');
      if (!video?.videoWidth) throw Error('Aguarde a câmera ficar pronta.');
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video,0,0); const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', .9));
      await this.choose(new File([blob], 'camera.jpg', { type: 'image/jpeg' })); return;
    }
    if (name === 'apply' && this.bitmap) {
      const canvas = this.account.root.querySelector('[data-photo-canvas]'); this.draw();
      const version = this.version, blob = await new Promise(r => canvas.toBlob(r, 'image/webp', .85));
      if (version !== this.version || this.account.mode !== 'profile') return;
      if (!blob || blob.size > 256 * 1024) throw Error('Não foi possível preparar a foto. Escolha outra imagem.');
      if (this.settings.pending?.url) URL.revokeObjectURL(this.settings.pending.url);
      this.settings.pending = { file: new File([blob], 'avatar.webp', { type: blob.type }), url: URL.createObjectURL(blob) };
      this.settings.removing = false; this.reset(); this.account.paint();
    }
  }
}
