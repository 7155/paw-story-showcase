import { PREVIEW_REPORT_BYTES } from '@/features/agent/preview-data';
import {
  PAW_ROOM_FLOW_SHOWCASE_ID,
  pawRoomFlowShowcaseParticipants,
} from '@/paw-os/showcase/room-flow-script';

type PreviewRoomSnapshotOptions = {
  baseTimeMs?: number;
  throughSequence?: number;
};

function roomPostBlock(
  id: string,
  type: string,
  presentationKind: string,
  summary: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    schemaVersion: 'rag-ime.agent-block.v1',
    id,
    type,
    status: 'completed',
    presentationKind,
    data,
    summary,
    source: {},
    visibility: 'room_post',
    digest: 'd'.repeat(64),
    ref: `ref:${id}`,
    generation: 0,
  };
}

/**
 * The public Room fixture is also the showcase event script. `throughSequence`
 * lets the preview transport start from one durable user message and then
 * reveal the remaining events through the real Room subscription. A fresh
 * snapshot always contains every event emitted so far, matching Runtime
 * recovery semantics instead of maintaining a second UI-only timeline.
 */
export function previewRoomSnapshot(
  roomId: string,
  options: PreviewRoomSnapshotOptions = {},
) {
  const now = options.baseTimeMs ?? Date.now() - 60_000;
  const rootId = `${roomId}:turn-1`;
  const waveId = `${roomId}:wave-implementation`;
  const participants = pawRoomFlowShowcaseParticipants.map((participant) => ({
    schemaVersion: 'rag-ime.agent-participant.v1',
    id: participant.id,
    roomId,
    sessionId: participant.sessionId,
    roleId: participant.roleId,
    roleVersion: '1',
    displayName: participant.displayName,
    collaborationRole: participant.collaborationRole,
    status: 'active',
    ordinal: participant.ordinal,
    createdAtMs: now,
    lastSpokeAtMs: null,
  }));
  const participantById = new Map(
    pawRoomFlowShowcaseParticipants.map((participant) => [participant.id, participant]),
  );
  const event = (
    sequence: number,
    eventType: string,
    participantId: string | null,
    payload: Record<string, unknown>,
  ) => ({
    schemaVersion: 'rag-ime.agent-room-event.v1',
    eventId: `${roomId}:${sequence}`,
    roomId,
    sequence,
    turnId: rootId,
    eventType,
    participantId,
    sourceSessionId: participantId ? participantById.get(participantId)?.sessionId ?? '' : '',
    createdAtMs: now + sequence * 1_000,
    payload,
    resumeToken: `${roomId}:${sequence}`,
  });
  const roomPost = (
    postId: string,
    participantId: string,
    dispatchId: string,
    content: string,
    sequence: number,
    blocks?: Record<string, unknown>[],
  ) => ({
    schemaVersion: 'wisdom-weasel.room-post.v2',
    postId,
    roomId,
    rootId,
    generation: 0,
    dispatchId,
    authorActorRef: participantId,
    kind: 'result',
    visibility: 'room',
    content,
    idempotencyKey: postId,
    publicationSource: { kind: 'room_commit', ref: `commit:${postId}` },
    createdAtMs: now + sequence * 1_000,
    ...(blocks ? { blocks } : {}),
  });
  const workActivity = (
    sequence: number,
    participantId: string,
    dispatchId: string,
    sourceEventType: string,
    summary: string,
    extra: Record<string, unknown> = {},
  ) => event(sequence, 'participant_activity', participantId, {
    rootId,
    dispatchId,
    activityKind: 'work',
    sourceEventId: `${participantId}:${sourceEventType}:${sequence}`,
    sourceEventType,
    summary,
    ...extra,
  });

  const events = [
    event(1, 'user_message', null, {
      messageId: 'room-user-1',
      rootId,
      text: '完成 PAW 展示页：真实输入与语音、记忆/RAG，以及从行星关系进入真实 PAWOS 多窗口运行态。',
    }),
    event(2, 'route_decision', 'participant-input', {
      rootId,
      dispatchId: 'dispatch-input',
      targetParticipantId: 'participant-input',
      targetDisplayName: 'Input Agent',
      reason: '纵向负责智能输入与语音转文字',
      summary: 'Facilitator 分派 Input Agent · 实施批次',
      workItemId: 'room-work:input',
      waveId,
      phaseName: '实施批次',
      parallelIndex: 0,
      parallelSize: 3,
    }),
    event(3, 'route_decision', 'participant-memory', {
      rootId,
      dispatchId: 'dispatch-memory',
      targetParticipantId: 'participant-memory',
      targetDisplayName: 'Memory Agent',
      reason: '纵向负责记忆治理、Knowledge 与 RAG Trace',
      summary: 'Facilitator 分派 Memory Agent · 实施批次',
      workItemId: 'room-work:memory',
      waveId,
      phaseName: '实施批次',
      parallelIndex: 1,
      parallelSize: 3,
    }),
    event(4, 'route_decision', 'participant-room', {
      rootId,
      dispatchId: 'dispatch-room',
      targetParticipantId: 'participant-room',
      targetDisplayName: 'Room Agent',
      reason: '纵向负责行星关系与真实 PAWOS 多窗口',
      summary: 'Facilitator 分派 Room Agent · 实施批次',
      workItemId: 'room-work:room',
      waveId,
      phaseName: '实施批次',
      parallelIndex: 2,
      parallelSize: 3,
    }),
    workActivity(5, 'participant-input', 'dispatch-input', 'tool_started', '读取真实 VoiceFeature 与输入法组件', {
      toolCallId: 'tool-input-source',
      toolName: 'read_file',
      task: '实现智能输入与语音转文字展示',
      expectedOutput: '输入模式与语音模式可切换的真实交互展示',
      acceptanceCriteria: ['沿用真实前端术语', '语音定稿保守纠错', '不把实施回执冒充测试'],
    }),
    event(6, 'participant_delta', 'participant-input', {
      rootId,
      dispatchId: 'dispatch-input',
      messageId: 'room-assistant-input',
      delta: '已接入原始句子、窗口上下文、候选补全与写回状态；',
    }),
    event(7, 'participant_delta', 'participant-input', {
      rootId,
      dispatchId: 'dispatch-input',
      messageId: 'room-assistant-input',
      delta: '语音路径正在流式展示 interim transcript、热词与文字定稿。',
    }),
    workActivity(8, 'participant-input', 'dispatch-input', 'tool_finished', '输入与语音展示代码已完成，准备 WorkPatch', {
      toolCallId: 'tool-input-source',
      toolName: 'apply_patch',
      isError: false,
    }),
    event(9, 'room_post', 'participant-input', {
      rootId,
      dispatchId: 'dispatch-input',
      post: roomPost(
        'room-post-input',
        'participant-input',
        'dispatch-input',
        'WorkPatch 已提交：智能输入与语音转文字展示完成。实施伙伴未执行最终测试。',
        9,
      ),
    }),
    workActivity(10, 'participant-input', 'dispatch-input', 'message_completed', 'Input Agent 已封装 WorkPatch', {
      responsePostId: 'room-post-input',
      runtimeTurnId: 'runtime-turn-input',
      status: 'draft_ready',
      provider: 'openai',
      model: 'gpt-5.4',
      usageReported: true,
      cacheUsageReported: true,
      usage: { input: 7_820, output: 534, cacheRead: 4_800, cacheWrite: 0, totalTokens: 13_154 },
    }),
    event(11, 'turn_completed', 'participant-input', {
      rootId,
      dispatchId: 'dispatch-input',
      summary: 'Input WorkPatch 已送达 Facilitator',
    }),
    workActivity(12, 'participant-memory', 'dispatch-memory', 'tool_started', '整理 Docs、用户记忆与外挂 Knowledge 的权限边界', {
      toolCallId: 'tool-memory-source',
      toolName: 'read_file',
      task: '实现记忆与 RAG 展示',
      expectedOutput: '来源、权限、召回与 Trace/Eval 边界清晰的第二章',
      acceptanceCriteria: ['Project Docs 与用户记忆隔离', 'Knowledge 按需挂载', '建设中能力不冒充上线'],
    }),
    event(13, 'participant_delta', 'participant-memory', {
      rootId,
      dispatchId: 'dispatch-memory',
      messageId: 'room-assistant-memory',
      delta: '输入记录已按日聚合为时间线、词库与候选记忆；',
    }),
    event(14, 'participant_delta', 'participant-memory', {
      rootId,
      dispatchId: 'dispatch-memory',
      messageId: 'room-assistant-memory',
      delta: 'Embedding、Hybrid、Rerank 与 Agentic RAG 已分开展示真实回执和 AI 判断。',
    }),
    workActivity(15, 'participant-memory', 'dispatch-memory', 'tool_finished', '记忆与 RAG 展示代码已完成，准备 WorkPatch', {
      toolCallId: 'tool-memory-source',
      toolName: 'apply_patch',
      isError: false,
    }),
    event(16, 'room_post', 'participant-memory', {
      rootId,
      dispatchId: 'dispatch-memory',
      post: roomPost(
        'room-post-memory',
        'participant-memory',
        'dispatch-memory',
        'WorkPatch 已提交：记忆、Knowledge、RAG 与 Trace/Eval 边界展示完成。实施伙伴未执行最终测试。',
        16,
      ),
    }),
    workActivity(17, 'participant-memory', 'dispatch-memory', 'message_completed', 'Memory Agent 已封装 WorkPatch', {
      responsePostId: 'room-post-memory',
      runtimeTurnId: 'runtime-turn-memory',
      status: 'draft_ready',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      usageReported: true,
      cacheUsageReported: true,
      usage: { input: 8_430, output: 612, cacheRead: 5_200, cacheWrite: 320, totalTokens: 14_562 },
    }),
    event(18, 'turn_completed', 'participant-memory', {
      rootId,
      dispatchId: 'dispatch-memory',
      summary: 'Memory WorkPatch 已送达 Facilitator',
    }),
    workActivity(19, 'participant-room', 'dispatch-room', 'tool_started', '接入真实 PawDesktop、PawWindowLayer 与 Room 事件流', {
      toolCallId: 'tool-room-source',
      toolName: 'read_file',
      task: '实现从行星到真实 PAWOS 多窗口的连续动画',
      expectedOutput: '真实 Room 窗口、伙伴窗口与有序事件投影',
      acceptanceCriteria: ['终态是实际 PAWOS', '单路流式输出', 'Reviewer 独立启动'],
    }),
    event(20, 'participant_delta', 'participant-room', {
      rootId,
      dispatchId: 'dispatch-room',
      messageId: 'room-assistant-room',
      delta: '太阳保留 Goal 身份，三颗实施行星正在映射到各自 participant window；',
    }),
    event(21, 'participant_delta', 'participant-room', {
      rootId,
      dispatchId: 'dispatch-room',
      messageId: 'room-assistant-room',
      delta: '分派、工具、增量、WorkPatch 和回执按 sequence 单路投影。',
    }),
    workActivity(22, 'participant-room', 'dispatch-room', 'tool_finished', '真实 PAWOS 运行导演已完成，准备 WorkPatch', {
      toolCallId: 'tool-room-source',
      toolName: 'apply_patch',
      isError: false,
    }),
    event(23, 'room_post', 'participant-room', {
      rootId,
      dispatchId: 'dispatch-room',
      post: roomPost(
        'room-post-room',
        'participant-room',
        'dispatch-room',
        'WorkPatch 已提交：行星过渡与真实 PAWOS 多窗口运行态完成。实施伙伴未执行最终测试。',
        23,
      ),
    }),
    workActivity(24, 'participant-room', 'dispatch-room', 'message_completed', 'Room Agent 已封装 WorkPatch', {
      responsePostId: 'room-post-room',
      runtimeTurnId: 'runtime-turn-room',
      status: 'draft_ready',
      provider: 'openai',
      model: 'gpt-5.4',
      usageReported: true,
      cacheUsageReported: true,
      usage: { input: 9_260, output: 748, cacheRead: 6_400, cacheWrite: 0, totalTokens: 16_408 },
    }),
    event(25, 'turn_completed', 'participant-room', {
      rootId,
      dispatchId: 'dispatch-room',
      summary: 'Room WorkPatch 已送达 Facilitator · 实施批次 3/3 完成',
    }),
    event(26, 'route_decision', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      targetParticipantId: 'participant-review',
      targetDisplayName: 'Reviewer',
      reason: 'Facilitator 已收到 3/3 WorkPatch，现启动独立测试批次',
      summary: 'Facilitator 启动 Reviewer · 测试批次',
      workItemId: 'room-work:review',
      waveId: `${roomId}:wave-review`,
      phaseName: '独立测试',
      parallelIndex: 0,
      parallelSize: 1,
    }),
    workActivity(27, 'participant-review', 'dispatch-review', 'tool_started', '运行类型检查、构建与页面测试', {
      toolCallId: 'tool-review-build',
      toolName: 'pnpm test',
      task: '独立验证三个已整合 WorkPatch',
      expectedOutput: '可追溯的运行性与需求忠实度双轴结论',
      acceptanceCriteria: ['所有要求逐项对照', '真实代码路径可运行', 'P0 = 0 才允许提交'],
    }),
    event(28, 'participant_delta', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      messageId: 'room-assistant-review',
      delta: '正在逐项核对：语音定稿、记忆权限、RAG 指标边界与真实 OS 窗口；',
    }),
    workActivity(29, 'participant-review', 'dispatch-review', 'tool_finished', '类型检查、构建与组件测试通过', {
      toolCallId: 'tool-review-build',
      toolName: 'pnpm test',
      isError: false,
    }),
    workActivity(30, 'participant-review', 'dispatch-review', 'tool_started', '启动真实浏览器验收与响应式检查', {
      toolCallId: 'tool-review-browser',
      toolName: 'playwright',
    }),
    event(31, 'participant_delta', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      messageId: 'room-assistant-review',
      delta: '桌面与窄屏关键交互可达；事件保持单路有序，没有多窗口消息交错刷屏。',
    }),
    workActivity(32, 'participant-review', 'dispatch-review', 'tool_finished', '浏览器验收完成，未发现 P0', {
      toolCallId: 'tool-review-browser',
      toolName: 'playwright',
      isError: false,
    }),
    event(33, 'room_post', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      post: roomPost(
        'room-post-review',
        'participant-review',
        'dispatch-review',
        '合成演示复核回执：运行性 passed，需求忠实度 satisfied，P0 = 0；允许 Facilitator 最终提交。',
        33,
        [roomPostBlock('room-review-report', 'file', 'file', '独立复核报告', {
          mediaId: 'media_showcasereview01',
          name: 'showcase-review-report.html',
          mimeType: 'text/html',
          byteSize: PREVIEW_REPORT_BYTES,
          sha256: 'c'.repeat(64),
        })],
      ),
    }),
    workActivity(34, 'participant-review', 'dispatch-review', 'message_completed', 'Reviewer 已提交独立双轴结论', {
      responsePostId: 'room-post-review',
      runtimeTurnId: 'runtime-turn-review',
      status: 'draft_ready',
      provider: 'openai',
      model: 'gpt-5.4',
      usageReported: true,
      cacheUsageReported: true,
      usage: { input: 10_280, output: 826, cacheRead: 7_200, cacheWrite: 0, totalTokens: 18_306 },
    }),
    event(35, 'turn_completed', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      summary: 'Reviewer 测试批次完成 · passed / satisfied / P0 0',
    }),
    event(36, 'turn_completed', null, {
      rootId,
      summary: 'Facilitator 已汇总实现与复核回执 · 最终提交完成',
    }),
  ];

  const maxSequence = events.length;
  const throughSequence = Math.max(1, Math.min(options.throughSequence ?? maxSequence, maxSequence));
  const visibleEvents = events.slice(0, throughSequence);
  const workItems = [
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'input',
      ownerId: 'participant-input',
      objective: '实现智能输入与语音转文字展示',
      expectedOutput: '输入模式与语音模式可切换的真实交互展示',
      acceptanceCriteria: ['沿用真实前端术语', '语音定稿保守纠错', '实施者不冒充 Reviewer'],
      throughSequence,
      dispatchSequence: 2,
      completedSequence: 11,
      evidenceRefs: ['workpatch:input-showcase'],
    }),
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'memory',
      ownerId: 'participant-memory',
      objective: '实现记忆、Knowledge、RAG 与 Trace/Eval 展示',
      expectedOutput: '来源、权限、召回和评测边界清晰的第二章',
      acceptanceCriteria: ['Project Docs 与用户记忆隔离', 'Knowledge 按需挂载', '建设中能力明确标注'],
      throughSequence,
      dispatchSequence: 3,
      completedSequence: 18,
      evidenceRefs: ['workpatch:memory-rag-showcase'],
    }),
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'room',
      ownerId: 'participant-room',
      objective: '实现行星到真实 PAWOS 多窗口运行态',
      expectedOutput: '真实 Room 窗口、伙伴窗口与有序事件投影',
      acceptanceCriteria: ['终态使用实际 PAWOS', '只显示一个流式输出焦点', 'Reviewer 独立启动'],
      throughSequence,
      dispatchSequence: 4,
      completedSequence: 25,
      evidenceRefs: ['workpatch:room-flow-showcase'],
    }),
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'review',
      ownerId: 'participant-review',
      objective: '独立测试整合后的展示页',
      expectedOutput: '运行性与需求忠实度双轴结论，且 P0 = 0',
      acceptanceCriteria: ['实施 WorkPatch 3/3 后才启动', '忠于用户原始需求', '代码无 P0'],
      throughSequence,
      dispatchSequence: 26,
      completedSequence: 35,
      evidenceRefs: ['test:typecheck', 'test:build', 'test:browser', 'review:p0-0'],
      reviewer: true,
    }),
  ];

  return {
    schemaVersion: 'rag-ime.agent-room-snapshot.v1',
    ok: true,
    room: {
      schemaVersion: 'rag-ime.agent-room.v1',
      id: roomId,
      title: roomId === PAW_ROOM_FLOW_SHOWCASE_ID ? 'PAW 展示页制作' : '展示协作 Room',
      status: 'active',
      executionMode: 'workspace_managed',
      roomKind: 'collaboration',
      avatar: 'briefcase',
      description: '三个纵向实施 WorkPatch 收齐后，由 Facilitator 启动独立 Reviewer 测试',
      routingPolicy: 'sequential',
      moderatorParticipantId: 'participant-facilitator',
      activeTopicId: 'topic-showcase',
      workspaceRoots: ['/Users/example/Projects/paw-story-showcase'],
      topics: [{
        schemaVersion: 'rag-ime.agent-room-topic.v1',
        id: 'topic-showcase',
        roomId,
        title: '真实 PAW 产品故事与运行态',
        summary: '输入、记忆/RAG 与多 Agent 三条纵向实施线，完成后独立复核。',
        status: 'active',
        ordinal: 0,
        createdAtMs: now,
        updatedAtMs: now + throughSequence * 1_000,
      }],
      artifacts: [],
      workItems,
      createdAtMs: now,
      updatedAtMs: now + throughSequence * 1_000,
      lastEventSequence: throughSequence,
      participants,
    },
    events: visibleEvents,
    firstSequence: 1,
    lastSequence: throughSequence,
    resumeToken: `${roomId}:${throughSequence}`,
    truncated: false,
  };
}

