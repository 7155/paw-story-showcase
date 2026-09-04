import { MousePointer2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePawDesktopApi } from '../runtime/desktop-context';
import {
  PAW_MEMORY_FLOW_SHOWCASE_ID,
  isPawMemoryShowcaseCommand,
  pawMemoryFlowShowcaseInstance,
  pawMemoryFlowShowcaseStages,
  type PawMemoryFlowShowcaseStage,
  type PawMemoryFlowStageId,
  type PawMemoryShowcaseCommand,
  type PawShowcaseCommandName,
} from './memory-flow-script';

type ShowcaseCursor = {
  x: number;
  y: number;
  visible: boolean;
  pressed: boolean;
  targetId: string;
};

type ShowcasePhase = 'idle' | 'cursor-hover' | 'cursor-click' | 'waiting' | 'complete' | 'error';

export function PawMemoryFlowShowcaseDirector() {
  const api = usePawDesktopApi();
  const instanceId = pawMemoryFlowShowcaseInstance();
  const [stageId, setStageId] = useState<PawMemoryFlowStageId>('history-list');
  const [eventIndex, setEventIndex] = useState(0);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const [, setPlaying] = useState(true);
  const [cursor, setCursor] = useState<ShowcaseCursor>({
    x: 0,
    y: 0,
    visible: false,
    pressed: false,
    targetId: '',
  });
  const epochRef = useRef(0);
  const actionRef = useRef('');
  const cursorVisibleRef = useRef(false);
  const timersRef = useRef<Set<number>>(new Set());
  const parentOriginRef = useRef(parentOrigin());

  const post = useCallback((payload: Record<string, unknown>) => {
    if (window.parent === window) return;
    window.parent.postMessage({
      channel: 'paw.showcase',
      version: 1,
      showcaseId: PAW_MEMORY_FLOW_SHOWCASE_ID,
      instanceId,
      replayEpoch: epochRef.current,
      stageId,
      eventIndex,
      ...payload,
    }, parentOriginRef.current);
  }, [eventIndex, instanceId, stageId]);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current.clear();
  }, []);

  const wait = useCallback((durationMs: number) => new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      resolve();
    }, durationMs);
    timersRef.current.add(timer);
  }), []);

  const findVisible = useCallback((selector: string): HTMLElement | null => (
    [...document.querySelectorAll<HTMLElement>(selector)].find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !(element as HTMLButtonElement).disabled;
    }) ?? null
  ), []);

  const waitForVisible = useCallback((selector: string, timeoutMs = 8_000) => new Promise<HTMLElement | null>((resolve) => {
    const startedAt = performance.now();
    let timer = 0;
    const check = () => {
      const target = findVisible(selector);
      if (target || performance.now() - startedAt >= timeoutMs) {
        timersRef.current.delete(timer);
        resolve(target);
        return;
      }
      timer = window.setTimeout(check, 50);
      timersRef.current.add(timer);
    };
    check();
  }), [findVisible]);

  const moveCursor = useCallback(async (target: HTMLElement, targetId: string) => {
    const rect = target.getBoundingClientRect();
    const next = {
      x: rect.left + rect.width * .58,
      y: rect.top + rect.height * .55,
      pressed: false,
      targetId,
    };
    const wasVisible = cursorVisibleRef.current;
    if (!wasVisible) {
      setCursor({ ...next, visible: false });
      await wait(24);
    }
    cursorVisibleRef.current = true;
    setCursor({ ...next, visible: true });
    await wait(wasVisible ? 190 : 70);
  }, [wait]);

  const hoverAndClick = useCallback(async (target: HTMLElement, targetId: string) => {
    await moveCursor(target, targetId);
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    post({ type: 'state', phase: 'cursor-hover', cursor: { targetId, hovered: true, clicked: false } });
    await wait(220);
    setCursor((current) => ({ ...current, pressed: true }));
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    target.click();
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    post({ type: 'state', phase: 'cursor-click', cursor: { targetId, hovered: true, clicked: true } });
    await wait(220);
    setCursor((current) => ({ ...current, pressed: false }));
  }, [moveCursor, post, wait]);

  const openStage = useCallback((stage: PawMemoryFlowShowcaseStage) => {
    const state = api.getState();
    state.setCollaborationFocusGroup(null);
    const windowId = state.openApp(stage.appId, {
      initialRoute: stage.route,
      ...(stage.appId === 'agent' ? {
        target: {
          kind: 'session' as const,
          id: 'session-memory',
          title: '今天聊聊',
          subtitle: '自然对话中的时间线与来源回执',
        },
      } : {}),
      title: stage.label,
    });
    const opened = api.getState().windows[windowId];
    if (opened && opened.placement !== 'maximized') api.getState().toggleMaximize(windowId);
  }, [api]);

  const clickDockApp = useCallback(async (appId: string) => {
    const icon = await waitForVisible(`[data-paw-app-icon="${appId}"]`);
    const button = icon?.closest<HTMLElement>('button');
    if (button) await hoverAndClick(button, `app:${appId}`);
  }, [hoverAndClick, waitForVisible]);

  const runStageAction = useCallback(async (nextStageId: PawMemoryFlowStageId) => {
    const actionKey = `${epochRef.current}:${nextStageId}:${eventIndex}`;
    if (actionRef.current === actionKey) return;
    actionRef.current = actionKey;
    const stage = pawMemoryFlowShowcaseStages.find((item) => item.id === nextStageId)
      ?? pawMemoryFlowShowcaseStages[0];
    post({ type: 'state', phase: 'waiting' satisfies ShowcasePhase });

    if (nextStageId === 'history-list') {
      openStage(stage);
      const target = await waitForVisible('[data-history-event-id="202"]');
      if (target) {
        await moveCursor(target, 'history:202');
        target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        await wait(600);
      }
    } else if (nextStageId === 'history-detail') {
      openStage(stage);
      const target = await waitForVisible('[data-history-event-id="202"]');
      if (target) {
        await hoverAndClick(target, 'history:202');
        await wait(1_600);
      }
    } else if (nextStageId === 'daily-memory') {
      const close = findVisible('.history-detail-dialog .ui-dialog__close');
      if (close) {
        await hoverAndClick(close, 'history-detail:close');
        await wait(350);
      }
      await clickDockApp('memory');
      openStage(stage);
    } else if (nextStageId === 'graph') {
      const graph = await waitForVisible('.paw-native-app[data-app-id="memory"] button[aria-label="关系图"]');
      if (graph) {
        await hoverAndClick(graph, 'memory:relations');
        await wait(500);
      }
      openStage(stage);
    } else if (nextStageId === 'recall') {
      await clickDockApp('agent');
      openStage(stage);
    } else {
      openStage(stage);
      await wait(600);
      const receipt = await waitForVisible('.agent-memory-recall-receipt > summary');
      if (receipt) {
        await hoverAndClick(receipt, 'memory-recall:receipt');
        await wait(1_200);
      }
      const source = await waitForVisible('.agent-memory-recall-receipt__actions button[data-memory-source="true"]');
      if (source) {
        await hoverAndClick(source, 'memory-recall:source');
        await wait(1_200);
      }
      const child = await waitForVisible('.memory-reference-view__children button');
      if (child) {
        await hoverAndClick(child, 'memory-reference:event');
        await wait(1_000);
      }
      const raw = await waitForVisible('[data-memory-open-history="true"]');
      if (raw) {
        await hoverAndClick(raw, 'history:202:raw');
        const windowId = api.getState().openApp('input-studio', {
          initialRoute: '/history?event=202',
          title: '原始输入 · 202',
        });
        const opened = api.getState().windows[windowId];
        if (opened && opened.placement !== 'maximized') api.getState().toggleMaximize(windowId);
      }
    }

    post({ type: 'state', phase: 'complete' satisfies ShowcasePhase });
  }, [api, clickDockApp, eventIndex, findVisible, hoverAndClick, moveCursor, openStage, post, wait, waitForVisible]);

  const applyCommand = useCallback((command: PawMemoryShowcaseCommand) => {
    if (command.instanceId !== instanceId || command.replayEpoch < epochRef.current) return;
    if (command.replayEpoch > epochRef.current) {
      epochRef.current = command.replayEpoch;
      setReplayEpoch(command.replayEpoch);
      actionRef.current = '';
      clearTimers();
    }

    if (command.command === 'playback.set') {
      setPlaying(command.playing !== false);
    } else if (command.command === 'replay.reset') {
      epochRef.current = command.replayEpoch;
      setReplayEpoch(command.replayEpoch);
      setStageId('history-list');
      setEventIndex(0);
      cursorVisibleRef.current = false;
      setCursor((current) => ({ ...current, visible: false, pressed: false }));
      actionRef.current = '';
      clearTimers();
      api.getState().closeAllWindows();
      openStage(pawMemoryFlowShowcaseStages[0]);
    } else {
      const nextStage = command.stageId ?? stageId;
      setStageId(nextStage);
      setEventIndex(command.eventIndex ?? 0);
      actionRef.current = '';
    }

    post({
      type: 'ack',
      requestId: command.requestId,
      command: command.command satisfies PawShowcaseCommandName,
      accepted: true,
      phase: 'idle' satisfies ShowcasePhase,
    });
  }, [api, clearTimers, instanceId, openStage, post, stageId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || event.origin !== parentOriginRef.current) return;
      if (!isPawMemoryShowcaseCommand(event.data)) return;
      applyCommand(event.data);
    };
    window.addEventListener('message', onMessage);
    const ready = () => post({
      type: 'ready',
      phase: 'idle',
      capabilities: { stage: true, seek: true, playback: true, cursor: true, stream: true },
    });
    ready();
    const retry = window.setTimeout(ready, 240);
    timersRef.current.add(retry);
    openStage(pawMemoryFlowShowcaseStages[0]);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimers();
    };
  }, [applyCommand, clearTimers, openStage, post]);

  useEffect(() => {
    void runStageAction(stageId);
  }, [replayEpoch, runStageAction, stageId]);

  return (
    <span
      aria-hidden="true"
      className="paw-memory-flow-cursor"
      data-cursor-target={cursor.targetId || undefined}
      data-pressed={cursor.pressed || undefined}
      data-visible={cursor.visible || undefined}
      data-replay-epoch={replayEpoch}
      data-stage={stageId}
      data-testid="paw-memory-flow-showcase"
      style={{
        transform: `translate3d(${cursor.x - 3}px, ${cursor.y - 3}px, 0)`,
      }}
    >
      <MousePointer2 fill="currentColor" size={20} strokeWidth={1.7} />
    </span>
  );
}

function parentOrigin(): string {
  try {
    return document.referrer ? new URL(document.referrer).origin : window.location.origin;
  } catch {
    return window.location.origin;
  }
}
