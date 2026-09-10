import { labFlowSamples, type DemoDataset } from './lab-flow';
import type { LabKey } from './lab-evidence';

export type LabDocument = { id: string; name: string; title: string; text: string; pages: number; status: 'ready' | 'failed'; error?: string; record?: Record<string, string | number> };
export type LabQuestion = DemoDataset['cases'][number] & { expectedIds?: string[] };
export type LabConfig = {
  strategy: 'fixed' | 'paragraph'; size: number; overlap: number; normalize: boolean;
  topK: number; contextChars: number; titleWeight: number; sourceCap: number;
  constraints: boolean; minTenure: number; useSignals: boolean; multiple: boolean;
  durableOnly: boolean; changes: boolean; merge: boolean;
};
export type LabPreferences = { accuracy: number; cost: number };
export type LabRun = { id: string; name: string; config: LabConfig; signature: string; createdAt: string; total: number; passed: number; quality: number; contextChars: number; chunks: number; rows: { id: string; input: string; expected: string; actual: string; passed: boolean; detail: string; sourceIds: string[] }[] };
export const guidedScenarios: { key: LabKey; title: string; files: string; goal: string; result: string }[] = [
  { key: 'rag', title: '深度研究', files: '15 项入口 · 10 份有效正文 · 16 道题', goal: '以海岚交接研究助手为例，把资料做成可试用的研究应用，保留来源，并明确资料没有回答的内容。', result: '可追溯交接研究应用' },
  { key: 'cloudops', title: '云上故障诊断', files: '告警、日志与配置快照', goal: '根据观测定位责任组件，区分多重异常与证据不足。', result: '故障诊断应用' },
  { key: 'enterpriseops', title: '企业交付', files: '客户、负责人和交接要求', goal: '按地区、资格和容量完成客户交接，保留当前业务状态。', result: '客户交接应用' },
  { key: 'memory', title: '记忆整理', files: '输入记录与已有记忆', goal: '从已提交的输入中整理长期记忆，识别合并、纠正与撤销。', result: '记忆整理应用' },
];
export const journeySteps = ['资料与基线', '设定目标', '基线测评', '优化实验', '结果对比', '应用交付'];
export const diagnosisLabels: Record<string, string> = { gateway: '网关', database: '数据库', worker: '任务处理服务', discovery: '服务发现', storage: '存储', auth: '身份认证', search: '搜索服务', cdn: '内容分发', vendor: '外部服务', api: '业务 API', deploy: '发布流程', registry: '登记服务', multiple: '多个独立异常', unknown: '证据不足' };
export const defaultLabConfig: LabConfig = { strategy: 'fixed', size: 900, overlap: 120, normalize: true, topK: 4, contextChars: 6000, titleWeight: 1, sourceCap: 20, constraints: false, minTenure: 90, useSignals: false, multiple: false, durableOnly: false, changes: false, merge: false };

