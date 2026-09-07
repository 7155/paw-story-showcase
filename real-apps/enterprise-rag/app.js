const VIEW_NAMES = new Set(['overview', 'queries', 'corpus', 'results', 'guardrails']);
const initialView = VIEW_NAMES.has(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'overview';
const state = {
  view: initialView,
  overview: null,
  queries: null,
  querySplit: 'train',
  queryKind: 'retrieval',
  querySearch: '',
  querySlice: '',
  queryOffset: 0,
  corpus: null,
  corpusSearch: '',
  corpusSource: '',
  corpusOffset: 0,
  selectedDocument: null,
  results: null,
  selectedCandidate: 'bge-small-hybrid',
};

const app = document.getElementById('app');

const SLICE_LABELS = {
  basic: '直接事实',
  semantic: '语义改写',
  intra_document_reasoning: '单文档多处取证',
  project_related: '跨文档项目关联',
  constrained: '限定条件',
  conflicting_info: '冲突信息',
  completeness: '完整性',
  miscellaneous: '零散信息',
  high_level: '高层综合',
  info_not_found: '资料中不存在',
};

const SOURCE_LABELS = {
  slack: 'Slack',
  gmail: 'Gmail',
  github: 'GitHub',
  jira: 'Jira',
  linear: 'Linear',
  google_drive: 'Google Drive',
  confluence: 'Confluence',
  hubspot: 'HubSpot',
  fireflies: 'Fireflies',
};

const METRIC_LABELS = {
  mrr: 'MRR（首个相关结果排名）',
  recallAt1: 'Recall@1（前 1 条覆盖率）',
  recallAt3: 'Recall@3（前 3 条覆盖率）',
  recallAt5: 'Recall@5（前 5 条覆盖率）',
  recallAt10: 'Recall@10（前 10 条覆盖率）',
  ndcgAt1: 'nDCG@1（前 1 条排序质量）',
  ndcgAt3: 'nDCG@3（前 3 条排序质量）',
  ndcgAt5: 'nDCG@5（前 5 条排序质量）',
  ndcgAt10: 'nDCG@10（前 10 条排序质量）',
};

const WARNING_MAP = [
  ['production lexical floor mirrors', '生产词法下限用于模拟当前已安装的 Knowledge 检索运行时；它不是语义 Embedding 基线。'],
  ['local product retrieval run', '这是 PAW 本地产品检索实验，不是官方排行榜成绩。'],
  ['deterministic multi-query arm', '确定性的多查询分支只是离线诊断，不等于最终的 Luna Agentic 检索。'],
  ['deterministic multi-query held-out diagnostic', '确定性的多查询留出集诊断单独记录，不能标称为 Luna Agentic 检索。'],
  ['strong naive dense baseline', '强语义基线使用同一中文 Embedding、语料和切块配置，但没有 Skill、图、重排或 Agentic 迭代。'],
  ['subagent is a query planner', '子 Agent 只负责规划查询和判断证据是否足够，不能替代独立的候选重排器。'],
  ['No independent Knowledge reranker', '本次运行没有启用独立的 Knowledge 重排器。'],
  ['Knowledge graph candidates were not included', '本次运行没有纳入知识图谱候选。'],
  ['Validation-only mode suppresses', 'Validation-only（仅验证集）模式会隐藏所有留出集指标，可用于安全选择切块配置。'],
  ['Exact validation uses', '精确验证使用同一 SQLite 向量上的确定性矩阵缓存；ANN 的质量和延迟不会混入参数选择真值。'],
  ['When a bounded corpus is requested', '构建限定语料时，qrels 只用于离线组装冻结语料；真正检索时只把问题文本交给检索器。'],
];

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmtInt(value) {
  return typeof value === 'number' ? value.toLocaleString('en-US') : '—';
}

function pct(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '—';
}

function seconds(value) {
  return typeof value === 'number' ? `${(value / 1000).toFixed(1)}s` : '—';
}

function label(value) {
  const key = String(value ?? '');
  return SLICE_LABELS[key] || key.replaceAll('_', ' ');
}

function sourceLabel(value) {
  return SOURCE_LABELS[String(value ?? '')] || String(value ?? '未知来源');
}

function kindLabel(value) {
  return value === 'retrieval' ? '检索问题' : '回答 / 拒答问题';
}

function metricLabel(value) {
  return METRIC_LABELS[value] || String(value ?? '指标');
}

function warningText(value) {
  const match = WARNING_MAP.find(([needle]) => String(value).includes(needle));
  return match ? match[1] : String(value);
}

function statusText(value) {
  const map = {
    conditional_metric_winner_not_heldout_eligible: '验证集指标胜出，但尚未具备留出集资格',
    locked: '已锁定',
    completed: '已完成',
    validation_only: '仅验证集',
  };
  return map[String(value ?? '')] || String(value ?? '未记录');
}

function tag(text, kind = '') {
  return `<span class="tag ${kind}">${esc(text)}</span>`;
}

async function api(path) {
  const response = await window.publicSnapshotFetch(path);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `请求失败（${response.status}）`);
  return body;
}

