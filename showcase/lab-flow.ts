import type { LabKey } from './lab-evidence';

export type DemoDataset = { records: Record<string, string | number>[]; cases: { id: string; input: string; expected: string }[] };
export type DemoMode = 'baseline' | 'bounded';
export const demoModeLabels = { baseline: '简化基线', bounded: '完整规则与证据' };
export const labFlowSamples: Record<LabKey, DemoDataset> = {
  rag: {
    records: [
      { id: 'refund', title: '退款政策', text: '退款申请应在收货后七天内提出，并保留订单编号。' },
      { id: 'access', title: '项目访问权限', text: '项目访问权限由项目负责人审批，离开项目时撤销。' },
      { id: 'invoice', title: '发票申请', text: '发票申请需提供订单编号、公司抬头和税号。' },
    ], cases: [
      { id: 'refund-case', input: '退款申请期限', expected: 'refund' },
      { id: 'access-case', input: '项目访问权限由谁审批', expected: 'access' },
      { id: 'invoice-case', input: '发票申请需要什么', expected: 'invoice' },
    ],
  },
  enterpriseops: {
    records: [
      { id: 'customer-a', region: 'CN', role: 'manager', tenureDays: 120 },
      { id: 'customer-b', region: 'EU', role: 'manager', tenureDays: 120 },
      { id: 'customer-c', region: 'CN', role: 'manager', tenureDays: 30 },
    ], cases: [
      { id: 'allowed', input: 'customer-a', expected: '允许' },
      { id: 'region', input: 'customer-b', expected: '拒绝' },
      { id: 'tenure', input: 'customer-c', expected: '拒绝' },
    ],
  },
  cloudops: {
    records: [
      { id: 'incident-a', latencyMs: 800, errorRate: 0.01, dbUtilization: 0.3 },
      { id: 'incident-b', latencyMs: 800, errorRate: 0.08, dbUtilization: 0.3 },
      { id: 'incident-c', latencyMs: 800, errorRate: 0.01, dbUtilization: 0.95 },
    ], cases: [
      { id: 'worker', input: 'incident-a', expected: 'worker' },
      { id: 'gateway', input: 'incident-b', expected: 'gateway' },
      { id: 'database', input: 'incident-c', expected: 'database' },
    ],
  },
  memory: {
    records: [
      { id: 'memory-a', text: '长期使用中文技术文档。', scope: 'durable' },
      { id: 'memory-b', text: '今天下午检查测试日志。', scope: 'temporary' },
      { id: 'memory-c', text: '项目采用文件作为工作事实源。', scope: 'durable' },
    ], cases: [
      { id: 'preference', input: 'memory-a', expected: '保留' },
      { id: 'temporary', input: 'memory-b', expected: '不保留' },
      { id: 'decision', input: 'memory-c', expected: '保留' },
    ],
  },
};

export const labFlowRules: Record<LabKey, string> = {
  rag: '按问题与文档的关键词及中文双字片段排序，核对 Top-1 来源 ID。只验证本地检索，不生成模型答案。',
  enterpriseops: '同时满足地区 CN、角色 manager、任期至少 90 天才允许操作。只判断本地样例，不写入外部业务系统。',
  cloudops: '错误率高于 5% 优先定位 gateway；否则数据库利用率高于 90% 定位 database；否则延迟高于 500ms 定位 worker。只验证示例诊断规则。',
  memory: '只保留 scope=durable 的记忆，临时事项不进入长期记忆。只处理导入的演示数据。',
};

