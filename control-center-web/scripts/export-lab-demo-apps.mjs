import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.resolve(process.argv[2] ?? path.join(root, '../output/lab-demo-apps'));
const vite = await createServer({ root, configFile: false, appType: 'custom',
  optimizeDeps: { noDiscovery: true, entries: [] },
  cacheDir: path.join(root, 'node_modules/.cache/lab-export-vite'), server: { middlewareMode: true } });
try {
  const { buildLabDemoApp } = await vite.ssrLoadModule('/src/app/preview-lab-app-package.ts');
  const { labFlowSamples, evaluateLabDemo } = await vite.ssrLoadModule('/../showcase/lab-flow.ts');
  const { currentLabExperiments } = await vite.ssrLoadModule('/../showcase/lab-evidence.ts');
  const results = [];
  await mkdir(output, { recursive: true });
  for (const experiment of currentLabExperiments) {
    const key = experiment.key; const dataset = labFlowSamples[key]; const projectId = `lab-showcase-${key}`;
    const result = evaluateLabDemo(key, dataset, 'bounded');
    if (result.decision !== 'keep') throw new Error(`${key}: sample evaluation did not pass`);
    const value = await buildLabDemoApp(projectId, `${experiment.label} · 离线演示`, key, dataset, 'bounded',
      { ...result, materialSetId: `${projectId}:materials:2`, configurationRevision: 1 });
    const file = path.join(output, value.download.filename);
    try { await access(file); throw new Error(`Refusing to overwrite ${file}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(file, Buffer.from(value.download.base64, 'base64'));
    results.push({ scenario: key, file, sha256: value.download.sha256, byteSize: value.download.byteSize, passed: result.candidatePassed, total: result.total });
  }
  await writeFile(path.join(output, 'receipts.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
} finally { await vite.close(); }
