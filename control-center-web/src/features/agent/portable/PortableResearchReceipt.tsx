import { BookOpen } from 'lucide-react';
import type { PortableSource } from './SourceReader';
import { portableObject, type PortableTurn } from './conversation-types';

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
const count = (value: unknown) => number(value)?.toLocaleString('zh-CN') ?? '未提供';
const usd = (value: unknown) => number(value) === undefined ? '未提供' : `$${(value as number).toFixed(4)}`;
function tokenCount(usage: Record<string, unknown>) {
  const total = usage.totalTokensComplete === false ? undefined : number(usage.totalTokens ?? usage.total_tokens);
  const input = usage.inputTokensComplete === false ? undefined : number(usage.inputTokens ?? usage.input_tokens ?? usage.prompt_tokens);
  const output = usage.outputTokensComplete === false ? undefined : number(usage.outputTokens ?? usage.output_tokens ?? usage.completion_tokens);
  if (usage.totalTokensComplete === false) return undefined;
  return total ?? (input !== undefined && output !== undefined ? input + output : undefined);
}
function stageUsage(value: unknown) {
  const row = portableObject(value) ?? {}; const usage = portableObject(row.usage) ?? {};
  const receipt = portableObject(row.receipt) ?? {};
  const cost = usage.costUsdComplete === false ? undefined : number(usage.costUsd ?? receipt.costUsd);
  const estimated = usage.estimatedCostUsdComplete !== false && (usage.estimatedCostBasis ?? usage.costBasis) === 'model_catalog_estimate' && (number(usage.estimatedCostUsd) ?? 0) > 0 ? usage.estimatedCostUsd : undefined;
  const elapsedMs = row.elapsedMsComplete === false || receipt.elapsedMsComplete === false ? undefined : number(row.elapsedMs ?? receipt.elapsedMs ?? row.latencyMs);
  return { tokens: tokenCount(usage), cost, estimated, elapsedMs };
}

function resourceMetric(value: unknown, field: string, label: string) {
  const usage = portableObject(value) ?? {};
  const current = number(usage[field]);
  const complete = usage[`${field}Complete`] === true
    || (usage[`${field}Complete`] === undefined && current !== undefined);
  if (complete && current !== undefined) return count(current);
  const known = number(usage[`known${field[0].toUpperCase()}${field.slice(1)}`]);
  return known === undefined ? '未提供' : `未完整（已知${label ? ` ${label}` : ''} ${count(known)}）`;
}

function elapsedMetric(value: unknown) {
  const usage = portableObject(value) ?? {};
  const current = number(usage.elapsedMs);
  const complete = usage.elapsedComplete === true || usage.elapsedMsComplete === true
    || (usage.elapsedComplete === undefined && usage.elapsedMsComplete === undefined && current !== undefined);
  const format = (ms: number) => `${(ms / 1000).toFixed(1)} 秒`;
  if (complete && current !== undefined) return format(current);
  const known = number(usage.knownElapsedMs);
  return known === undefined ? '未提供' : `未完整（已知 ${format(known)}）`;
}

/** Uses the owner's total; legacy answer-only usage is never labelled assistant total. */
type PortableUsageSummaryValue = {
  usage?: unknown; assistantUsage?: unknown; usageScopes?: unknown; stageReceipts?: unknown; knowledge?: unknown;
};

