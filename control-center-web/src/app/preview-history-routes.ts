import { publicMemoryCorpus } from './preview-memory-corpus';
import type { ControlPathId } from '@/platform/routes';
import taskStory from '../../../showcase/task-story.v1.json';
import type { ControlRequest } from '@/platform/transport';
import type { MockRouteHandler } from '@/test/mock-transport';

const HISTORY_EVENT_ID = 201;
const HISTORY_RUNTIME_REVISION = 12;
const HISTORY_PAYLOAD_SHA256 = `sha256:${'1'.repeat(64)}`;
const HISTORY_SUBJECT_REVISION = `sha256:${'2'.repeat(64)}`;
const HISTORY_PREVIEW_TOKEN = 'preview-history-tombstone-token-v1';

type PreviewHistoryItem = {
  id: number;
  minutesAgo: number;
  source: 'rime_commit' | 'voice' | 'assistant_candidate';
  app: string;
  project: string;
  textPreview: string;
  text: string;
  phase?: string;
  sourceTime?: string;
};

export const previewMemorySourceExamples: readonly PreviewHistoryItem[] = [
  ...publicMemoryCorpus.map(row => ({ id: row.eventId, text: row.text, project:row.project,app:row.app,phase:row.phase,sourceTime:row.sourceTime })),
  { id: 10001, text: '面向用户的解释先给结论，再补充必要原因。' },
  { id: 10002, text: '除最新内容外，其他内容也应保留；网页只需更新，不必每次重写全部内容。' },
  { id: 10003, text: '测试、合成回放和真实运行状态必须分别陈述。' },
  { id: 10004, text: '演示应使用真实前端组件，不能用静态示意替代操作。' },
  { id: 10005, text: '减少重复说明，让操作和结果保持清楚。' },
].map((item, index) => ({ ...item, textPreview: item.text, minutesAgo: 190 + index * 10, source: ('app' in item && item.app==='Voice' ? 'voice' : 'rime_commit') as PreviewHistoryItem['source'], app: 'app' in item ? String(item.app) : 'Public Memory Source', project: 'project' in item ? String(item.project) : 'personal-agent-workbench' }));

export const previewMemoryInputSources = previewMemorySourceExamples.filter(source=>!source.phase||source.phase==='committed');

const previewHistoryItems: readonly PreviewHistoryItem[] = [
  {
    id: 201,
    minutesAgo: 18,
    source: 'rime_commit',
    app: 'PAW Project Docs',
    project: 'personal-agent-workbench',
    textPreview: '输入法先保留 Rime 原生候选，AI 联想等完整句子提交后再出现。',
    text: '输入法先保留 Rime 原生候选；AI 联想只在完整句子提交后出现，不能替代或重排原生候选。',
  },
  {
    id: 202,
    minutesAgo: 42,
    source: 'voice',
    app: 'PAW Agent',
    project: 'personal-agent-workbench',
    textPreview: '一天输入很多，先记住 PAW 工作台这条已接受的决定。',
    text: taskStory.memory,
  },
  {
    id: 203,
    minutesAgo: 71,
    source: 'rime_commit',
    app: 'PAW Room',
    project: 'personal-agent-workbench',
    textPreview: '多 Agent 并行必须共享 Goal、边界和一个最终结果。',
    text: '多 Agent 并行必须共享 Goal、边界和一个最终结果；实施伙伴不能各自宣布整个项目完成。',
  },
  {
    id: 204,
    minutesAgo: 96,
    source: 'assistant_candidate',
    app: 'PAW Room',
    project: 'personal-agent-workbench',
    textPreview: '行星之间要交换接口、依赖和证据，不能只是同时开四个窗口。',
    text: '行星之间要交换接口、依赖和证据；只有互相通信并被主 Room 汇合，才算真实协作。',
  },
  {
    id: 205,
    minutesAgo: 134,
    source: 'rime_commit',
    app: 'PAWOS',
    project: 'personal-agent-workbench',
    textPreview: 'PAWOS 投影 Runtime 事实，不再创建第二套状态机。',
    text: 'PAWOS 负责把 Session、Room、Memory 和 Tool 状态投影成可操作窗口；事实仍由原 Runtime owner 提供。',
  },
  {
    id: 206,
    minutesAgo: 168,
    source: 'voice',
    app: 'PAW Agent',
    project: 'personal-agent-workbench',
    textPreview: '给用户的回答先说结果，再补必要证据。',
    text: '给用户的回答先说结果，再补必要证据；测试、合成回放和真实运行状态必须分别陈述。',
  },
  ...previewMemoryInputSources,
] as const;

type PreviewRoutes = Partial<Record<ControlPathId, MockRouteHandler>>;

