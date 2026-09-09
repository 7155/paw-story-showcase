import type { PortableSource, SourceLocator, SourceRead } from './SourceReader';

export type PortableSelection = { provider: string; model: string; thinkingLevel: string };
export type PortableUsage = Record<string, unknown> & {
  calls?: number; inputTokens?: number | null; outputTokens?: number | null;
  cacheReadTokens?: number | null; cacheWriteTokens?: number | null; totalTokens?: number | null;
  elapsedMs?: number | null; costUsd?: number | null; estimatedCostUsd?: number | null;
  [key: string]: unknown;
};
export type PortableProgress = { stage?: string; text?: string; message?: string; detail?: string; sources?: PortableSource[];
  knowledge?: Record<string, unknown>; retrievalHits?: unknown[]; usage?: PortableUsage;
  assistantUsage?: PortableUsage; usageScopes?: Record<string, PortableUsage>; stageReceipts?: Record<string, PortableUsage>;
  usageScope?: string; updatedAtMs?: number; [key: string]: unknown };
export type PortableResult = { text?: string; sources?: PortableSource[]; knowledge?: Record<string, unknown>;
  retrievalHits?: unknown[]; usage?: PortableUsage; assistantUsage?: PortableUsage;
  usageScopes?: Record<string, PortableUsage>; stageReceipts?: Record<string, PortableUsage>; usageScope?: string; [key: string]: unknown };
export type PortableRecord = { requestId: string; actionId: string; input: Record<string, string>; state: string; createdAtMs?: number;
  version?: number; result?: PortableResult; progress?: PortableProgress; message?: string; model?: PortableSelection };
export type PortableBridge = {
  models: () => Promise<{ catalog: unknown; selected: PortableSelection }>;
  invoke?: (actionId: string, values: Record<string, string>, options: { requestId?: string; model?: PortableSelection; signal: AbortSignal; onProgress: (progress: PortableProgress) => void }) => Promise<PortableResult>;
  history?: () => Promise<PortableRecord[]>;
  reconcile?: (requestId: string) => Promise<PortableRecord>;
  readSource?: (locator: SourceLocator & { appVersion?: number }) => Promise<SourceRead>;
  downloadReport?: (turn: PortableTurn) => boolean;
  ready?: () => void;
  capabilities?: { progress?: boolean; cancel?: boolean; sourceReader?: boolean; reportExport?: boolean };
};
export type PortableConversationOptions = {
  title: string; description?: string; welcome?: string; suggestions?: string[]; placeholder?: string;
  actionId?: string; sourcesActionId?: string; questionField?: string; contextField?: string;
  footer?: string;
};
export type PortableTurn = { id: string; question: string; actionId: string; values: Record<string, string>; createdAtMs: number;
  state: string; output: string; sources: PortableSource[]; stages: { stage: string; label: string; at: number }[];
  finalOutputConfirmed?: boolean; requestId?: string; error?: string; restored?: boolean; version?: number;
  knowledge?: Record<string, unknown>; retrievalHits?: unknown[]; usage?: PortableUsage; assistantUsage?: PortableUsage;
  usageScopes?: Record<string, PortableUsage>; stageReceipts?: Record<string, PortableUsage>; usageScope?: string };

export const portableStageLabels: Record<string, string> = { queued: '已收到问题', context_ready: '应用资料已就绪',
  planning: '正在规划检索问题',
  researching: '正在按需查证资料',
  retrieving: '正在检索论文', sources_ready: '已找到资料', model_starting: '正在准备回答', model_wait: '正在等待响应',
  thinking: '正在分析问题', answering: '正在整理回答', completed: '回答已完成', failed: '本轮未完成',
  cancelled: '本轮已停止', interrupted: '连接中断', unconfirmed: '完成状态尚未确认', running: '正在处理' };
export const unresolvedPortableState = (state: string) => ['unconfirmed', 'interrupted', 'running', 'queued'].includes(state);
export const portableObject = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
function metadata(turn: PortableTurn, value: Record<string, unknown>): PortableTurn {
  const result = { ...turn };
  for (const key of ['knowledge', 'usage', 'assistantUsage', 'usageScopes', 'stageReceipts'] as const) {
    const supplied = portableObject(value[key]);
    if (supplied) (result as Record<string, unknown>)[key] = { ...(portableObject(turn[key]) ?? {}), ...supplied };
  }
  if (Array.isArray(value.retrievalHits)) result.retrievalHits = value.retrievalHits;
  if (typeof value.usageScope === 'string') result.usageScope = value.usageScope;
  return result;
}
export function applyPortableProgress(turn: PortableTurn, progress: PortableProgress): PortableTurn {
  const stage = progress.stage || turn.state; const label = portableStageLabels[stage] || '正在处理';
  const at = progress.updatedAtMs ?? Date.now();
  return { ...metadata(turn, progress), state: stage, output: typeof progress.text === 'string' ? progress.text : turn.output,
    sources: Array.isArray(progress.sources) ? progress.sources : turn.sources,
    stages: turn.stages.at(-1)?.stage === stage ? turn.stages : [...turn.stages, { stage, label, at }].slice(-32) };
}
export function applyPortableResult(turn: PortableTurn, result: PortableResult): PortableTurn {
  return applyPortableProgress({ ...metadata(turn, result), error: undefined, finalOutputConfirmed: typeof result.text === 'string' && Boolean(result.text.trim()) }, {
    stage: 'completed', text: result.text ?? turn.output, sources: result.sources ?? turn.sources,
  });
}
export function portableRecordTurn(row: PortableRecord, questionField: string, previous?: PortableTurn): PortableTurn {
  const events = Array.isArray(row.progress?.events) ? row.progress.events : [];
  const stages = events.flatMap((raw) => {
    const event = portableObject(raw); return typeof event?.stage === 'string' && typeof event.atMs === 'number'
      ? [{ stage: event.stage, label: portableStageLabels[event.stage] ?? '正在处理', at: event.atMs }] : [];
  });
  const turn: PortableTurn = { ...previous, id: row.requestId, requestId: row.requestId,
    question: row.input?.[questionField] ?? previous?.question ?? '', actionId: row.actionId,
    values: row.input ?? previous?.values ?? {}, createdAtMs: row.createdAtMs ?? previous?.createdAtMs ?? Date.now(),
    finalOutputConfirmed: typeof row.result?.text === 'string' && Boolean(row.result.text.trim()),
    state: row.state, version: row.version ?? previous?.version,
    output: row.result?.text ?? row.progress?.text ?? previous?.output ?? '',
    sources: row.result?.sources ?? row.progress?.sources ?? previous?.sources ?? [],
    stages: stages.length ? stages : previous?.stages ?? [], error: row.message, restored: true };
  const restored = metadata(metadata(turn, row.progress ?? {}), row.result ?? {});
  return applyPortableProgress(restored, { stage: row.state, text: turn.output, sources: turn.sources });
}