function setView(view) {
  state.view = view;
  window.history.replaceState(null, '', `#${view}`);
  syncNav();
  renderView();
}

function syncNav() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === state.view);
  });
}

function shell(title, description, content, action = '') {
  return `
    <div class="view-title">
      <div><div class="eyebrow">PAW / 证据控制台</div><h1>${esc(title)}</h1><p>${description}</p></div>
      ${action}
    </div>
    ${content}
  `;
}

function metricCompareRow(item) {
  const delta = typeof item.delta === 'number' ? item.delta : null;
  const deltaHtml = delta === null ? '<span class="delta-neutral">n/a</span>' : `<span class="delta-positive">+${delta.toFixed(4)}</span>`;
  return `<tr><td>${esc(metricLabel(item.metric))}</td><td>${pct(item.baseline)}</td><td class="winner">${pct(item.optimized)} ${deltaHtml}</td></tr>`;
}

function overviewMarkup(data) {
  const corpus = data.corpus || {};
  const suite = data.suite || {};
  const train = suite.splits?.train || {};
  const validation = suite.splits?.validation || {};
  return `
    <section class="hero">
      <div>
        <div class="eyebrow">先回答：这是什么</div>
        <h1>这是一个用来检查 RAG 检索质量的实验台。</h1>
        <p class="lede">它把一批<strong>模拟企业内部资料</strong>、问题和多次检索实验放在一起，让你看到：系统有没有找到回答所需的资料，以及哪些结论还不能说。这里展示的是 PAW 冻结的 Smoke Suite（烟雾测试集），不是线上客户数据。</p>
      </div>
      <div class="hero-side">
        <div class="label">这次实验的一句话</div>
        <p><strong>词法基线 → 混合检索</strong><br />保留同一批问题、文档和切块，只把检索方案从“主要匹配词”换成“词法 + 语义”。验证集变好了，但留出集仍然没有打开。</p>
      </div>
    </section>

    <div class="metrics-row">
      <div class="metric"><div class="metric-label">文档数</div><div class="metric-value">${fmtInt(corpus.documents)}</div><div class="metric-meta">${fmtInt(corpus.goldDocuments)} 个相关文档 + ${fmtInt(corpus.distractors)} 个干扰文档</div><div class="metric-guide">怎么看：干扰文档用来模拟真实企业库中的噪声。</div></div>
      <div class="metric"><div class="metric-label">任务数</div><div class="metric-value">60</div><div class="metric-meta">训练 ${fmtInt(train.tasks)} · 验证 ${fmtInt(validation.tasks)} · 留出集 20</div><div class="metric-guide">怎么看：训练用来开发，验证用来挑方案，留出集只在最后测一次。</div></div>
      <div class="metric"><div class="metric-label">Recall@10（前 10 条覆盖率）</div><div class="metric-value accent">89.2%</div><div class="metric-meta">BGE / 混合检索 · 16 个验证检索问题</div><div class="metric-guide">怎么看：答案需要的相关文档，有多少进入前 10；它不等于回答正确。</div></div>
      <div class="metric"><div class="metric-label">证据状态</div><div class="metric-value" style="font-size:24px;letter-spacing:-.03em">本地</div><div class="metric-meta">只读 · 不是排行榜成绩</div><div class="metric-guide">怎么看：这里只能证明本地验证集发生了什么。</div></div>
    </div>

    <div class="section-head"><div><div class="section-kicker">01 / 先看结论</div><h2>67.2% → 89.2%，为什么仍不能说“系统做好了”？</h2><p>这是验证集上的聚合指标，不是所有问题都答对，更不是生产环境的准确率保证。</p></div><button class="section-action" data-view="results" type="button">查看完整结果 →</button></div>
    <div class="split-layout">
      <section class="panel">
        <div class="panel-header"><div><div class="panel-title">验证集对比表</div><div class="panel-subtitle">只展示聚合结果 · 细粒度标签仍留在评分器内</div></div>${tag('有条件的胜出', 'warn')}</div>
        <div class="panel-body"><table class="compare-table"><thead><tr><th>指标</th><th>词法基线</th><th>BGE / 混合</th></tr></thead><tbody>
          <tr><td>MRR（首个相关结果排位）</td><td>60.4%</td><td class="winner">74.0% <span class="delta-positive">+13.5 个百分点</span></td></tr>
          <tr><td>Recall@10（前 10 条覆盖）</td><td>67.2%</td><td class="winner">89.2% <span class="delta-positive">+22.0 个百分点</span></td></tr>
          <tr><td>nDCG@10（前 10 条排序质量）</td><td>61.3%</td><td class="winner">74.8% <span class="delta-positive">+13.5 个百分点</span></td></tr>
        </tbody></table></div>
      </section>
      <section class="panel">
        <div class="panel-header"><div><div class="panel-title">两套方案到底改了什么</div><div class="panel-subtitle">保持语料、问题和切块不变</div></div>${tag('仅验证集', 'cyan')}</div>
        <div class="panel-body">
          <div class="method-line"><div class="method-name">词法基线</div><div class="method-value"><code>local-hash 96d</code>，主要按关键词匹配；MRR 60.4%，Recall@10 67.2%。</div></div>
          <div class="method-line"><div class="method-name">改进方案</div><div class="method-value"><code>BGE-small 384d</code> + 词法，使用 RRF（倒数排名融合）<code>k=60</code>；MRR 74.0%，Recall@10 89.2%。</div></div>
          <div class="method-line"><div class="method-name">不变条件</div><div class="method-value">${fmtInt(corpus.documents)} 文档 · <code>1200 / 160</code> 切块 / 重叠 · Top 10</div></div>
          <div class="method-line"><div class="method-name">仍未验证</div><div class="method-value">完整 Reranker（重排器）效果、留出集效果、真实生产效果。</div></div>
        </div>
      </section>
    </div>

    <div class="section-head"><div><div class="section-kicker">02 / 看懂指标</div><h2>三个指标分别在回答什么问题</h2><p>指标不是“模型智商分数”，它们只描述检索结果的不同侧面。</p></div></div>
    <div class="section-head" style="margin-top:34px"><div><div class="section-kicker">02.5 / 三份题怎么分工</div><h2>Train、Validation、Held-out 各自负责什么？</h2><p>把数据分开，是为了让“调参时看到的东西”和“最后检验泛化的东西”互不污染。</p></div></div>
    <div class="boundary split-explain">
      <div class="boundary-item"><div class="tiny">Train / 训练集</div><h3>开发时可以看答案。</h3><p>用来写代码、调切块和查错。这里允许展示 Gold（标准答案投影），但不能拿它冒充最终成绩。</p></div>
      <div class="boundary-item"><div class="tiny">Validation / 验证集</div><h3>用来比较候选方案。</h3><p>问题和语料可以看，评分器返回聚合指标；qrels（相关性标签）不进入检索器或浏览器。</p></div>
      <div class="boundary-item"><div class="tiny">Held-out / 留出集</div><h3>最后才打开一次。</h3><p>调参期间完全隐藏问题、标签和答案，只有冻结候选方案后才允许外部评分。</p></div>
    </div>
    <div class="boundary metric-explain">
      <div class="boundary-item"><div class="tiny">Recall@10</div><h3>有没有把相关资料找进前 10 条？</h3><p>看覆盖面。它高，只能说明候选资料更可能在证据包里，不能证明最终回答没有幻觉。</p></div>
      <div class="boundary-item"><div class="tiny">MRR</div><h3>第一条相关资料排得靠不靠前？</h3><p>看第一个命中结果的位置。越靠前分越高，适合观察用户是否很快看到有用证据。</p></div>
      <div class="boundary-item"><div class="tiny">nDCG@10</div><h3>相关资料的排序整体是否合理？</h3><p>同时考虑相关资料出现了多少，以及它们在前 10 中排得是否靠前。</p></div>
    </div>

    <div class="section-head"><div><div class="section-kicker">03 / 按问题类型拆开看</div><h2>completeness（完整性）只有 30%，暴露了什么？</h2><p>“整体变好”掩盖了按问题类型分层后的缺口；完整性问题仍需要继续优化。</p></div></div>
    <section class="panel"><div class="panel-body"><div class="slice-table">
      <div class="slice-row low"><div class="slice-label">完整性（completeness）</div><div class="slice-score">30.0%</div><div class="bar-track"><div class="bar-fill" style="width:30%"></div></div></div>
      <div class="slice-row"><div class="slice-label">跨文档项目关联（project related）</div><div class="slice-score">83.3%</div><div class="bar-track"><div class="bar-fill" style="width:83.3%"></div></div></div>
      <div class="slice-row"><div class="slice-label">限定条件（constrained）</div><div class="slice-score">100.0%</div><div class="bar-track"><div class="bar-fill" style="width:100%"></div></div></div>
      <div class="slice-row"><div class="slice-label">语义改写（semantic）</div><div class="slice-score">100.0%</div><div class="bar-track"><div class="bar-fill" style="width:100%"></div></div></div>
    </div></div></section>
    <div class="callout"><div class="callout-mark"></div><div><h3>30% 不是“模型只会做 30 分题”，而是覆盖不足。</h3><p>这类问题要求把一套完整流程涉及的多个文档全部找回来。当前方案可能找到了其中一部分，但漏掉了其他证据。因此下一步应看多文档覆盖、去重和证据打包，而不是只继续调一个 Embedding 权重。</p></div></div>

    <div class="section-head"><div><div class="section-kicker">04 / 证据边界</div><h2>结果有用，但不能过度解读</h2></div></div>
    <div class="callout"><div class="callout-mark"></div><div><h3>这是验证集结果，不是生产质量保证。</h3><p>语料来自合成的 EnterpriseRAG-Bench；Smoke Suite 是 PAW 冻结的本地切片。Reranker 目前只有两段文本的运行时探针，没有完整验证集效果。留出集标签仍在评分器边界外。</p></div></div>
    <div class="boundary">
      <div class="boundary-item"><div class="tiny">可查看</div><h3>Train + Validation</h3><p>可以查看问题、语料文档、训练集 gold 投影和验证集聚合结果。</p></div>
      <div class="boundary-item"><div class="tiny">受保护</div><h3>Held-out（留出集）</h3><p>留出集的 ID、问题、qrels（相关性标签）和答案不会进入浏览器。</p></div>
      <div class="boundary-item"><div class="tiny">当前没有</div><h3>逐题排名日志</h3><p>结果文件没有保存每道题的 Top-K，所以页面不会伪造逐题故事。</p></div>
    </div>
  `;
}

