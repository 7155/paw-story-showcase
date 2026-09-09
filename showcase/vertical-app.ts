import { runLabDemo, type DemoDataset, type DemoMode } from './lab-flow';
import type { LabKey } from './lab-evidence';
import { runBusinessCase, type LabConfig } from './guided-lab';

export const verticalAppNames: Record<LabKey, { title: string; subtitle: string }> = {
  enterpriseops: { title: '客户交接工作台', subtitle: '核对权限与任期，执行交接，查看回执并撤销。' },
  rag: { title: '企业知识台', subtitle: '搜索制度与项目资料，阅读证据，保存有来源的答案。' },
  cloudops: { title: '事故诊断台', subtitle: '从观测指标定位责任层，核对时间线并记录处理方案。' },
  memory: { title: '记忆整理台', subtitle: '处理待整理记录，区分长期与临时信息，召回并检查来源。' },
};
const safeJson = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
const escapeText = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** The complete application source is serialized into the downloadable App. */
export function verticalAppDocument(key: LabKey, dataset: DemoDataset, mode: DemoMode, report: unknown, instanceId: string, config?: LabConfig) {
  const meta = verticalAppNames[key];
  const execution = config ? `const business=${runBusinessCase.toString()};const configuration=${safeJson(config)};const execute=(key,records,input)=>business(key,records.map(record=>({id:record.id,record,status:'ready'})),input,configuration);` : `const execute=${runLabDemo.toString()};`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeText(meta.title)}</title><style>${verticalStyle}</style></head><body data-app="${key}"><main id="app"><header class="app-header"><div><small>PAW / ${key.toUpperCase()}</small><h1>${meta.title}</h1><p>${meta.subtitle}</p></div><div class="app-actions"><button data-action="export-work">导出工作记录</button><button data-action="play">播放示例</button></div></header><div class="app-meta"><span>${dataset.records.length} 条记录</span><span>${dataset.cases.length} 个检查案例</span><span>公开示例 · 浏览器内执行</span><span id="storage-status">当前窗口</span></div><div id="workspace"></div>${config ? `<details class="export-configuration"><summary>本轮采用的参数与检查结果</summary><pre>${escapeText(JSON.stringify({config,report},null,2))}</pre></details>` : ''}<p id="notice" role="status" aria-live="polite"></p><footer>业务写入只作用于演示副本。知识台执行本地检索与原文摘录，诊断台执行明确规则；不调用模型、生产业务系统或个人记忆。</footer></main><script>${execution}const records=${safeJson(dataset.records)};const cases=${safeJson(dataset.cases)};const mode=${safeJson(mode)};const key=${safeJson(key)};const start=${mountVerticalApp.toString()};start({execute,records,cases,mode,key,report:${safeJson(report)},instanceId:${safeJson(instanceId)},config:${safeJson(config ?? null)}});</script></body></html>`;
}

type VerticalContext = { execute: typeof runLabDemo; records: DemoDataset['records']; cases: DemoDataset['cases']; mode: DemoMode; key: LabKey; report: unknown; instanceId: string; config?: LabConfig };
function mountVerticalApp(ctx: VerticalContext) {
  type Row = Record<string, string | number>;
  type Action = { kind: string; id: string; before: unknown; at: string; detail: string };
  type AssignmentReceipt = { ownerId: string; ownerName: string; previousRevision: number; revision: number; operationId: string };
  type State = { assignmentRevisions: Record<string, number>; assignmentReceipts: Record<string, AssignmentReceipt>; ownerLoadDelta: Record<string, number>; blockedMemorySources: Record<string, string>; assignments: Record<string, string>; tickets: Record<string, string>; memories: Record<string, Row>; answers: { query: string; id: string; text: string }[]; actions: Action[] };
  const { records, cases, key, mode, execute, instanceId } = ctx;
  const minimumTenure = ctx.config?.minTenure ?? 90;
  const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;
  const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  const humanQuery = (input: string) => { try { return String(JSON.parse(input).query || input); } catch { return input; } };
  const label = (row: Row) => String(row.title ?? row.customer ?? row.id);
  const fresh = (): State => ({ assignments: {}, assignmentRevisions: {}, assignmentReceipts: {}, ownerLoadDelta: {}, blockedMemorySources: {}, tickets: {}, memories: {}, answers: [], actions: [] });
  const storageKey = `paw.vertical-work.v1:${instanceId}`;
  let persistent = false;
  let state = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object' && saved.assignments && saved.tickets && saved.memories && Array.isArray(saved.answers) && Array.isArray(saved.actions)) state = { ...fresh(), ...saved };
    localStorage.setItem(storageKey, JSON.stringify(state)); persistent = true;
  } catch { /* Opaque preview frames have no storage. Export remains available. */ }
  const revision = (row: Row) => state.assignmentRevisions[String(row.id)] ?? Number(row.revision || 1);
  const effectiveRecords = () => key !== 'enterpriseops' ? records : records.map(row => !row.worldKind ? row : {
    ...row, revision: revision(row), owners: JSON.stringify(JSON.parse(String(row.owners)).map((owner: {id:string;activeLoad:number}) => ({...owner, activeLoad: owner.activeLoad + (state.ownerLoadDelta[owner.id] || 0)}))),
  });
  const result = (id: string): ReturnType<typeof execute> => {
    if (key === 'enterpriseops' && state.assignmentReceipts[id]) {
      const receipt = state.assignmentReceipts[id];
      return {value:'已交接', detail:`已回读负责人 ${receipt.ownerName}，revision=${receipt.revision}。再次点击不会重复交接；可撤销本次操作。`,ownerId:receipt.ownerId,ownerName:receipt.ownerName};
    }
    if (key === 'memory' && state.blockedMemorySources[id]) return {value:'不保留',detail:`本来源已由 ${state.blockedMemorySources[id]} 撤销或替代。重放旧来源不会重新入库；撤销对应整理操作可以恢复。`};
    return execute(key, effectiveRecords(), id, mode);
  };
  let shownProposal: {id:string;revision:number;ownerId:string} | undefined;
  $('#storage-status').textContent = persistent ? '结果保存在此浏览器' : '结果保留在当前窗口，可导出';
  let selected = '';
  let view = 'inbox';
  let query = '';
  let searchScope = 'tenant:harbor';
  let queryResult: ReturnType<typeof execute> | null = null;
  let sourceOpen = '';
  let diagnosis = '';
  let lastAction = '';
  const save = () => { try { if (persistent) localStorage.setItem(storageKey, JSON.stringify(state)); } catch { persistent = false; $('#storage-status').textContent = '保存失败，请导出工作记录'; } };
  const notify = (text: string) => { $('#notice').textContent = text; };
  const download = (name: string, text: string, mime = 'application/json') => {
    const href = URL.createObjectURL(new Blob([text], { type: mime })); const a = document.createElement('a'); a.href = href; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(href), 10000);
    notify('已触发导出，请检查浏览器下载结果。');
  };
  const origin = (row: Row) => row.origin === 'public-design-summary' ? '项目设计摘要 · 已改写' : '公开合成样例';
  const source = (row: Row) => `<section class="source" aria-label="原始来源"><small>${origin(row)}</small><h3>${escape(row.sourceTitle || row.title || '示例来源')}</h3><p>${escape(row.text || label(row))}</p>${row.tickets ? `<h3>在途工单与下一次回访</h3><p>${escape(row.nextFollowUp)}</p><pre>${escape(JSON.stringify(JSON.parse(String(row.tickets)),null,2))}</pre>` : ''}${row.configDiff ? `<h3>只读配置变更</h3><pre>${escape(row.configDiff)}</pre><h3>关联日志</h3><pre>${escape(row.logs)}</pre>` : ''}${row.projectScope ? `<p>范围：${escape(row.projectScope)} · 阶段：${escape(row.phase)}</p>` : ''}<code>${escape(row.sourceId || row.id)}</code></section>`;
  const selectedRecord = () => records.find(row => row.id === selected);
  const check = (ok: boolean, name: string, detail: string) => `<li><span class="badge ${ok ? 'ok' : 'no'}">${ok ? '通过' : '不满足'}</span><div><strong>${name}</strong><p>${escape(detail)}</p></div></li>`;
  const empty = (text: string) => `<div class="empty"><h2>${text}</h2><p>左侧保留完整记录，选择后查看依据与可执行操作。</p></div>`;
  const list = (rows: Row[], action = 'select-record') => `<aside class="record-list" aria-label="记录列表">${rows.map(row => `<button data-action="${action}" data-record="${escape(row.id)}" aria-pressed="${selected === row.id}"><strong>${escape(label(row))}</strong><span>${escape(key === 'cloudops' ? `${row.severity} · ${row.cluster}` : key === 'memory' ? `${row.topicTitle || '待整理'} · ${row.scope}` : `${row.region} · ${row.role} · ${row.tenureDays} 天`)}</span></button>`).join('')}</aside>`;
  const recentActions = () => `<section class="activity"><h3>操作回执</h3>${state.actions.length ? `<ol>${state.actions.slice(-6).reverse().map(action => `<li><strong>${escape(action.detail)}</strong><span>${escape(action.id)} · ${escape(action.at)}</span></li>`).join('')}</ol>` : '<p>执行操作后显示前后变化和时间。</p>'}</section>`;
  function render() {
    const row = selectedRecord();
    if (key === 'enterpriseops') {
      shownProposal = row ? {id:String(row.id),revision:revision(row),ownerId:String(result(selected).ownerId || '')} : undefined;
      $('#workspace').innerHTML = `<div class="workspace">${list(records)}<section class="detail">${row ? `<header class="detail-title"><small>客户负责人变更</small><h2>${escape(row.customer || row.id)}</h2><span class="badge ${result(selected).value === '允许' ? 'ok' : 'no'}">${result(selected).value}</span></header><div class="handover"><div><small>当前负责人</small><strong data-current-owner>${escape(state.assignments[selected] || row.currentOwner || '原负责人')}</strong></div><span>${state.assignmentReceipts[selected] ? '✓' : '→'}</span><div><small>${state.assignmentReceipts[selected] ? '已确认版本' : '拟交接给'}</small><strong>${state.assignmentReceipts[selected] ? `revision ${revision(row)}` : escape(result(selected).ownerName || row.candidateOwner || row.id)}</strong></div></div><h3>交接条件</h3><ul class="checks">${row.worldKind ? check(['允许','已交接'].includes(result(selected).value), '地区、行业、认证与容量', result(selected).detail) + check(!row.locked, '冻结与版本', `冻结=${row.locked} / revision=${revision(row)}`) : check(row.region === 'CN', '地区一致', `目标地区 CN / 当前 ${row.region}`)}${check(row.role === 'manager', '角色匹配', `需要 manager / 当前 ${row.role}`)}${check(Number(row.tenureDays) >= minimumTenure, '任期要求', `至少 ${minimumTenure} 天 / 当前 ${row.tenureDays} 天`)}</ul><div class="action-row"><button class="primary" data-action="apply-assignment" ${result(selected).value === '允许' ? '' : 'disabled'}>执行交接</button><button data-action="undo" ${state.actions.length ? '' : 'disabled'}>撤销最近操作</button></div><p class="muted">更新当前演示中的负责人；条件不满足时不会写入。</p>${source(row)}${recentActions()}` : empty('选择一条客户交接请求')}</section></div>`;
    } else if (key === 'rag') {
      const found = queryResult && records.find(item => item.id === queryResult!.value);
      const docs = query ? records.filter(item => `${item.title} ${item.text} ${item.category}`.includes(query)) : records;
      $('#workspace').innerHTML = `<form id="query-form" class="search"><label for="query">从资料中寻找答案</label>${records[0]?.worldKind ? `<label for="search-scope">查询范围</label><select id="search-scope">${[...new Set(records.map(row=>String(row.scope)))].map(scope=>`<option value="${escape(scope)}" ${scope===searchScope?'selected':''}>${escape(scope)}</option>`).join('')}</select>` : ''}<div><input id="query" aria-label="问题或记录 ID" placeholder="例如：项目访问权限由谁审批" value="${escape(query)}" required><button class="primary">搜索资料</button></div></form><nav class="examples" aria-label="示例问题">${cases.slice(0,6).map(item => `<button data-action="example" data-example="${escape(item.id)}">${escape(humanQuery(item.input))}</button>`).join('')}${cases.length>6 ? `<details><summary>更多问题（${cases.length-6}）</summary><div>${cases.slice(6).map(item=>`<button data-action="example" data-example="${escape(item.id)}">${escape(humanQuery(item.input))}</button>`).join('')}</div></details>` : ''}</nav><div class="knowledge-layout"><section class="answer" aria-live="polite"><small>原文回答</small><h2 id="result">${queryResult ? found ? escape(found.title) : '没有找到支持材料' : '每项回答，都能回到来源'}</h2><p id="detail">${queryResult ? escape(queryResult.detail) : '这里执行本地检索并展示来源原文，不生成未经证据支持的模型回答。'}</p>${found ? `<div class="action-row"><button data-action="open-source" data-open-source="${escape(found.id)}">查看来源 ${escape(found.id)}</button><button data-action="save-answer">保存答案</button><button data-action="export-answer">导出答案</button></div>${sourceOpen === found.id ? source(found) : ''}` : ''}<section class="activity"><h3>已保存的答案 <span>${state.answers.length}</span></h3>${state.answers.slice(-5).reverse().map(item => `<p><strong>${escape(item.query)}</strong><br>${escape(item.text)} <code>[${escape(item.id)}]</code></p>`).join('') || '<p>保存后可以继续核对和导出。</p>'}</section></section><aside class="document-library"><h3>资料库 <span>${records.length}</span></h3>${(docs.length ? docs : records).map(item => `<button data-action="browse-source" data-open-source="${escape(item.id)}"><strong>${escape(item.title)}</strong><span>${escape(item.worldKind ? `${item.scope} · v${item.version} · ${item.status} · ${item.effectiveAt}` : item.category || '资料')} · ${origin(item)}</span></button>`).join('')}</aside></div>`;
    } else if (key === 'cloudops') {
      const hasDiagnosis = diagnosis === selected;
      const ownerLabels: Record<string,string> = { gateway: '网关层', database: '数据库层', worker: '工作进程', healthy: '当前无异常规则命中', discovery: '服务发现', storage: '存储', auth: '身份认证', search: '搜索服务', cdn: '内容分发', vendor: '外部服务', api: '业务 API', deploy: '发布流程', registry: '登记服务', multiple: '多个独立异常', unknown: '证据不足' };
      $('#workspace').innerHTML = `<div class="workspace">${list(records)}<section class="detail">${row ? `<header class="detail-title"><small>${escape(row.cluster)} / ${escape(row.id)}</small><h2>${escape(row.title)}</h2><span class="badge">${escape(row.severity)}</span></header><div class="metrics"><div><small>请求延迟</small><strong>${row.latencyMs}<em>ms</em></strong></div><div><small>错误率</small><strong>${(Number(row.errorRate)*100).toFixed(1)}<em>%</em></strong></div><div><small>数据库利用率</small><strong>${Math.round(Number(row.dbUtilization)*100)}<em>%</em></strong></div></div><h3>观测时间线</h3><ol class="timeline">${String(row.timeline || '已导入指标快照').split(/[；\n]/).map(item => `<li>${escape(item)}</li>`).join('')}</ol><button class="primary" data-action="diagnose">运行分层诊断</button>${hasDiagnosis ? `<section class="diagnosis" aria-live="polite"><small>当前规则的结论</small><h2>${escape(ownerLabels[result(selected).value] || result(selected).value)}</h2><p>${escape(result(selected).detail)}</p><p>${row.worldKind ? escape(String(row.visibleSignal)+' / '+String(row.configDiff)) : ''}</p>${row.worldKind ? `<section class="source"><h3>配置与证据</h3><pre>${escape(row.configDiff)}</pre><p>${escape(row.logs)}</p></section>` : `<ul class="checks">${check(Number(row.errorRate) > .05, '网关检查', '错误率高于 5% 时优先定位网关层。')}${check(Number(row.dbUtilization) > .9, '数据库检查', '网关未命中时，检查数据库利用率是否高于 90%。')}${check(Number(row.latencyMs) > 500, '工作进程检查', '前两层未命中时，检查延迟是否高于 500 ms。')}</ul>`}<label for="plan">处理计划</label><textarea id="plan">${escape(state.tickets[selected] || `核对${escape(ownerLabels[result(selected).value] || result(selected).value)}的日志、近期变更与观测窗口；先验证根因，再决定修复操作。`)}</textarea><div class="action-row"><button data-action="save-ticket">保存处理计划</button><button data-action="export-diagnosis">导出诊断记录</button></div>${state.tickets[selected] ? '<p class="saved">处理计划已记录，未执行生产修复。</p>' : ''}</section>` : ''}` : empty('选择一条服务观测')}</section></div>`;
    } else {
      const candidates = view === 'library' ? Object.values(state.memories) : records;
      $('#workspace').innerHTML = `<nav class="tabs" aria-label="记忆工作区"><button data-action="memory-view" data-nav="inbox" aria-pressed="${view === 'inbox'}">待整理记录 <span>${records.length}</span></button><button data-action="memory-view" data-nav="library" aria-pressed="${view === 'library'}">长期记忆 <span>${Object.keys(state.memories).length}</span></button></nav>${view === 'library' ? '<form id="memory-search" class="search"><label for="memory-query">召回长期记忆</label><div><input id="memory-query" placeholder="输入关键词，例如 来源、Session、回滚"><button>查找记忆</button></div></form>' : ''}<div class="workspace">${list(query && view === 'library' ? candidates.filter(item => `${item.title} ${item.text}`.includes(query)) : candidates)}<section class="detail">${row ? `<header class="detail-title"><small>${escape(row.topicTitle || row.topic || '示例记录')}</small><h2>${escape(row.title || row.id)}</h2><span class="badge ${row.scope === 'durable' ? 'ok' : 'no'}">${escape(row.scope)}</span></header><p class="memory-text">${escape(row.text)}</p><section class="decision"><small>整理建议</small><h3>${escape(result(selected).value)}</h3><p>${escape(result(selected).detail)}</p><p>${row.scope === 'durable' ? '本条属于稳定偏好、已接受决定或可复用约束。' : row.scope === 'superseded' ? '本条已被新决定替代，保留在来源中供核对。' : row.scope === 'sensitive' ? '本条为已移除敏感字段的占位样例，不写入长期记忆。' : '一次性事项留在当前任务，不作为长期偏好。'}</p><div class="action-row"><button class="primary" data-action="accept-memory">应用整理决定</button><button data-action="show-memory-source">核对来源</button><button data-action="undo" ${state.actions.length ? '' : 'disabled'}>撤销最近操作</button></div>${state.memories[selected] ? '<p class="saved">已写入长期记忆，可切换到长期记忆检索。</p>' : ''}</section>${sourceOpen === selected ? source(row) : ''}${recentActions()}` : empty(view === 'library' ? '选择一条已整理记忆' : '选择一条输入记录')}</section></div>`;
    }
  }
  function action(kind: string, id: string, before: unknown, detail: string) {
    state.actions.push({ kind, id, before, at: new Date().toISOString(), detail }); lastAction = kind; save();
  }
  function search(input: string) { if(input.trim().startsWith('{')) { try { searchScope=String(JSON.parse(input).scope||searchScope); } catch { /* kernel reports invalid query */ } } query = humanQuery(input.trim()); queryResult = execute('rag', records, records[0]?.worldKind && !input.trim().startsWith('{') ? JSON.stringify({query:input,scope:searchScope,asOf:'2026-09-07'}) : input, mode); sourceOpen = ''; render(); }
  document.addEventListener('submit', event => {
    if ((event.target as HTMLElement).id === 'query-form') { event.preventDefault(); searchScope=(document.getElementById('search-scope') as HTMLSelectElement | null)?.value || searchScope; search((document.getElementById('query') as HTMLInputElement).value); }
    if ((event.target as HTMLElement).id === 'memory-search') { event.preventDefault(); query = (document.getElementById('memory-query') as HTMLInputElement).value.trim(); render(); }
  });
  document.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]'); if (!button || button.disabled) return;
    const name = button.dataset.action; const row = selectedRecord();
    if (name === 'select-record') { selected = button.dataset.record || ''; sourceOpen = ''; render(); }
    if (name === 'example') { const item = cases.find(item => item.id === button.dataset.example); if (item) search(item.input); }
    if (name === 'open-source') { sourceOpen = button.dataset.openSource || ''; render(); }
    if (name === 'browse-source') { const item = records.find(item => item.id === button.dataset.openSource); if (item) { query = ''; queryResult = { value: String(item.id), detail: String(item.text) }; sourceOpen = String(item.id); render(); } }
    if (name === 'save-answer' && queryResult && records.some(item => item.id === queryResult!.value)) {
      if (!state.answers.some(item => item.query === query && item.id === queryResult!.value)) state.answers.push({ query, id: queryResult.value, text: queryResult.detail });
      save(); lastAction = 'save-answer'; render(); notify('答案与来源已保存到当前工作记录。');
    }
    if (name === 'export-answer' && queryResult) download('answer.md', `# ${query || '来源摘录'}\n\n${queryResult.detail}\n\n来源：${queryResult.value}\n`, 'text/markdown');
    if (name === 'apply-assignment' && row) {
      // Re-read shared local state before accepting the exact proposal currently shown.
      const proposal = shownProposal;
      try { const saved = persistent && JSON.parse(localStorage.getItem(storageKey) || 'null'); if (saved?.assignments && saved?.memories && Array.isArray(saved.actions)) state = {...fresh(),...saved}; } catch { /* The current window remains recoverable by export. */ }
      if (state.assignmentReceipts[selected]) { render(); notify('本次交接已经完成，已回读当前负责人；未重复写入。'); return; }
      if (!proposal || proposal.id !== selected || proposal.revision !== revision(row)) { render(); notify('客户版本已变化，已回读当前版本，请重新核对交接。'); return; }
      const decision = result(selected);
      if (decision.value !== '允许' || String(decision.ownerId || '') !== proposal.ownerId) { render(); notify('候选负责人或剩余容量已变化，请重新核对。'); return; }
      const before = {assignments:{...state.assignments},assignmentRevisions:{...state.assignmentRevisions},assignmentReceipts:{...state.assignmentReceipts},ownerLoadDelta:{...state.ownerLoadDelta}};
      const ownerId = String(decision.ownerId || row.candidateOwner || row.id);
      const ownerName = String(decision.ownerName || row.candidateOwner || row.id);
      state.assignments[selected] = ownerName;
      state.assignmentRevisions[selected] = proposal.revision + 1;
      state.ownerLoadDelta[ownerId] = (state.ownerLoadDelta[ownerId] || 0) + 1;
      state.assignmentReceipts[selected] = {ownerId,ownerName,previousRevision:proposal.revision,revision:proposal.revision+1,operationId:`${instanceId}:${selected}:r${proposal.revision}:${ownerId}`};
      action('assignment', selected, before, `负责人：${before.assignments[selected] || row.currentOwner || '原负责人'} → ${ownerName}；revision ${proposal.revision} → ${proposal.revision+1}；工单与回访保留`);
      render(); notify(`交接已写入并回读当前演示副本，revision=${proposal.revision+1}。`);
    }
    if (name === 'diagnose' && row) { diagnosis = selected; render(); notify('已按当前观测完成规则诊断。'); }
    if (name === 'save-ticket' && row && diagnosis === selected) { const plan = (document.getElementById('plan') as HTMLTextAreaElement).value.trim(); if (plan) { const before = state.tickets[selected] ?? null; state.tickets[selected] = plan; action('ticket', selected, before, '保存处理计划，未执行生产修复'); render(); notify('处理计划已保存。'); } }
    if (name === 'export-diagnosis' && row) download(`${selected}-diagnosis.json`, JSON.stringify({ observation: row, diagnosis: result(selected), plan: state.tickets[selected] || '', productionRepair: false }, null, 2));
    if (name === 'memory-view') { view = button.dataset.nav || 'inbox'; query = ''; render(); }
    if (name === 'accept-memory' && row) {
      if (state.blockedMemorySources[selected]) { notify('本来源已撤销或被纠正，未重新写入。可撤销对应整理操作恢复。'); return; }
      const before = {memories:JSON.parse(JSON.stringify(state.memories)),blockedMemorySources:{...state.blockedMemorySources}};
      const decision = result(selected).value;
      const retire = (sourceId:string) => {
        state.blockedMemorySources[sourceId] = selected;
        for(const [id,memory] of Object.entries(state.memories)) {
          const ids = String(memory.sourceIds || memory.sourceId || memory.id).split('、');
          if(!ids.includes(sourceId) && id!==sourceId) continue;
          const remaining=ids.filter(id=>!state.blockedMemorySources[id]);
          const current=records.filter(item=>remaining.includes(String(item.sourceId||item.id))).sort((a,b)=>String(b.time).localeCompare(String(a.time)))[0];
          delete state.memories[id];
          if(current) state.memories[String(current.id)]={...current,sourceIds:remaining.join('、')};
        }
      };
      if (decision === '撤销') retire(String(row.revokes));
      else if (['保留','纠正','合并'].includes(decision)) {
        if(decision==='纠正' && row.corrects) retire(String(row.corrects));
        const existing = decision==='合并' ? Object.values(state.memories).find(item=>item.projectScope===row.projectScope && item.concept===row.concept) : undefined;
        const targetId=String(existing?.id||selected);
        state.memories[targetId] = {...row,id:targetId,sourceIds:[...new Set([existing?.sourceIds||existing?.sourceId,row.sourceId].filter(Boolean).flatMap(value=>String(value).split('、')))].join('、')};
      } else delete state.memories[selected];
      action('memory-collection', selected, before, `${row.title || row.id}：${decision}`); render(); notify(`已应用「${decision}」，来源记录保留，可撤销本次变更。`);
    }
    if (name === 'show-memory-source') { sourceOpen = selected; render(); }
    if (name === 'undo') {
      const previous = state.actions.pop();
      if (previous?.kind==='memory-collection') {
        const before=previous.before as {memories?:State['memories'];blockedMemorySources?:State['blockedMemorySources']};
        if(before.memories && before.blockedMemorySources) {state.memories=before.memories;state.blockedMemorySources=before.blockedMemorySources;} else state.memories=previous.before as State['memories'];
        lastAction='undo'; save(); render(); notify('记忆集合与撤销状态已恢复到操作前。'); return;
      }
      if(previous?.kind==='assignment' && previous.before && typeof previous.before==='object' && 'assignments' in previous.before) {
        Object.assign(state,previous.before);lastAction='undo';save();render();notify('负责人、容量与客户版本已恢复到交接前。');return;
      }
      if (previous) { const collection = previous.kind === 'assignment' ? state.assignments : previous.kind === 'ticket' ? state.tickets : state.memories;
        if (previous.before === null) delete collection[previous.id]; else (collection as Record<string,unknown>)[previous.id] = previous.before;
        lastAction = 'undo'; save(); render(); notify('最近操作已撤销，当前副本已恢复到操作前。'); }
    }
    if (name === 'export-work') download(`${key}-work.json`, JSON.stringify({ schemaVersion: 'paw.vertical-work.v1', key, state, records, evaluation: ctx.report }, null, 2));
    if (name === 'play') { if (step >= steps.length) { step = 0; attempted = false; lastAction = ''; } active = !active; due = Date.now() + 1800; button.textContent = active ? '暂停示例' : '播放示例'; }
  });
  render();

  // The cursor uses the same controls and rendered results as a person.
  const sample = key === 'enterpriseops' ? records.find(row => result(String(row.id)).value === '允许') : key === 'cloudops' ? records.find(row => Number(row.errorRate) > .05) : records.find(row => row.scope === 'durable');
  const sampleId = String(sample?.id || records[0]?.id || '');
  const firstCase = cases[0];
  type Step = { label: string; instruction: string; selector: string; after: () => boolean };
  const steps: Step[] = key === 'rag' ? [
    { label: '提出问题', instruction: '搜索一个业务问题。', selector: `[data-example="${firstCase?.id}"]`, after: () => query === humanQuery(firstCase?.input || '') && !!queryResult },
    { label: '核对来源', instruction: '打开命中文档，核对原文。', selector: '[data-action="open-source"]', after: () => !!sourceOpen },
    { label: '保存答案', instruction: '保存答案及其来源引用。', selector: '[data-action="save-answer"]', after: () => lastAction === 'save-answer' },
  ] : key === 'enterpriseops' ? [
    { label: '选择请求', instruction: '选择一条客户交接请求。', selector: `[data-record="${sampleId}"]`, after: () => selected === sampleId },
    { label: '执行交接', instruction: '核对三项条件，执行交接。', selector: '[data-action="apply-assignment"]', after: () => lastAction === 'assignment' },
    { label: '撤销操作', instruction: '撤销刚才的交接，检查恢复结果。', selector: '[data-action="undo"]', after: () => lastAction === 'undo' },
  ] : key === 'cloudops' ? [
    { label: '选择观测', instruction: '选择一条服务观测。', selector: `[data-record="${sampleId}"]`, after: () => selected === sampleId },
    { label: '运行诊断', instruction: '按网关、数据库和工作进程的顺序检查。', selector: '[data-action="diagnose"]', after: () => diagnosis === sampleId },
    { label: '记录计划', instruction: '保存处理计划，保留诊断依据。', selector: '[data-action="save-ticket"]', after: () => lastAction === 'ticket' },
  ] : [
    { label: '选择记录', instruction: '选择一条待整理记录。', selector: `[data-record="${sampleId}"]`, after: () => selected === sampleId },
    { label: '整理记忆', instruction: '应用整理决定，保留来源。', selector: '[data-action="accept-memory"]', after: () => lastAction === 'memory-collection' },
    { label: '召回结果', instruction: '打开长期记忆，检查整理结果。', selector: '[data-nav="library"]', after: () => view === 'library' },
    { label: '检查来源', instruction: '核对这条记忆的来源。', selector: '[data-action="show-memory-source"]', after: () => sourceOpen === sampleId },
  ];
  let step = 0; let attempted = false; let active = false; let due = Date.now() + 2600;
  const cursor = document.createElement('div'); cursor.className = 'demo-pointer'; cursor.hidden = true;
  cursor.innerHTML = '<svg viewBox="0 0 28 32" width="28" height="32"><path d="M2 1.5v22l5.7-5.5 4.7 10.4 4.3-2-4.8-10.2H21Z" fill="#171a21" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  cursor.setAttribute('aria-hidden','true'); document.body.appendChild(cursor);
  document.addEventListener('click', event => { const target = steps[step] && document.querySelector(steps[step].selector); if (target?.contains(event.target as Node)) attempted = true; }, true);
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.channel !== 'paw.hands-on-control' || event.data.instanceId !== instanceId) return;
    const playButton = document.querySelector<HTMLButtonElement>('[data-action="play"]'); if (playButton) playButton.hidden = true;
    if (active !== (event.data.playing === true)) due = Date.now() + 2600;
    active = event.data.playing === true;
  });
  const timer = window.setInterval(() => {
    if (attempted && steps[step]?.after()) { step++; attempted = false; due = Date.now() + 2600; }
    const target = steps[step] && document.querySelector<HTMLButtonElement>(steps[step].selector);
    const complete = step >= steps.length;
    window.parent.postMessage({ channel: 'paw.hands-on', version: 1, instanceId, labels: steps.map(row => row.label), step: Math.min(step+1,steps.length), total: steps.length, instruction: complete ? '本应用的示例流程已完成，可以继续操作其他记录。' : steps[step].instruction, found: !!target && !target.disabled, complete }, '*');
    cursor.hidden = !active || !target || target.disabled || complete || document.hidden;
    document.querySelectorAll('[data-guided]').forEach(node => node.removeAttribute('data-guided'));
    if (!cursor.hidden && target) {
      target.setAttribute('data-guided','true');
      for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
        const item = target.getBoundingClientRect(); const bounds = parent.getBoundingClientRect();
        if (item.top < bounds.top) parent.scrollTop -= bounds.top-item.top;
        else if (item.bottom > bounds.bottom) parent.scrollTop += item.bottom-bounds.bottom;
      }
      const before = target.getBoundingClientRect();
      if (before.top < 12 || before.bottom > innerHeight-20) window.scrollTo(0, window.scrollY + before.top - innerHeight*.45);
      const box = target.getBoundingClientRect(); cursor.style.left = `${box.left+box.width/2}px`; cursor.style.top = `${box.top+box.height/2}px`;
      if (!attempted && Date.now() >= due) { target.click(); due = Date.now() + 2600; }
    }
  }, 200);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}

