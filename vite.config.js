import { defineConfig } from 'vite';
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const pdfSource = fileURLToPath(new URL('./node_modules/pdfjs-dist/', import.meta.url));
const pdfAssetFolders = ['cmaps', 'standard_fonts', 'wasm'];
export default defineConfig({
  optimizeDeps: { include: ['pdfjs-dist', '@office-kit/pptx', '@office-kit/pptx-preview'] },
  plugins: [{
    name: 'local-pdf-assets',
    configureServer(server) {
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
      const target = fileURLToPath(new URL('./dist/pdfjs-assets/', import.meta.url));
      mkdirSync(target, { recursive: true });
      for (const folder of pdfAssetFolders) cpSync(path.join(pdfSource, folder), path.join(target, folder), { recursive: true });
    }
  }],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'hardware-3d';
          if (id.includes('/node_modules/peerjs/') || id.includes('/node_modules/peerjs-js-binarypack/')) return 'classroom-network';
        }
      }
    }
  }
});