export function createPreviewHistoryRoutes(): PreviewRoutes {
  return {
    'history.page': (request: ControlRequest) => previewHistoryPage(record(request.query)),
    'history.detail': (request: ControlRequest) =>
      previewHistoryDetail(Number(record(request.query).eventId ?? 0)),
    'history.tombstone.preview': (request: ControlRequest) => {
      const body = record(request.body);
      const eventId = Number(body.eventId ?? HISTORY_EVENT_ID);
      return {
        schemaVersion: 'rag-ime.management-work-preview.v1',
        ok: true,
        previewToken: HISTORY_PREVIEW_TOKEN,
        pathId: 'history.tombstone.apply',
        payloadSha256: HISTORY_PAYLOAD_SHA256,
        expectedRevision: {
          runtimeRevision: Number(body.expectedRuntimeRevision ?? HISTORY_RUNTIME_REVISION),
          subjectRevision: HISTORY_SUBJECT_REVISION,
        },
        expiresAtMs: Date.now() + 300_000,
        requiredConfirm: 'apply',
        summary: {
          title: '让这条记录不再参与记忆？',
          items: [`记录 ${eventId} 将停止参与后续召回；原始输入仍会保留。`],
          risk: 'R2',
        },
      };
    },
    'history.tombstone.apply': (request: ControlRequest) =>
      previewHistoryReceipt('history.tombstone.apply', request, true),
    'history.tombstone.rollback': (request: ControlRequest) =>
      previewHistoryReceipt('history.tombstone.rollback', request, false),
  };
}

function previewHistoryPage(query: Record<string, unknown>): Record<string, unknown> {
  const search = stringValue(query.query).trim().toLocaleLowerCase('zh-CN');
  const filter = stringValue(query.filter);
  const items = previewHistoryItems
    .filter((item) => (
      (!search
        || item.textPreview.toLocaleLowerCase('zh-CN').includes(search)
        || item.app.toLocaleLowerCase('en-US').includes(search))
      && (!filter || item.source === filter)
    ))
    .map((item) => ({
      id: item.id,
      createdAtMs: previewHistoryCreatedAtMs(item),
      source: item.source,
      app: item.app,
      project: item.project,
      textPreview: item.textPreview,
      textChars: item.text.length,
      contextHash: HISTORY_SUBJECT_REVISION,
    }));
  return {
    ok: true,
    runtimeRevision: HISTORY_RUNTIME_REVISION,
    items,
    totalCount: items.length,
    nextCursor: '',
    limit: Math.max(50, items.length),
    rawTextVisible: false,
  };
}

function previewHistoryDetail(eventId: number): Record<string, unknown> {
  const selected = previewHistoryItems.find((item) => item.id === eventId);
  if (!selected) return { ok: false, reason: 'not_found' };
  const createdAtMs = previewHistoryCreatedAtMs(selected);
  return {
    ok: true,
    runtimeRevision: HISTORY_RUNTIME_REVISION,
    rawTextVisible: true,
    item: {
      id: selected.id,
      createdAtMs,
      source: selected.source,
      text: selected.text,
      textChars: selected.text.length,
      app: selected.app,
      project: selected.project,
      provider: 'local',
      candidateRank: null,
      groupId: selected.project.startsWith('project-') ? selected.project.replace(/^project-/, 'project:') : `project:${selected.project}`,
      groupLevel: 'project',
      auxiliaryContext: {
        available: true,
        text: '同一任务中的相邻输入只作为整理上下文；公开演示不展示原始私人内容。',
        textChars: 34,
        truncated: false,
        hasAdditionalText: true,
        captureSource: 'accessibility',
        captureMode: 'foreground_selection',
        fallbackReason: '',
        fieldContextChars: 39,
        imeBufferChars: 0,
        modelRequestLinked: true,
      },
      status: 'active',
      feedback: {
        available: true,
        acceptedCount: 1,
        skippedCount: 0,
        pinned: false,
        downranked: false,
        deleted: false,
        updatedAtMs: createdAtMs + 10_000,
        latestAction: 'accept',
        latestActionAtMs: createdAtMs + 10_000,
      },
    },
  };
}

function previewHistoryReceipt(
  pathId: 'history.tombstone.apply' | 'history.tombstone.rollback',
  request: ControlRequest,
  rollbackAvailable: boolean,
): Record<string, unknown> {
  const body = record(request.body);
  return {
    schemaVersion: 'rag-ime.management-work-receipt.v1',
    ok: true,
    receiptId: `preview-history-receipt-${Date.now()}`,
    pathId,
    payloadSha256: stringValue(body.payloadSha256) || HISTORY_PAYLOAD_SHA256,
    appliedAtMs: Date.now(),
    auditId: HISTORY_EVENT_ID,
    rollbackAvailable,
    rollbackToken: rollbackAvailable ? 'preview-history-rollback-token-v1' : '',
    rollbackAuthority: { eventId: HISTORY_EVENT_ID },
    restartComponents: [],
    result: { runtimeRevision: HISTORY_RUNTIME_REVISION + 1 },
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function previewHistoryCreatedAtMs(item: {sourceTime?:string;minutesAgo:number}) {
 const recorded=item.sourceTime ? Date.parse(item.sourceTime) : NaN;
 return Number.isFinite(recorded) ? recorded : Date.now()-item.minutesAgo*60_000;
}
export function previewHistoryStats() {
 return {totalCount:previewHistoryItems.length,appCount:new Set(previewHistoryItems.map(item=>item.app)).size,
 activeDayCount:new Set(previewHistoryItems.map(item=>new Date(previewHistoryCreatedAtMs(item)).toISOString().slice(0,10))).size,
 voiceCount:previewHistoryItems.filter(item=>item.source==='voice').length,
 phaseExcludedCount:previewMemorySourceExamples.length-previewMemoryInputSources.length};
}
