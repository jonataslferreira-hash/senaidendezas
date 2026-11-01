import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const details = {
  casing: ['Carcaça', 'Protege os componentes. Este modelo é didático: o interior e a disposição das peças variam entre fabricantes.'],
  nand: ['Memória flash NAND', 'As células armazenam dados sem precisar de energia contínua. As gravações têm vida útil limitada, gerenciada pelo controlador.'],
  controller: ['Controlador', 'Organiza leituras e gravações e distribui o uso das células de memória. É o coordenador do SSD.'],
  pcb: ['Placa de circuito', 'Conecta eletricamente os chips e os demais componentes do SSD.'],
  sata: ['Conexão SATA', 'Este SSD de 2,5 polegadas usa SATA para os dados e um conector separado para alimentação.'],
  platter: ['Pratos magnéticos', 'Os dados são gravados como padrões magnéticos em trilhas. Os pratos giram para que a cabeça acesse as posições.'],
  spindle: ['Motor e eixo', 'Giram os pratos a uma velocidade controlada. HDDs comuns operam, por exemplo, a 5.400 ou 7.200 rpm.'],
  arm: ['Braço e cabeças', 'O braço posiciona as cabeças de leitura e gravação sobre as trilhas. O movimento mecânico contribui para a latência.'],
  nvme: ['Conector M.2', 'Neste exemplo, conecta um SSD PCIe/NVMe à placa-mãe. M.2 também existe em versões SATA: confira o suporte do slot.']
};

