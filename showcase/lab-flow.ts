import sampleData from './datasets/lab-world.v2.json';
import type { LabKey } from './lab-evidence';

export type DemoDataset = { records: Record<string, string | number>[]; cases: { id: string; input: string; expected: string }[] };
export type DemoMode = 'baseline' | 'bounded';
export const demoModeLabels = { baseline: '简化基线', bounded: '完整规则与证据' };
export const labFlowSamples: Record<LabKey, DemoDataset> = sampleData;

export const labFlowRules: Record<LabKey, string> = {
  rag: '先按项目范围、生效日期、状态与可信度筛选，再按标题、关键词、中文片段和约束词排序。检查 Top-1 来源或资料不足；只验证离线检索，不生成模型答案。',
  enterpriseops: '核对管理角色、任期、冻结、地区、行业、认证及负责人剩余容量；提案携带 revision，在途工单和回访继续保留。只写入演示副本。',
  cloudops: '沿配置变更、日志和观测时间线提出责任层假设。区分单点、多重异常与证据不足；保存计划前保留回读条件，不执行生产命令。',
  memory: '区分已提交输入、草稿、组合态、临时与敏感信息；在同项目范围内保留、合并、纠正或撤销，并保留原始来源。',
};

/** Self-contained so the exported offline App uses the exact evaluated code. */
export function runLabDemo(key: string, records: Record<string, string | number>[], input: string, mode: DemoMode) {
  const record = records.find((row) => row.id === input);
  if (records[0]?.worldKind) {
    const parse = (value: string | number | undefined) => JSON.parse(String(value || '{}'));
    if (key === 'enterpriseops' && record) {
      const owners = parse(record.owners) as { id: string; name: string; available: boolean; region: string; sectors: string[]; certifications: string[]; activeLoad: number; capacity: number }[];
      const required = parse(record.requiredCertifications) as string[];
      const available = owners.filter(owner => owner.available && owner.activeLoad < owner.capacity && (mode === 'baseline' || owner.region === record.region && owner.sectors.includes(String(record.sector)) && required.every(cert => owner.certifications.includes(cert)))).sort((a,b) => a.activeLoad/a.capacity-b.activeLoad/b.capacity || a.id.localeCompare(b.id));
      const allowed = record.role === 'manager' && Number(record.tenureDays) >= 90 && (mode === 'baseline' || !record.locked) && available.length > 0;
      return { value: allowed ? '允许' : '拒绝', detail: allowed ? `候选负责人：${available.map(o=>o.name).join('、')}。当前 revision=${record.revision}；确认前需回读版本，在途工单与下次回访随交接保留。` : `不能生成交接：${record.locked ? '客户处于冻结窗口' : '没有同时满足地区、行业、认证和容量的负责人'}。原负责人保持不变。`, ownerId: allowed ? available[0].id : '', ownerName: allowed ? available[0].name : '' };
    }
    if (key === 'cloudops' && record) {
      const signal = String(record.visibleSignal); const diff = String(record.configDiff);
      const observations: [RegExp,string][] = [[/retry_attempts|TLS certificate expired/,'gateway'],[/pool_wait_timeout/,'database'],[/consumers_active=0|batch_size=/,'worker'],[/NXDOMAIN/,'discovery'],[/quota_exceeded|AccessDenied/,'storage'],[/token_not_yet_valid/,'auth'],[/index_generation/,'search'],[/cache_age/,'cdn'],[/upstream_vendor_timeout/,'vendor'],[/unknown_column/,'api'],[/deploy_cancelled/,'deploy'],[/registration_receipt_missing/,'registry']];
      const matches = [...new Set(observations.filter(([pattern])=>pattern.test(signal)).map(([,service])=>service))];
      const value = mode === 'baseline' ? 'worker' : matches.length > 1 ? 'multiple' : matches[0] || 'unknown';
      return { value, detail: `观测：${signal}。配置变更：${diff}。${value==='unknown' ? '证据不足，补充日志与配置快照。' : value==='multiple' ? '存在多条独立异常，需分别验证，不能强选单一根因。' : '这是由明确观测规则得到的排查假设；沿时间线检查变更先后，并回读恢复信号。'}不会执行生产命令。` };
    }
    if (key === 'memory' && record) {
      const earlier = records.filter(row=>row.projectScope===record.projectScope && String(row.time)<String(record.time) && row.concept===record.concept && row.phase==='committed' && row.scope==='durable');
      const value = mode==='baseline' ? '保留' : record.phase!=='committed' || !record.consent || record.scope!=='durable' ? '不保留' : record.revokes ? '撤销' : record.corrects || record.intent==='correction' ? '纠正' : earlier.length ? '合并' : '保留';
      return { value, detail: `${record.application} · ${record.time} · ${record.projectScope}\n${record.text}\n治理依据：phase=${record.phase}，consent=${record.consent}，retention=${record.scope}。${record.corrects ? '纠正来源 '+record.corrects : record.revokes ? '撤销来源 '+record.revokes : earlier.length ? '同范围同概念的已有来源 '+earlier.map(r=>r.id).join('、') : '保留独立来源' }；跨项目不可直接合并。` };
    }
  }
  if (key === 'rag') {
    const tokens = (text: string) => {
      const clean = text.toLowerCase();
      const values: string[] = [...(clean.match(/[a-z0-9]+/g) ?? [])];
      for (let index = 0; index < clean.length - 1; index++) {
        if (/[\u3400-\u9fff]{2}/.test(clean.slice(index, index + 2))) values.push(clean.slice(index, index + 2));
      }
      return [...new Set(values)];
    };
    let queryText = input; let scope = records[0]?.worldKind ? 'tenant:harbor' : ''; let asOf = '2026-09-07';
    if (records[0]?.worldKind && input.trim().startsWith('{')) { try { const queryInput=JSON.parse(input); queryText=String(queryInput.query||''); scope=String(queryInput.scope||''); asOf=String(queryInput.asOf||asOf); } catch { return {value:'未命中',detail:'查询格式无效。'}; } }
    const query = tokens(queryText);
    const eligible = records.filter(row => !row.worldKind || mode==='baseline' || row.status==='active' && String(row.effectiveAt)<=asOf && row.authority!=='untrusted' && row.access!=='restricted' && (!scope || row.scope===scope || row.scope==='global'));
    if (records[0]?.worldKind && mode==='bounded' && (
      /(?:其他|别的|跨)(?:公司|租户)/.test(queryText) && /身份|联系人|客户|邮箱|电话/.test(queryText)
      || /(?:具体价格|合同价格|合同.*价格|金额|报价)/.test(queryText) && !eligible.some(row=>/[0-9]+(?:元|万元|美元|USD|CNY)/.test(String(row.text)))
    )) return { value:'未命中',detail:'当前范围没有获准的具体记录。保留未知，不以通用制度代替客户身份或合同数据。' };
    const constraints = ['冻结','取消','撤销','纠正','过期','未知回执','连接池','域名解析'];
    const ranked = eligible.map((row, index) => ({ row, index, score: (row.worldKind ? constraints.filter(term=>queryText.includes(term)&&String(row.title).includes(term)).length*20 : 0) + query.reduce((sum, token) => sum + (1 + Math.log((records.length+1)/(1+records.filter(doc=>`${doc.title} ${doc.keywords} ${doc.text}`.toLowerCase().includes(token)).length))) * ((String(row.title??'').toLowerCase().includes(token)?4:0) + (String(row.keywords??'').toLowerCase().includes(token)?2:0) + (String(row.text??'').toLowerCase().includes(token)?1:0)), 0) }))
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
    dataMode: 'offline-rule-evaluation', providerCalls: 0, scope: dataset.records[0]?.worldKind ? '公开合成业务材料的离线规则检查；保留逐题失败，不代表模型或生产服务表现。' : labFlowRules[key] };
}