function queryMarkup(data) {
  const split = data.split;
  const items = data.items || [];
  const tabs = `<div class="segmented"><button class="segment ${split === 'train' ? 'active' : ''}" data-query-split="train" type="button">训练集 / 可看 Gold</button><button class="segment ${split === 'validation' ? 'active' : ''}" data-query-split="validation" type="button">验证集 / 标签隐藏</button></div>`;
  const kind = `<div class="segmented"><button class="segment ${data.kind === 'retrieval' ? 'active' : ''}" data-query-kind="retrieval" type="button">检索问题</button><button class="segment ${data.kind === 'answer' ? 'active' : ''}" data-query-kind="answer" type="button">回答 / 拒答问题</button></div>`;
  const sliceOptions = [`<option value="">全部切片</option>`].concat((data.slices || []).map((item) => `<option value="${esc(item)}" ${state.querySlice === item ? 'selected' : ''}>${esc(label(item))}</option>`)).join('');
  const list = items.length ? items.map((item) => {
    const gold = item.gold || {};
    const isTrain = split === 'train';
    return `<article class="query-item">
      <div><div class="query-id">${esc(item.queryId)}</div><div class="query-meta">${esc(kindLabel(item.kind))} · ${esc((item.sourceTypes || []).map(sourceLabel).join(' / ') || '未指定来源')}</div></div>
      <div><div class="query-text">${esc(item.query)}</div>${isTrain && (gold.goldAnswer || gold.relevantDocumentIds?.length) ? `<details class="query-gold"><summary>查看训练集 Gold 投影（仅训练集）</summary><div class="gold-content"><div class="gold-answer">${esc(gold.goldAnswer || '没有记录回答投影。')}</div><div class="gold-docs">相关文档 ID：${[...(gold.relevantDocumentIds || [])].map((id) => `<code>${esc(id)}</code>`).join(' ') || '无'}</div></div></details>` : ''}${!isTrain ? `<div class="validation-note" style="margin-top:14px">验证集问题可以查看，但 Gold 文档、qrels（相关性标签）和标准答案仍留在评分器边界内。</div>` : ''}</div>
      <div class="query-tags">${tag(label(item.slice), item.slice === 'completeness' ? 'warn' : '')}${item.abstentionExpected ? tag('应该拒答', 'warn') : ''}</div>
    </article>`;
  }).join('') : '<div class="empty-state">没有符合筛选条件的问题。</div>';
  const prevDisabled = data.offset <= 0 ? 'disabled' : '';
  const nextDisabled = data.offset + data.items.length >= data.total ? 'disabled' : '';
  return shell('问题集', '这套题分成训练集、验证集和留出集：开发时可以看训练证据，验证时可以比较方案，但不能偷看最终答案。题目原文来自英文企业语料，因此保留英文，旁边的字段和解释用中文。', `
    <div class="toolbar">${tabs}${kind}<input id="query-search" value="${esc(state.querySearch)}" placeholder="搜索问题文字…" aria-label="搜索问题" /><select id="query-slice" aria-label="按问题类型筛选">${sliceOptions}</select><span class="results-count">${fmtInt(data.total)} 道题</span></div>
    <section class="panel field-guide"><div class="panel-header"><div><div class="panel-title">字段怎么读：先看一条示例</div><div class="panel-subtitle">下面的英文键名来自原始 JSON；右侧解释它在测评里负责什么。</div></div>${tag('结构说明', 'cyan')}</div><div class="panel-body"><table class="field-table"><thead><tr><th>原始字段</th><th>中文含义</th><th>示例 / 用途</th></tr></thead><tbody>
      <tr><td><code>queryId</code></td><td>问题 ID</td><td><code>qst_0029</code>：用于跨运行对齐同一道题。</td></tr>
      <tr><td><code>query</code></td><td>原始问题</td><td>“What caused the nightly evaluation cron jobs…?”：检索器真正收到的问题。</td></tr>
      <tr><td><code>slice</code></td><td>问题类型切片</td><td><code>basic</code> = 直接事实；<code>completeness</code> = 要找全多个证据。</td></tr>
      <tr><td><code>sourceTypes</code></td><td>预期来源类型</td><td><code>jira</code>、<code>slack</code>：说明答案可能分布在哪类企业资料中。</td></tr>
      <tr><td><code>retrievalEvaluable</code></td><td>是否纳入检索指标</td><td><code>true</code>：可以计算 Recall、MRR、nDCG。</td></tr>
      <tr><td><code>abstentionExpected</code></td><td>是否应该拒答</td><td><code>true</code>：资料不存在时，正确行为不是编答案。</td></tr>
      <tr><td><code>gold</code></td><td>训练集标准投影</td><td>只在 Train 显示；Validation 不返回这个字段，避免泄漏。</td></tr>
    </tbody></table></div></section>
    <div class="query-list">${list}</div>
    <div class="toolbar" style="justify-content:flex-end;margin-top:20px;margin-bottom:0"><button class="section-action page-btn" data-page="prev" ${prevDisabled} type="button">← 上一页</button><span class="results-count" style="margin-left:0">${data.total ? data.offset + 1 : 0}–${Math.min(data.offset + data.items.length, data.total)} / ${data.total}</span><button class="section-action page-btn" data-page="next" ${nextDisabled} type="button">下一页 →</button></div>
  `);
}