export class HardwareViewer {
  constructor() {
    this.el = document.createElement('div'); this.el.className = 'hardware-view';
    this.el.innerHTML = '<div class="model-fallback" hidden>Visualização 3D indisponível neste dispositivo. As explicações e o quiz continuam disponíveis.</div><div class="part-detail" aria-live="polite"><span class="part-dot"></span><div><strong>Explore por dentro</strong><p>Arraste para girar · toque em uma peça para descobrir</p></div></div>';
    this.detail = this.el.querySelector('.part-detail');
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch { this.el.querySelector('.model-fallback').hidden = false; return; }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.el.prepend(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', 'Modelo 3D didático de armazenamento. Arraste para girar e toque nas peças para conhecê-las.');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(6.8, 7.2, 8.2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.enablePan = false;
    this.controls.minDistance = 5; this.controls.maxDistance = 18;
    this.controls.maxPolarAngle = Math.PI * .86;
    this.scene.add(new THREE.AmbientLight(0xbec8ff, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 4.5); key.position.set(2, 7, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9370ff, 5); rim.position.set(-5, 3, -3); this.scene.add(rim);
    const cyan = new THREE.PointLight(0x57dfd0, 18); cyan.position.set(3, 2, -4); this.scene.add(cyan);
    this.group = new THREE.Group(); this.scene.add(this.group);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, .012, 6, 100), new THREE.MeshBasicMaterial({ color: 0x514574, transparent: true, opacity: .6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = -1.1; this.scene.add(ring);
    const ring2 = ring.clone(); ring2.scale.setScalar(1.25); ring2.material = ring.material.clone(); ring2.material.opacity = .2; this.scene.add(ring2);
    this.ray = new THREE.Raycaster();
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', e => { this.pointer = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      if (!this.pointer || Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 8) return;
      const rect = canvas.getBoundingClientRect();
      this.ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      const hit = this.ray.intersectObjects(this.group.children, true).find(hit => hit.object.userData.part);
      if (hit) this.select(hit.object.userData.part);
    });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(this.el);
    this.renderer.setAnimationLoop(() => {
      if (!this.el.isConnected || document.hidden) return;
      let moving = false;
      for (const part of this.group.children) if (part.userData.targetY !== undefined) {
        const difference = part.userData.targetY - part.position.y;
        if (Math.abs(difference) > .001) {
          part.position.y += difference * .09;
          moving = true;
        } else if (difference !== 0) {
          part.position.y = part.userData.targetY;
          this.dirty = true;
        }
      }
      const cameraMoved = this.controls.update();
      if (moving || cameraMoved || this.dirty) {
        this.renderer.render(this.scene, this.camera);
        this.dirty = false;
      }
    });
    this.setModel('ssd', true);
  }
  select(part) {
    const [title, text] = details[part] || details.casing;
    this.detail.querySelector('strong').textContent = title;
    this.detail.querySelector('p').textContent = text;
    requestAnimationFrame(() => this.resize());
  }
  resize() {
    if (!this.renderer) return;
    const w = this.el.clientWidth, h = this.el.clientHeight - this.detail.offsetHeight - 12;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  reset() { if (this.controls) { this.camera.position.set(6.8, 7.2, 8.2); this.controls.target.set(0, .3, 0); this.controls.update(); } }
  setModel(type, exploded) {
    if (!this.renderer) return;
    this.dirty = true;
    if (this.type !== type) {
      this.group.traverse(o => { o.geometry?.dispose(); if (o.material) { for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m.map?.dispose(); m.dispose(); } } });
      this.group.clear(); this.type = type;
      this.parts = [];
      const material = (color, metalness = .5, roughness = .45) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
      const metal = material(0x555769, .85, .3), board = material(0x103b35, .25), chip = material(0x1c202c, .3), gold = material(0xd3ac59, .85, .28), silver = material(0xc2c6d3, 1, .2);
      const box = (x, y, z, width, height, depth, mat, part, lift = 0) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat.clone()); m.position.set(x, y, z);
        m.userData = { part, baseY: y, lift }; this.group.add(m); return m;
      };
      const cylinder = (x, y, z, radius, height, mat, part, lift = 0) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 80), mat.clone()); m.position.set(x, y, z);
        m.userData = { part, baseY: y, lift }; this.group.add(m); return m;
      };
      if (type === 'hdd') {
        box(0, -.35, 0, 4, .3, 5.4, metal, 'casing');
        box(-1.9, -.05, 0, .13, .5, 5.35, metal, 'casing');
        box(1.9, -.05, 0, .13, .5, 5.35, metal, 'casing');
        box(0, -.05, -2.6, 4, .5, .13, metal, 'casing');
        cylinder(-.35, -.08, -.45, 1.52, .08, silver, 'platter', .35);
        cylinder(-.35, .04, -.45, .34, .16, metal, 'spindle', .4);
        for (const radius of [.55, .85, 1.12, 1.4]) {
          const track = new THREE.Mesh(new THREE.TorusGeometry(radius, .008, 5, 100), material(0x85879e)); track.rotation.x = Math.PI / 2; track.position.set(-.35, -.025, -.45); track.userData = { part: 'platter', baseY: -.025, lift: .35 }; this.group.add(track);
        }
        cylinder(1.15, 0, 1.5, .42, .22, silver, 'arm', .8);
        const arm = box(.55, .18, .8, .22, .09, 2, silver, 'arm', .8); arm.rotation.y = .65;
        box(-.05, .16, .03, .3, .12, .2, gold, 'arm', .8);
        const coverMat = material(0x7e829b, .8); coverMat.transparent = true; coverMat.opacity = .14;
        box(0, .35, 0, 3.95, .08, 5.25, coverMat, 'casing', 2);
        box(0, -.32, 2.6, 2.8, .15, .2, gold, 'sata');
      } else if (type === 'ssd') {
        box(0, -.4, 0, 3.8, .22, 5.2, metal, 'casing');
        box(0, -.21, 0, 3.45, .1, 4.7, board, 'pcb', .35);
        for (const x of [-.88, .88]) for (const z of [-1.35, .1]) {
          box(x, -.04, z, 1.16, .16, 1.13, chip, 'nand', .8);
          this.label('NAND', x, .05, z, .7, .8);
          for (let k = 0; k < 6; k++) box(x - .46 + k * .18, -.08, z + .62, .06, .05, .16, gold, 'nand', .8);
        }
        box(.72, -.02, 1.4, .9, .18, .9, material(0x7160c2), 'controller', .8);
        this.label('CTRL', .72, .08, 1.4, .58, .8);
        for (let n = 0; n < 9; n++) box(-1.2 + n * .14, -.08, 1.65, .06, .08, .17, gold, 'pcb', .35);
        box(-.45, -.28, 2.55, 1.5, .15, .25, gold, 'sata');
        box(1.12, -.28, 2.55, .8, .15, .25, gold, 'sata');
        box(0, .18, 0, 3.85, .15, 5.15, material(0x393346, .75, .4), 'casing', 2.1);
        this.label('STORAGE LAB', 0, .265, -.6, 2.6, 2.1, '#c3b3ff');
        this.label('SOLID STATE DRIVE', 0, .267, .15, 2.3, 2.1, '#e5e3ee');
        this.label('2.5”  /  SATA', 0, .268, 1.45, 1.7, 2.1, '#a8a6b5');
        for (const x of [-1.65, 1.65]) for (const z of [-2.25, 2.25]) cylinder(x, .28, z, .07, .04, silver, 'casing', 2.1);
      } else {
        box(0, -.1, 0, 1.65, .12, 5.5, board, 'pcb');
        for (const z of [-1.75, -.25]) { box(0, .06, z, 1.27, .18, 1.2, chip, 'nand', .7); this.label('NAND', 0, .16, z, .82, .7); }
        box(0, .06, 1.2, 1.05, .18, 1.03, material(0x7160c2), 'controller', .7);
        this.label('NVMe', 0, .16, 1.2, .8, .7);
        for (let i = 0; i < 14; i++) if (i !== 10) box(-.73 + i * .11, -.09, 2.77, .075, .11, .4, gold, 'nvme');
        cylinder(0, -.025, -2.5, .13, .04, gold, 'pcb');
      }
      this.reset(); this.select(type === 'hdd' ? 'platter' : 'nand');
    }
    this.exploded = exploded;
    for (const part of this.group.children) part.userData.targetY = (part.userData.baseY || 0) + (exploded ? part.userData.lift || 0 : 0);
  }
  label(text, x, y, z, width, lift, color = '#b4b7c3') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.font = '600 38px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 48);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 96 / 512), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.userData = { baseY: y, lift }; this.group.add(mesh);
  }
}
