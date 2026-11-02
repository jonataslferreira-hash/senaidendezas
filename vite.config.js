import { defineConfig } from 'vite';
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const pdfSource = fileURLToPath(new URL('./node_modules/pdfjs-dist/', import.meta.url));
const pdfAssetFolders = ['cmaps', 'standard_fonts', 'wasm'];
const modelSources = { draco: fileURLToPath(new URL('./node_modules/three/examples/jsm/libs/draco/gltf/', import.meta.url)), basis: fileURLToPath(new URL('./node_modules/three/examples/jsm/libs/basis/', import.meta.url)) };
export default defineConfig({
  optimizeDeps: { include: ['pdfjs-dist', '@office-kit/pptx', '@office-kit/pptx-preview', 'three/addons/loaders/GLTFLoader.js', 'three/addons/loaders/OBJLoader.js', 'three/addons/loaders/MTLLoader.js', 'three/addons/loaders/DRACOLoader.js', 'three/addons/loaders/KTX2Loader.js', 'three/addons/libs/meshopt_decoder.module.js'] },
  plugins: [{
    name: 'local-pdf-assets',
    configureServer(server) {
      server.middlewares.use('/model-codecs', (req, res, next) => {
        const match = /^\/(draco|basis)\/([a-zA-Z0-9_.-]+)$/.exec((req.url || '').split('?')[0]);
        if (!match) return next();
        try { res.setHeader('Content-Type', match[2].endsWith('.wasm') ? 'application/wasm' : 'text/javascript'); res.end(readFileSync(path.join(modelSources[match[1]], match[2]))); }
        catch { res.statusCode = 404; res.end(); }
      });
      server.middlewares.use('/pdfjs-assets', (req, res, next) => {
        const match = /^\/(cmaps|standard_fonts|wasm)\/([a-zA-Z0-9_.-]+)$/.exec((req.url || '').split('?')[0]);
        if (!match) return next();
        try {
          const body = readFileSync(path.join(pdfSource, match[1], match[2]));
          res.setHeader('Content-Type', match[2].endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'); res.end(body);
        } catch { res.statusCode = 404; res.end(); }
      });
    },
    closeBundle() {
      for (const [name, folder] of Object.entries(modelSources)) cpSync(folder, fileURLToPath(new URL('./dist/model-codecs/' + name + '/', import.meta.url)), { recursive: true });
      const target = fileURLToPath(new URL('./dist/pdfjs-assets/', import.meta.url));
      mkdirSync(target, { recursive: true });
      for (const folder of pdfAssetFolders) cpSync(path.join(pdfSource, folder), path.join(target, folder), { recursive: true });
    }
  }],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/three/examples/jsm/loaders/') || id.includes('/three/examples/jsm/libs/meshopt_decoder')) return 'custom-model-codecs';
          if (id.includes('/node_modules/three/')) return 'hardware-3d';
          if (id.includes('/node_modules/peerjs/') || id.includes('/node_modules/peerjs-js-binarypack/')) return 'classroom-network';
        }
      }
    }
  }
});