function corpusMarkup(data) {
  const sourceOptions = [`<option value="">全部来源</option>`].concat((data.sources || []).map((item) => `<option value="${esc(item)}" ${state.corpusSource === item ? 'selected' : ''}>${esc(sourceLabel(item))}</option>`)).join('');
  const list = (data.items || []).map((item) => `<button type="button" class="doc-row ${state.selectedDocument?.documentId === item.documentId ? 'selected' : ''}" data-document-id="${esc(item.documentId)}"><span class="doc-dot"></span><span><span class="doc-source">${esc(sourceLabel(item.source))}</span><span class="doc-title">${esc(item.title)}</span><span class="doc-preview">${esc(item.preview)}</span><span class="doc-id">${esc(item.documentId)} · ${fmtInt(item.characters)} 个字符</span></span></button>`).join('');
  const detail = state.selectedDocument ? `<div class="panel-body"><div class="doc-detail-head"><div><div class="doc-source">${esc(sourceLabel(state.selectedDocument.source))}</div><div class="doc-detail-title">${esc(state.selectedDocument.title)}</div><div class="doc-detail-meta">${esc(state.selectedDocument.documentId)} · ${fmtInt(state.selectedDocument.text.length)} 个字符</div></div>${tag('原始证据', 'cyan')}</div><div class="doc-detail-text">${esc(state.selectedDocument.text)}</div></div>` : `<div class="panel-body empty-state" style="min-height:410px">选择一份文档，查看完整原文</div>`;
  return shell('语料库浏览', '这是冻结的 5,101 份企业内部模拟文档。搜索由服务端逐条读取 JSONL 完成，不会把评分器私有文件暴露给浏览器。', `
    <section class="panel field-guide corpus-field-guide"><div class="panel-header"><div><div class="panel-title">字段怎么读：一条文档示例</div><div class="panel-subtitle">文档详情保留来源和原文，方便追溯“这一条检索证据到底来自哪里”。</div></div>${tag('可追溯', 'cyan')}</div><div class="panel-body"><table class="field-table"><thead><tr><th>原始字段</th><th>中文含义</th><th>示例 / 用途</th></tr></thead><tbody>
      <tr><td><code>documentId</code></td><td>文档唯一 ID</td><td><code>dsid_…</code>：Gold/qrels 和检索结果用它对齐。</td></tr>
      <tr><td><code>source</code></td><td>文档来源系统</td><td><code>slack</code>、<code>jira</code>、<code>gmail</code>：用于按来源过滤和分析。</td></tr>
      <tr><td><code>title</code></td><td>文档标题</td><td><code>partnerships</code>：列表页先展示的可读名称。</td></tr>
      <tr><td><code>text</code></td><td>原始正文</td><td>完整对话、邮件或工单正文：最终答案必须能回到这里。</td></tr>
      <tr><td><code>normalization</code></td><td>入库清洗记录</td><td>例如 NUL 替换次数：说明原文是否做过最小清洗。</td></tr>
    </tbody></table></div></section>
    <div class="toolbar"><input id="corpus-search" value="${esc(state.corpusSearch)}" placeholder="搜索标题或来源…" aria-label="搜索语料库" /><select id="corpus-source" aria-label="按来源筛选">${sourceOptions}</select><span class="results-count">${fmtInt(data.total)} 份匹配文档</span></div>
    <div class="corpus-layout"><section class="panel"><div class="panel-header"><div><div class="panel-title">已选冻结语料</div><div class="panel-subtitle">${fmtInt(data.total)} 份匹配 · 第 ${Math.floor(data.offset / data.limit) + 1} 页</div></div>${tag('JSONL / 分页', 'cyan')}</div><div class="panel-body" style="padding-top:4px"><div class="doc-list">${list || '<div class="empty-state">没有符合搜索条件的文档。</div>'}</div></div></section><section class="panel doc-detail">${detail}</section></div>
    <div class="toolbar" style="justify-content:flex-end;margin-top:20px;margin-bottom:0"><button class="section-action corpus-page" data-page="prev" ${data.offset <= 0 ? 'disabled' : ''} type="button">← 上一页</button><span class="results-count" style="margin-left:0">${data.total ? data.offset + 1 : 0}–${Math.min(data.offset + data.items.length, data.total)} / ${data.total}</span><button class="section-action corpus-page" data-page="next" ${data.offset + data.items.length >= data.total ? 'disabled' : ''} type="button">下一页 →</button></div>
  `);
}

