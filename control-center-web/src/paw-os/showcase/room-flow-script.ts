export const PAW_ROOM_FLOW_SHOWCASE_ID = 'room-preview';
export const PAW_ROOM_FLOW_SHOWCASE_EVENT = 'paw:showcase-room-flow';

export type PawRoomFlowShowcaseRole = 'facilitator' | 'implementer' | 'reviewer';

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
    celestialName: 'Earth',
    collaborationRole: 'coordinator',
    showcaseRole: 'facilitator',
    task: '守住 Goal、分派实施批次并汇总最终提交',
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
    task: '智能输入与语音转文字',
    ordinal: 1,
  },
  {
    id: 'participant-memory',
    sessionId: 'session-room-memory',
    roleId: 'companion-firstlight-v1',
    displayName: 'Memory Agent',
    celestialName: 'Venus',
    collaborationRole: 'implementer',
    showcaseRole: 'implementer',
    task: '输入时间线、记忆治理与 RAG',
    ordinal: 2,
  },
  {
    id: 'participant-room',
    sessionId: 'session-room-room',
    roleId: 'companion-future-v1',
    displayName: 'Room Agent',
    celestialName: 'Jupiter',
    collaborationRole: 'implementer',
    showcaseRole: 'implementer',
    task: '行星关系到真实 PAWOS 多窗口',
    ordinal: 3,
  },
  {
    id: 'participant-review',
    sessionId: 'session-room-review',
    roleId: 'companion-firstlight-v1',
    displayName: 'Reviewer',
    celestialName: 'Saturn',
    collaborationRole: 'reviewer',
    showcaseRole: 'reviewer',
    task: '需求忠实度、真实代码路径与 P0 独立复核',
    ordinal: 4,
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

export function isPawRoomFlowShowcase(search = typeof window === 'undefined' ? '' : window.location.search): boolean {
  return __CONTROL_PREVIEW__
    && new URLSearchParams(search).get('showcase') === 'room-flow';
}

export function pawRoomFlowShowcaseDelayMs(search = typeof window === 'undefined' ? '' : window.location.search): number {
  return new URLSearchParams(search).get('showcaseSpeed') === 'fast' ? 36 : 720;
}

declare global {
  interface WindowEventMap {
    [PAW_ROOM_FLOW_SHOWCASE_EVENT]: CustomEvent<PawRoomFlowShowcaseEventDetail>;
  }
}