/** Self-contained so the exported offline App uses the exact evaluated code. */
export function runLabDemo(key: string, records: Record<string, string | number>[], input: string, mode: DemoMode) {
  const record = records.find((row) => row.id === input);
  if (key === 'rag') {
    const tokens = (text: string) => {
      const clean = text.toLowerCase();
      const values: string[] = [...(clean.match(/[a-z0-9]+/g) ?? [])];
      for (let index = 0; index < clean.length - 1; index++) {
        if (/[\u3400-\u9fff]{2}/.test(clean.slice(index, index + 2))) values.push(clean.slice(index, index + 2));
      }
      return [...new Set(values)];
    };
    const query = tokens(input);
    const ranked = records.map((row, index) => ({ row, index, score: query.filter((token) => `${row.title ?? ''} ${row.text ?? ''}`.toLowerCase().includes(token)).length }))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    const chosen = mode === 'baseline' ? records[0] : ranked[0]?.score ? ranked[0].row : undefined;
    return { value: String(chosen?.id ?? '未命中'), detail: String(chosen?.text ?? '没有匹配资料，请检查输入。') };
  }
  if (!record) return { value: '未找到', detail: '输入必须对应一条已导入记录的 id。' };
  if (key === 'enterpriseops') {
    const allowed = record.role === 'manager' && (mode === 'baseline' || (record.region === 'CN' && Number(record.tenureDays) >= 90));
    return { value: allowed ? '允许' : '拒绝', detail: `地区 ${record.region} · 角色 ${record.role} · 任期 ${record.tenureDays} 天` };
  }
  if (key === 'cloudops') {
    const owner = mode !== 'baseline' && Number(record.errorRate) > .05 ? 'gateway'
      : mode !== 'baseline' && Number(record.dbUtilization) > .9 ? 'database' : Number(record.latencyMs) > 500 ? 'worker' : 'healthy';
    return { value: owner, detail: `延迟 ${record.latencyMs} ms · 错误率 ${record.errorRate} · 数据库利用率 ${record.dbUtilization}` };
  }
  return { value: mode === 'baseline' || record.scope === 'durable' ? '保留' : '不保留', detail: String(record.text ?? '') };
}

export function parseLabDemoDataset(texts: string[]): DemoDataset {
  const records: DemoDataset['records'] = []; const cases: DemoDataset['cases'] = [];
  for (const text of texts) {
    let data: unknown; try { data = JSON.parse(text); } catch { continue; }
    if (!data || typeof data !== 'object') continue;
    const item = data as Record<string, unknown>;
    if (Array.isArray(item.records)) records.push(...item.records as DemoDataset['records']);
    if (Array.isArray(item.cases)) cases.push(...item.cases as DemoDataset['cases']);
  }
  if (!records.length || !cases.length || records.length > 1000 || cases.length > 1000
      || !records.every((row) => row && typeof row === 'object' && typeof row.id === 'string' && row.id && Object.values(row).every((value) => typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)))
      || !cases.every((row) => row && typeof row === 'object' && ['id', 'input', 'expected'].every((key) => typeof row[key as keyof typeof row] === 'string' && row[key as keyof typeof row].length > 0))
      || new Set(records.map((row) => row.id)).size !== records.length || new Set(cases.map((row) => row.id)).size !== cases.length) {
    throw new Error('请导入包含 records 与 cases 的有效 JSON；每条记录和题目需有唯一 id，题目还需 input 与 expected。可先下载或导入本场景示例。');
  }
  return { records, cases };
}

export function evaluateLabDemo(key: LabKey, dataset: DemoDataset, mode: DemoMode) {
  const required: Record<LabKey, Record<string, 'string' | 'number'>> = {
    rag: { id: 'string', text: 'string' }, enterpriseops: { id: 'string', region: 'string', role: 'string', tenureDays: 'number' },
    cloudops: { id: 'string', latencyMs: 'number', errorRate: 'number', dbUtilization: 'number' }, memory: { id: 'string', text: 'string', scope: 'string' },
  };
  if (!dataset.records.every((row) => Object.entries(required[key]).every(([name, type]) => typeof row[name] === type))) {
    throw new Error(`记录字段与 ${key} 场景不一致，请参照本场景示例 JSON。`);
  }
  const rows = dataset.cases.map((item) => {
    const baseline = runLabDemo(key, dataset.records, item.input, 'baseline');
    const candidate = runLabDemo(key, dataset.records, item.input, mode);
    return { caseId: item.id, input: item.input, expected: item.expected, baseline: baseline.value === item.expected ? '通过' : '失败',
      actual: candidate.value, candidate: candidate.value === item.expected ? '通过' : '失败', detail: candidate.detail };
  });
  return { rows, total: rows.length, baselinePassed: rows.filter((row) => row.baseline === '通过').length,
    candidatePassed: rows.filter((row) => row.candidate === '通过').length, decision: rows.every((row) => row.candidate === '通过') ? 'keep' : 'reject',
    dataMode: 'offline-rule-evaluation', providerCalls: 0, scope: labFlowRules[key] };
}