function configMarkup(candidate) {
  const e = candidate.embedding || {};
  const c = candidate.chunking || {};
  const r = candidate.retrieval || {};
  const cells = [
    ['向量提供方', e.provider], ['模型', e.model], ['向量维度', e.dimensions], ['向量覆盖率', pct(e.vectorCoverage)],
    ['切块策略', c.strategy === 'general' ? '通用切块' : c.strategy], ['切块 / 重叠', `${c.size} / ${c.overlap}`], ['检索模式', r.mode === 'hybrid' ? '混合（词法 + 语义）' : r.mode === 'lexical' ? '词法' : r.mode], ['RRF k / Top K', `${r.rrfK} / ${r.topK}`],
  ];
  return `<div class="config-grid">${cells.map(([name, value]) => `<div class="config-cell"><div class="config-label">${esc(name)}</div><div class="config-value">${esc(value ?? '—')}</div></div>`).join('')}</div><div class="config-note">怎么看：${candidate.id === 'bge-small-hybrid' ? '这套方案同时保留关键词命中，并增加语义相近的候选。' : '这是对照用的确定性词法下限，不代表语义检索能力。'}</div>`;
}

function resultsMarkup(data) {
  const selected = data.candidates.find((item) => item.id === state.selectedCandidate) || data.candidates[data.candidates.length - 1];
  const candidateName = item => item.id === 'bge-small-hybrid' ? 'BGE-small / 混合检索方案' : 'local-hash / 词法基线';
  const candidates = data.candidates.map((item) => `<button type="button" class="candidate ${item.id === selected.id ? 'selected' : ''}" data-candidate="${esc(item.id)}"><div class="candidate-top"><div><div class="candidate-label">${esc(candidateName(item))}</div><div class="candidate-fingerprint">指纹：${esc(item.embedding.fingerprint || '未记录')}</div></div>${item.id === 'bge-small-hybrid' ? tag('待验证候选', 'cyan') : tag('对照基线', '')}</div><div class="candidate-metrics"><div><div class="candidate-metric-label">MRR</div><div class="candidate-metric-value">${pct(item.metrics.mrr)}</div></div><div><div class="candidate-metric-label">Recall@10</div><div class="candidate-metric-value">${pct(item.metrics.recallAt10)}</div></div><div><div class="candidate-metric-label">nDCG@10</div><div class="candidate-metric-value">${pct(item.metrics.ndcgAt10)}</div></div><div><div class="candidate-metric-label">运行耗时</div><div class="candidate-metric-value">${seconds(item.elapsedMs)}</div></div></div></button>`).join('');
  const slices = Object.entries(selected.perSlice || {}).map(([name, item]) => `<div class="slice-row ${item.metrics.recallAt10 < .5 ? 'low' : ''}"><div class="slice-label">${esc(label(name))}</div><div class="slice-score">${pct(item.metrics.recallAt10)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (item.metrics.recallAt10 || 0) * 100)}%"></div></div></div>`).join('');
  const warnings = (selected.warnings || []).slice(0, 6).map((item) => `<li>${esc(warningText(item))}</li>`).join('');
  return shell('实验结果', '在完全相同的验证集上比较候选方案。结果页同时展示收益、失败切片和不能声称的边界，不把“最高分”包装成生产结论。', `
    <div class="result-hero"><div><div class="eyebrow">validation / 聚合证据</div><h2>${esc(candidateName(selected))} 在当前验证集上胜出。</h2><p>这里的“胜出”只表示验证集上的指标更好：清理恢复已核实，但自动清理门禁仍未通过，完整 Reranker 验证也没有完成，所以还不能进入留出集。</p></div><div class="result-status"><div class="status-word">${esc(statusText(data.selection?.heldOutGate || 'locked'))}</div><div class="status-caption">Held-out（留出集）门禁</div></div></div>
    <div class="result-grid" style="margin-top:34px"><section class="candidate-stack">${candidates}</section><div class="result-details"><section class="panel"><div class="panel-header"><div><div class="panel-title">选中的配置</div><div class="panel-subtitle">${esc(selected.reportFile)} · ${esc(selected.evaluationScope)}（仅验证集）</div></div>${tag('同一批语料', 'good')}</div><div class="panel-body">${configMarkup(selected)}</div></section><section class="panel"><div class="panel-header"><div><div class="panel-title">按问题类型看 Recall@10</div><div class="panel-subtitle">${fmtInt(selected.queryCount)} 个检索问题 · 不含隐藏答案行</div></div></div><div class="panel-body"><div class="slice-table">${slices}</div></div></section></div></div>
    <div class="section-head"><div><div class="section-kicker">04 / 仍未解决</div><h2>失败信息也是实验结果的一部分</h2><p>没有边界说明的分数，不是可复现的工程结论。</p></div></div>
    <section class="panel"><div class="panel-body"><ul class="warning-list">${warnings || '<li>结果文件没有记录额外警告。</li>'}</ul></div></section>
    <div class="callout" style="margin-top:22px"><div class="callout-mark"></div><div><h3>结果文件没有保存逐题排名。</h3><p>当前只有总体指标和按切片聚合，没有每道题的 Top-K 明细。因此页面不会伪造某道题“从第 20 名升到第 1 名”的故事。</p></div></div>
  `);
}