export function PortableUsageSummary({ value, compact = false }: { value: PortableUsageSummaryValue; compact?: boolean }) {
  const workflow = portableObject(portableObject(value.knowledge)?.workflow);
  const scopes = portableObject(value.usageScopes) ?? portableObject(value.stageReceipts);
  const plan = portableObject(scopes?.planning) ?? portableObject(scopes?.plan) ?? portableObject(workflow?.planner);
  const answer = portableObject(scopes?.answer);
  const research = portableObject(scopes?.research);
  const total = portableObject(value.assistantUsage);
  const legacy = portableObject(value.usage);
  if (!total && !plan && !answer && !research && !legacy) return null;
  const actual = total?.costComplete === true && number(total.costUsd) !== undefined;
  const estimated = total?.estimateComplete === true && (number(total.estimatedCostUsd) ?? 0) > 0;
  const partialCost = number(total?.knownCostUsd) !== undefined ? `费用未完整提供（已知 ${usd(total?.knownCostUsd)}）`
    : (number(total?.knownEstimatedCostUsd) ?? 0) > 0 ? `目录估算未完整（已知 ${usd(total?.knownEstimatedCostUsd)}）` : '费用未完整提供';
  if (compact) return <div className="paw-portable-usage-compact" aria-label="用量摘要">
    {total ? <><span>总 Token {resourceMetric(total, 'totalTokens', '')}</span><span>{actual ? `费用 ${usd(total.costUsd)}` : estimated ? `目录估算 ${usd(total.estimatedCostUsd)}` : partialCost}</span><span>累计执行 {elapsedMetric(total)}</span></>
      : legacy ? <><span>回答 Token {count(tokenCount(legacy))}</span><span>{legacy.costUsdComplete !== false && number(legacy.costUsd) !== undefined ? `回答费用 ${usd(legacy.costUsd)}` : '回答费用未提供'}</span></> : <span>模型用量待确认</span>}
  </div>;
  return <div className="paw-portable-usage" aria-label="模型用量回执">
    {total ? <p><strong>执行回执 {count(total.calls)} 条</strong><span>总 Token {resourceMetric(total, 'totalTokens', '')}</span>
      <span>{actual ? `费用 ${usd(total.costUsd)}` : estimated ? `目录估算 ${usd(total.estimatedCostUsd)}` : partialCost}</span></p>
      : legacy ? <p><strong>{workflow || plan || answer ? '回答调用用量' : '回答用量'}</strong><span>{count(tokenCount(legacy))} Token</span><span>{number(legacy.costUsd) !== undefined ? `费用 ${usd(legacy.costUsd)}` : '费用未完整提供'}</span></p>
        : <p>已收到阶段回执；模型合计用量待完整结果确认。</p>}
    {total ? <dl><div><dt>实际模型请求</dt><dd>{resourceMetric(total, 'modelCallCount', '')}</dd></div><div><dt>输入 Token</dt><dd>{resourceMetric(total, 'inputTokens', '')}</dd></div><div><dt>输出 Token</dt><dd>{resourceMetric(total, 'outputTokens', '')}</dd></div><div><dt>缓存读 Token</dt><dd>{resourceMetric(total, 'cacheReadTokens', '')}</dd></div><div><dt>缓存写 Token</dt><dd>{resourceMetric(total, 'cacheWriteTokens', '')}</dd></div><div><dt>执行阶段累计耗时</dt><dd>{elapsedMetric(total)}</dd></div><div><dt>Tool 调用尝试</dt><dd>{total.toolCallCountScope === 'native_tool_attempts' ? resourceMetric(total, 'toolCallCount', '') : '未提供'}</dd></div></dl> : null}
    {plan || answer || research ? <dl>{([['规划', plan], ['回答', answer], ['按需研究与回答', research]] as const).filter(([, item]) => item).map(([label, item]) => {
      const observed = stageUsage(item);
      return <div key={label}><dt>{label}</dt><dd>{count(observed.tokens)} Token · {observed.cost !== undefined ? usd(observed.cost)
        : observed.estimated !== undefined ? `目录估算 ${usd(observed.estimated)}` : '费用未提供'} · 执行阶段 {observed.elapsedMs === undefined ? '未提供' : `${(observed.elapsedMs / 1000).toFixed(1)} 秒`}</dd></div>;
    })}</dl> : null}
    {total && !actual ? <small>{estimated ? '估算来自模型目录，不是实际账单。' : '缺失费用仍为未知，不能据此判断节省。'}</small> : null}
    {total ? <small>一次研究执行可能包含多次模型请求；累计耗时不代表端到端或并行 wall time。</small> : null}
    {!total && workflow && legacy ? <small>当前只收到回答阶段用量；规划阶段及总量尚未完整提供。</small> : null}
  </div>;
}

