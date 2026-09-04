export const PAW_ROOM_FLOW_SHOWCASE_ID = 'room-preview';
export const PAW_ROOM_FLOW_SHOWCASE_EVENT = 'paw:showcase-room-flow';

export type PawRoomFlowShowcaseRole = 'facilitator' | 'implementer' | 'reviewer';
export type PawRoomFlowShowcaseView = 'rounds' | 'collaboration' | 'conversation';

export type PawRoomFlowShowcaseNavigation = {
  view: PawRoomFlowShowcaseView;
  label: string;
};

export type PawRoomFlowShowcaseParticipant = {
  id: string;
  sessionId: string;
  roleId: string;
  displayName: string;
  celestialName: string;
  collaborationRole: 'coordinator' | 'implementer' | 'reviewer';
  showcaseRole: PawRoomFlowShowcaseRole;
  task: string;
  ordinal: number;
};

/**
 * Public showcase identities. They deliberately describe product areas, not
 * people or local Sessions, and are shared by the preview transport and the
 * real PAWOS window director so an event can only open its own participant.
 */
export const pawRoomFlowShowcaseParticipants: readonly PawRoomFlowShowcaseParticipant[] = [
  {
    id: 'participant-facilitator',
    sessionId: 'session-room-facilitator',
    roleId: 'companion-present-v1',
    displayName: 'Facilitator',
    celestialName: 'Sol',
    collaborationRole: 'coordinator',
    showcaseRole: 'facilitator',
    task: '立项追问、四线分派、行星通信与最终整合',
    ordinal: 0,
  },
  {
    id: 'participant-input',
    sessionId: 'session-room-input',
    roleId: 'companion-present-v1',
    displayName: 'Input Agent',
    celestialName: 'Mars',
    collaborationRole: 'implementer',
    showcaseRole: 'implementer',
    task: '输入法、本地候选、完整输入与显式 Agent 入口',
    ordinal: 1,
  },
  {
    id: 'participant-runtime',
    sessionId: 'session-room-runtime',
    roleId: 'companion-firstlight-v1',
    displayName: 'Memory / Context Agent',
    celestialName: 'Venus',
    collaborationRole: 'implementer',
    showcaseRole: 'implementer',
    task: '输入整理、时间线、偏好治理与按题召回',
    ordinal: 2,
  },
  {
    id: 'participant-context',
    sessionId: 'session-room-context',
    roleId: 'companion-firstlight-v1',
    displayName: 'Multi-Agent / Room Agent',
    celestialName: 'Jupiter',
    collaborationRole: 'implementer',
    showcaseRole: 'implementer',
    task: '有界 TaskBrief、并行 WorkPatch、伙伴通信与唯一 Root',
    ordinal: 3,
  },
  {
    id: 'participant-room',
    sessionId: 'session-room-room',
    roleId: 'companion-future-v1',
    displayName: 'PAWOS Agent',
    celestialName: 'Saturn',
    collaborationRole: 'implementer',
    showcaseRole: 'implementer',
    task: '把 Input、Memory、Agent 与 Room 投影成同一个可操作桌面',
    ordinal: 4,
  },
  {
    id: 'participant-review',
    sessionId: 'session-room-review',
    roleId: 'companion-firstlight-v1',
    displayName: 'Reviewer',
    celestialName: 'Neptune',
    collaborationRole: 'reviewer',
    showcaseRole: 'reviewer',
    task: '立项范围、跨线接口、证明边界与 P0 独立复核',
    ordinal: 6,
  },
] as const;

export type PawRoomFlowShowcaseEventDetail = {
  sequence: number;
  eventType: string;
  participantId: string | null;
  payload: Record<string, unknown>;
};

export function pawRoomFlowShowcaseParticipant(
  participantId: string | null | undefined,
): PawRoomFlowShowcaseParticipant | undefined {
  return pawRoomFlowShowcaseParticipants.find((participant) => participant.id === participantId);
}

export function isPawRoomFlowShowcaseImplementer(participantId: string): boolean {
  return pawRoomFlowShowcaseParticipants.some((participant) => (
    participant.id === participantId && participant.showcaseRole === 'implementer'
  ));
}

export function isPawRoomFlowShowcase(search = typeof window === 'undefined' ? '' : window.location.search): boolean {
  return __CONTROL_PREVIEW__
    && new URLSearchParams(search).get('showcase') === 'room-flow';
}

export function pawRoomFlowShowcaseDelayMs(search = typeof window === 'undefined' ? '' : window.location.search): number {
  // The fixture skips model wall-clock entirely. Normal speed is reading time;
  // fast speed is still long enough for the Docs/Reviewer gate to remain an
  // observable state instead of being skipped between two browser frames.
  return new URLSearchParams(search).get('showcaseSpeed') === 'fast' ? 180 : 800;
}

export function pawRoomFlowShowcaseNavigationAtSequence(
  sequence: number,
): PawRoomFlowShowcaseNavigation | null {
  if (sequence === 1) return { view: 'conversation', label: '公开记录' };
  if (sequence === 24) return { view: 'collaboration', label: '协同模式' };
  if (sequence === 53) return { view: 'conversation', label: '公开记录' };
  return null;
}

export function pawRoomFlowShowcaseDelayBeforeSequenceMs(
  sequence: number,
  search = typeof window === 'undefined' ? '' : window.location.search,
): number {
  const baseDelay = pawRoomFlowShowcaseDelayMs(search);
  if (new URLSearchParams(search).get('showcaseSpeed') === 'fast') {
    if (sequence === 23 || sequence === 24) return 800;
    if (sequence === 53) return 500;
    return baseDelay;
  }
  if ([7, 10, 13, 16, 19].includes(sequence)) return 3_200;
  if ([8, 11, 14, 17].includes(sequence)) return 2_400;
  if ([9, 12, 15, 18].includes(sequence)) return 1_800;
  if (sequence === 20) return 3_600; // Task completion question & startConfirmation popup
  if (sequence === 21) return 2_400; // User confirms completion & start
  if (sequence === 22) return 2_200; // Facilitator completion note
  if (sequence === 23) return 2_400; // Partner session ready
  if (sequence === 24) return 3_200; // Enter collaboration mode (parallel work starts)
  if (sequence === 28) return 2_400; // 4 伙伴启动：Mars 加载 Skill
  if ([29, 30, 31].includes(sequence)) return 1_200; // Venus / Jupiter / Saturn 加载 Skill
  if ([32, 33, 34, 35].includes(sequence)) return 1_800; // 4 伙伴并行调用工具取证
  if ([36, 37, 38, 39].includes(sequence)) return 2_400; // 4 伙伴流式生成实施论述
  if ([40, 41, 42, 43].includes(sequence)) return 1_800; // 4 伙伴跨星交接合同与证据
  if ([44, 45, 46, 47].includes(sequence)) return 2_400; // 4 伙伴提交 WorkPatch
  if ([48, 49, 50, 51].includes(sequence)) return 1_600; // 4 伙伴汇合 AgentResult
  if (sequence === 52) return 2_400; // Facilitator 收齐 4/4 回执
  if (sequence === 53) return 2_800; // 切回公开记录，准备整合 Docs
  return baseDelay;
}

export function pawRoomFlowShowcaseReviewerGateHoldMs(
  search = typeof window === 'undefined' ? '' : window.location.search,
): number {
  return new URLSearchParams(search).get('showcaseSpeed') === 'fast' ? 1_200 : 5_400;
}

declare global {
  interface WindowEventMap {
    [PAW_ROOM_FLOW_SHOWCASE_EVENT]: CustomEvent<PawRoomFlowShowcaseEventDetail>;
  }
}
