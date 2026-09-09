import { build } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile } from 'node:fs/promises';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({ configFile: false, publicDir:false, root, resolve: { alias: { '@': path.join(root, 'src') } },
  define: { 'process.env.NODE_ENV': '"production"' }, esbuild: { jsx: 'automatic' },
  build: { outDir: '.generated/portable-agent-ui', emptyOutDir: true, target: 'es2022',
    lib: { entry: path.join(root, 'src/features/agent/portable/index.tsx'),
      name: 'PawAgentUIBundle', formats: ['iife'], fileName: () => 'agent-ui.js', cssFileName: 'agent-ui' } } });
await mkdir(path.join(root,'public/portable-agent-ui'),{recursive:true});
for (const name of ['agent-ui.js','agent-ui.css']) await copyFile(path.join(root,'.generated/portable-agent-ui',name),path.join(root,'public/portable-agent-ui',name));
