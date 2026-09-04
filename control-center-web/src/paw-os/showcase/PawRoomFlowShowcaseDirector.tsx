import { Check, FileCheck2, MessageCircleQuestion, MousePointer2, Radio, RefreshCw, Send, ShieldCheck, TestTube2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePawDesktopApi } from '../runtime/desktop-context';
import {
  PAW_ROOM_FLOW_SHOWCASE_EVENT,
  PAW_ROOM_FLOW_SHOWCASE_ID,
  pawRoomFlowShowcaseNavigationAtSequence,
  pawRoomFlowShowcaseParticipant,
  type PawRoomFlowShowcaseEventDetail,
  type PawRoomFlowShowcaseNavigation,
  type PawRoomFlowShowcaseView,
} from './room-flow-script';

const FINAL_SEQUENCE = 69;

type ShowcasePhase = 'goal' | 'grill' | 'confirm' | 'dispatch' | 'streaming' | 'workpatch' | 'review' | 'submit';

type RoomShowcaseCursor = {
  x: number;
  y: number;
  visible: boolean;
  pressed: boolean;
  targetView: PawRoomFlowShowcaseView | '';
};

export function PawRoomFlowShowcaseDirector() {
  const api = usePawDesktopApi();
  const [current, setCurrent] = useState<PawRoomFlowShowcaseEventDetail>({
    sequence: 1,
    eventType: 'user_message',
    participantId: null,
    payload: {
      text: 'Pi 可以做成网关型 Agent 吗？就是本项目的输入法。如果像 Hermes 这样做可以吗？',
    },
  });
  const [workPatchParticipantIds, setWorkPatchParticipantIds] = useState<Set<string>>(() => new Set());
  const [cursor, setCursor] = useState<RoomShowcaseCursor>({
    x: 0,
    y: 0,
    visible: false,
    pressed: false,
    targetView: '',
  });
  const cursorTimersRef = useRef<number[]>([]);
  const reducedMotionRef = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const fastPlaybackRef = useRef(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('showcaseSpeed') === 'fast',
  );

  const clearCursorTimers = useCallback(() => {
    cursorTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    cursorTimersRef.current = [];
  }, []);

  const animateButtonClick = useCallback((
    locate: () => HTMLButtonElement | undefined,
    targetView: PawRoomFlowShowcaseView,
  ) => {
    clearCursorTimers();
    const findAndActivate = (attempt: number) => {
      const target = locate();
      if (!target) {
        if (attempt >= 80) return;
        const retryTimer = window.setTimeout(() => findAndActivate(attempt + 1), 100);
        cursorTimersRef.current.push(retryTimer);
        return;
      }
      if (reducedMotionRef.current || fastPlaybackRef.current) {
        target.click();
        setCursor((current) => ({ ...current, visible: false, pressed: false, targetView }));
        return;
      }
      const bounds = target.getBoundingClientRect();
      setCursor({
        x: bounds.left + bounds.width * .7,
        y: bounds.top + bounds.height * .58,
        visible: true,
        pressed: false,
        targetView,
      });
      const pressTimer = window.setTimeout(() => {
        setCursor((current) => ({ ...current, pressed: true }));
      }, 240);
      const clickTimer = window.setTimeout(() => {
        target.click();
      }, 340);
      const releaseTimer = window.setTimeout(() => {
        setCursor((current) => ({ ...current, pressed: false }));
      }, 440);
      const hideTimer = window.setTimeout(() => {
        setCursor((current) => ({ ...current, visible: false }));
      }, 650);
      cursorTimersRef.current.push(pressTimer, clickTimer, releaseTimer, hideTimer);
    };
    findAndActivate(0);
  }, [clearCursorTimers]);

  const activateRoomView = useCallback((navigation: PawRoomFlowShowcaseNavigation) => {
    animateButtonClick(
      () => Array.from(document.querySelectorAll<HTMLButtonElement>(`button[data-room-view="${navigation.view}"]`))
        .find((button) => !button.disabled && button.getClientRects().length > 0),
      navigation.view,
    );
  }, [animateButtonClick]);

  const activateLatest = useCallback(() => {
    animateButtonClick(
      () => {
        const button = document.querySelector<HTMLButtonElement>(
          `.paw-room-workspace[data-room-id="${PAW_ROOM_FLOW_SHOWCASE_ID}"] button[aria-label="回到最新消息"]`,
        );
        return button && !button.disabled && button.getClientRects().length > 0 ? button : undefined;
      },
      'conversation',
    );
  }, [animateButtonClick]);

  useEffect(() => {
    const state = api.getState();
    state.closeAllWindows();
    state.openApp('agent', {
      initialRoute: `/agent?room=${PAW_ROOM_FLOW_SHOWCASE_ID}`,
      target: {
        kind: 'room',
        id: PAW_ROOM_FLOW_SHOWCASE_ID,
        title: 'PAW 立项',
        subtitle: '真实 USER-DIRECT · 4 条产品线 → 交接 → Docs → Reviewer',
      },
      title: 'PAW 立项',
    });
    const initialNavigation = pawRoomFlowShowcaseNavigationAtSequence(1);
    if (initialNavigation) activateRoomView(initialNavigation);

    const receive = (event: WindowEventMap[typeof PAW_ROOM_FLOW_SHOWCASE_EVENT]) => {
      const detail = event.detail;
      setCurrent(detail);
      const participant = pawRoomFlowShowcaseParticipant(detail.participantId);
      const navigation = pawRoomFlowShowcaseNavigationAtSequence(detail.sequence);
      if (navigation) activateRoomView(navigation);

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

      if (participant && participant.showcaseRole !== 'facilitator' && detail.eventType !== 'route_decision') {
        api.getState().focusWindow(`agent:${participant.id}`);
      }
      if (detail.eventType === 'room_post' && participant?.showcaseRole === 'implementer') {
        setWorkPatchParticipantIds((currentIds) => {
          const next = new Set(currentIds);
          next.add(participant.id);
          return next;
        });
      }
      if (detail.sequence === FINAL_SEQUENCE) {
        const settleTimer = window.setTimeout(() => {
          api.getState().setCollaborationFocusGroup(null);
          api.getState().focusWindow('agent');
          activateLatest();
          const verifyTimer = window.setTimeout(() => {
            const finalVisible = document.querySelector(
              `.paw-room-workspace[data-room-id="${PAW_ROOM_FLOW_SHOWCASE_ID}"]`,
            )?.textContent?.includes('独立复核回执：PAW 立项产品线 4/4');
            if (!finalVisible) activateLatest();
          }, 1_200);
          cursorTimersRef.current.push(verifyTimer);
        }, 4_200);
        cursorTimersRef.current.push(settleTimer);
      }
    };

    window.addEventListener(PAW_ROOM_FLOW_SHOWCASE_EVENT, receive);
    return () => {
      clearCursorTimers();
      window.removeEventListener(PAW_ROOM_FLOW_SHOWCASE_EVENT, receive);
    };
  }, [activateLatest, activateRoomView, api, clearCursorTimers]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (matches: boolean) => {
      reducedMotionRef.current = matches;
      if (matches) setCursor((current) => ({ ...current, visible: false, pressed: false }));
    };
    update(media.matches);
    const onChange = (event: MediaQueryListEvent) => update(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const participant = pawRoomFlowShowcaseParticipant(current.participantId);
  const phase = showcasePhase(current);
  const copy = showcaseEventCopy(current);
  const reviewerStarted = current.sequence >= 58;
  const reviewerNeedsFix = current.sequence >= 62 && current.sequence < 66;
  const reviewerPassed = current.sequence >= 66;
  const progress = Math.min(100, Math.round((current.sequence / FINAL_SEQUENCE) * 100));
  const phaseLabel = useMemo(() => ({
    goal: 'GOAL RECEIVED',
    grill: 'SCOPE QUESTIONS',
    confirm: 'TASK CONFIRMATION',
    dispatch: 'PARALLEL DISPATCH',
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
      data-room-view-target={cursor.targetView || undefined}
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
        <i style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <footer>
        <span data-state={workPatchParticipantIds.size === 4 ? 'done' : 'running'}>
          <FileCheck2 aria-hidden="true" size={13} />
          <b>产品 WorkPatch</b>
          <strong>{workPatchParticipantIds.size}/4</strong>
        </span>
        <span data-state={reviewerPassed ? 'done' : reviewerStarted ? 'running' : 'queued'}>
          <TestTube2 aria-hidden="true" size={13} />
          <b>Reviewer</b>
          <strong>{reviewerPassed ? 'PASSED' : reviewerNeedsFix ? 'REVISION' : reviewerStarted ? 'CHECKING' : 'GATED'}</strong>
        </span>
        <span data-state={reviewerPassed ? 'done' : reviewerNeedsFix ? 'running' : 'queued'}>
          <ShieldCheck aria-hidden="true" size={13} />
          <b>P0</b>
          <strong>{reviewerPassed ? '1 → 0' : reviewerNeedsFix ? '1' : '—'}</strong>
        </span>
      </footer>
      {typeof document !== 'undefined' ? createPortal(
        <span
          aria-hidden="true"
          className="paw-room-flow-showcase__cursor"
          data-pressed={cursor.pressed || undefined}
          data-testid="paw-room-flow-cursor"
          data-visible={cursor.visible || undefined}
          style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0) translate3d(-3px, -3px, 0) scale(${cursor.pressed ? .84 : 1})` }}
        >
          <MousePointer2 fill="currentColor" size={18} strokeWidth={1.7} />
        </span>,
        document.body,
      ) : null}
    </aside>
  );
}

function showcasePhase(event: PawRoomFlowShowcaseEventDetail): ShowcasePhase {
  if (event.sequence === FINAL_SEQUENCE) return 'submit';
  if (event.sequence >= 58) return 'review';
  if (event.sequence === 20 || event.sequence === 21 || event.sequence === 22) return 'confirm';
  if (event.sequence >= 6 && event.sequence <= 19) return 'grill';
  if (event.eventType === 'route_decision') return 'dispatch';
  if (event.eventType === 'participant_delta') return 'streaming';
  if (event.eventType === 'room_post' || event.eventType === 'turn_completed') return 'workpatch';
  return event.sequence <= 5 ? 'goal' : 'streaming';
}

function showcaseEventCopy(event: PawRoomFlowShowcaseEventDetail): string {
  if (event.eventType === 'participant_delta') return stringValue(event.payload.delta);
  if (event.eventType === 'room_post') return stringValue(record(event.payload.post).content);
  return stringValue(event.payload.summary)
    || stringValue(event.payload.text)
    || 'Room 运行事件已写入统一时间线。';
}

function phaseIcon(phase: ShowcasePhase) {
  if (phase === 'grill') return <MessageCircleQuestion aria-hidden="true" size={13} />;
  if (phase === 'confirm') return <ShieldCheck aria-hidden="true" size={13} />;
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
