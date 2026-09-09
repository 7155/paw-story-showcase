import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { createServer } from 'vite';
import { JSDOM } from '../../control-center-web/node_modules/jsdom/lib/api.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({ appType: 'custom', configFile: false, root, cacheDir: path.join(root, 'node_modules/.cache/guided-lab-tests'), server: { middlewareMode: true } });
after(() => vite.close());
const engine = await vite.ssrLoadModule('../showcase/guided-lab.ts');
const { guidedAppDocument } = await vite.ssrLoadModule('../showcase/guided-lab-app.ts');
const { labFlowSamples } = await vite.ssrLoadModule('../showcase/lab-flow.ts');
const { defaultLabConfig: baseline, createChunks, documentsFromDataset, sampleDocuments, candidateConfigs, evaluateGuidedLab, searchResearch, recommendRun, labSignature } = engine;
const research = JSON.parse(await readFile(path.join(root, 'public/evidence/guided-research.v1.json'), 'utf8'));

test('research replay supplies real saved turns and citations to the PAW conversation bridge', async () => {
  const { createResearchReplayBridge } = await vite.ssrLoadModule('../showcase/research-conversation-app.ts');
  const replay = JSON.parse(await readFile(path.join(root, 'public/evidence/research-conversations.v1.json'), 'utf8'));
  const bridge = createResearchReplayBridge(replay), records = await bridge.history();
  assert.equal(records.length, 4); assert.equal(replay.documents.length, 211);
  assert.doesNotMatch(JSON.stringify(replay), /\/Users\/|\/Volumes\/|sessionId|apiKey|knowledge-source:/);
  for (const topic of replay.topics) {
    for (const turn of topic.turns) {
      const result = await bridge.invoke('research', { question: turn.question });
      assert.equal(result.text, turn.answer);
      assert.equal(result.assistantUsage.totalTokens, turn.receipt.totalTokens);
      for (const source of result.sources) assert.equal(source.text, turn.sources.find(item => item.number === source.citationNumber).text);
    }
    assert.equal((await bridge.invoke('research', { question: topic.title })).text, topic.turns[0].answer);
  }
  const followup = records.find(row => row.requestId === 'heat-2');
  assert.equal(JSON.parse(followup.input.conversation)[0].answer, replay.topics[1].turns[0].answer);
  await assert.rejects(() => bridge.invoke('research', { question: 'a new unrecorded question' }), /已保存/);
});

