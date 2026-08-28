import { Check, FileCheck2, Radio, RefreshCw, Send, ShieldCheck, TestTube2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usePawDesktopApi } from '../runtime/desktop-context';
import {
  PAW_ROOM_FLOW_SHOWCASE_EVENT,
  PAW_ROOM_FLOW_SHOWCASE_ID,
  pawRoomFlowShowcaseParticipant,
  type PawRoomFlowShowcaseEventDetail,
} from './room-flow-script';

const FINAL_SEQUENCE = 36;

type ShowcasePhase = 'goal' | 'dispatch' | 'streaming' | 'workpatch' | 'review' | 'submit';

export function PawRoomFlowShowcaseDirector() {
  const api = usePawDesktopApi();
  const [current, setCurrent] = useState<PawRoomFlowShowcaseEventDetail>({
    sequence: 1,
    eventType: 'user_message',
    participantId: null,
    payload: {
      text: 'Facilitator 已接收原始 Goal，正在建立三个实施 WorkItem。',
    },
  });
  const [workPatchParticipantIds, setWorkPatchParticipantIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const state = api.getState();
    state.closeAllWindows();
    state.openApp('agent', {
      initialRoute: `/agent?room=${PAW_ROOM_FLOW_SHOWCASE_ID}`,
      target: {
        kind: 'room',
        id: PAW_ROOM_FLOW_SHOWCASE_ID,
        title: 'PAW 展示页制作',
        subtitle: 'Facilitator · 3 个实施 WorkPatch → 1 个独立 Reviewer',
      },
      title: 'PAW 展示页制作',
    });
    state.setCollaborationFocusGroup(`room:${PAW_ROOM_FLOW_SHOWCASE_ID}`);

    const receive = (event: WindowEventMap[typeof PAW_ROOM_FLOW_SHOWCASE_EVENT]) => {
      const detail = event.detail;
      setCurrent(detail);
      const participant = pawRoomFlowShowcaseParticipant(detail.participantId);

      if (detail.eventType === 'route_decision' && participant && participant.showcaseRole !== 'facilitator') {
        api.getState().openApp('agent', {
          background: true,
          entityId: participant.id,
          target: {
            kind: 'participant',
            id: participant.id,
            roomId: PAW_ROOM_FLOW_SHOWCASE_ID,
            title: participant.celestialName,
            subtitle: participant.task,
          },
          title: participant.celestialName,
        });
        api.getState().setCollaborationFocusGroup(`room:${PAW_ROOM_FLOW_SHOWCASE_ID}`);
      }

      if (participant && detail.eventType !== 'route_decision') {
        api.getState().focusWindow(`agent:${participant.id}`);
      }
      if (detail.eventType === 'room_post' && participant?.showcaseRole === 'implementer') {
        setWorkPatchParticipantIds((currentIds) => {
          const next = new Set(currentIds);
          next.add(participant.id);
          return next;
        });
      }
      if (detail.sequence === FINAL_SEQUENCE) api.getState().focusWindow('agent');
    };

    window.addEventListener(PAW_ROOM_FLOW_SHOWCASE_EVENT, receive);
    return () => window.removeEventListener(PAW_ROOM_FLOW_SHOWCASE_EVENT, receive);
  }, [api]);

  const participant = pawRoomFlowShowcaseParticipant(current.participantId);
  const phase = showcasePhase(current);
  const copy = showcaseEventCopy(current);
  const reviewerStarted = current.sequence >= 26;
  const reviewerPassed = current.sequence >= 35;
  const progress = Math.min(100, Math.round((current.sequence / FINAL_SEQUENCE) * 100));
  const phaseLabel = useMemo(() => ({
    goal: 'GOAL RECEIVED',
    dispatch: 'DISPATCH',
    streaming: 'STREAMING',
    workpatch: 'WORKPATCH RECEIPT',
    review: 'REVIEWER TEST',
    submit: 'FINAL SUBMIT',
  })[phase], [phase]);

  return (
    <aside
      aria-label="PAW Room 公开合成运行导演"
      aria-live="polite"
      className="paw-room-flow-showcase"
      data-phase={phase}
      data-sequence={current.sequence}
      data-testid="paw-room-flow-showcase"
    >
      <header>
        <span className="paw-room-flow-showcase__live"><Radio aria-hidden="true" size={13} /> REAL PAWOS</span>
        <span>PUBLIC SYNTHETIC EVENTS</span>
        <button aria-label="重新播放 Room 运行过程" onClick={() => window.location.reload()} type="button">
          <RefreshCw aria-hidden="true" size={13} />重播
        </button>
      </header>
      <div className="paw-room-flow-showcase__event">
        <div className="paw-room-flow-showcase__sequence">
          <span>SEQ</span>
          <strong>{String(current.sequence).padStart(2, '0')}</strong>
        </div>
        <span className="paw-room-flow-showcase__phase">{phaseIcon(phase)}{phaseLabel}</span>
        <div className="paw-room-flow-showcase__copy">
          <small>{participant ? `${participant.celestialName} · ${participant.displayName}` : 'Sol · Facilitator'}</small>
          <strong>{copy}<i aria-hidden="true" data-streaming={phase === 'streaming' || undefined} /></strong>
        </div>
      </div>
      <div className="paw-room-flow-showcase__progress" aria-label={`运行进度 ${progress}%`}>
        <i style={{ width: `${progress}%` }} />
      </div>
      <footer>
        <span data-state={workPatchParticipantIds.size === 3 ? 'done' : 'running'}>
          <FileCheck2 aria-hidden="true" size={13} />
          <b>实施 WorkPatch</b>
          <strong>{workPatchParticipantIds.size}/3</strong>
        </span>
        <span data-state={reviewerPassed ? 'done' : reviewerStarted ? 'running' : 'queued'}>
          <TestTube2 aria-hidden="true" size={13} />
          <b>Reviewer</b>
          <strong>{reviewerPassed ? 'PASSED' : reviewerStarted ? 'TESTING' : 'GATED'}</strong>
        </span>
        <span data-state={reviewerPassed ? 'done' : 'queued'}>
          <ShieldCheck aria-hidden="true" size={13} />
          <b>P0</b>
          <strong>{reviewerPassed ? '0' : '—'}</strong>
        </span>
      </footer>
    </aside>
  );
}

function showcasePhase(event: PawRoomFlowShowcaseEventDetail): ShowcasePhase {
  if (event.sequence === FINAL_SEQUENCE) return 'submit';
  if (event.sequence >= 26) return 'review';
  if (event.eventType === 'route_decision') return 'dispatch';
  if (event.eventType === 'participant_delta') return 'streaming';
  if (event.eventType === 'room_post' || event.eventType === 'turn_completed') return 'workpatch';
  return event.sequence <= 1 ? 'goal' : 'streaming';
}

function showcaseEventCopy(event: PawRoomFlowShowcaseEventDetail): string {
  if (event.eventType === 'participant_delta') return stringValue(event.payload.delta);
  if (event.eventType === 'room_post') return stringValue(record(event.payload.post).content);
  return stringValue(event.payload.summary)
    || stringValue(event.payload.text)
    || 'Room 运行事件已写入统一时间线。';
}

function phaseIcon(phase: ShowcasePhase) {
  if (phase === 'workpatch') return <FileCheck2 aria-hidden="true" size={13} />;
  if (phase === 'review') return <TestTube2 aria-hidden="true" size={13} />;
  if (phase === 'submit') return <Check aria-hidden="true" size={13} />;
  if (phase === 'dispatch') return <Send aria-hidden="true" size={13} />;
  return <Radio aria-hidden="true" size={13} />;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