function showcaseWorkItem({
  acceptanceCriteria,
  completedSequence,
  dispatchSequence,
  evidenceRefs,
  expectedOutput,
  id,
  now,
  objective,
  ownerId,
  reviewer = false,
  roomId,
  rootId,
  throughSequence,
}: {
  acceptanceCriteria: string[];
  completedSequence: number;
  dispatchSequence: number;
  evidenceRefs: string[];
  expectedOutput: string;
  id: string;
  now: number;
  objective: string;
  ownerId: string;
  reviewer?: boolean;
  roomId: string;
  rootId: string;
  throughSequence: number;
}) {
  const completed = throughSequence >= completedSequence;
  const active = throughSequence >= dispatchSequence;
  return {
    schemaVersion: 'rag-ime.agent-room-work-item.v1',
    id: `room-work:${id}`,
    roomId,
    topicId: 'topic-showcase',
    rootTurnId: rootId,
    rootWorkId: `room-work:${id}`,
    parentWorkId: '',
    objective,
    expectedOutput,
    acceptanceCriteria,
    accountableParticipantId: 'participant-facilitator',
    currentOwnerParticipantId: ownerId,
    offeredToParticipantId: '',
    createdByParticipantId: 'participant-facilitator',
    clientMessageId: `showcase-assignment:${id}`,
    state: completed ? 'done' : active ? reviewer ? 'review' : 'active' : 'queued',
    depth: 1,
    revision: throughSequence,
    resultSummary: completed
      ? reviewer
        ? '独立复核通过：运行性 passed、需求 satisfied、P0 = 0。'
        : '实施 WorkPatch 已提交；最终测试由 Reviewer 负责。'
      : active
        ? reviewer ? '独立测试批次进行中。' : '实施中；尚未形成测试结论。'
        : reviewer ? '等待 Facilitator 收齐三个实施 WorkPatch。' : '等待实施批次开始。',
    artifactRefs: completed && !reviewer ? [`workpatch:${id}`] : [],
    evidenceRefs: completed ? evidenceRefs : [],
    ...(reviewer && completed ? {
      review: {
        operabilityVerdict: 'passed',
        requirementVerdict: 'satisfied',
        evidenceRefs,
        reason: '公开合成演示的类型、构建与浏览器检查均通过，未发现 P0。',
        reviewerParticipantId: ownerId,
        reviewedAtMs: now + completedSequence * 1_000,
      },
    } : {}),
    blocker: {},
    acceptedTurnId: completed ? `${rootId}:${id}` : '',
    createdAtMs: now + dispatchSequence * 1_000,
    updatedAtMs: now + Math.min(throughSequence, completedSequence) * 1_000,
    completedAtMs: completed ? now + completedSequence * 1_000 : null,
  };
}