function guardrailMarkup(data) {
  return shell('评测门禁', '这个查看器故意比评分器“知道得少”。这样查看结果不会意外变成调参通道，也不会把留出集答案泄漏出来。', `
    <div class="guardrail-grid"><section class="lock-panel"><div class="eyebrow" style="color:var(--green)">评测边界</div><h2>Held-out（留出集）仍然锁定。</h2><div class="lock-number">${esc(statusText(data.state || 'locked'))}</div><div class="lock-detail">${fmtInt(data.tasks)} 个任务 · ${fmtInt(data.retrieval)} 个检索问题 · ${fmtInt(data.answer)} 个回答/拒答问题<br />已使用 ${fmtInt(data.consumed)} / ${fmtInt(data.maximum)} 次允许的留出评测</div><div style="margin-top:20px">${tag('问题 ID 隐藏', 'good')} ${tag('qrels 隐藏', 'good')}</div></section><section class="panel"><div class="panel-header"><div><div class="panel-title">这个页面不会展示什么</div><div class="panel-subtitle">隐私和评测隔离是功能要求，不是页脚免责声明。</div></div></div><div class="panel-body"><ul class="guard-list"><li><strong>留出集问题 ID、问题文字和答案</strong>不会进入 API 投影。</li><li><strong>验证集 qrels 和标准答案</strong>留在评分器边界内；这里只能查看验证问题文字。</li><li><strong>host/prepared.json</strong>只用于在内存中生成训练集投影，不会作为静态文件挂载。</li><li><strong>逐题排名</strong>只有在结果文件真实保存时才会展示；没有数据就不编造。</li></ul></div></section></div>
    <div class="section-head"><div><div class="section-kicker">05 / 评测流程</div><h2>一个候选方案怎样才能进入下一步？</h2><p>一次只改一类参数；门禁本身也是实验协议的一部分。</p></div></div>
    <div class="protocol"><div class="protocol-step"><div class="step-no">01</div><h3>冻结</h3><p>记录语料、问题切分、切块配置、模型指纹和预算。</p></div><div class="protocol-step"><div class="step-no">02</div><h3>回放</h3><p>用同一验证集运行，保留总体指标和切片指标。</p></div><div class="protocol-step"><div class="step-no">03</div><h3>检查</h3><p>先看失败类型、清理回执和未解决边界，再决定下一次调什么。</p></div><div class="protocol-step"><div class="step-no">04</div><h3>只解锁一次</h3><p>候选方案冻结后才能跨过留出门禁，而且最多执行一次。</p></div></div>
    <div class="callout" style="margin-top:22px"><div class="callout-mark"></div><div><h3>${esc(data.reason || '留出集评分不属于调参和查看器边界。')}</h3><p>这个本地页面帮助你看懂实验，但不能把合成验证结果包装成生产准确率承诺。</p></div></div>
  `);
}

