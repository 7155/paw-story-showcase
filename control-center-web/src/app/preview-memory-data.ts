import type { ControlRequest } from '@/platform/transport';
import type {
  MemoryReferenceV1,
  Reference,
  ReferenceKind,
} from '@/contracts/generated/memory-reference.v1';

export function previewLocalDate(value = Date.now()): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function previewMemoryPage(
  request: ControlRequest,
  _evidenceDisposition: string,
): Record<string, unknown> {
  const kind = stringValue(record(request.params).kind);
  if (kind === 'evidence') {
    return {
      ok: true,
      items: [
        {
          id: 'source:preview-conclusion-first',
          title: '面向用户的解释先给结论，再补充必要原因。',
          detail: '已清洗治理样例 · 原始输入不进入公开展示',
          status: 'consolidated',
          disposition: 'consolidated',
          sourceChannel: 'input_method',
          transportSource: 'squirrel_rime_commit_burst',
          source: { type: 'input_event', id: 'event:sanitized:10001' },
          ref: { type: 'evidence', id: 'source:preview-conclusion-first' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10001' }],
          type: 'user_final',
          ownerKind: 'user',
          ownerId: 'default',
          updatedAtMs: Date.now() - 86_400_000,
        },
        {
          id: 'source:preview-preserve-existing',
          title: '除最新内容外，其他内容也应保留。',
          detail: '已清洗治理样例 · 只在相关任务中召回',
          status: 'consolidated',
          disposition: 'consolidated',
          sourceChannel: 'input_method',
          transportSource: 'squirrel_rime_commit_burst',
          source: { type: 'input_event', id: 'event:sanitized:10002' },
          ref: { type: 'evidence', id: 'source:preview-preserve-existing' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10002' }],
          type: 'user_final',
          ownerKind: 'user',
          ownerId: 'default',
          updatedAtMs: Date.now() - 7_200_000,
        },
        {
          id: 'evidence:preview-agent-capture',
          title: '当理解与代码事实不一致时，明确指出并基于源码证据修正。',
          detail: '伙伴整理后的治理候选 · 可下钻来源',
          status: 'active',
          sourceChannel: 'agent_capture',
          source: { type: 'agent_memory_evidence', id: 'evidence:preview-agent-capture' },
          ref: { type: 'evidence', id: 'evidence:preview-agent-capture' },
          evidenceRefs: [{
            kind: 'event',
            referenceId: 'event:10003',
            title: '伙伴主动记录的长期记忆边界',
          }],
          type: 'session_digest',
          ownerKind: 'agent',
          ownerId: 'companion-present-v1',
          updatedAtMs: Date.now() - 3_600_000,
        },
        {
          id: 'source:preview-evidence-boundary',
          title: '测试、合成 Replay、安装态和真实前台要分别陈述，不能互相冒充。',
          detail: '已清洗治理样例 · 工程交付的证据等级规则',
          status: 'consolidated',
          disposition: 'consolidated',
          sourceChannel: 'input_method',
          transportSource: 'squirrel_rime_commit_burst',
          source: { type: 'input_event', id: 'event:sanitized:10003' },
          ref: { type: 'evidence', id: 'source:preview-evidence-boundary' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10003' }],
          type: 'user_final',
          ownerKind: 'user',
          ownerId: 'default',
          updatedAtMs: Date.now() - 5_400_000,
        },
        {
          id: 'source:preview-real-frontend',
          title: '不要把 resourceRevision、原子替换和完整多 Agent 并发安全混成一个概念。',
          detail: '已清洗治理样例 · 只在相关任务中召回',
          status: 'consolidated',
          disposition: 'consolidated',
          sourceChannel: 'input_method',
          transportSource: 'squirrel_rime_commit_burst',
          source: { type: 'input_event', id: 'event:sanitized:10004' },
          ref: { type: 'evidence', id: 'source:preview-real-frontend' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10004' }],
          type: 'user_final',
          ownerKind: 'user',
          ownerId: 'default',
          updatedAtMs: Date.now() - 7_800_000,
        },
      ],
      nextCursor: '',
      limit: 50,
    };
  }
  if (kind === 'books') {
    return {
      ok: true,
      items: [
        {
          id: 'book:preview-memory-governance',
          title: '技术表达、证据等级与 Agent 工作边界',
          summary: '把结论先行、术语精确和证明边界整理为可追溯 Atom；架构状态与代码事实仍留在项目文档。',
          status: 'active',
          source: { type: 'memory_book', id: 'book:preview-memory-governance' },
          ref: { type: 'book', id: 'book:preview-memory-governance' },
          evidenceRefs: [
            { kind: 'atom', referenceId: 'atom:conclusion-first', title: '结论先行' },
            { kind: 'atom', referenceId: 'atom:evidence-over-agreement', title: '源码证据高于顺从' },
          ],
          type: 'topic',
          ownerKind: 'user',
          ownerId: 'default',
          tags: ['表达品味', '证据规则', '并发边界'],
          updatedAtMs: Date.now() - 7_200_000,
        },
      ],
      nextCursor: '',
      limit: 50,
    };
  }
  if (kind === 'timelines') {
    const date = previewLocalDate();
    const timeline = previewActivityTimeline(date, 'approved');
    return {
      ok: true,
      items: [{
        id: timeline.timelineId,
        title: `${date} 语义任务时间线`,
        summary: timeline.summary,
        status: timeline.status,
        type: 'daily_activity_timeline',
        taskCount: timeline.segmentCount,
        eventCount: timeline.eventCount,
        source: timeline.source,
        ref: timeline.ref,
        evidenceRefs: (timeline.segments as Record<string, unknown>[])
          .flatMap((segment) => segment.evidenceRefs as Record<string, unknown>[]),
        updatedAtMs: timeline.updatedAtMs,
      }],
      nextCursor: '',
      limit: 50,
    };
  }
  return previewMemoryCatalogPage(kind);
}

export function previewMemoryReference(kind: string, referenceId: string): MemoryReferenceV1 {
  const now = Date.now();
  const referenceKind: ReferenceKind = (
    ['event', 'evidence', 'atom', 'book', 'timeline', 'role_book_revision'] as const
  ).includes(kind as ReferenceKind)
    ? kind as ReferenceKind
    : 'role_book_revision';
  const base = {
    schemaVersion: 'rag-ime.memory-reference.v1' as const,
    settingsRevision: 'settings:preview',
    runtimeRevision: 1,
    ok: true as const,
    kind: referenceKind,
    referenceId,
  };
  const makeReference = (
    targetKind: ReferenceKind,
    targetId: string,
    label?: string,
  ): Reference => ({
    kind: targetKind,
    id: targetId,
    referenceKind: targetKind,
    referenceId: targetId,
    ...(label ? { label } : {}),
  });

  if (referenceKind === 'event') {
    const text = referenceId.endsWith('202')
      ? '一天可能有上千次输入，但碎片和一次性内容不应该直接成为长期记忆；先整理，再按问题召回。'
      : referenceId.endsWith('10001')
      ? '面向用户的解释先给结论，再补充必要原因。'
      : '除最新内容外，其他内容也应保留；网页只需更新，不必每次重写全部内容。';
    return {
      ...base,
      source: { kind: 'input_event', sourceKind: 'squirrel_input_segment', id: referenceId },
      ref: makeReference('event', referenceId),
      item: {
        id: referenceId,
        title: '已清洗输入依据',
        text,
        textPreview: text,
        status: 'active',
        sourceKind: 'squirrel_input_segment',
        app: 'public.showcase.preview',
        ownerKind: 'user',
        ownerId: 'default',
        occurredAtMs: now - 3_600_000,
      },
      evidenceRefs: [],
    };
  }
  if (referenceKind === 'evidence') {
    return {
      ...base,
      source: { kind: 'agent_memory_evidence', id: referenceId },
      ref: makeReference('evidence', referenceId),
      item: {
        id: referenceId,
        title: '伙伴对话整理依据',
        detail: '当理解与代码事实不一致时，明确指出并基于源码证据共同修正。',
        status: 'active',
        ownerKind: 'agent',
        ownerId: 'companion-present-v1',
        updatedAtMs: now - 2_400_000,
      },
      evidenceRefs: [makeReference('event', 'event:10002', '原始对话输入')],
    };
  }
  if (referenceKind === 'atom') {
    const atomContent = referenceId.includes('evidence-over-agreement')
      ? {
          title: '源码证据高于顺从',
          text: '当理解与代码事实不一致、方案不现实或描述不完整时，应明确指出并基于源码证据共同修正。',
        }
      : referenceId.includes('preserve-existing')
        ? {
            title: '保留已有内容',
            text: '除最新内容外，其他内容也应保留；网页只需更新，不必每次重写全部内容。',
          }
        : {
            title: '结论先行',
            text: '面向用户的解释先给结论，再补充必要原因。',
          };
    return {
      ...base,
      source: { kind: 'memory_atom', id: referenceId },
      ref: makeReference('atom', referenceId),
      item: {
        id: referenceId,
        title: atomContent.title,
        text: atomContent.text,
        status: 'active',
        claimState: 'current',
        ownerKind: 'user',
        ownerId: 'default',
        updatedAtMs: now - 120_000,
      },
      evidenceRefs: referenceId.includes('evidence-over-agreement')
        ? [makeReference('evidence', 'evidence:preview-compaction', '伙伴对话整理依据')]
        : [makeReference('event', 'event:sanitized:10001', '已清洗输入依据')],
    };
  }
  if (referenceKind === 'book') {
    return {
      ...base,
      source: { kind: 'memory_book', id: referenceId },
      ref: makeReference('book', referenceId),
      item: {
        id: referenceId,
        title: referenceId.includes('agent-runtime') ? '伙伴运行' : '表达品味与修改偏好',
        summary: '聚合当前 Atom 和来源证据，按当前问题提供有界检索入口。',
        status: 'active',
        type: 'topic',
        ownerKind: 'user',
        ownerId: 'default',
        updatedAtMs: now - 90_000,
      },
      evidenceRefs: [
        makeReference('atom', 'atom:conclusion-first', '结论先行'),
        makeReference('atom', 'atom:evidence-over-agreement', '源码证据高于顺从'),
      ],
    };
  }
  if (referenceKind === 'timeline') {
    const matchedDate = referenceId.match(/(20\d{2}-\d{2}-\d{2})/u)?.[1]
      ?? previewLocalDate();
    const timeline = previewActivityTimeline(matchedDate, 'approved');
    return {
      ...base,
      source: { kind: 'activity_timeline', id: referenceId },
      ref: makeReference('timeline', referenceId),
      item: {
        ...timeline,
        id: referenceId,
        title: `${matchedDate} 语义任务时间线`,
        status: 'approved',
      },
      evidenceRefs: [makeReference('event', 'event:202', '今天 10:18 的原始输入')],
    };
  }
  return {
    ...base,
    source: { kind: 'role_book_revision', id: referenceId },
    ref: makeReference('role_book_revision', referenceId),
    item: {
      id: referenceId,
      title: 'Agent 设置',
      detail: '维护角色使命、能力画像、协作习惯与已验证教训。',
      status: 'active',
      ownerKind: 'agent',
      ownerId: 'companion-present-v1',
      updatedAtMs: now - 60_000,
    },
    evidenceRefs: [makeReference('evidence', 'evidence:preview-compaction', '最近角色整理证据')],
  };
}

export function previewMemorySummary(timelineStatuses = new Map<string, string>()): Record<string, unknown> {
  const today = previewLocalDate();
  const currentTimelineStatus = timelineStatuses.get(today) || 'draft';
  const activityTimelineCounts: Record<string, number> = {
    approved: 46,
    draft: 11,
    superseded: 404,
    rejected: 1,
  };
  if (timelineStatuses.has(today)) {
    activityTimelineCounts[currentTimelineStatus] = (activityTimelineCounts[currentTimelineStatus] ?? 0) + 1;
  }
  return {
    ok: true,
    runtimeRevision: 7,
    snapshotLabel: 'sanitized-local-aggregate-2026-08-28',
    appCount: 30,
    activeDayCount: 64,
    completeInputCount: 24_483,
    memoryItemCount: 15_219,
    blockedFragmentCount: 0,
    memoryBookCount: 108,
    memoryAtomCount: 566,
    memoryAtomArchivedCount: 0,
    memoryAtomSourceArchiveCount: 0,
    memoryTagCount: 398,
    activityTimelineCount: 462,
    timelineCount: 462,
    pendingCompileEvents: 0,
    evidenceSourceCount: 24_483,
    memoryEvidenceCount: 24_483,
    inputMethodEvidenceCount: 24_483,
    voiceEvidenceCount: 0,
    agentCapturedSourceCount: 0,
    agentCapturedEvidenceCount: 1,
    forgottenSourceCount: 0,
    needsReviewSourceCount: 0,
    currentAtomCount: 566,
    historicalAtomCount: 0,
    agentEvidenceCount: 1,
    agentEvidenceTombstonedCount: 4,
    roleBookRevisionCounts: { active: 3, draft: 1, superseded: 8 },
    activityTimelineCounts,
    governanceProposalCounts: { preview: 2, applied: 14, rolled_back: 1 },
    latestActivityTimeline: {
      date: today,
      status: currentTimelineStatus,
      updatedAtMs: Date.now() - 90_000,
    },
    projection: {
      fresh: true,
      backlog: 0,
      dead: 0,
      retrievalDocuments: 15_219,
      checkpointCaughtUp: true,
      vectorCoverage: 1,
    },
    owners: [
      { ownerKind: 'user', ownerId: 'default', itemCount: 15_219 },
      { ownerKind: 'agent', ownerId: 'companion-present-v1', itemCount: 566 },
    ],
  };
}

export function previewActivityTimeline(date: string, status: string): Record<string, unknown> {
  const dayStart = localPreviewDayStart(date);
  const hash = '8d4a2d9c1fc84d408f8fe9a314f34c767b28e32e5b6461d73cc8e22d2209dc11';
  const segments = [
    previewActivitySegment({
      id: 'session-runtime-boundary',
      position: 0,
      title: '确认 Session Runtime 的唯一 owner',
      apps: ['com.openai.codex', 'com.google.Chrome'],
      startMs: dayStart + 8.4 * 3_600_000,
      endMs: dayStart + 8.58 * 3_600_000,
      eventCount: 318,
      summary: '沿 Pi、PAW 与 Room 的调用链核对 transcript、Tool loop、Stop、compaction 和 recovery 由谁负责。',
      sourceKinds: ['squirrel_input_segment', 'pi_agent'],
      contextGroupIds: ['group:session-runtime', 'group:owner-boundary'],
    }),
    previewActivitySegment({
      id: 'memory-knowledge-boundary',
      position: 1,
      title: '拆开 Memory、Knowledge 与当前 Context',
      apps: ['com.openai.codex', 'com.google.Chrome'],
      startMs: dayStart + 9.2 * 3_600_000,
      endMs: dayStart + 12.1 * 3_600_000,
      eventCount: 276,
      summary: '把高频输入里的稳定偏好、项目事实、外挂资料和一次性任务分开，保留来源与授权。',
      sourceKinds: ['pi_agent', 'browser_extension', 'squirrel_input_segment'],
      contextGroupIds: ['group:context-engineering', 'group:memory-evaluation'],
      redactedEventCount: 2,
    }),
    previewActivitySegment({
      id: 'light-room-cutover',
      position: 2,
      title: 'Strong Room 切回 Light Room',
      apps: ['com.microsoft.VSCode', 'com.mitchellh.ghostty', 'com.openai.codex'],
      startMs: dayStart + 13.2 * 3_600_000,
      endMs: dayStart + 15.1 * 3_600_000,
      eventCount: 352,
      summary: '删除重复 Agent Runtime，让 Partner 回到普通 Pi Session，只保留派发、公共事件与一个 final。',
      sourceKinds: ['squirrel_input_segment', 'pi_agent'],
      contextGroupIds: ['group:room-runtime', 'group:pi-session', 'group:verification'],
    }),
    previewActivitySegment({
      id: 'room-frontend-iterations',
      position: 3,
      title: '验证多 Agent 的复合视图',
      apps: ['com.openai.codex', 'com.figma.Desktop'],
      startMs: dayStart + 15.3 * 3_600_000,
      endMs: dayStart + 17.4 * 3_600_000,
      eventCount: 221,
      summary: '分别用公开记录、任务表、关系视图和真实 Session 窗口回答因果、责任、协同与执行细节。',
      sourceKinds: ['squirrel_input_segment', 'pi_agent'],
      contextGroupIds: ['group:pawos-ui', 'group:frontend-craft'],
    }),
    previewActivitySegment({
      id: 'trace-repair-evidence',
      position: 4,
      title: '闭合 Trace 与 Repair 证据链',
      apps: ['com.openai.codex', 'com.mitchellh.ghostty'],
      startMs: dayStart + 17.6 * 3_600_000,
      endMs: dayStart + 18.9 * 3_600_000,
      eventCount: 117,
      summary: '把原失败、诊断报告、精确授权、变更证据、测试证据和同题复检绑定到同一来源链。',
      sourceKinds: ['pi_agent'],
      contextGroupIds: ['group:trace-runtime', 'group:repair-authority', 'group:verification'],
    }),
  ];
  return {
    schemaVersion: 'rag-ime.daily-activity-timeline.v1',
    timelineId: `timeline:${date}`,
    project: 'personal-agent-workbench',
    date,
    timezone: 'Asia/Shanghai',
    status,
    segmentationMode: 'semantic_task_v5',
    sourceEventIds: segments.flatMap((segment) => segment.sourceEventIds as number[]),
    sourceEventHash: hash,
    segments,
    summary: '1,284 条完整输入被整理为 5 个可核对任务：Session owner、Context 治理、Light Room、复合前端与 Trace repair。',
    eventCount: segments.reduce((sum, segment) => sum + Number(segment.eventCount), 0),
    segmentCount: segments.length,
    observedStartMs: Math.min(...segments.map((segment) => Number(segment.startMs))),
    observedEndMs: Math.max(...segments.map((segment) => Number(segment.endMs))),
    spanSemantics: 'first_to_last_source_event',
    ordinaryActivityCount: segments.filter((segment) => segment.activityKind === 'ordinary_activity').length,
    consolidatedActivityCount: segments.filter((segment) => segment.activityKind === 'consolidated_activity').length,
    approvedBookId: status === 'approved' ? `book:daily:${date}` : '',
    approvedBy: status === 'approved' ? 'control-center-user' : '',
    approvedAtMs: status === 'approved' ? Date.now() - 30_000 : 0,
    createdAtMs: dayStart + 18 * 3_600_000,
    updatedAtMs: Date.now() - 30_000,
    source: { type: 'daily_activity_timeline', id: `timeline:${date}` },
    ref: { type: 'timeline', id: `timeline:${date}` },
    policy: {
      derivedFromInputEvents: true,
      longTermFact: false,
      automaticPromotion: true,
      explicitApprovalRequired: false,
      minimumConsolidatedSpanMs: 30 * 60_000,
    },
  };
}

export function previewActivityTimelineCalendar(
  month: string,
  statuses: ReadonlyMap<string, string>,
): Record<string, unknown> {
  const monthStart = new Date(`${month}-01T00:00:00`);
  const daysInMonth = Number.isNaN(monthStart.getTime())
    ? 30
    : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const today = previewLocalDate();
  const latestSeedDay = today.startsWith(`${month}-`)
    ? Number(today.slice(-2))
    : daysInMonth;
  const seeded = [
    { day: Math.max(1, latestSeedDay - 8), status: 'approved', sourceEventCount: 42, segmentCount: 3, needsRefresh: false },
    { day: Math.max(1, latestSeedDay - 5), status: 'approved', sourceEventCount: 31, segmentCount: 2, needsRefresh: true },
    { day: Math.max(1, latestSeedDay - 3), status: 'draft', sourceEventCount: 27, segmentCount: 3, needsRefresh: false },
    { day: Math.max(1, latestSeedDay - 1), status: 'none', sourceEventCount: 18, segmentCount: 0, needsRefresh: false },
  ];
  const byDate = new Map(seeded.map((item) => [
    `${month}-${String(item.day).padStart(2, '0')}`,
    item,
  ]));
  for (const [date, status] of statuses) {
    if (!date.startsWith(`${month}-`)) continue;
    const current = byDate.get(date);
    byDate.set(date, {
      day: Number(date.slice(-2)),
      status,
      sourceEventCount: current?.sourceEventCount ?? (date === today ? 1_284 : 24),
      segmentCount: current?.segmentCount ?? (date === today ? 5 : 2),
      needsRefresh: false,
    });
  }
  const days = [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, item]) => {
    const organized = (item.status === 'approved' || item.status === 'draft') && !item.needsRefresh;
    return {
      date,
      status: item.status,
      organized,
      modelOrganized: organized && item.segmentCount > 0,
      needsRefresh: item.needsRefresh,
      sourceEventCount: item.sourceEventCount,
      timelineId: item.status === 'none' ? '' : `timeline:${date}`,
      timelineEventCount: item.needsRefresh ? Math.max(0, item.sourceEventCount - 6) : item.sourceEventCount,
      segmentCount: item.segmentCount,
      updatedAtMs: localPreviewDayStart(date) + 18 * 3_600_000,
    };
  });
  return {
    schemaVersion: 'rag-ime.activity-timeline-calendar.v1',
    ok: true,
    project: 'wisdom-weasel-rag-ime',
    timezone: 'Asia/Shanghai',
    month,
    summary: {
      sourceEventCount: days.reduce((sum, item) => sum + item.sourceEventCount, 0),
      activityDayCount: days.length,
      organizedDayCount: days.filter((item) => item.organized).length,
      approvedDayCount: days.filter((item) => item.status === 'approved' && item.organized).length,
      draftDayCount: days.filter((item) => item.status === 'draft' && item.organized).length,
      waitingDayCount: days.filter((item) => !item.organized).length,
      outdatedDayCount: days.filter((item) => item.needsRefresh).length,
    },
    days,
  };
}

function previewActivitySegment(input: {
  id: string;
  position: number;
  title: string;
  apps: string[];
  startMs: number;
  endMs: number;
  eventCount: number;
  summary: string;
  sourceKinds: string[];
  contextGroupIds: string[];
  redactedEventCount?: number;
}): Record<string, unknown> {
  const firstEventId = 10_001 + input.position * 100;
  const sourceEventIds = Array.from(
    { length: input.eventCount },
    (_, index) => firstEventId + index,
  );
  return {
    segmentId: `segment:${input.id}`,
    position: input.position,
    title: input.title,
    app: input.apps[0],
    apps: input.apps,
    sourceKinds: input.sourceKinds,
    contextGroupIds: input.contextGroupIds,
    startMs: Math.round(input.startMs),
    endMs: Math.round(input.endMs),
    activityKind: input.endMs - input.startMs >= 30 * 60_000 ? 'consolidated_activity' : 'ordinary_activity',
    spanSemantics: 'first_to_last_source_event',
    eventCount: input.eventCount,
    sourceEventIds,
    sourceEventHash: '24d18e6ea9f1d8dd36b957d3948dc6948c00c86173691104be5b3e24358da8bb',
    summary: input.summary,
    redactedEventCount: input.redactedEventCount ?? 0,
    evidenceRefs: sourceEventIds.map((eventId, index) => ({
      sourceType: 'input_event',
      sourceId: `event:${eventId}`,
      eventId,
      app: input.apps[index % input.apps.length],
      sourceKind: input.sourceKinds[index % input.sourceKinds.length],
      occurredAtMs: Math.round(
        input.startMs
        + ((input.endMs - input.startMs) * index) / Math.max(1, input.eventCount - 1),
      ),
      redacted: index < (input.redactedEventCount ?? 0),
    })),
    source: { type: 'daily_activity_timeline', id: `timeline:${new Date(input.startMs).toISOString().slice(0, 10)}` },
    ref: { type: 'timeline', id: `timeline:${new Date(input.startMs).toISOString().slice(0, 10)}` },
  };
}

export function previewTimelineDate(timelineId: string): string {
  const value = timelineId.startsWith('timeline:') ? timelineId.slice('timeline:'.length) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

function localPreviewDayStart(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function previewMemoryCatalogPage(kind: string): Record<string, unknown> {
  const common = { ok: true, nextCursor: '', limit: 50 };
  if (kind === 'apps') {
    return {
      ...common,
      rawTextVisible: false,
      items: [
        previewAppMemory('com.openai.codex', 'Codex', 3_501, 89, 8, Date.now() - 42_000),
        previewAppMemory('com.mitchellh.ghostty', 'Ghostty', 67, 10, 1, Date.now() - 320_000),
        previewAppMemory('com.microsoft.VSCode', 'VS Code', 26, 5, 1, Date.now() - 840_000),
        previewAppMemory('com.microsoft.edgemac', 'Edge', 8, 7, 0, Date.now() - 1_500_000),
        previewAppMemory('com.figma.Desktop', 'Figma', 412, 21, 2, Date.now() - 2_400_000),
        previewAppMemory('com.apple.Safari', 'Safari', 96, 6, 1, Date.now() - 3_300_000),
      ],
    };
  }
  if (kind === 'tags') {
    return {
      ...common,
      items: [
        { id: 'agent-runtime', tag: '伙伴运行', description: '会话、工具与执行边界', item_count: 18, edge_count: 2, color_token: 'teal', status: 'active', source: 'agent' },
        { id: 'memory-quality', tag: '记忆质量', description: '去噪、合并与来源约束', item_count: 14, edge_count: 2, color_token: 'green', status: 'active', source: 'agent' },
        { id: 'input-boundary', tag: '输入封口', description: 'Backspace 编辑，Enter 后持久化', item_count: 9, edge_count: 2, color_token: 'orange', status: 'active', source: 'agent' },
        { id: 'frontend-craft', tag: '前端工艺', description: '布局、字体与动效的统一约束', item_count: 12, edge_count: 3, color_token: 'violet', status: 'active', source: 'agent' },
        { id: 'verification', tag: '验收证据', description: '测试、构建与浏览器验收回执', item_count: 11, edge_count: 2, color_token: 'blue', status: 'active', source: 'agent' },
      ],
    };
  }
  if (kind === 'groups') {
    return {
      ...common,
      items: [
        { id: 'group:input-method', title: '输入法', note: '输入质量、候选与上下文注入', tags: ['输入封口', '记忆质量'], event_count: 34, color_token: 'teal', status: 'active', source: 'agent' },
        { id: 'group:agent', title: '伙伴运行资料', note: '会话、工具和长期记忆', tags: ['伙伴运行', '记忆质量'], event_count: 27, color_token: 'blue', status: 'active', source: 'agent' },
        { id: 'group:frontend-craft', title: '前端工艺', note: '布局、字体、动效与验收证据', tags: ['前端工艺', '验收证据'], event_count: 19, color_token: 'violet', status: 'active', source: 'agent' },
        { id: 'group:collab', title: '多 Agent 协作', note: 'Room 伙伴、WorkItem 与事件流', tags: ['伙伴运行', '验收证据'], event_count: 15, color_token: 'green', status: 'active', source: 'agent' },
      ],
    };
  }
  if (kind === 'atoms') {
    return {
      ...common,
      items: [
        {
          id: 'atom:conclusion-first',
          title: '结论先行',
          text: '面向用户的解释先给结论，再补充必要原因。',
          status: 'active',
          quality: 0.99,
          source: { type: 'memory_atom', id: 'atom:conclusion-first' },
          ref: { type: 'atom', id: 'atom:conclusion-first' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10001', title: '已清洗输入依据' }],
          tags: ['表达品味', '结果说明'],
          updatedAtMs: Date.now() - 120_000,
        },
        {
          id: 'atom:evidence-over-agreement',
          title: '源码证据高于顺从',
          text: '当理解与代码事实不一致、方案不现实或描述不完整时，应明确指出并基于源码证据共同修正。',
          status: 'active',
          quality: 0.99,
          source: { type: 'memory_atom', id: 'atom:evidence-over-agreement' },
          ref: { type: 'atom', id: 'atom:evidence-over-agreement' },
          evidenceRefs: [{ kind: 'evidence', referenceId: 'evidence:preview-compaction', title: '伙伴对话整理依据' }],
          tags: ['证据规则', '协作边界'],
          updatedAtMs: Date.now() - 240_000,
        },
        {
          id: 'atom:preserve-existing',
          title: '保留已有内容',
          text: '除最新内容外，其他内容也应保留；网页只需更新，不必每次重写全部内容。',
          status: 'active',
          quality: 0.94,
          source: { type: 'memory_atom', id: 'atom:preserve-existing' },
          ref: { type: 'atom', id: 'atom:preserve-existing' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10002', title: '已清洗输入依据' }],
          tags: ['修改偏好', '保留边界'],
          updatedAtMs: Date.now() - 360_000,
        },
        {
          id: 'atom:layout-consistency',
          title: '界面一致与隐私边界',
          text: '输入法候选框与控制界面的字体和布局保持统一，避免文字重叠；候选内容需先脱敏。',
          status: 'active',
          quality: 0.96,
          source: { type: 'memory_atom', id: 'atom:layout-consistency' },
          ref: { type: 'atom', id: 'atom:layout-consistency' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10003', title: '已清洗输入依据' }],
          tags: ['前端工艺', '隐私边界'],
          updatedAtMs: Date.now() - 540_000,
        },
        {
          id: 'atom:real-frontend-first',
          title: '真实前端优先',
          text: '先展示真实前端，再解释系统边界；重要内容不依赖小字，演示数据必须明确标注合成。',
          status: 'active',
          quality: 0.97,
          source: { type: 'memory_atom', id: 'atom:real-frontend-first' },
          ref: { type: 'atom', id: 'atom:real-frontend-first' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10004', title: '已清洗输入依据' }],
          tags: ['表达品味', '前端工艺'],
          updatedAtMs: Date.now() - 720_000,
        },
        {
          id: 'atom:simple-immersive',
          title: '简洁沉浸',
          text: '页面保持简洁沉浸式：一个视图一个焦点，去掉多余框层与装饰，转场保持同色系。',
          status: 'active',
          quality: 0.93,
          source: { type: 'memory_atom', id: 'atom:simple-immersive' },
          ref: { type: 'atom', id: 'atom:simple-immersive' },
          evidenceRefs: [{ kind: 'event', referenceId: 'event:sanitized:10005', title: '已清洗输入依据' }],
          tags: ['前端工艺', '修改偏好'],
          updatedAtMs: Date.now() - 900_000,
        },
      ],
    };
  }
  if (kind === 'phrases') {
    return { ...common, items: [{ id: 'phrase:memory-curator', text: '记忆整理 Skill', status: 'approved', source: 'agent', updatedAtMs: Date.now() - 360_000 }] };
  }
  if (kind === 'negative') {
    return { ...common, items: [{ id: 'negative:rime-fragment', reason: '未封口的 Rime 单词碎片不得注入上下文', active: true, status: 'active', source: 'input_quality', updatedAtMs: Date.now() - 480_000 }] };
  }
  return {
    ...common,
    items: [
      {
        id: 'book:input-memory',
        type: 'topic',
        title: '表达品味与修改偏好',
        summary: '从获准完整输入中整理结论先行、保留已有内容与界面一致性偏好。',
        status: 'active',
        source: { type: 'memory_book', id: 'book:input-memory' },
        ref: { type: 'book', id: 'book:input-memory' },
        evidenceRefs: [{ kind: 'atom', referenceId: 'atom:conclusion-first', title: '结论先行' }],
        tags: ['表达品味', '修改偏好'],
        updatedAtMs: Date.now() - 90_000,
      },
      {
        id: 'book:agent-runtime',
        type: 'topic',
        title: '伙伴运行',
        summary: '伙伴记忆、对话启动参考、记忆工具与受控写入。',
        status: 'active',
        source: { type: 'memory_book', id: 'book:agent-runtime' },
        ref: { type: 'book', id: 'book:agent-runtime' },
        evidenceRefs: [{ kind: 'evidence', referenceId: 'evidence:preview-compaction', title: '伙伴对话整理依据' }],
        tags: ['伙伴运行'],
        updatedAtMs: Date.now() - 210_000,
      },
      {
        id: 'book:frontend-craft',
        type: 'topic',
        title: '前端工艺与验收',
        summary: '界面一致性、真实前端优先与简洁沉浸的界面约束，以及对应的验收证据。',
        status: 'active',
        source: { type: 'memory_book', id: 'book:frontend-craft' },
        ref: { type: 'book', id: 'book:frontend-craft' },
        evidenceRefs: [{ kind: 'atom', referenceId: 'atom:layout-consistency', title: '界面一致与隐私边界' }],
        tags: ['前端工艺', '验收证据'],
        updatedAtMs: Date.now() - 300_000,
      },
      {
        id: 'book:collab-boundary',
        type: 'topic',
        title: '协作边界',
        summary: '多 Agent 协作中的分派、复核与打回边界；实施者不冒充 Reviewer。',
        status: 'active',
        source: { type: 'memory_book', id: 'book:collab-boundary' },
        ref: { type: 'book', id: 'book:collab-boundary' },
        evidenceRefs: [{ kind: 'atom', referenceId: 'atom:evidence-over-agreement', title: '源码证据高于顺从' }],
        tags: ['协作边界', '伙伴运行'],
        updatedAtMs: Date.now() - 420_000,
      },
    ],
  };
}

function previewAppMemory(
  id: string,
  title: string,
  eventCount: number,
  atomCount: number,
  bookCount: number,
  latestAtMs: number,
): Record<string, unknown> {
  return {
    id,
    title,
    detail: `${eventCount} 段完整输入 · ${atomCount} 个记忆原子 · ${bookCount} 本主题书`,
    source: 'input_app',
    status: 'active',
    type: 'app',
    bundleId: id,
    eventCount,
    finalizedSegmentCount: Math.min(eventCount, Math.max(0, Math.round(eventCount * 0.72))),
    contextGroupCount: Math.max(1, Math.round(eventCount / 18)),
    atomCount,
    bookCount,
    latestAtMs,
  };
}

export function previewMemoryGraph(plane: 'groups' | 'tags'): Record<string, unknown> {
  const runtime = previewMemoryGraphNode('tag:agent-runtime', 'tag', '伙伴运行', '会话、工具与执行边界', 18, 'teal');
  const quality = previewMemoryGraphNode('tag:memory-quality', 'tag', '记忆质量', '去噪、合并与来源约束', 14, 'green');
  const boundary = previewMemoryGraphNode('tag:input-boundary', 'tag', '输入封口', 'Backspace 编辑，Enter 后持久化', 9, 'orange');
  const tags = [runtime, quality, boundary];
  if (plane === 'tags') {
    return previewMemoryGraphEnvelope(plane, tags, [
      previewMemoryGraphEdge('tag-edge:runtime-quality', 'tagRelation', 'tag:agent-runtime', 'tag:memory-quality', 'related_to', 0.92, 8),
      previewMemoryGraphEdge('tag-edge:quality-boundary', 'tagRelation', 'tag:memory-quality', 'tag:input-boundary', 'depends_on', 0.88, 6),
      previewMemoryGraphEdge('tag-edge:boundary-runtime', 'tagRelation', 'tag:input-boundary', 'tag:agent-runtime', 'feeds', 0.74, 4),
    ]);
  }
  const inputGroup = previewMemoryGraphNode('group:input-method', 'group', '输入法', '输入质量、候选与上下文注入', 34, 'teal');
  const agentGroup = previewMemoryGraphNode('group:agent', 'group', '伙伴运行资料', '会话、工具和长期记忆', 27, 'blue');
  const book = previewMemoryGraphNode('book:input-memory', 'book', '输入法记忆与上下文', '完整输入段、App 来源和闪电联想边界', 12, 'green');
  return previewMemoryGraphEnvelope(plane, [inputGroup, agentGroup, book, ...tags], [
    previewMemoryGraphEdge('member:input-boundary', 'groupMember', 'group:input-method', 'tag:input-boundary', 'contains', 1, 1),
    previewMemoryGraphEdge('member:input-quality', 'groupMember', 'group:input-method', 'tag:memory-quality', 'contains', 1, 1),
    previewMemoryGraphEdge('member:input-book', 'groupMember', 'group:input-method', 'book:input-memory', 'contains', 0.9, 1),
    previewMemoryGraphEdge('member:agent-runtime', 'groupMember', 'group:agent', 'tag:agent-runtime', 'contains', 1, 1),
    previewMemoryGraphEdge('member:agent-quality', 'groupMember', 'group:agent', 'tag:memory-quality', 'contains', 0.85, 1),
  ]);
}

function previewMemoryGraphEnvelope(
  plane: 'groups' | 'tags',
  nodes: Record<string, unknown>[],
  edges: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    schemaVersion: 'rag-ime.memory-graph.v1',
    ok: true,
    settingsRevision: 'settings:preview',
    runtimeRevision: 7,
    graphRevision: `sha256:${'a'.repeat(64)}`,
    plane,
    project: 'wisdom-weasel-rag-ime',
    filters: { status: 'active', query: '', focusId: '', minWeight: 0 },
    nodes,
    edges,
    truncated: { nodes: false, edges: false },
    limits: { nodeLimit: 48, edgeLimit: 160, depth: 1 },
  };
}

function previewMemoryGraphNode(
  id: string,
  kind: 'tag' | 'group' | 'book',
  label: string,
  description: string,
  memberCount: number,
  color: string,
): Record<string, unknown> {
  return {
    id,
    entityId: id.slice(id.indexOf(':') + 1),
    kind,
    label,
    description,
    color,
    status: 'active',
    source: 'preview',
    project: 'wisdom-weasel-rag-ime',
    qualityScore: 1,
    memberCount,
    edgeCount: 2,
    updatedAtMs: Date.now() - 60_000,
  };
}

function previewMemoryGraphEdge(
  id: string,
  kind: 'tagRelation' | 'groupMember',
  sourceId: string,
  targetId: string,
  relation: string,
  weight: number,
  evidenceCount: number,
): Record<string, unknown> {
  return {
    id,
    kind,
    sourceId,
    targetId,
    sourceKind: sourceId.split(':', 1)[0],
    targetKind: targetId.split(':', 1)[0],
    relation,
    weight,
    directionBias: 0,
    evidenceCount,
    source: 'preview',
    updatedAtMs: Date.now() - 60_000,
  };
}

export function previewMemoryEntity(kindValue: string, entityId: string): Record<string, unknown> {
  const kind = kindValue === 'group' || kindValue === 'book' ? kindValue : 'tag';
  const catalog = {
    'agent-runtime': previewMemoryGraphNode('tag:agent-runtime', 'tag', '伙伴运行', '会话、工具与执行边界', 18, 'teal'),
    'memory-quality': previewMemoryGraphNode('tag:memory-quality', 'tag', '记忆质量', '去噪、合并与来源约束', 14, 'green'),
    'input-boundary': previewMemoryGraphNode('tag:input-boundary', 'tag', '输入封口', 'Backspace 编辑，Enter 后持久化', 9, 'orange'),
    'input-method': previewMemoryGraphNode('group:input-method', 'group', '输入法', '输入质量、候选与上下文注入', 34, 'teal'),
    agent: previewMemoryGraphNode('group:agent', 'group', '伙伴运行资料', '会话、工具和长期记忆', 27, 'blue'),
    'input-memory': previewMemoryGraphNode('book:input-memory', 'book', '输入法记忆与上下文', '完整输入段、App 来源和闪电联想边界', 12, 'green'),
  } as const;
  const fallback = previewMemoryGraphNode(
    `${kind}:${entityId || 'preview'}`,
    kind,
    entityId || '预览记忆',
    '本地记忆关系',
    0,
    'gray',
  );
  const entity = catalog[entityId as keyof typeof catalog] ?? fallback;
  const related = kind === 'tag'
    ? catalog['memory-quality']
    : kind === 'book'
      ? catalog['input-method']
      : catalog['agent-runtime'];
  const connectionEdge = kind === 'tag'
    ? previewMemoryGraphEdge(`entity-edge:${entityId}`, 'tagRelation', String(entity.id), String(related.id), 'related_to', 0.88, 6)
    : kind === 'book'
      ? previewMemoryGraphEdge(`entity-edge:${entityId}`, 'groupMember', String(related.id), String(entity.id), 'contains', 0.9, 1)
      : previewMemoryGraphEdge(`entity-edge:${entityId}`, 'groupMember', String(entity.id), String(related.id), 'contains', 0.9, 1);
  const members = kind === 'group'
    ? [catalog['input-boundary'], catalog['memory-quality']].map((node) => ({
        node,
        edge: previewMemoryGraphEdge(`entity-member:${String(node.id)}`, 'groupMember', String(entity.id), String(node.id), 'contains', 1, 1),
      }))
    : [];
  return {
    schemaVersion: 'rag-ime.memory-entity.v1',
    ok: true,
    settingsRevision: 'settings:preview',
    runtimeRevision: 7,
    kind,
    entityId: entityId || 'preview',
    entityRevision: `sha256:${'b'.repeat(64)}`,
    project: 'wisdom-weasel-rag-ime',
    entity,
    attributes: {
      type: kind === 'group' ? 'semantic' : kind === 'book' ? 'topic' : 'concept',
      aliases: kind === 'tag' && entityId === 'memory-quality' ? ['记忆治理'] : [],
      tags: kind === 'book' ? ['输入封口', '记忆质量'] : [],
    },
    connections: { items: [{ node: related, edge: connectionEdge }], nextCursor: '', limit: 40, hasMore: false },
    members: { items: members, nextCursor: '', limit: 40, hasMore: false },
    limits: { connectionsLimit: 40, membersLimit: 40 },
  };
}

export function previewMemoryCurationStatus(status: string, showcaseComplete = false): Record<string, unknown> {
  const today = previewLocalDate();
  const dateBefore = (days: number) => previewLocalDate(Date.now() - days * 86_400_000);
  const backlogDays = [
    { date: dateBefore(6), pendingSourceCount: 38, needsReviewSourceCount: 0, applications: [{ name: 'Codex', count: 21 }, { name: 'Chrome', count: 11 }, { name: '系统输入框', count: 6 }], channels: [] },
    { date: dateBefore(5), pendingSourceCount: 44, needsReviewSourceCount: 0, applications: [{ name: 'Codex', count: 27 }, { name: 'Chrome', count: 17 }], channels: [] },
    { date: dateBefore(4), pendingSourceCount: 51, needsReviewSourceCount: 0, applications: [{ name: 'Codex', count: 31 }, { name: 'Terminal', count: 12 }, { name: 'Chrome', count: 8 }], channels: [] },
    { date: dateBefore(3), pendingSourceCount: 63, needsReviewSourceCount: 0, applications: [{ name: 'Codex', count: 42 }, { name: 'Chrome', count: 21 }], channels: [] },
    { date: dateBefore(2), pendingSourceCount: 48, needsReviewSourceCount: 0, applications: [{ name: 'Codex', count: 26 }, { name: 'Chrome', count: 15 }, { name: 'Terminal', count: 7 }], channels: [] },
    { date: dateBefore(1), pendingSourceCount: 42, needsReviewSourceCount: 0, applications: [{ name: 'Codex', count: 25 }, { name: 'Chrome', count: 17 }], channels: [] },
    { date: today, pendingSourceCount: 24, needsReviewSourceCount: 0, applications: [{ name: 'Codex', count: 15 }, { name: 'Chrome', count: 9 }], channels: [] },
  ];
  if (showcaseComplete) {
    return {
      ok: true,
      policy: 'auto_governed',
      autoApply: false,
      scheduledDraftOnly: true,
      due: false,
      compileState: { undraftedEventCount: 0 },
      ownerCuration: {
        pendingSourceCount: 0,
        needsReviewSourceCount: 0,
        backlog: {
          schemaVersion: 'rag-ime.owner-memory-curation-backlog.v1',
          pendingSourceCount: 0,
          pendingDayCount: 0,
          oldestPendingAtMs: 0,
          newestPendingAtMs: 0,
          coveredThroughAtMs: Date.now(),
          coveredThroughDate: today,
          targetDate: today,
          caughtUpThroughToday: true,
          applications: [
            { name: 'PAW Input Studio', count: 1_284, lastSourceAtMs: Date.now() - 18 * 60_000 },
          ],
          channels: [],
          days: [],
          truncated: false,
        },
        scopes: [{
          status: 'active',
          pendingSourceCount: 0,
          totalSourceCount: 1_284,
          consecutiveFailures: 0,
          lastSourceCursor: { createdAtMs: Date.now() - 18 * 60_000 },
          lastError: '',
        }],
      },
      modelCuration: {
        stateCounts: { running: 0, resumable: 0, completed: 10, cancelled: 0 },
        runs: [{ state: 'completed', lastError: '' }],
      },
      bookProjection: { inSync: true, unbookedAtomCount: 0 },
      projection: { freshness: { fresh: true, retrievalDocuments: 15_219, vectorCoverage: 1, providerFingerprint: 'sha256:preview' } },
      pendingDraftCount: 0,
      runs: [{ runId: 'memory_book_preview', status: 'applied', diffCount: 3, createdAtMs: Date.now() - 90_000 }],
      showcaseReceipt: {
        sourceEventCount: 1_284,
        taskCount: 5,
        recalledPreferenceCount: 3,
        modelWaitCompressed: true,
      },
    };
  }
  return {
    ok: true,
    policy: 'auto_governed',
    autoApply: false,
    scheduledDraftOnly: true,
    due: true,
    compileState: { undraftedEventCount: 310 },
    ownerCuration: {
      pendingSourceCount: 310,
      needsReviewSourceCount: 0,
      backlog: {
        schemaVersion: 'rag-ime.owner-memory-curation-backlog.v1',
        pendingSourceCount: 310,
        pendingDayCount: backlogDays.length,
        oldestPendingAtMs: Date.now() - 6 * 86_400_000,
        newestPendingAtMs: Date.now(),
        coveredThroughAtMs: Date.now() - 7 * 86_400_000,
        coveredThroughDate: dateBefore(7),
        targetDate: today,
        caughtUpThroughToday: false,
        applications: [
          { name: 'Codex', count: 187, lastSourceAtMs: Date.now() },
          { name: 'Chrome', count: 98, lastSourceAtMs: Date.now() - 30_000 },
          { name: 'Terminal', count: 19, lastSourceAtMs: Date.now() - 120_000 },
          { name: '系统输入框', count: 6, lastSourceAtMs: Date.now() - 180_000 },
        ],
        channels: [],
        days: backlogDays,
        truncated: false,
      },
      scopes: [{
        status: 'backoff',
        pendingSourceCount: 310,
        totalSourceCount: 339,
        consecutiveFailures: 2,
        lastSourceCursor: { createdAtMs: Date.now() - 7 * 86_400_000 },
        lastError: 'managed memory model request failed: request failed',
      }],
    },
    modelCuration: {
      stateCounts: { running: 0, resumable: 2, completed: 9, cancelled: 1 },
      runs: [{ state: 'resumable', lastError: 'request failed' }],
    },
    bookProjection: { inSync: true, unbookedAtomCount: 0 },
    projection: { freshness: { fresh: true, retrievalDocuments: 76, vectorCoverage: .49, providerFingerprint: 'sha256:preview' } },
    pendingDraftCount: status === 'draft' ? 1 : 0,
    runs: [{ runId: 'memory_book_preview', status, diffCount: 3, createdAtMs: Date.now() - 180_000 }],
  };
}

export function previewMemoryCurationRun(
  selections: Map<number, boolean>,
  status: string,
): Record<string, unknown> {
  const changes = [
    ['upsert_memory_atom', '更新记忆原子', '真实前端优先', '能力演示直接使用实际 PAWOS App；截图和自绘面板不能替代真实交互。', 318],
    ['merge_semantic_tag', '合并标签', 'PAW 立项边界', '把输入、Memory、多 Agent 与 PAWOS 的稳定决策合并到同一主题。', 276],
    ['supersede_memory', '归档噪声', '隔离一次性输入与碎片', '未封口拼音、重复状态和短暂操作不进入长期记忆或 Agent 召回。', 690],
  ].map(([operation, operationLabel, title, detail, sourceCount], index) => {
    const diffId = index + 1;
    const selected = selections.get(diffId) === true;
    return {
      diffId,
      operation,
      operationLabel,
      status: status === 'draft' ? (selected ? 'approved' : 'rejected') : status === 'rolled_back' ? 'rolled_back' : 'applied',
      selected,
      title,
      detail,
      sourceCount,
    };
  });
  return {
    ok: true,
    stale: false,
    canApply: status === 'draft' && changes.some((change) => change.selected),
    canRollback: status === 'applied',
    run: {
      runId: 'memory_book_preview',
      status,
      createdAtMs: Date.now() - 180_000,
      diffCount: changes.length,
      pendingDiffCount: status === 'draft' ? changes.filter((change) => change.selected).length : 0,
      changes,
    },
  };
}

export function previewMemoryApplyPreview(): Record<string, unknown> {
  return {
    schemaVersion: 'rag-ime.management-work-preview.v1',
    ok: true,
    previewToken: 'preview-memory-curation',
    pathId: 'knowledge.database.apply',
    payloadSha256: `sha256:${'d'.repeat(64)}`,
    expectedRevision: { runtimeRevision: 7, subjectRevision: 'memory_book_preview' },
    expiresAtMs: Date.now() + 60_000,
    requiredConfirm: 'apply',
    summary: {
      title: '应用所选记忆更新',
      items: ['只写入已勾选的整理建议', '重建本地记忆检索索引'],
      risk: 'R2',
    },
  };
}

export function previewMemoryWorkReceipt(pathId: string, rollbackAvailable: boolean): Record<string, unknown> {
  return {
    schemaVersion: 'rag-ime.management-work-receipt.v1',
    ok: true,
    receiptId: pathId.endsWith('rollback') ? 'receipt-memory-curation-rollback' : 'receipt-memory-curation',
    pathId,
    payloadSha256: `sha256:${'d'.repeat(64)}`,
    appliedAtMs: Date.now(),
    auditId: 17,
    rollbackAvailable,
    rollbackToken: rollbackAvailable ? 'rollback-memory-curation' : '',
    rollbackAuthority: { runId: 'memory_book_preview' },
    restartComponents: [],
    result: { status: pathId.endsWith('rollback') ? 'rolled_back' : 'applied' },
  };
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
