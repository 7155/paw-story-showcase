import type { PawOsAppId } from '@/features/paw-os/model/app-registry';

export const PAW_MEMORY_FLOW_SHOWCASE_ID = 'memory-flow' as const;
export const PAW_SHOWCASE_CHANNEL = 'paw.showcase' as const;
export const PAW_SHOWCASE_VERSION = 1 as const;

export type PawMemoryFlowStageId =
  | 'history-list'
  | 'history-detail'
  | 'daily-memory'
  | 'graph'
  | 'recall'
  | 'evidence';

export type PawMemoryFlowShowcaseStage = {
  id: PawMemoryFlowStageId;
  appId: PawOsAppId;
  route: string;
  label: string;
  title: string;
  detail: string;
  readyText: string;
  durationMs: number;
};

export const pawMemoryFlowShowcaseStages: readonly PawMemoryFlowShowcaseStage[] = [
  {
    id: 'history-list',
    appId: 'input-studio',
    route: '/history',
    label: '查看采集结果',
    title: '先看今天采集到的完整输入',
    detail: '鼠标定位到一条具体记录；列表只显示脱敏摘要。',
    readyText: '一天输入很多',
    durationMs: 4_200,
  },
  {
    id: 'history-detail',
    appId: 'input-studio',
    route: '/history',
    label: '打开原始输入',
    title: '点击记录 202，读取它的完整输入与采集上下文',
    detail: '详情来自 History owner，不由 Memory 复制第二份原文。',
    readyText: '完整文本',
    durationMs: 4_800,
  },
  {
    id: 'daily-memory',
    appId: 'memory',
    route: '/memory?view=timeline',
    label: '一天整理结果',
    title: '关闭原文，再切到 Memory 看今天整理成什么',
    detail: '1,284 条来源被压成 5 个可核对任务，仍保留来源。',
    readyText: '5 个可核对任务',
    durationMs: 5_000,
  },
  {
    id: 'graph',
    appId: 'memory',
    route: '/memory?view=relations',
    label: '关系 Graph',
    title: '点击关系图，查看任务、偏好、主题与来源的连接',
    detail: 'Graph 是已整理关系的投影，不创造新的记忆事实。',
    readyText: '关系图',
    durationMs: 4_800,
  },
  {
    id: 'recall',
    appId: 'agent',
    route: '/agent?session=session-memory',
    label: '对话找回',
    title: '打开 Agent，一句普通对话自然找回今天',
    detail: '回答快速流式出现；不会把全天原始输入整段灌入上下文。',
    readyText: '今天有点累',
    durationMs: 5_200,
  },
  {
    id: 'evidence',
    appId: 'agent',
    route: '/agent?session=session-memory',
    label: '证据回跳',
    title: '展开召回回执，沿来源回到同一条原始输入',
    detail: 'Memory → 来源记录 → History 202，整条链可以逐级核对。',
    readyText: '记忆召回',
    durationMs: 6_800,
  },
] as const;

export type PawShowcaseCommandName = 'stage.set' | 'seek' | 'playback.set' | 'replay.reset';

export type PawMemoryShowcaseCommand = {
  channel: typeof PAW_SHOWCASE_CHANNEL;
  version: typeof PAW_SHOWCASE_VERSION;
  type: 'command';
  showcaseId: typeof PAW_MEMORY_FLOW_SHOWCASE_ID;
  instanceId: string;
  requestId: string;
  replayEpoch: number;
  command: PawShowcaseCommandName;
  stageId?: PawMemoryFlowStageId;
  eventIndex?: number;
  playing?: boolean;
};

export function pawMemoryFlowShowcaseStageIsReady(
  stage: PawMemoryFlowShowcaseStage,
  visibleText: string,
): boolean {
  return visibleText.includes(stage.readyText);
}

export function isPawMemoryFlowShowcase(
  search = typeof window === 'undefined' ? '' : window.location.search,
): boolean {
  return __CONTROL_PREVIEW__
    && new URLSearchParams(search).get('showcase') === PAW_MEMORY_FLOW_SHOWCASE_ID;
}

export function pawMemoryFlowShowcaseInstance(
  search = typeof window === 'undefined' ? '' : window.location.search,
): string {
  const value = new URLSearchParams(search).get('showcaseInstance')?.trim() ?? '';
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/u.test(value) ? value : 'memory-preview';
}

export function isPawMemoryShowcaseCommand(value: unknown): value is PawMemoryShowcaseCommand {
  const item = record(value);
  return item.channel === PAW_SHOWCASE_CHANNEL
    && item.version === PAW_SHOWCASE_VERSION
    && item.type === 'command'
    && item.showcaseId === PAW_MEMORY_FLOW_SHOWCASE_ID
    && boundedId(item.instanceId)
    && boundedId(item.requestId)
    && integer(item.replayEpoch)
    && ['stage.set', 'seek', 'playback.set', 'replay.reset'].includes(String(item.command))
    && (!('stageId' in item) || isStageId(item.stageId))
    && (!('eventIndex' in item) || integer(item.eventIndex))
    && (!('playing' in item) || typeof item.playing === 'boolean');
}

function isStageId(value: unknown): value is PawMemoryFlowStageId {
  return pawMemoryFlowShowcaseStages.some((stage) => stage.id === value);
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
