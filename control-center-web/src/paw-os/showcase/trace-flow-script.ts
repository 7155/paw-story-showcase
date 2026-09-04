export const PAW_TRACE_FLOW_SHOWCASE_ID = 'context-reliability' as const;

export type PawTraceFlowStageId = 'observe' | 'report' | 'repair' | 'verify';

export const pawTraceFlowShowcaseStages = [
  { id: 'observe', route: '/agent?session=session-reliability-incident', label: '运行异常' },
  { id: 'report', route: '/trace-agent', label: 'Trace 诊断' },
  { id: 'repair', route: '/trace-agent', label: '授权修复' },
  { id: 'verify', route: '/trace-agent', label: '前后对比' },
] as const;

export type PawTraceFlowAnomaly = {
  sessionId: string;
  label: string;
  detail: string;
  traceId: string;
};

export const pawTraceFlowAnomalies: readonly PawTraceFlowAnomaly[] = [
  {
    sessionId: 'session-reliability-incident',
    label: 'Tool error',
    detail: 'workspace_write 成功后，旧 Workflow 因辅助登记失败回滚真实产物。',
    traceId: 'trace:before:tool-error',
  },
  {
    sessionId: 'session-reliability-slow',
    label: '耗时过长',
    detail: '同一回合运行 14m32s，发生 6 次重试，长时间没有有效进展。',
    traceId: 'trace:before:slow-runtime',
  },
  {
    sessionId: 'session-reliability-foreground',
    label: 'Sub Agent 前台化',
    detail: '本应后台执行的 Sub Agent 被提升到前台，阻塞主 Session。',
    traceId: 'trace:before:foreground-child',
  },
  {
    sessionId: 'session-reliability-skill-eval',
    label: 'Skill 测评异常',
    detail: 'Reviewer 只检查 Worker 自我总结，没有对照用户原始需求、程序行为与测试证据。',
    traceId: 'trace:before:skill-eval',
  },
] as const;

export function pawTraceFlowSessionAnomaly(sessionId: string): PawTraceFlowAnomaly | undefined {
  return pawTraceFlowAnomalies.find((item) => item.sessionId === sessionId);
}

export function isPawTraceFlowShowcase(
  search = typeof window === 'undefined' ? '' : window.location.search,
): boolean {
  return __CONTROL_PREVIEW__
    && new URLSearchParams(search).get('showcase') === PAW_TRACE_FLOW_SHOWCASE_ID;
}

export function pawTraceFlowShowcaseInstance(
  search = typeof window === 'undefined' ? '' : window.location.search,
): string {
  const value = new URLSearchParams(search).get('showcaseInstance')?.trim() ?? '';
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/u.test(value) ? value : 'trace-preview';
}

export type PawTraceShowcaseCommand = {
  channel: 'paw.showcase';
  version: 1;
  type: 'command';
  showcaseId: typeof PAW_TRACE_FLOW_SHOWCASE_ID;
  instanceId: string;
  requestId: string;
  replayEpoch: number;
  command: 'stage.set' | 'seek' | 'playback.set' | 'replay.reset';
  stageId?: PawTraceFlowStageId;
  eventIndex?: number;
  playing?: boolean;
};

export function isPawTraceShowcaseCommand(value: unknown): value is PawTraceShowcaseCommand {
  const item = record(value);
  return item.channel === 'paw.showcase'
    && item.version === 1
    && item.type === 'command'
    && item.showcaseId === PAW_TRACE_FLOW_SHOWCASE_ID
    && boundedId(item.instanceId)
    && boundedId(item.requestId)
    && integer(item.replayEpoch)
    && ['stage.set', 'seek', 'playback.set', 'replay.reset'].includes(String(item.command))
    && (!('stageId' in item) || isStageId(item.stageId))
    && (!('eventIndex' in item) || integer(item.eventIndex));
}

function isStageId(value: unknown): value is PawTraceFlowStageId {
  return value === 'observe' || value === 'report' || value === 'repair' || value === 'verify';
}

function boundedId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,120}$/u.test(value);
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