export function sampleDocuments(key: LabKey) {
  return documentsFromDataset(labFlowSamples[key]);
}
export function documentsFromDataset(dataset: DemoDataset) {
  return dataset.records.map((record): LabDocument => ({ id: String(record.id), name: String(record.sourceTitle || record.title || record.id) + (/\.(txt|md|json|pdf)$/i.test(String(record.sourceTitle)) ? '' : '.json'), title: String(record.title || record.customer || record.id), text: String(record.text || JSON.stringify(record, null, 2)), pages: 0, status: 'ready', record }));
}
export function validateLabConfig(config: LabConfig) {
  if (!['fixed', 'paragraph'].includes(config.strategy) || !Number.isInteger(config.size) || config.size < 200 || config.size > 8000 || !Number.isInteger(config.overlap) || config.overlap < 0 || config.overlap >= config.size) throw new Error('分片长度需为 200–8000 字符，重叠需小于分片长度。');
  if (!Number.isInteger(config.topK) || config.topK < 1 || config.topK > 20 || !Number.isFinite(config.contextChars) || config.contextChars < 500 || config.contextChars > 60000 || !Number.isFinite(config.titleWeight) || config.titleWeight < 0 || config.titleWeight > 8) throw new Error('请检查检索片段数、上下文长度和标题权重。');
  if (!Number.isFinite(config.minTenure) || config.minTenure < 0 || config.minTenure > 3650) throw new Error('任期要求需为 0–3650 天。');
  if (config.sourceCap !== undefined && (!Number.isInteger(config.sourceCap) || config.sourceCap < 1 || config.sourceCap > 20)) throw new Error('每份资料的片段上限需为 1–20。');
  return config;
}
export function labSignature(documents: LabDocument[], questions: LabQuestion[], config: LabConfig) {
  // Local identity only, never presented as a cryptographic provenance hash.
  const value = JSON.stringify([documents, questions, config]); let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
export function createChunks(documents: LabDocument[], config: LabConfig) {
  validateLabConfig(config);
  const chunks: { id: string; sourceId: string; title: string; text: string; start: number }[] = [];
  for (const doc of documents.filter(doc => doc.status === 'ready')) {
    const text = config.normalize ? doc.text.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : doc.text;
    let start = 0;
    while (start < text.length) {
      let end = Math.min(text.length, start + config.size);
      if (config.strategy === 'paragraph' && end < text.length) {
        const boundary = text.lastIndexOf('\n\n', end);
        if (boundary > start + config.size * .4) end = boundary + 2;
      }
      chunks.push({ id: `${doc.id}:${start}`, sourceId: doc.id, title: doc.title, text: text.slice(start, end), start });
      if (end === text.length) break;
      start = Math.max(start + 1, end - config.overlap);
    }
  }
  return chunks;
}
export function searchResearch(chunks: ReturnType<typeof createChunks>, input: string, config: LabConfig) {
  const tokens = (text: string) => [...new Set([...(text.toLowerCase().match(/[a-z0-9]{2,}/g) || []), ...(text.match(/[\u3400-\u9fff]+/g) || []).flatMap(word => word.length < 2 ? [word] : Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2)))])];
  const query = tokens(input); const frequency = new Map<string, number>();
  for (const token of query) frequency.set(token, chunks.filter(chunk => `${chunk.title} ${chunk.text}`.toLowerCase().includes(token)).length);
  const ranked = chunks.map(chunk => ({ ...chunk, score: query.reduce((sum, token) => sum + Math.log(1 + chunks.length / (1 + (frequency.get(token) || 0))) * (Number(chunk.text.toLowerCase().includes(token)) + config.titleWeight * Number(chunk.title.toLowerCase().includes(token))), 0) })).filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const selected = []; let length = 0; const sourceCounts = new Map<string, number>();
  for (const row of ranked) {
    if (selected.length === config.topK || length >= config.contextChars) break;
    const count = sourceCounts.get(row.sourceId) || 0;
    if (count >= (config.sourceCap ?? 20)) continue;
    const text = row.text.slice(0, config.contextChars - length); selected.push({ ...row, text }); length += text.length;
    sourceCounts.set(row.sourceId, count + 1);
  }
  return selected;
}
export function runBusinessCase(key: LabKey, documents: LabDocument[], input: string, config: LabConfig) {
  const records = documents.filter(doc => doc.status === 'ready').map(doc => doc.record).filter(Boolean) as Record<string, string | number>[];
  const row = records.find(row => row.id === input);
  if (!row) return { value: '未找到', detail: '没有对应的已导入记录。' };
  const parseArray = (value: string | number | undefined) => { try { const result = JSON.parse(String(value || '[]')); return Array.isArray(result) ? result : []; } catch { return []; } };
  if (key === 'enterpriseops') {
    const required = parseArray(row.requiredCertifications);
    const owners = parseArray(row.owners).filter(owner => owner.available && owner.activeLoad < owner.capacity && (!config.constraints || owner.region === row.region && owner.sectors?.includes(row.sector) && required.every(cert => owner.certifications?.includes(cert)))).sort((a,b) => a.activeLoad / a.capacity - b.activeLoad / b.capacity || String(a.id).localeCompare(String(b.id)));
    const allowed = row.role === 'manager' && Number(row.tenureDays) >= config.minTenure && (!config.constraints || !row.locked) && owners.length > 0;
    return { value: allowed ? '允许' : '拒绝', detail: allowed ? `负责人：${owners[0].name}；交接基于 revision ${row.revision}，保留在途工单与回访。` : '角色、任期、冻结或负责人约束未通过；保留原负责人。', ownerId: allowed ? String(owners[0].id) : '', ownerName: allowed ? String(owners[0].name) : '' };
  }
  if (key === 'cloudops') {
    const patterns: [RegExp, string][] = [[/retry_attempts|TLS certificate expired/, 'gateway'], [/pool_wait_timeout/, 'database'], [/consumers_active=0|batch_size=/, 'worker'], [/NXDOMAIN/, 'discovery'], [/quota_exceeded|AccessDenied/, 'storage'], [/token_not_yet_valid/, 'auth'], [/index_generation/, 'search'], [/cache_age/, 'cdn'], [/upstream_vendor_timeout/, 'vendor'], [/unknown_column/, 'api'], [/deploy_cancelled/, 'deploy'], [/registration_receipt_missing/, 'registry']];
    const matches = [...new Set(patterns.filter(([pattern]) => pattern.test(String(row.visibleSignal))).map(([, service]) => service))];
    const value = config.useSignals ? matches.length > 1 && config.multiple ? 'multiple' : matches[0] || 'unknown' : 'worker';
    return { value, detail: `观测：${row.visibleSignal}。配置：${row.configDiff}。${value === 'unknown' ? '证据不足，需要补充观测。' : value === 'multiple' ? '存在多条独立异常，分别核查。' : `排查 ${value}；核对配置变更与异常发生的先后。`}` };
  }
  const earlier = records.filter(item => item.projectScope === row.projectScope && String(item.time) < String(row.time) && item.concept === row.concept && item.phase === 'committed' && item.scope === 'durable');
  const value = config.durableOnly && (row.phase !== 'committed' || !row.consent || row.scope !== 'durable') ? '不保留' : config.changes && row.revokes ? '撤销' : config.changes && (row.corrects || row.intent === 'correction') ? '纠正' : config.merge && earlier.length ? '合并' : '保留';
  return { value, detail: `${row.text}\n来源：${row.sourceId || row.id} · ${row.projectScope || ''} · ${row.time || ''}\n处理：${value}${value === '合并' ? '，关联 ' + earlier.map(item => item.id).join('、') : ''}` };
}
export function evaluateGuidedLab(key: LabKey, documents: LabDocument[], questions: LabQuestion[], config: LabConfig, name: string): LabRun {
  validateLabConfig(config);
  if (!documents.some(doc => doc.status === 'ready') || !questions.length) throw new Error('先选择可读取的资料，并加入至少一道有预期结果的检查题。');
  const chunks = key === 'rag' ? createChunks(documents, config) : [];
  let contextChars = 0;
  const rows = questions.map(question => {
    if (key === 'rag') {
      const hits = searchResearch(chunks, question.input, config); const sourceIds = [...new Set(hits.map(hit => hit.sourceId))]; contextChars += hits.reduce((total, hit) => total + hit.text.length, 0);
      const expectedIds = question.expectedIds?.length ? question.expectedIds : [question.expected];
      return { id: question.id, input: question.input, expected: expectedIds.join(', '), actual: sourceIds.join(', ') || '未命中', passed: expectedIds.every(id => sourceIds.includes(id)), detail: hits.map(hit => `[${hit.title}]\n${hit.text}`).join('\n\n'), sourceIds };
    }
    const result = runBusinessCase(key, documents, question.input, config); contextChars += result.detail.length;
    return { id: question.id, input: question.input, expected: question.expected, actual: result.value, passed: result.value === question.expected, detail: result.detail, sourceIds: [question.input] };
  });
  const passed = rows.filter(row => row.passed).length;
  return { id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, config: { ...config }, signature: labSignature(documents, questions, config), createdAt: new Date().toISOString(), total: rows.length, passed, quality: passed / rows.length, contextChars: Math.round(contextChars / rows.length), chunks: chunks.length, rows };
}
export function candidateConfigs(key: LabKey, baseline: LabConfig) {
  if (key === 'rag') return [
    { name: '候选 A · 紧凑检索', config: { ...baseline, strategy: 'paragraph' as const, size: 600, overlap: 80, topK: 4, contextChars: 3000, titleWeight: 2 } },
    { name: '候选 B · 扩大证据', config: { ...baseline, strategy: 'paragraph' as const, size: 1200, overlap: 180, topK: 12, contextChars: 16000, titleWeight: 3 } },
    { name: '候选 C · 分散来源', config: { ...baseline, strategy: 'paragraph' as const, size: 1200, overlap: 180, topK: 12, contextChars: 16000, titleWeight: 3, sourceCap: 2 } },
  ];
  if (key === 'cloudops') return [{ name: '候选 A · 观测定位', config: { ...baseline, useSignals: true, multiple: false } }, { name: '候选 B · 多异常识别', config: { ...baseline, useSignals: true, multiple: true } }];
  if (key === 'enterpriseops') return [{ name: '候选 A · 完整约束', config: { ...baseline, constraints: true } }, ...(baseline.minTenure === 90 ? [] : [{ name: '候选 B · 统一任期', config: { ...baseline, constraints: true, minTenure: 90 } }])];
  return [{ name: '候选 A · 长期信息筛选', config: { ...baseline, durableOnly: true } }, { name: '候选 B · 关联与变更', config: { ...baseline, durableOnly: true, changes: true, merge: true } }];
}
export function recommendRun(runs: LabRun[], preferences: LabPreferences) {
  if (!runs.length) return undefined;
  const maxQuality = Math.max(...runs.map(run => run.quality));
  // Relative quality tolerance, not a fabricated quality gate or spending limit.
  const eligible = runs.filter(run => run.quality >= maxQuality - (1 - preferences.accuracy) * .15);
  const maxContext = Math.max(1, ...eligible.map(run => run.contextChars));
  return [...eligible].sort((a, b) => (b.quality - a.quality) * (.2 + preferences.accuracy * 4) - (b.contextChars - a.contextChars) / maxContext * (1 - preferences.cost) * .35 || b.passed - a.passed || a.contextChars - b.contextChars)[0];
}