test('research sample contains 200 actual existing public synthetic documents and all required sources', async () => {
  assert.equal(research.records.length, 200); assert.equal(research.cases.length, 16);
  const snapshot = JSON.parse(await readFile(path.join(root, '../real-apps/enterprise-rag/snapshot.json'), 'utf8'));
  for (const question of research.cases) { assert.equal(snapshot.queries.find(row => row.queryId === question.id).split, 'train'); assert.ok(question.expectedIds.every(id => research.records.some(row => row.id === id))); }
  const first = research.records[0]; const metadata = snapshot.documents.find(row => row.documentId === first.id);
  assert.equal(first.text, JSON.parse(await readFile(path.join(root, '../real-apps/enterprise-rag/documents', metadata.file), 'utf8')).text);
});
test('chunking preserves source identity and respects overlap without accepting a non-advancing window', () => {
  const docs = [{ id: 'a', title: 'A', name: 'a.txt', text: '0123456789'.repeat(90), status: 'ready', pages: 0 }];
  const chunks = createChunks(docs, { ...baseline, size: 300, overlap: 100 });
  assert.deepEqual(chunks.map(row => row.start), [0, 200, 400, 600]); assert.ok(chunks.every(row => row.sourceId === 'a' && row.text.length === 300));
  assert.throws(() => createChunks(docs, { ...baseline, size: 300, overlap: 300 }), /重叠/);
  assert.throws(() => createChunks(docs, { ...baseline, size: NaN }), /分片长度/);
});
test('research candidate parameters change the actual retrieval and context; missing expected sources fail', () => {
  const docs = documentsFromDataset(research); const questions = [...research.cases.slice(0, 2), { id: 'missing', input: 'unavailable source', expected: 'missing-id' }];
  const base = evaluateGuidedLab('rag', docs, questions, baseline, 'base');
  const expanded = evaluateGuidedLab('rag', docs, questions, candidateConfigs('rag', baseline)[1].config, 'expanded');
  assert.notEqual(base.chunks, expanded.chunks); assert.notEqual(base.contextChars, expanded.contextChars);
  assert.equal(expanded.rows.at(-1).passed, false); assert.ok(expanded.passed < expanded.total);
  assert.equal(labSignature(docs, questions, baseline), base.signature);
  assert.notEqual(labSignature(docs.slice(1), questions, baseline), base.signature);
  assert.notEqual(labSignature(docs, questions, { ...baseline, size: 400 }), base.signature);
});
for (const key of ['enterpriseops', 'cloudops', 'memory']) test(`${key} runs the same checks for baseline and candidates and exports that exact behavior`, () => {
  const docs = sampleDocuments(key); const questions = labFlowSamples[key].cases;
  const runs = [evaluateGuidedLab(key, docs, questions, baseline, 'baseline'), ...candidateConfigs(key, baseline).map(({ config, name }) => evaluateGuidedLab(key, docs, questions, config, name))];
  assert.ok(runs.every(run => run.total === questions.length)); assert.ok(runs.at(-1).passed >= runs[0].passed);
  const run = runs.at(-1); const html = guidedAppDocument(key, docs, run); const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const document = dom.window.document;
  try {
    for (const row of run.rows) {
      document.querySelector(`[data-record="${row.input}"]`).click();
      if (key === 'cloudops') document.querySelector('[data-action="diagnose"]').click();
      const actual = key === 'memory' ? document.querySelector('.decision h3').textContent : key === 'cloudops' ? document.querySelector('.diagnosis h2').textContent : document.querySelector('.detail-title .badge').textContent;
      assert.equal(actual, key === 'cloudops' ? ({ gateway: '网关层', database: '数据库层', worker: '工作进程' }[row.actual] || engine.diagnosisLabels[row.actual] || row.actual) : row.actual);
    }
    assert.match(document.querySelector('.export-configuration').textContent, /config/);
  } finally { dom.window.close(); }
});
test('exported research application uses the evaluated retrieval and treats uploaded markup as text', () => {
  const docs = [{ id: 'source', name: 'source.txt', title: '<img src=x onerror=alert(1)> research', text: 'ocean heat transport '.repeat(40) + '</script><script>window.injected=true</script>', pages: 0, status: 'ready' }];
  const run = evaluateGuidedLab('rag', docs, [{ id: 'q', input: 'ocean heat', expected: 'source' }], baseline, 'baseline');
  const dom = new JSDOM(guidedAppDocument('rag', docs, run), { runScripts: 'dangerously' });
  dom.window.document.getElementById('input').value = 'ocean heat'; dom.window.document.getElementById('run').click();
  assert.equal(dom.window.document.querySelectorAll('#answer section').length, searchResearch(createChunks(docs, baseline), 'ocean heat', baseline).length);
  assert.equal(dom.window.injected, undefined); assert.equal(dom.window.document.querySelector('#answer img'), null);
  dom.window.document.querySelector('#answer button').click(); assert.ok(dom.window.document.querySelector('#answer details').textContent.includes(docs[0].text)); dom.window.close();
});
test('recommendation never changes measured rows when preferences change', () => {
  const docs = sampleDocuments('cloudops'); const questions = labFlowSamples.cloudops.cases;
  const runs = [baseline, ...candidateConfigs('cloudops', baseline).map(row => row.config)].map((config, index) => evaluateGuidedLab('cloudops', docs, questions, config, String(index)));
  const before = JSON.stringify(runs); assert.ok(recommendRun(runs, { accuracy: 1, cost: .2 })); assert.ok(recommendRun(runs, { accuracy: .4, cost: .8 })); assert.equal(JSON.stringify(runs), before);
});
test('enterprise candidates do not offer an identical ninety-day policy twice', () => {
  assert.equal(candidateConfigs('enterpriseops', baseline).length, 1);
  assert.equal(candidateConfigs('enterpriseops', { ...baseline, minTenure: 30 }).length, 2);
});
test('quality and cost preferences can select different measured tradeoffs', () => {
  const common = { total: 20, rows: [], config: baseline, signature: 'same', createdAt: '', chunks: 1 };
  const cheap = { ...common, id: 'cheap', name: 'cheap', quality: .9, passed: 18, contextChars: 1000 };
  const accurate = { ...common, id: 'accurate', name: 'accurate', quality: .95, passed: 19, contextChars: 10000 };
  assert.equal(recommendRun([cheap, accurate], { accuracy: 0, cost: 0 }).id, 'cheap');
  assert.equal(recommendRun([cheap, accurate], { accuracy: 1, cost: 1 }).id, 'accurate');
});
test('source diversity changes retrieval without changing the questions or expected sources', () => {
  const docs = documentsFromDataset(research); const questionSnapshot = JSON.stringify(research.cases);
  const candidates = candidateConfigs('rag', baseline);
  const previous = evaluateGuidedLab('rag', docs, research.cases, candidates[1].config, 'expanded');
  const diverse = evaluateGuidedLab('rag', docs, research.cases, candidates[2].config, 'diverse');
  assert.equal(previous.passed, 10); assert.equal(diverse.passed, 15); assert.equal(diverse.total, 16);
  assert.equal(JSON.stringify(research.cases), questionSnapshot);
  const hits = searchResearch(createChunks(docs, candidates[2].config), research.cases[2].input, candidates[2].config);
  for (const id of new Set(hits.map(hit => hit.sourceId))) assert.ok(hits.filter(hit => hit.sourceId === id).length <= 2);
});
test('historical paper records preserve denominators and expose only curated metadata', async () => {
  const data = JSON.parse(await readFile(path.join(root, 'public/evidence/research-history.v1.json'), 'utf8'));
  assert.equal(data.records.length, 72); assert.deepEqual(data.corpus, { attempted: 211, readable: 209, failed: 2 });
  assert.equal(data.categories['检索评测'], 13); assert.equal(data.categories['回答实验'], 8);
  assert.equal(data.categories['应用版本'], 11); assert.equal(data.categories['阅读记录'], 5);
  const comparable = data.records.filter(row => row.state === 'completed' && row.metrics.evaluatedCount === 37 && row.metrics.plannedCount === 37 && row.config.topK === 16);
  assert.equal(comparable.length, 7); assert.equal(new Set(comparable.map(row => row.metrics.corpusHash)).size, 1); assert.equal(new Set(comparable.map(row => row.metrics.datasetHash)).size, 1);
  assert.ok(data.records.some(row => row.state === 'failed')); assert.ok(data.records.every(row => /^[a-f0-9]{64}$/.test(row.sourceReceiptSha256)));
  assert.doesNotMatch(JSON.stringify(data), /\/Users\/|\/Volumes\/|sourceUri|originalPath|cleanedMarkdown|"input"|"question"|"text"|sessionId|apiKey/);
});
