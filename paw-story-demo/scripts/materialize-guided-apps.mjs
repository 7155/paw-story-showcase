import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { zip } from './archive-real-app.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({ appType: 'custom', configFile: false, root, resolve: { alias: { '@': path.join(root, '../control-center-web/src') } }, cacheDir: path.join(root, 'node_modules/.cache/guided-export'), server: { middlewareMode: true } });
try {
  const { researchConversationDocument, createResearchReplayBridge } = await vite.ssrLoadModule('../showcase/research-conversation-app.ts');
  const { researchReportMarkdown } = await vite.ssrLoadModule('../control-center-web/src/features/agent/portable/research-report.ts');
  const { portableRecordTurn } = await vite.ssrLoadModule('../control-center-web/src/features/agent/portable/conversation-types.ts');
  const { guidedAppDocument } = await vite.ssrLoadModule('../showcase/guided-lab-app.ts');
  const { sampleDocuments, defaultLabConfig, candidateConfigs, evaluateGuidedLab } = await vite.ssrLoadModule('../showcase/guided-lab.ts');
  const { labFlowSamples } = await vite.ssrLoadModule('../showcase/lab-flow.ts');
  const replay = JSON.parse(readFileSync(path.join(root, 'public/evidence/research-conversations.v1.json'), 'utf8'));
  for (const key of ['deep-research', 'cloudops', 'enterpriseops', 'memory']) {
    let html, configuration;
    if (key === 'deep-research') {
      html = researchConversationDocument(replay, {
        js: readFileSync(path.join(root, '../control-center-web/.generated/portable-agent-ui/agent-ui.js'), 'utf8'),
        css: readFileSync(path.join(root, '../control-center-web/.generated/portable-agent-ui/agent-ui.css'), 'utf8'),
      });
      configuration = { mode: 'saved-research-conversation', corpus: replay.corpus, source: 'research-conversations.v1.json', responses: 4 };
    } else {
      const docs = sampleDocuments(key), candidate = candidateConfigs(key, defaultLabConfig).at(-1);
      const run = evaluateGuidedLab(key, docs, labFlowSamples[key].cases, candidate.config, candidate.name);
      run.createdAt = 'offline-package'; run.id = key + '-packaged-example';
      html = guidedAppDocument(key, docs, run);
      configuration = { mode: 'offline-local-checks', scenario: key, config: run.config, report: run };
    }
    const target = path.join(root, 'public/real-apps', key);
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'index.html'), html);
    writeFileSync(path.join(target, 'parameters.json'), JSON.stringify(configuration, null, 2) + '\n');
    const files = {
      'index.html': Buffer.from(html),
      'parameters.json': Buffer.from(JSON.stringify(configuration, null, 2)),
      'README.md': Buffer.from('# PAW 离线应用\n\n解压后直接打开 index.html，无需后端或依赖安装。\n\n' + (key === 'deep-research' ? '本包展示实际保存的研究问答和引用片段，不生成新模型回答。资料清单含 211 份论文，未打包完整论文正文。' : '本包在浏览器内执行已测评的规则；示例资料、参数和检查结果随应用保存。') + '\n'),
      'LICENSE': readFileSync(path.join(root, '../real-apps/PAW-LICENSE')),
    };
    if (key === 'deep-research') {
      mkdirSync(path.join(target, 'reports'), { recursive: true });
      for (const record of await createResearchReplayBridge(replay).history()) {
        const markdown = researchReportMarkdown(replay.title, portableRecordTurn(record, 'question'));
        files[`reports/${record.requestId}.md`] = Buffer.from(markdown);
        writeFileSync(path.join(target, 'reports', record.requestId + '.md'), markdown);
      }
    }
    writeFileSync(path.join(root, 'public/real-apps', key + '-app.zip'), zip(files));
    console.log(key + ': standalone HTML + ZIP');
  }
} finally { await vite.close(); }
