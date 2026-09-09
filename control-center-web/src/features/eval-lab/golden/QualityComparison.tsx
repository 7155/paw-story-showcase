import { Disclosure } from '@/components/primitives';
import { object, qualityMetricKeys, type ExperimentMetrics, type QualityMetricKey, type QualityObservation, type RetrievalObservation } from './types';

const definitions: Record<QualityMetricKey, [string, string]> = {
  factualAccuracy: ['事实准确率', '可回答题中，全部必答事实已覆盖且全部可核对主张有证据支持，才记为 1；否则为 0。'],
  referenceFactRecall: ['必答事实召回率', '已覆盖必答事实数 / 必答事实总数。'],
  claimPrecision: ['主张精确率', '有证据支持的事实主张数 / 答案事实主张总数。'],
  claimF1: ['事实 F1', '主张精确率与必答事实召回率的调和平均；不是检索片段 F1。'],
  faithfulness: ['材料忠实度', '被本次实际回答上下文支持的主张数 / 答案事实主张总数；与事实正确性分别判断。'],
  queryRelevance: ['问题相关性', '评审给出的 0–1 分数：1 为直接回应，0.5 为部分回应，0 为无关。'],
  citationCorrectness: ['引用正确率', '可解析到实际材料且支持对应主张的引用次数 / 可识别引用总次数；没有引用时为 N/A。'],
  abstentionCorrectness: ['拒答正确率', '仅对不可回答题判断是否恰当拒答；可回答题不计入。'],
};
const score = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 1 })}%` : 'N/A';

export function QualityComparison({ title, baseline, candidate }: { title: string; baseline: ExperimentMetrics; candidate: ExperimentMetrics }) {
  if (!baseline.quality && !candidate.quality) return null;
  const metric = (metrics: ExperimentMetrics, key: QualityMetricKey) => {
    const quality = object(metrics.quality);
    const row = object(object(quality.metrics)[key]);
    const count = typeof row.measuredCount === 'number' ? row.measuredCount : 0;
    return <><strong>{score(row.value)}</strong><small>{count} / {metrics.total} 题有效</small></>;
  };
  return <section className="golden-quality" aria-label={`${title}质量指标`}>
    <header><h4>{title} · 回答质量</h4><p className="golden-note">模型评审观察；各指标仅对有定义且已测量的题目取平均。N/A 表示不适用、缺失或无法核对，覆盖不全时不计算提升幅度。</p></header>
    <div className="golden-table-scroll"><table className="golden-table golden-quality-table"><thead><tr><th scope="col">指标</th><th scope="col">基线 · BEFORE</th><th scope="col">候选 · AFTER</th></tr></thead><tbody>{qualityMetricKeys.map((key) => <tr key={key}><th scope="row">{definitions[key][0]}</th><td>{metric(baseline, key)}</td><td>{metric(candidate, key)}</td></tr>)}</tbody></table></div>
  </section>;
}

export function QualityDefinitions() {
  return <Disclosure className="golden-disclosure" summary="质量指标如何计算"><p className="golden-note">这些分数来自同一个冻结评审模型。程序核对逐字答案、来源引文与引用位置，语义标签仍由模型判断；不代表独立人工准确率。通过率单独按原题目 rubric 统计，不等于事实准确率。</p><dl className="golden-definition">{qualityMetricKeys.map((key) => <div key={key}><dt>{definitions[key][0]}</dt><dd>{definitions[key][1]}</dd></div>)}</dl><p className="golden-note">每题先计算指标，再对有效题目做宏平均。存在未知事实、未知主张或零分母时，对应指标为 N/A。两侧有效题目可能不同，仅比较均值不能证明配对提升。</p></Disclosure>;
}

export function RetrievalComparison({ title, baseline, candidate }: { title: string; baseline: ExperimentMetrics; candidate: ExperimentMetrics }) {
  if (!baseline.retrievalQuality && !candidate.retrievalQuality) return null;
  const rows = [['precision', '来源 Precision'], ['recall', '来源 Recall'], ['f1', '来源 F1']] as const;
  return <section className="golden-quality" aria-label={`${title}来源召回指标`}><header><h4>{title} · 来源召回</h4><p className="golden-note">按冻结参考来源计分；逐题去重后计算，再取有效题的平均。统计每路 Top K 的实际命中并集，在来源/上下文截断前计算；Precision 分母为实际返回来源数。不同方案的查询数与预算见实际参数。</p></header>
    <div className="golden-table-scroll"><table className="golden-table golden-quality-table"><thead><tr><th scope="col">指标</th><th scope="col">基线 · BEFORE</th><th scope="col">候选 · AFTER</th></tr></thead><tbody>{rows.map(([key, label]) => <tr key={key}><th scope="row">{label}</th>{[baseline, candidate].map((metrics, index) => <td key={index}><strong>{score(metrics.retrievalQuality?.metrics[key].value)}</strong><small>{metrics.retrievalQuality?.metrics[key].measuredCount ?? 0} / {metrics.total} 题有效</small></td>)}</tr>)}</tbody></table></div>
    <p className="golden-note">有参考但零命中时三项记 0；无参考或历史记录缺原始命中时为 N/A。参考集合可能未列尽所有相关论文，未标注命中按本集合计入非参考来源；这些分数不等于答案事实 F1。</p>
  </section>;
}

export function RetrievalObservations({ observation }: { observation?: RetrievalObservation }) {
  if (!observation) return null;
  return <details><summary>本题来源召回计分 · {observation.status === 'measured' ? '已测量' : 'N/A'}</summary><p>Precision {score(observation.metrics.precision)} · Recall {score(observation.metrics.recall)} · F1 {score(observation.metrics.f1)}</p>
    <p>参考来源 {observation.counts.referenceSources}；实际来源 {observation.counts.retrievedSources ?? '未记录'}；命中参考 {observation.counts.truePositive ?? '未计分'}。{observation.cutoff.actualQueries} 路实际检索，每路 Top K {observation.cutoff.perQueryTopK}，计分早于上下文截断。</p>
    <p className="golden-note">实际有用的来源可能未列入冻结参考，需结合原文和逐题回答判断。</p>
  </details>;
}

export function QualityObservations({ quality }: { quality?: QualityObservation }) {
  if (!quality) return null;
  return <details><summary>逐题质量观察 · {quality.status === 'measured' ? '模型评审' : '未有效测量'}</summary>
    {quality.reason ? <p>{quality.reason}</p> : null}
    <dl className="golden-definition">{qualityMetricKeys.map((key) => <div key={key}><dt>{definitions[key][0]}</dt><dd>{score(object(quality.metrics)[key])}</dd></div>)}</dl>
    {Array.isArray(quality.facts) && quality.facts.length ? <><h6>必答事实核对</h6><ul>{quality.facts.map((raw, index) => { const fact = object(raw); return <li key={index}>{String(fact.fact ?? '')} · {fact.covered === true ? '已覆盖' : fact.covered === false ? '未覆盖' : '未知'}{typeof fact.answerQuote === 'string' && fact.answerQuote ? <blockquote>{fact.answerQuote}</blockquote> : null}</li>; })}</ul></> : null}
    {Array.isArray(quality.claims) && quality.claims.length ? <><h6>答案主张核对</h6><ul>{quality.claims.map((raw, index) => { const claim = object(raw); const labels: Record<string, string> = { supported: '有支持', contradicted: '被反驳', unsupported: '缺少支持', unknown: '未知' }; return <li key={index}><blockquote>{String(claim.answerQuote ?? '')}</blockquote>事实：{labels[String(claim.status)] ?? '未知'}；实际材料：{labels[String(claim.grounding)] ?? '未知'}</li>; })}</ul></> : null}
    {typeof quality.relevance?.reason === 'string' ? <p>相关性依据：{quality.relevance.reason}</p> : null}
  </details>;
}
