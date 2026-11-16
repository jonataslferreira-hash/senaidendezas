import { prefersReducedMotion } from './motion-preference.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { modelMeta, isBuiltinModel } from './model-catalog.js';
import { PART_DETAILS, buildBuiltinModel } from './model-builders.js';

export class HardwareViewer {
  constructor({ defer = false } = {}) {
    this.el = document.createElement('div');
    this.el.className = 'hardware-view';
    this.el.innerHTML = '<div class="model-fallback" hidden>Visualização 3D indisponível neste dispositivo. As explicações e o quiz continuam disponíveis.</div><div class="part-detail" aria-live="polite"><span class="part-dot"></span><div><strong>Explore por dentro</strong><p>Arraste para girar · toque em uma peça para descobrir</p></div></div>';
    this.detail = this.el.querySelector('.part-detail');
    if (!defer) this.initialize();
  }

  initialize(defaultModel = true) {
    if (this.initialized || this.disposed) return;
    this.initialized = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      this.el.querySelector('.model-fallback').hidden = false;
      return;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.el.prepend(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', 'Modelo 3D didático interativo. Arraste para girar e toque nas peças para conhecê-las.');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(6.4, 6.2, 7.6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.2;
    this.controls.maxDistance = 18;
    this.controls.maxPolarAngle = Math.PI * 0.88;

    // Iluminação de estúdio 3-pontos + hemisfério para realçar metais, vidros e cores
    this.scene.add(new THREE.HemisphereLight(0xdce8ff, 0x262040, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 3.6);
    key.position.set(4, 8, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9b72f2, 3.4);
    rim.position.set(-6, 4, -4);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0x57dfd0, 14);
    fill.position.set(4, 2, -5);
    this.scene.add(fill);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Pedestal orbital discreto para dar referência espacial
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.25, 0.014, 6, 100),
      new THREE.MeshBasicMaterial({ color: 0x5c4f86, transparent: true, opacity: 0.52 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.35;
    this.scene.add(ring);

    const ring2 = ring.clone();
    ring2.scale.setScalar(1.24);
    ring2.material = ring.material.clone();
    ring2.material.opacity = 0.18;
    this.scene.add(ring2);

    this.ray = new THREE.Raycaster();
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', e => { this.pointer = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      if (!this.pointer || Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 8) return;
      const rect = canvas.getBoundingClientRect();
      this.ray.setFromCamera(
        new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1),
        this.camera
      );
      const hit = this.ray.intersectObjects(this.group.children, true).find(h => h.object.userData.part || h.object.userData.customPart);
      if (hit?.object.userData.customPart) {
        this.detail.querySelector('strong').textContent = this.displayTitle || hit.object.userData.customPart;
        this.detail.querySelector('p').textContent = this.displayDescription || 'Peça do modelo enviado. Arraste para girar e use o zoom para explorar.';
      } else if (hit) {
        this.select(hit.object.userData.part);
      }
    });

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.el);
    this.controls.addEventListener('change', () => this.invalidate());
    this.onVisibility = () => {
      if (!document.hidden) this.invalidate();
      else {
        clearTimeout(this.frameTimer);
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
        this.frameTimer = null;
      }
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.intersection = new IntersectionObserver(entries => {
      this.inView = entries[0].isIntersecting;
      if (this.inView) this.invalidate();
    });
    this.intersection.observe(this.el);

    this.drawFrame = () => {
      this.frameId = null;
      this.frameTimer = null;
      if (this.disposed || !this.el.isConnected || document.hidden || this.inView === false) return;
      let moving = false;
      const reduced = prefersReducedMotion();
      for (const part of this.group.children) {
        const ud = part.userData;
        if (ud.targetY === undefined) continue;
        const tx = ud.targetX ?? ud.baseX ?? part.position.x;
        const ty = ud.targetY;
        const tz = ud.targetZ ?? ud.baseZ ?? part.position.z;
        const dx = tx - part.position.x;
        const dy = ty - part.position.y;
        const dz = tz - part.position.z;
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dz) > 0.001) {
          const factor = reduced ? 1 : 0.18;
          part.position.x += dx * factor;
          part.position.y += dy * factor;
          part.position.z += dz * factor;
          moving = !reduced;
          this.dirty = true;
        } else if (dx !== 0 || dy !== 0 || dz !== 0) {
          part.position.set(tx, ty, tz);
          this.dirty = true;
        }
      }
      const cameraMoved = this.controls.update();
      if (moving || cameraMoved || this.dirty) {
        this.renderer.render(this.scene, this.camera);
        this.dirty = false;
      }
      if (moving || cameraMoved) this.invalidate(false);
    };

    if (defaultModel) this.setModel('ssd', true);
  }

  invalidate(dirty = true) {
    if (dirty) this.dirty = true;
    if (this.disposed || !this.renderer || this.frameTimer || this.frameId) return;
    this.frameTimer = setTimeout(() => {
      this.frameTimer = null;
      this.frameId = requestAnimationFrame(this.drawFrame);
    }, 33);
  }

  select(part) {
    this.selectedPart = part;
    const [title, text] = PART_DETAILS[part] || PART_DETAILS.casing;
    this.detail.querySelector('strong').textContent = this.displayTitle || title;
    this.detail.querySelector('p').textContent = this.displayDescription || text;
    requestAnimationFrame(() => this.resize());
  }

  setPresentation({ modelLabel = '', modelDescription = '', modelDetailsHidden = false } = {}) {
    this.displayTitle = modelLabel.trim();
    this.displayDescription = modelDescription.trim();
    this.detail.hidden = Boolean(modelDetailsHidden);
    if (this.type === 'custom') {
      if (this.el.dataset.customLoaded !== 'error') {
        this.detail.querySelector('strong').textContent = this.displayTitle || this.customSource?.name || 'Modelo 3D';
      }
      this.detail.querySelector('p').textContent = this.displayDescription;
      this.resize();
    } else {
      this.select(this.selectedPart);
    }
  }

  resize() {
    if (!this.renderer) return;
    const w = this.el.clientWidth;
    const h = this.el.clientHeight - this.detail.offsetHeight - 12;
    if (!w || !h) return;
    if (this.width !== w || this.height !== h) {
      this.width = w;
      this.height = h;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.invalidate();
  }

  reset() {
    if (!this.controls) return;
    // Ajusta distância inicial conforme a proporção de cada modelo
    const presets = {
      cpu: [5.6, 5.0, 6.4],
      motor: [6.0, 4.0, 6.8],
      crystal: [5.8, 4.2, 6.4],
      heart: [5.2, 3.2, 6.2],
      volcano: [5.8, 4.4, 6.4],
      dna: [6.2, 2.6, 6.8],
      molecule: [5.2, 2.8, 6.4],
      atom: [6.2, 4.4, 6.8],
      earth: [5.4, 3.6, 6.0],
      prism: [5.6, 3.8, 6.8]
    };
    const [cx, cy, cz] = presets[this.type] || [6.4, 6.2, 7.6];
    this.camera.position.set(cx, cy, cz);
    this.controls.target.set(0, 0.25, 0);
    this.controls.update();
  }

  disposeGroup() {
    if (!this.group) return;
    this.group.traverse(o => {
      o.geometry?.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
          m.dispose();
        }
      }
    });
    this.group.clear();
  }

  setModel(rawType, exploded) {
    this.initialize();
    if (!this.renderer) return;
    const type = isBuiltinModel(rawType) ? rawType : 'ssd';
    this.customSource = null;
    this.scene.environment = null;
    this.dirty = true;
    if (this.type !== type) {
      this.customKey = null;
      this.loadVersion = (this.loadVersion || 0) + 1;
      this.disposeGroup();
      this.type = type;
      const meta = modelMeta(type);
      this.renderer.domElement.setAttribute(
        'aria-label',
        `Modelo 3D didático: ${meta.name} (${meta.subject}). Arraste para girar e toque nas peças para conhecê-las.`
      );
      buildBuiltinModel(this.group, type);
      this.reset();
      this.select(meta.defaultPart);
    }
    this.exploded = Boolean(exploded);
    for (const part of this.group.children) {
      const ud = part.userData;
      ud.targetX = (ud.baseX || 0) + (this.exploded ? ud.explodeX || 0 : 0);
      ud.targetY = (ud.baseY || 0) + (this.exploded ? (ud.explodeY ?? ud.lift ?? 0) : 0);
      ud.targetZ = (ud.baseZ || 0) + (this.exploded ? ud.explodeZ || 0 : 0);
    }
    this.invalidate();
  }

  async setCustomModel(model, label = '') {
    this.initialize(false);
    if (!this.renderer || !model) return;
    this.customSource = model;
    const title = label.trim() || 'Modelo 3D';
    const heading = this.detail.querySelector('strong');
    const key = model.assetId || model.name + ':' + model.data?.length;
    if (this.customKey === key) {
      if (this.customLabel !== title && this.el.dataset.customLoaded !== 'error') heading.textContent = title;
      this.customLabel = title;
      return;
    }
    this.customLabel = title;
    this.customKey = key;
    const version = this.loadVersion = (this.loadVersion || 0) + 1;
    this.el.dataset.customLoaded = 'loading';
    this.renderer.domElement.setAttribute('aria-label', 'Modelo 3D enviado. Arraste para girar e toque nas peças.');
    this.type = 'custom';
    heading.textContent = title;
    this.detail.querySelector('p').textContent = 'Preparando o modelo 3D…';
    try {
      const { loadCustomObject, disposeObject } = await import('./model-loader.js');
      const object = await loadCustomObject(model, this.renderer);
      if (version !== this.loadVersion || this.disposed) { disposeObject(object); return; }
      if (!this.environment) {
        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
        if (version !== this.loadVersion || this.disposed) { disposeObject(object); return; }
        const room = new RoomEnvironment();
        const generator = new THREE.PMREMGenerator(this.renderer);
        this.environment = generator.fromScene(room, 0.04);
        room.dispose();
        generator.dispose();
      }
      this.scene.environment = this.environment.texture;
      disposeObject(this.group);
      this.group.clear();
      this.group.add(object);
      heading.textContent = this.customLabel;
      this.detail.querySelector('p').textContent = 'Modelo enviado · arraste para girar, aproxime com dois dedos e toque nas peças.';
      this.reset();
      this.dirty = true;
      this.resize();
      this.el.dataset.customLoaded = 'true';
    } catch (error) {
      if (version !== this.loadVersion || this.disposed) return;
      this.group.clear();
      this.dirty = true;
      this.el.dataset.customLoaded = 'error';
      this.invalidate();
      this.detail.querySelector('strong').textContent = 'Não foi possível abrir o modelo';
      this.detail.querySelector('p').textContent = error.message;
    }
  }

  dispose() {
    this.disposed = true;
    this.loadVersion = (this.loadVersion || 0) + 1;
    clearTimeout(this.frameTimer);
    cancelAnimationFrame(this.frameId);
    this.intersection?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.observer?.disconnect();
    this.controls?.dispose();
    this.renderer?.setAnimationLoop(null);
    this.scene?.traverse(o => {
      o.geometry?.dispose();
      for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
        for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
        m.dispose();
      }
    });
    this.renderer?.dispose();
    this.el.remove();
    this.environment?.dispose();
  }
}