const verticalStyle = `*{box-sizing:border-box}body{margin:0;color:#202632;background:#f7f8fb;font:14px/1.65 system-ui,-apple-system,BlinkMacSystemFont,sans-serif}button,input,textarea{font:inherit}button{cursor:pointer;border:1px solid #dce1e9;background:#fff;color:inherit;border-radius:6px;padding:8px 12px}button:disabled{opacity:.4;cursor:not-allowed}button:hover:not(:disabled){border-color:#7b70b8;background:#f7f5fd}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #6554b5;outline-offset:3px}.primary{background:#5143ae;color:#fff;border-color:#5143ae}.primary:hover:not(:disabled){background:#453895;color:#fff}.export-configuration{margin:18px 0;font-size:12px}.export-configuration pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.7 ui-monospace,monospace}main{max-width:1400px;margin:0 auto;padding:24px}small{font-size:11px;color:#6d7584;letter-spacing:.05em}h1,h2,h3,p{margin:0}h1{font-size:25px;line-height:1.35;margin:3px 0 8px}h2{font-size:22px;line-height:1.4}h3{font-size:15px;margin:20px 0 10px}p{margin:8px 0 14px}header.app-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.app-header p{color:#637082}.app-actions,.action-row{display:flex;flex-wrap:wrap;gap:8px}.app-meta{display:flex;flex-wrap:wrap;gap:8px 20px;font-size:12px;color:#6c7584;border-bottom:1px solid #dde1e8;padding:0 0 18px;margin-bottom:20px}.workspace{display:grid;grid-template-columns:270px minmax(0,1fr);border:1px solid #dde1e8;background:white;border-radius:9px;overflow:hidden;min-height:510px}.record-list{max-height:680px;overflow:auto;border-right:1px solid #e4e7ed;background:#fcfcfe}.record-list button,.document-library button{display:block;width:100%;border:0;border-radius:0;text-align:left;padding:15px 18px;border-bottom:1px solid #eef0f4}.record-list strong,.document-library strong{display:block;font-size:13px}.record-list span,.document-library span{display:block;color:#7b8390;font-size:11px;margin-top:4px}.record-list [aria-pressed=true]{box-shadow:inset 3px 0 #6352b3;background:#f1eef9}.detail{min-width:0;padding:28px;max-height:900px;overflow:auto}.detail-title{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.detail-title small{flex-basis:100%}.detail-title .badge{margin-left:auto}.badge{display:inline-block;padding:3px 8px;font-size:11px;background:#edf0f5;color:#626d80;border-radius:4px}.ok{background:#e5f3ed;color:#287652}.no{background:#faf0e7;color:#94642b}.handover{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:center;margin:28px 0;padding:20px;background:#f7f8fb;border-radius:7px}.handover strong{display:block;font-size:17px;margin-top:5px}.checks{list-style:none;margin:0 0 24px;padding:0}.checks li{display:flex;align-items:flex-start;gap:12px;border-bottom:1px solid #edf0f5;padding:12px 0}.checks p{font-size:12px;color:#707888;margin:3px 0 0}.muted,footer{color:#7b8290;font-size:11px}.activity{border-top:1px solid #e8ebf0;margin-top:26px;padding-top:2px}.activity ol{list-style:none;padding:0}.activity li{font-size:12px;margin:10px 0}.activity li span{display:block;color:#87909c}.activity p{font-size:12px;color:#6e7786}.activity code,.source code{font:11px/1.7 ui-monospace,monospace;color:#6a5b9d}.empty{padding:70px 15px}.empty h2{font-size:19px}.empty p{color:#818895;max-width:330px}.search{margin-bottom:15px}.search label{display:block;margin-bottom:8px;font-size:12px;color:#697589}.search>div{display:flex;gap:8px}input{border:1px solid #d7dde8;border-radius:6px;background:#fff;padding:11px 13px;min-width:0;flex:1}.examples{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:24px}.examples button{font-size:11px;border-radius:20px;background:#f0eef8;border:0;padding:6px 10px;color:#615286}.examples details{width:100%;font-size:12px}.examples summary{cursor:pointer;color:#615286}.examples details>div{display:flex;gap:7px;flex-wrap:wrap;padding-top:10px}.source pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,monospace}.document-library{max-height:650px;overflow:auto}select{font:inherit;padding:8px;border:1px solid #d7dde8;background:#fff;border-radius:6px;margin-bottom:12px}.knowledge-layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:22px}.answer{border:1px solid #dde1e8;background:#fff;padding:26px;border-radius:8px}.answer>p{font-size:17px;line-height:1.9;white-space:pre-wrap;margin:20px 0}.document-library{border:1px solid #dde1e8;border-radius:8px;background:#fff;max-height:680px;overflow:auto}.document-library h3{padding:0 16px}.document-library h3 span{font-weight:400;color:#88909c}.source{background:#f7f9fc;border-left:3px solid #8c81bc;margin-top:25px;padding:18px}.source h3{margin-top:4px}.source p{white-space:pre-wrap;font-size:14px;line-height:1.9}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;background:#f7f9fc;padding:20px;margin:24px 0;border-radius:7px}.metrics strong{font-size:28px;display:block;font-weight:600;font-variant-numeric:tabular-nums}.metrics em{font-size:12px;font-style:normal;margin-left:4px;color:#7f8895}.timeline{padding-left:20px;color:#667383}.timeline li{padding:6px 0}.diagnosis{margin-top:24px;border-top:1px solid #e4e9f0;padding-top:20px}.diagnosis label{display:block;margin:15px 0 6px}textarea{display:block;width:100%;min-height:95px;border:1px solid #d9dfe7;border-radius:6px;padding:12px;resize:vertical;margin-bottom:12px}.saved{color:#287652;font-size:12px}.tabs{display:flex;gap:5px;border-bottom:1px solid #dfe4eb;margin-bottom:20px;padding-bottom:10px}.tabs button{border:0;background:transparent}.tabs [aria-pressed=true]{background:#edeaf7;color:#5946a8}.tabs span{font-size:11px;margin-left:5px}.memory-text{font-size:19px;line-height:1.9;margin:25px 0}.decision{padding:20px;background:#f7f8fb;border-radius:7px}.decision h3{margin-top:4px}.decision p{color:#697587}#notice{font-size:12px;color:#4e6681;min-height:20px;margin:18px 0 4px}footer{border-top:1px solid #e3e7ed;padding-top:13px}.demo-pointer{position:fixed;pointer-events:none;z-index:999999;width:28px;height:32px;filter:drop-shadow(0 1px 2px #14182540)}.demo-pointer[hidden]{display:none}[data-guided=true]{outline:3px solid #7861c6;outline-offset:3px}@media(prefers-reduced-motion:no-preference){.demo-pointer{transition:left 450ms ease,top 450ms ease}}@media(max-width:700px){main{padding:16px}.app-header{flex-wrap:wrap}.app-actions{width:100%}.workspace{grid-template-columns:1fr}.record-list{max-height:180px;border-right:0;border-bottom:1px solid #e2e6ed}.detail{padding:20px}.examples details{width:100%;font-size:12px}.examples summary{cursor:pointer;color:#615286}.examples details>div{display:flex;gap:7px;flex-wrap:wrap;padding-top:10px}.source pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,monospace}.document-library{max-height:650px;overflow:auto}select{font:inherit;padding:8px;border:1px solid #d7dde8;background:#fff;border-radius:6px;margin-bottom:12px}.knowledge-layout{grid-template-columns:1fr}.document-library{max-height:260px}.metrics{padding:12px;gap:10px}.metrics strong{font-size:24px}.handover{padding:14px;gap:10px}.handover strong{font-size:14px}h1{font-size:23px}}`;