export function PortableResearchReceipt({ turn, onOpen }: { turn: PortableTurn; onOpen: (source: PortableSource) => void }) {
  const knowledge = turn.knowledge; const workflow = portableObject(knowledge?.workflow);
  const raw = Array.isArray(turn.retrievalHits) ? turn.retrievalHits : Array.isArray(knowledge?.retrievalHits) ? knowledge.retrievalHits : undefined;
  const sources = new Map<string, { source: PortableSource; selected: boolean }>();
  for (const item of raw ?? []) {
    const row = portableObject(item); if (typeof row?.sourceId !== 'string') continue;
    const existing = sources.get(row.sourceId); const selected = row.usedInContext === true;
    if (existing && (!selected || existing.selected)) continue;
    sources.set(row.sourceId, { source: { sourceId: row.sourceId, title: typeof row.title === 'string' ? row.title : row.sourceId,
      text: typeof row.text === 'string' ? row.text : typeof row.preview === 'string' ? row.preview : '',
      ...(typeof row.chunkId === 'string' ? { chunkId: row.chunkId } : {}),
      ...(typeof row.uri === 'string' ? { uri: row.uri } : {}),
      ...(portableObject(row.citation) ? { citation: row.citation as PortableSource['citation'] } : {}) }, selected });
  }
  const queries = Array.isArray(workflow?.queries) ? workflow.queries.filter((item): item is string => typeof item === 'string') : [];
  const selectedCount = number(workflow?.selectedSources) ?? new Set(turn.sources.map((row) => row.sourceId)).size;
  const recalledCount = number(workflow?.candidateSources) ?? (raw ? sources.size : undefined);
  const searches = number(workflow?.searchCount) ?? (queries.length ? queries.length : undefined);
  const contextChars = number(knowledge?.contextChars ?? workflow?.contextChars);
  const planner = portableObject(workflow?.planner);
  const delivery = portableObject(knowledge?.contextDelivery) ?? portableObject(workflow?.contextDelivery);
  const deliveryUnknown = delivery?.complete === false;
  const failedDeliveries = Array.isArray(delivery?.failedToolCallIds) ? delivery.failedToolCallIds.length : 0;
  return <>
    {workflow || raw ? <details className="paw-portable-research"><summary>本次研究 · {searches === undefined ? '检索次数待确认' : `${count(searches)} 次检索`} · {count(recalledCount)} 篇命中 / {deliveryUnknown ? '上下文待核对' : `${count(selectedCount)} 篇采用`}</summary>
      <p>去重命中 {count(recalledCount)} 篇；{deliveryUnknown ? '已确认进入回答上下文' : '进入回答上下文'} {count(selectedCount)} 篇、{count(contextChars)} 字符。编号引用只对应回答实际采用的片段。</p>
      {deliveryUnknown ? <p className="paw-portable-note">部分工具结果是否送达模型尚未确认，当前仅列出已确认的上下文。</p> : null}
      {failedDeliveries ? <p className="paw-portable-note">{count(failedDeliveries)} 次工具结果未送达模型；对应片段不计入回答上下文，调用仍保留在记录中。</p> : null}
      {workflow?.execution === 'pi_tool_loop' ? <p>研究服务收到 {count(workflow.toolCallCount)} 次调用，其中搜索 {count(workflow.searchCount)} 次、原文读取 {count(workflow.sourceReadCount)} 次。执行前校验失败的尝试计入模型用量回执。</p> : null}
      {planner?.status === 'invalid_output_fallback' ? <p className="paw-portable-note">规划输出无效，本轮仅检索原问题；规划调用仍计入用量。</p> : null}
      {queries.length ? <><h4>实际查询</h4><ol>{queries.map((query, index) => <li key={`${index}:${query}`}>{query}</li>)}</ol></> : null}
      {raw ? <><h4>检索命中的来源</h4><ul className="paw-portable-recalled">{[...sources.values()].map(({ source, selected }) => <li key={source.sourceId}>
        <button type="button" onClick={() => onOpen(source)}><BookOpen size={13} /><span>{source.title}</span></button><small>{selected ? '已入上下文' : deliveryUnknown ? '送达待核对' : '未入上下文'}</small>
      </li>)}</ul></> : null}
    </details> : null}
    <PortableUsageSummary value={turn} />
  </>;
}