async function renderView() {
  app.innerHTML = '<div class="loading-state"><span class="loader"></span> 正在加载证据…</div>';
  try {
    if (state.view === 'overview') {
      state.overview ||= await api('/api/overview');
      app.innerHTML = overviewMarkup(state.overview);
    } else if (state.view === 'queries') {
      state.queries = await api(`/api/queries?split=${encodeURIComponent(state.querySplit)}&kind=${encodeURIComponent(state.queryKind)}&q=${encodeURIComponent(state.querySearch)}&slice=${encodeURIComponent(state.querySlice)}&offset=${state.queryOffset}&limit=40`);
      app.innerHTML = queryMarkup(state.queries);
    } else if (state.view === 'corpus') {
      state.corpus = await api(`/api/documents?q=${encodeURIComponent(state.corpusSearch)}&source=${encodeURIComponent(state.corpusSource)}&offset=${state.corpusOffset}&limit=30`);
      app.innerHTML = corpusMarkup(state.corpus);
    } else if (state.view === 'results') {
      state.results = await api('/api/results');
      app.innerHTML = resultsMarkup(state.results);
    } else if (state.view === 'guardrails') {
      const heldout = await api('/api/heldout');
      app.innerHTML = guardrailMarkup(heldout);
    }
  } catch (error) {
    app.innerHTML = `<div class="error-box">${esc(error.message)}<br /><br />查看器无法读取本地实验投影，请检查服务是否仍在运行。</div>`;
  }
}

