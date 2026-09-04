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
  const requestedSequence = Math.max(1, options.throughSequence ?? 69);
  const participants = pawRoomFlowShowcaseParticipants.map((participant) => ({
    schemaVersion: 'rag-ime.agent-participant.v1',
    id: participant.id,
    roomId,
    sessionId: participant.sessionId,
    roleId: participant.roleId,
    roleVersion: '1',
    displayName: participant.displayName,
    collaborationRole: participant.collaborationRole,
    status: participant.showcaseRole === 'reviewer' && requestedSequence < 58 ? 'muted' : 'active',
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
  const questionPost = (
    postId: string,
    sequence: number,
    prompt: string,
    options: { value: string; label: string; recommended?: boolean }[],
  ) => ({
    schemaVersion: 'wisdom-weasel.room-post.v2',
    postId,
    roomId,
    rootId,
    generation: 0,
    dispatchId: '',
    authorActorRef: 'participant-facilitator',
    kind: 'wait',
    visibility: 'room',
    content: prompt,
    question: { prompt, options },
    idempotencyKey: postId,
    publicationSource: { kind: 'room_commit', ref: `commit:${postId}` },
    createdAtMs: now + sequence * 1_000,
  });
  const notePost = (
    postId: string,
    sequence: number,
    content: string,
  ) => ({
    schemaVersion: 'wisdom-weasel.room-post.v2',
    postId,
    roomId,
    rootId,
    generation: 0,
    dispatchId: '',
    authorActorRef: 'participant-facilitator',
    kind: 'note',
    visibility: 'room',
    content,
    idempotencyKey: postId,
    publicationSource: { kind: 'room_commit', ref: `commit:${postId}` },
    createdAtMs: now + sequence * 1_000,
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

  const laneSpecs = [
    {
      id: 'input',
      participantId: 'participant-input',
      dispatchId: 'dispatch-input',
      displayName: 'Input Agent',
      skillRef: 'domain-modeling',
      searchSummary: '核对 Rime / Squirrel、完整输入事件与显式 Agent 入口的 owner 边界',
      toolName: 'workspace_read',
      toolArguments: { refs: ['input event contract', 'Rime candidate owner', 'post-commit prediction', 'Active RAG authority'], mode: 'read_only' },
      delta: '输入法保留 Rime 原生候选和分页；只有完整句子提交后才形成 input_event。短联想保持本地，显式生成才读取获准上下文。输入记录是后续整理的 Evidence，不直接等于长期 Memory。',
      resultSummary: '输入链路已拆成原生候选、完整输入、短联想与显式 Agent 四层；不让模型候选替代 Rime。',
      intercomTargetId: 'participant-runtime',
      intercomTargetName: 'Venus',
      intercomSummary: '行星通信 · Mars → Venus：交付 input_event 封口合同；只有完整输入和来源元数据进入 Memory 整理。',
      intercomRefs: ['contract:input-event-v1', 'decision:rime-native-owner'],
      postContent: 'WorkPatch · input-method-plan.md：Rime 原生候选、完整输入记录、本地联想与显式 Agent 入口已经分权；密码框、碎片和未封口拼音不进入整理。',
      usage: { input: 8_420, output: 684, cacheRead: 5_600, cacheWrite: 0, totalTokens: 14_704 },
    },
    {
      id: 'runtime',
      participantId: 'participant-runtime',
      dispatchId: 'dispatch-runtime',
      displayName: 'Memory / Context Agent',
      skillRef: 'rag-retrieval-optimization',
      searchSummary: '沿 Input Event → Evidence → Timeline / Atom → Recall Receipt 核对数据链',
      toolName: 'memory',
      toolArguments: { op: 'inspect_pipeline', sourceEvents: 1_284, target: 'today timeline + user preferences', rawInput: false },
      delta: '今天的 1,284 条完整输入先按语义任务聚合为 5 段活动，再把稳定偏好治理成 3 个 Atom。回答“今天做了什么”只召回 Timeline；回答“最近偏好”只召回相关 Atom，原始输入不整段回灌。',
      resultSummary: '1,284 条输入 → 5 个任务 → 3 条相关偏好；来源可追溯，未封口碎片和无关状态已排除。',
      intercomTargetId: 'participant-context',
      intercomTargetName: 'Jupiter',
      intercomSummary: '行星通信 · Venus → Jupiter：交付 bounded recall 合同；Room 只能按当前 WorkItem 请求 Timeline / Atom，不能复制整库。',
      intercomRefs: ['contract:memory-recall-v1', 'timeline:today', 'atom:real-frontend-first'],
      postContent: 'WorkPatch · memory-value-loop.md：真实 Input History、自动整理、活动时间线与 Agent 召回已闭成一条有来源回执的价值链。',
      usage: { input: 9_180, output: 742, cacheRead: 6_240, cacheWrite: 0, totalTokens: 16_162 },
    },
    {
      id: 'context',
      participantId: 'participant-context',
      dispatchId: 'dispatch-context',
      displayName: 'Multi-Agent / Room Agent',
      skillRef: 'implementation-planning',
      searchSummary: '把 PAW 立项拆成四个有依赖的 WorkItem，并定义 Partner 通信和唯一终态',
      toolName: 'room_partner',
      toolArguments: { op: 'plan', implementers: 4, communication: 'typed intercom', terminalOwner: 'Facilitator', sharedTranscript: false },
      delta: '四个 Partner 只接收有界 TaskBrief、ContextRefs 与 SkillRefs；行星通过带来源引用的 intercom 交换接口、依赖和反证。各自提交 WorkPatch，Facilitator 写 Docs；Reviewer 在 4/4 和 Docs 后才启动。',
      resultSummary: '并行不是四个独立答案：已定义 Mars→Venus→Jupiter→Saturn→Mars 的合同闭环与一个 Root final。',
      intercomTargetId: 'participant-room',
      intercomTargetName: 'Saturn',
      intercomSummary: '行星通信 · Jupiter → Saturn：交付 RoomEvent、WorkPatch 与 intercom 投影合同；OS 只显示权威事件。',
      intercomRefs: ['contract:room-event-v1', 'contract:workpatch-v1', 'decision:one-root-final'],
      postContent: 'WorkPatch · multi-agent-room-plan.md：四线并行、三次跨星交接、唯一 Root final、Docs 与 Reviewer 门禁已经写清。',
      usage: { input: 7_960, output: 816, cacheRead: 5_920, cacheWrite: 320, totalTokens: 15_016 },
    },
    {
      id: 'room-pawos',
      participantId: 'participant-room',
      dispatchId: 'dispatch-room',
      displayName: 'PAWOS Agent',
      skillRef: 'codemap',
      searchSummary: '映射 Input、Memory、Session、Room 与 Tool 怎样进入同一个 PAWOS 桌面',
      toolName: 'workspace_read',
      toolArguments: {
        op: 'owner map',
        refs: ['App registry', 'desktop store', 'Session / Room reducer', 'Electron + Ego / CDP host'],
        focus: 'projection, not a second Runtime',
      },
      delta: 'PAWOS 复用各 owner 的 reducer 和合同，把 Input Studio、Memory、Agent、Room、Trace 投影成真实窗口；它不复制 Session lifecycle 或 Room 状态机。发布宿主仍是 Electron WebView + Ego / CDP，source、build、foreground、release 分层验收。',
      resultSummary: '同一桌面可从输入记录跳到整理结果、Agent 召回和 Room 协作；OS 只投影权威状态。',
      intercomTargetId: 'participant-input',
      intercomTargetName: 'Mars',
      intercomSummary: '行星通信 · Saturn → Mars：回传真实 Input Studio 窗口约束；输入线无需另造展示面板。',
      intercomRefs: ['registry:input-studio', 'decision:pawos-projection', 'gate:foreground'],
      postContent: 'WorkPatch · pawos-projection-plan.md：Input、Memory、Agent 与 Room 已映射到真实 App；Electron / Ego / CDP 与前台验收边界保持可见。',
      usage: { input: 14_680, output: 1_220, cacheRead: 9_920, cacheWrite: 0, totalTokens: 25_820 },
    },
  ] as const;

  const laneEvents = [
    // 阶段 1：并行加载精准责任 Skill（seq 28..31）
    ...laneSpecs.map((lane, index) => workActivity(28 + index, lane.participantId, lane.dispatchId, 'tool_finished', '已加载精确 SkillRef · ' + lane.skillRef, {
      toolCallId: 'skill-' + lane.id,
      toolName: 'skill_load',
      isError: false,
      arguments: { name: lane.skillRef },
      result: { summary: '只加载当前纵向责任所需的 Skill 正文与引用。' },
    })),
    // 阶段 2：并行调用工具核对产品边界与证据（seq 32..35）
    ...laneSpecs.map((lane, index) => workActivity(32 + index, lane.participantId, lane.dispatchId, 'tool_started', lane.searchSummary, {
      toolCallId: 'tool-' + lane.id + '-inspect',
      toolName: lane.toolName,
      task: lane.searchSummary,
      arguments: lane.toolArguments,
      expectedOutput: '按时间保留问题、选择、首次收益、失败反证、迁移与当前判决',
      acceptanceCriteria: ['证据分级', '不倒填动机', 'OPEN-GAP 保持可见'],
    })),
    // 阶段 3：并行流式生成各责任线实施论述（seq 36..39）
    ...laneSpecs.map((lane, index) => event(36 + index, 'participant_delta', lane.participantId, {
      rootId,
      dispatchId: lane.dispatchId,
      messageId: 'room-assistant-' + lane.id,
      delta: lane.delta,
    })),
    // 阶段 4：并行跨星交接合同与证据引用（seq 40..43）
    ...laneSpecs.map((lane, index) => workActivity(40 + index, lane.participantId, lane.dispatchId, 'intercom_delivered', lane.intercomSummary, {
      toolCallId: 'intercom-' + lane.id + '-delivered',
      toolName: lane.toolName,
      isError: false,
      arguments: lane.toolArguments,
      result: { summary: lane.resultSummary },
      activityKind: 'intercom',
      category: 'intercom',
      phase: 'delivered',
      sourceParticipantId: lane.participantId,
      targetParticipantId: lane.intercomTargetId,
      targetDisplayName: lane.intercomTargetName,
      contextRefs: lane.intercomRefs,
    })),
    // 阶段 5：并行提交有界 WorkPatch（seq 44..47）
    ...laneSpecs.map((lane, index) => event(44 + index, 'room_post', lane.participantId, {
      rootId,
      dispatchId: lane.dispatchId,
      post: roomPost('room-post-' + lane.id, lane.participantId, lane.dispatchId, lane.postContent, 44 + index),
    })),
    // 阶段 6：伙伴正式汇合 AgentResult（seq 48..51）
    ...laneSpecs.map((lane, index) => workActivity(48 + index, lane.participantId, lane.dispatchId, 'message_completed', lane.displayName + ' 已提交有界 AgentResult', {
      responsePostId: 'room-post-' + lane.id,
      runtimeTurnId: 'runtime-turn-' + lane.id,
      status: 'draft_ready',
      provider: index === 2 ? 'anthropic' : 'openai',
      model: index === 2 ? 'claude-sonnet-4-5' : 'gpt-5.4',
      usageReported: true,
      cacheUsageReported: true,
      usage: lane.usage,
    })),
  ];

  const events = [
    event(1, 'user_message', null, {
      messageId: 'room-user-1',
      rootId,
      text: 'Pi 可以做成网关型 Agent 吗？就是本项目的输入法。如果像 Hermes 这样做可以吗？我希望以后手机或者聊天软件也能控制 Pi 和输入法这些。',
    }),
    workActivity(2, 'participant-facilitator', '', 'tool_started', '加载项目取证方法，只读取用户直接说过的话、Git 与当时 Docs', {
      toolCallId: 'skill-project-forensics',
      toolName: 'skill_load',
      arguments: { name: 'project-interview-forensics' },
      expectedOutput: '按时间还原当时问题、选择、失败反证与后来重构，不用今天的答案倒填动机',
    }),
    workActivity(3, 'participant-facilitator', '', 'tool_finished', 'project-interview-forensics 已加载，来源分类固定', {
      toolCallId: 'skill-project-forensics',
      toolName: 'skill_load',
      isError: false,
      arguments: { name: 'project-interview-forensics' },
      result: { summary: 'USER-DIRECT、Git、Docs、Test、Runtime 与 Agent interpretation 分开；引用材料不算用户判断。' },
    }),
    workActivity(4, 'participant-facilitator', '', 'tool_started', '读取已清洗的 Codex USER-DIRECT 索引', {
      toolCallId: 'read-user-direct-history',
      toolName: 'workspace_read',
      arguments: { refs: ['2026-07-13 Pi gateway', '2026-07-16 Memory curation', '2026-08-29 multi-Agent reversal'], mode: 'read_only' },
    }),
    workActivity(5, 'participant-facilitator', '', 'tool_finished', '找到三段因果连续的用户原话，开始逐轮核对', {
      toolCallId: 'read-user-direct-history',
      toolName: 'workspace_read',
      isError: false,
      arguments: { mode: 'read_only' },
      result: { summary: '已清洗出网关与输入、记忆治理、强规范多 Agent 反转三条 USER-DIRECT 证据；私有 Session 标识未进入公开 fixture。' },
    }),
    event(6, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: questionPost('scope-q1', 6, '你最早问“Pi 可以做成网关型 Agent 吗”。如果 Pi 已经持有会话，Sidecar 还要不要再做一层权威会话状态？', [
        { value: 'pi-runtime-input-parallel', label: 'Pi 管会话，Sidecar 与输入法平行', recommended: true },
        { value: 'sidecar-authority', label: 'Sidecar 再持有一套权威会话' },
      ]),
    }),
    event(7, 'user_message', null, {
      messageId: 'room-user-scope-1',
      rootId,
      text: 'pi-runtime-input-parallel',
      displayText: 'Sidecar 权威会话状态中间层会影响效率，应该和输入法平行。Pi 保留会话，输入法和 Sidecar 做适配。',
      answerToPostId: 'scope-q1',
    }),
    event(8, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: notePost('scope-a1', 8, '🟢 第一段已核对：Pi 是会话与 Tool loop 的 owner；输入法、Sidecar 和多端入口是并行 adapter，不再各自复制会话真相。'),
    }),
    event(9, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: questionPost('scope-q2', 9, '后来你说输入法的零散输入很乱。什么才算一段完整输入，哪些内容绝对不能直接进 Agent 上下文？', [
        { value: 'sealed-input', label: '按 App / 时间拼接，Backspace 修正，回车封口', recommended: true },
        { value: 'raw-keystrokes', label: '每个词和按键都直接写入 Memory' },
      ]),
    }),
    event(10, 'user_message', null, {
      messageId: 'room-user-scope-2',
      rootId,
      text: 'sealed-input',
      displayText: '杜绝噪声和单个词注入 Agent 上下文。同一软件短时间自动拼接，Backspace 判断删除，回车判断当前输入结束。',
      answerToPostId: 'scope-q2',
    }),
    event(11, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: notePost('scope-a2', 11, '🟢 第二段已核对：封口后的完整输入才进入 Evidence；闪电联想可临时读取当前缓冲，但碎片不进入长期 Memory。'),
    }),
    event(12, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: questionPost('scope-q3', 12, '整理 Memory 时，Agent 怎么知道已有的书、原则和 Tag？这应该做成 Skill，还是返回结构化变更的 Tool？', [
        { value: 'skill-plus-tool', label: 'Skill 讲流程，Tool 返回结构化变更', recommended: true },
        { value: 'prompt-all-memory', label: '把全部记忆塞进提示词' },
      ]),
    }),
    event(13, 'user_message', null, {
      messageId: 'room-user-scope-3',
      rootId,
      text: 'skill-plus-tool',
      displayText: '应该是工具，不是技能，因为这个涉及结构化返回。Skill 负责教整理流程，Tool 负责返回可以检查的变更。',
      answerToPostId: 'scope-q3',
    }),
    event(14, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: notePost('scope-a3', 14, '🟢 第三段已核对：Skill 只描述如何治理；Tool 暴露快照、候选变更和结构化回执，用户仍能在 Memory UI 审核。'),
    }),
    event(15, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: questionPost('scope-q4', 15, '再往后那套强规范多 Agent，为什么一开始要把交流方式和必交文件都规定死，后来又为什么跑不下去？', [
        { value: 'light-room', label: '保留责任语义，删除第二套完成 Kernel', recommended: true },
        { value: 'more-gates', label: '继续增加硬门与必交文件' },
      ]),
    }),
    event(16, 'user_message', null, {
      messageId: 'room-user-scope-4',
      rootId,
      text: 'light-room',
      displayText: '最开始那套强规范多 Agent，会把 Agent 怎么交流、结束后必须上传哪些文件都设定好；但这样经常导致流程跑不下去。这个要结合 Git tree，看当时为什么选，后面又怎么改。',
      answerToPostId: 'scope-q4',
    }),
    event(17, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: notePost('scope-a4', 17, '🟡 第四段保留为重构主线：强 Kernel 的初衷是责任与审计，反证是 ghost completion、硬门阻塞和重复 owner；当前用 Pi Session + Light Room 收口。'),
    }),
    event(18, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: questionPost('scope-q5', 18, '现在回头梳理这几个月，应该按每天硬拆，还是把 Git、Docs 和 Codex 对话合成有因果关系的阶段？', [
        { value: 'causal-stages', label: '按因果阶段合并，三类证据对齐', recommended: true },
        { value: 'daily-cards', label: '每天一张卡，不管有没有新判断' },
      ]),
    }),
    event(19, 'user_message', null, {
      messageId: 'room-user-scope-5',
      rootId,
      text: 'causal-stages',
      displayText: '可能好几天的工作才有一次真正有价值的变化。按阶段合并，但 Git、Docs 和 Codex 对话要能按日期回去核对，重点看技术选型、失败和重大重构。',
      answerToPostId: 'scope-q5',
    }),
    event(20, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: questionPost('scope-q-complete', 20, '五轮需求对齐已完成，网关 owner、输入封口、Skill / Tool、强 Room 反转与因果证据链已收敛。是否确认完成需求对齐任务，并启动 4 伙伴并行实施？', [
        { value: 'confirm-start-parallel', label: '确认完成需求对齐，启动实施', recommended: true },
        { value: 'continue-grill', label: '暂不启动，继续修改需求' },
      ]),
    }),
    event(21, 'user_message', null, {
      messageId: 'room-user-scope-confirm',
      rootId,
      text: 'confirm-start-parallel',
      displayText: '确认完成需求对齐，启动实施。按规划分派 Input、Memory、Multi-Agent 与 PAWOS 四条产品线。',
      answerToPostId: 'scope-q-complete',
    }),
    event(22, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: notePost('scope-a-complete', 22, '🟢 需求对齐任务已确认完成，五轮决策已收口归档，正式分派 4 位伙伴进入并行实施协同模式。'),
    }),
    workActivity(23, 'participant-facilitator', '', 'tool_finished', '四个 Partner Session 已创建，各自只收到有界 TaskBrief 与跨线接口', {
      toolCallId: 'delegate-product-lanes',
      toolName: 'room_partner',
      isError: false,
      arguments: { op: 'delegate_batch' },
      result: {
        operation: 'delegate_batch',
        summary: '4 条产品线并行；同一 PAW 立项 Goal，通过 typed intercom 通信，不共享私有 transcript。',
        partners: laneSpecs.map((lane) => ({ displayName: lane.displayName, collaborationRole: 'implementer' })),
      },
    }),
    ...laneSpecs.map((lane, index) => event(24 + index, 'route_decision', lane.participantId, {
      rootId,
      dispatchId: lane.dispatchId,
      targetParticipantId: lane.participantId,
      targetDisplayName: lane.displayName,
      reason: lane.searchSummary,
      summary: 'Facilitator 分派 ' + lane.displayName + ' · PAW 立项实施批次',
      workItemId: 'room-work:' + lane.id,
      waveId,
      phaseName: '纵向产品实施',
      parallelIndex: index,
      parallelSize: laneSpecs.length,
    })),
    ...laneEvents,
    workActivity(52, 'participant-facilitator', '', 'tool_finished', 'Facilitator 已收齐 4/4 WorkPatch 与四次行星通信回执', {
      toolCallId: 'partner-status-project',
      toolName: 'room_partner',
      isError: false,
      arguments: { op: 'status' },
      result: { summary: '4 个 Partner 已提交；等待 Docs 整合。' },
    }),
    event(53, 'participant_delta', null, {
      rootId,
      dispatchId: '',
      messageId: 'room-assistant-integration',
      delta: '四条线已经闭合：Mars 把封口后的 input_event 交给 Venus；Venus 把 bounded recall 合同交给 Jupiter；Jupiter 把 RoomEvent / WorkPatch 投影合同交给 Saturn；Saturn 再把真实 Input Studio 窗口约束回传 Mars。',
    }),
    workActivity(54, 'participant-facilitator', '', 'tool_finished', '已加载 organize-work-documents，准备写入接受后的 PAW 立项文档', {
      toolCallId: 'skill-organize-docs',
      toolName: 'skill_load',
      isError: false,
      arguments: { name: 'organize-work-documents' },
      result: { summary: '只整理已接受语义；歧义保持原 owner，Runtime 状态不写入 Markdown。' },
    }),
    workActivity(55, 'participant-facilitator', '', 'tool_started', '写入产品北极星、四线合同、行星通信图与分层验收清单', {
      toolCallId: 'write-project-docs',
      toolName: 'edit',
      arguments: {
        files: ['PROJECT.md', 'OUTCOMES.md', 'DECISIONS.md', 'ARCHITECTURE.md'],
        mode: 'source-linked',
      },
      acceptanceCriteria: ['四条产品线可追溯', '跨星接口有 owner', 'synthetic 与 Runtime 分开', 'OPEN-GAP 不消失'],
    }),
    workActivity(56, 'participant-facilitator', '', 'tool_finished', 'PAW 立项 Docs 写入完成，并生成四份可追踪回执', {
      toolCallId: 'write-project-docs',
      toolName: 'edit',
      isError: false,
      arguments: { mode: 'source-linked' },
      result: { summary: 'north star + four workstreams + intercom contracts + evidence gates written; no Runtime claim added.' },
    }),
    event(57, 'room_post', 'participant-facilitator', {
      rootId,
      dispatchId: '',
      post: roomPost(
        'room-post-integrated-docs',
        'participant-facilitator',
        '',
        '整合回执：PAW 立项北极星、输入 / Memory / 多 Agent / PAWOS 四条产品线、四次行星通信合同与验收边界已写入；真实 Runtime、安装与发布仍标 OPEN-GAP。',
        57,
        [roomPostBlock('room-project-docs', 'file', 'file', 'PAW 立项文档', {
          mediaId: 'media_pawkickoffdocs01',
          name: 'paw-project-kickoff.html',
          mimeType: 'text/html',
          byteSize: PREVIEW_REPORT_BYTES,
          sha256: 'b'.repeat(64),
        })],
      ),
    }),
    event(58, 'route_decision', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      targetParticipantId: 'participant-review',
      targetDisplayName: 'Reviewer',
      reason: 'Facilitator 已收齐 4/4 WorkPatch、四次行星通信回执并完成 Docs 整合，现启动独立复核',
      summary: 'Facilitator 启动 Reviewer · 独立复核批次',
      workItemId: 'room-work:review',
      waveId: roomId + ':wave-review',
      phaseName: '独立复核',
      parallelIndex: 0,
      parallelSize: 1,
    }),
    workActivity(59, 'participant-review', 'dispatch-review', 'tool_finished', 'Reviewer 已加载 independent-review', {
      toolCallId: 'skill-independent-review',
      toolName: 'skill_load',
      isError: false,
      arguments: { name: 'independent-review' },
      result: { summary: '固定范围：原始 Goal、四份 WorkPatch、整合 Docs 与公开数据边界。' },
    }),
    workActivity(60, 'participant-review', 'dispatch-review', 'tool_started', '逐项核对四条产品线、跨星合同、真实前端路由与公开证明边界', {
      toolCallId: 'review-project-kickoff',
      toolName: 'read',
      arguments: { artifacts: 6, checks: ['chronology', 'attribution', 'evidence', 'owner', 'public-safety'] },
      acceptanceCriteria: ['产品线 4/4', '行星通信 4/4', '真实 App 路由 4/4', 'P0 = 0'],
    }),
    event(61, 'participant_delta', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      messageId: 'room-assistant-review',
      delta: '发现 1 个 P0：PAWOS WorkPatch 写成“桌面负责同步 Session / Room 状态”，等于在 OS 内重建第二套 Runtime，与立项决定冲突。',
    }),
    workActivity(62, 'participant-review', 'dispatch-review', 'tool_finished', '首轮复核返回：P0 = 1，禁止最终提交', {
      toolCallId: 'review-project-kickoff',
      toolName: 'read',
      isError: true,
      result: { summary: 'PAWOS ownership boundary failed; revise projection language and rerun.' },
    }),
    event(63, 'room_post', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      post: roomPost(
        'room-post-review-returned',
        'participant-review',
        'dispatch-review',
        'Review Returned：把 PAWOS 改回 Input / Memory / Session / Room owner 的 Control 与 Observability projection；桌面只操作窗口，不复制状态机。其他三条产品线与四次行星通信通过。',
        63,
      ),
    }),
    workActivity(64, 'participant-facilitator', '', 'tool_finished', 'Facilitator 已按 Reviewer 修正 PAWOS owner 边界，没有改写其他 WorkPatch', {
      toolCallId: 'fix-pawos-owner',
      toolName: 'edit',
      isError: false,
      arguments: { file: 'ARCHITECTURE.md', section: 'PAWOS projection boundary' },
      result: { summary: '桌面只投影 owner reducer；Session / Room / Memory / Tool 机械事实仍由 Runtime 提供。' },
    }),
    workActivity(65, 'participant-review', 'dispatch-review', 'tool_finished', '复跑立项检查：4/4 产品线、4/4 行星通信、4/4 真实 App 路由通过', {
      toolCallId: 'review-project-kickoff-rerun',
      toolName: 'read',
      isError: false,
      result: { summary: 'P0 = 0; OPEN-GAP 仍可见; synthetic data label present.' },
    }),
    event(66, 'room_post', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      post: roomPost(
        'room-post-review',
        'participant-review',
        'dispatch-review',
        '独立复核回执：PAW 立项产品线 4/4，行星通信 4/4，真实 App 路由 4/4，Skill / Tool / Memory / Docs owner 清晰，P0 1 → 0；允许 Facilitator 提交公开合成 Demo。',
        66,
        [roomPostBlock('room-review-report', 'file', 'file', 'PAW 立项独立复核报告', {
          mediaId: 'media_pawkickoffreview01',
          name: 'paw-project-kickoff-review.html',
          mimeType: 'text/html',
          byteSize: PREVIEW_REPORT_BYTES,
          sha256: 'c'.repeat(64),
        })],
      ),
    }),
    workActivity(67, 'participant-review', 'dispatch-review', 'message_completed', 'Reviewer 已提交独立结论与修订回路', {
      responsePostId: 'room-post-review',
      runtimeTurnId: 'runtime-turn-review',
      status: 'draft_ready',
      provider: 'openai',
      model: 'gpt-5.4',
      usageReported: true,
      cacheUsageReported: true,
      usage: { input: 12_460, output: 1_086, cacheRead: 8_720, cacheWrite: 0, totalTokens: 22_266 },
    }),
    event(68, 'turn_completed', 'participant-review', {
      rootId,
      dispatchId: 'dispatch-review',
      summary: 'Reviewer 独立复核完成 · P0 1 → 0 · passed',
    }),
    event(69, 'turn_completed', null, {
      rootId,
      summary: 'Facilitator 已汇总立项追问、4/4 WorkPatch、行星通信、Docs 与 Reviewer 回执 · PAW 立项 Demo 完成',
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
      objective: '定义输入法、本地候选、完整输入与显式 Agent 的产品边界',
      expectedOutput: 'Rime owner、post-commit 联想、input_event 封口与 Agent 入口合同',
      acceptanceCriteria: ['不替代 Rime 原生候选', '碎片不进入整理', '显式生成才读取获准上下文'],
      throughSequence,
      dispatchSequence: 24,
      completedSequence: 48,
      evidenceRefs: ['contract:input-event-v1', 'workpatch:input-method-plan'],
    }),
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'runtime',
      ownerId: 'participant-runtime',
      objective: '定义从 1,284 条输入到时间线、偏好 Atom 与按题召回的数据链',
      expectedOutput: 'Input Event → Evidence → Timeline / Atom → Recall Receipt',
      acceptanceCriteria: ['原始输入不整库回灌', '时间线与偏好分开', '来源可下钻'],
      throughSequence,
      dispatchSequence: 25,
      completedSequence: 49,
      evidenceRefs: ['contract:memory-recall-v1', 'workpatch:memory-value-loop'],
    }),
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'context',
      ownerId: 'participant-context',
      objective: '定义四个 Partner 如何并行、通信、提交 WorkPatch 并汇成一个 Root final',
      expectedOutput: 'TaskBrief → typed intercom → WorkPatch → Docs → Reviewer',
      acceptanceCriteria: ['行星通信可见', '实施者不冒充 Reviewer', '只有 Facilitator 提交最终结果'],
      throughSequence,
      dispatchSequence: 26,
      completedSequence: 50,
      evidenceRefs: ['contract:room-event-v1', 'workpatch:multi-agent-room-plan'],
    }),
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'room-pawos',
      ownerId: 'participant-room',
      objective: '定义 PAWOS 如何把 Input、Memory、Agent 与 Room 投影到一个真实桌面',
      expectedOutput: 'App registry、owner reducer、Window projection 与 Electron / Ego / CDP host 边界',
      acceptanceCriteria: ['OS 不造第二 Runtime', '真实 App 代替自绘面板', 'foreground/release OPEN-GAP 保留'],
      throughSequence,
      dispatchSequence: 27,
      completedSequence: 51,
      evidenceRefs: ['decision:pawos-projection', 'workpatch:pawos-projection-plan'],
    }),
    showcaseWorkItem({
      roomId,
      rootId,
      now,
      id: 'review',
      ownerId: 'participant-review',
      objective: '独立复核 PAW 立项四线合同、行星通信、真实前端与最终 Docs',
      expectedOutput: '产品线 4/4、行星通信 4/4、真实 App 路由 4/4 与 P0 结论',
      acceptanceCriteria: ['4/4 WorkPatch 和整合 Docs 后才启动', '错误归因必须退回修订', 'P0 = 0 才通过'],
      throughSequence,
      dispatchSequence: 58,
      completedSequence: 68,
      evidenceRefs: ['review:lanes-4-of-4', 'review:intercom-4-of-4', 'review:real-apps-4-of-4', 'review:p0-0'],
      reviewer: true,
    }),
  ];

  return {
    schemaVersion: 'rag-ime.agent-room-snapshot.v1',
    ok: true,
    room: {
      schemaVersion: 'rag-ime.agent-room.v1',
      id: roomId,
      title: roomId === PAW_ROOM_FLOW_SHOWCASE_ID ? 'PAW 立项' : '协作 Room',
      status: 'active',
      executionMode: 'workspace_managed',
      permissionPolicy: {
        schemaVersion: 'rag-ime.room-permission-policy.v1',
        room: { executionMode: 'workspace_managed' },
        partner: { executionMode: 'inherit' },
        toolAgent: { executionMode: 'inherit' },
      },
      roomKind: 'collaboration',
      avatar: 'briefcase',
      description: '五轮 USER-DIRECT 核对后，输入、Memory、多 Agent 与 PAWOS 四线并行，通过有来源的交接交换合同，写入 Docs 后独立复核',
      routingPolicy: 'sequential',
      moderatorParticipantId: 'participant-facilitator',
      activeTopicId: 'topic-showcase',
      workspaceRoots: ['/Users/example/Projects/paw-story-showcase'],
      topics: [{
        schemaVersion: 'rag-ime.agent-room-topic.v1',
        id: 'topic-showcase',
        roomId,
        title: 'PAW 立项',
        summary: '从真实 Codex 用户直述还原网关、输入封口、Skill / Tool 与强 Room 反转；四条产品线再交换接口与证据。',
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
        ? '独立复核通过：4/4 产品线、4/4 行星通信、4/4 真实 App 路由，P0 1 → 0。'
        : '产品 WorkPatch 已提交；跨线整合与 Docs 由 Facilitator、Reviewer 负责。'
      : active
        ? reviewer ? '独立测试批次进行中。' : '实施中；尚未形成测试结论。'
        : reviewer ? '等待 Facilitator 收齐四个 WorkPatch 并完成 Docs 整合。' : '等待纵向产品实施批次开始。',
    artifactRefs: completed && !reviewer ? [`workpatch:${id}`] : [],
    evidenceRefs: completed ? evidenceRefs : [],
    ...(reviewer && completed ? {
      review: {
        operabilityVerdict: 'passed',
        requirementVerdict: 'satisfied',
        evidenceRefs,
        reason: '公开合成演示完成四线合同、行星通信、真实前端与数据边界复核；首轮 P0 已修订并复跑通过。',
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
