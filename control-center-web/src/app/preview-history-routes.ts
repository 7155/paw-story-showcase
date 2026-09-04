import type { ControlPathId } from '@/platform/routes';
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
};

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
    textPreview: '一天输入很多，不代表每条都应该成为长期记忆。',
    text: '一天可能有上千次输入，但碎片和一次性内容不应该直接成为长期记忆；先整理，再按问题召回。',
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
      createdAtMs: Date.now() - item.minutesAgo * 60_000,
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
    totalCount: 1_284,
    nextCursor: '',
    limit: 50,
    rawTextVisible: false,
  };
}

function previewHistoryDetail(eventId: number): Record<string, unknown> {
  const selected = previewHistoryItems.find((item) => item.id === eventId);
  if (!selected) return { ok: false, reason: 'not_found' };
  const createdAtMs = Date.now() - selected.minutesAgo * 60_000;
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
      groupId: 'project:personal-agent-workbench',
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