let queryTimer;
let corpusTimer;
document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-view]');
  if (nav) { setView(nav.dataset.view); return; }
  const qSplit = event.target.closest('[data-query-split]');
  if (qSplit) { state.querySplit = qSplit.dataset.querySplit; state.queryOffset = 0; renderView(); return; }
  const qKind = event.target.closest('[data-query-kind]');
  if (qKind) { state.queryKind = qKind.dataset.queryKind; state.queryOffset = 0; renderView(); return; }
  const page = event.target.closest('.page-btn');
  if (page && !page.disabled) { state.queryOffset = Math.max(0, state.queryOffset + (page.dataset.page === 'next' ? 40 : -40)); renderView(); return; }
  const corpusPage = event.target.closest('.corpus-page');
  if (corpusPage && !corpusPage.disabled) { state.corpusOffset = Math.max(0, state.corpusOffset + (corpusPage.dataset.page === 'next' ? 30 : -30)); renderView(); return; }
  const doc = event.target.closest('[data-document-id]');
  if (doc) {
    api(`/api/documents/${encodeURIComponent(doc.dataset.documentId)}`).then((item) => { state.selectedDocument = item; renderView(); }).catch((error) => { app.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; });
    return;
  }
  const candidate = event.target.closest('[data-candidate]');
  if (candidate) { state.selectedCandidate = candidate.dataset.candidate; renderView(); }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'query-search') {
    state.querySearch = event.target.value; state.queryOffset = 0; clearTimeout(queryTimer); queryTimer = setTimeout(renderView, 230);
  }
  if (event.target.id === 'corpus-search') {
    state.corpusSearch = event.target.value; state.corpusOffset = 0; clearTimeout(corpusTimer); corpusTimer = setTimeout(renderView, 230);
  }
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'query-slice') { state.querySlice = event.target.value; state.queryOffset = 0; renderView(); }
  if (event.target.id === 'corpus-source') { state.corpusSource = event.target.value; state.corpusOffset = 0; renderView(); }
});

window.addEventListener('hashchange', () => {
  const view = window.location.hash.slice(1);
  if (VIEW_NAMES.has(view) && view !== state.view) setView(view);
});

syncNav();
renderView();
