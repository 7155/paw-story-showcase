import { MousePointer2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePawDesktopApi } from '../runtime/desktop-context';
import {
  PAW_TRACE_FLOW_SHOWCASE_ID,
  isPawTraceShowcaseCommand,
  pawTraceFlowShowcaseInstance,
  pawTraceFlowShowcaseStages,
  type PawTraceFlowStageId,
  type PawTraceShowcaseCommand,
} from './trace-flow-script';

type TraceCursor = { x: number; y: number; visible: boolean; pressed: boolean; targetId: string };

export function PawTraceFlowShowcaseDirector() {
  const api = usePawDesktopApi();
  const instanceId = pawTraceFlowShowcaseInstance();
  const [stageId, setStageId] = useState<PawTraceFlowStageId>('observe');
  const [eventIndex, setEventIndex] = useState(0);
  const [replayEpoch, setReplayEpoch] = useState(0);
  const [cursor, setCursor] = useState<TraceCursor>({ x: 0, y: 0, visible: false, pressed: false, targetId: '' });
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
      showcaseId: PAW_TRACE_FLOW_SHOWCASE_ID,
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

  const waitForVisible = useCallback((selector: string, timeoutMs = 10_000) => new Promise<HTMLElement | null>((resolve) => {
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
    const next = { x: rect.left + rect.width * .56, y: rect.top + rect.height * .54, pressed: false, targetId };
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

  const openAgentIncident = useCallback(() => {
    const state = api.getState();
    const windowId = state.openApp('agent', {
      initialRoute: pawTraceFlowShowcaseStages[0].route,
      target: { kind: 'session', id: 'session-reliability-incident', title: 'Tool error · Workflow 事故' },
      title: '异常 Session',
    });
    const opened = api.getState().windows[windowId];
    if (opened && opened.placement !== 'maximized') api.getState().toggleMaximize(windowId);
  }, [api]);

  const openTraceAgent = useCallback(() => {
    if (findVisible('.trace-showcase-workbench')) return;
    const state = api.getState();
    const windowId = state.openApp('system-monitor', { initialRoute: '/trace-agent', title: 'Trace Agent' });
    const opened = api.getState().windows[windowId];
    if (opened && opened.placement !== 'maximized') api.getState().toggleMaximize(windowId);
  }, [api, findVisible]);

  const ensureReported = useCallback(async () => {
    openTraceAgent();
    const start = await waitForVisible('[data-trace-action="start-diagnostic"]');
    if (start) {
      await hoverAndClick(start, 'trace:start-diagnostic');
      await wait(1_200);
    }
    return waitForVisible('[data-trace-action="repair"]');
  }, [hoverAndClick, openTraceAgent, wait, waitForVisible]);

  const ensureRepairReady = useCallback(async () => {
    let repair = findVisible('[data-trace-action="repair"]');
    if (!repair) repair = await ensureReported();
    if (repair) {
      await hoverAndClick(repair, 'trace:repair');
      await wait(1_800);
    }
    const submit = await waitForVisible('[data-trace-action="repair-submit"]');
    if (submit) {
      await hoverAndClick(submit, 'trace:repair-submit');
      await wait(1_200);
    }
    return waitForVisible('[data-trace-action="recheck"]');
  }, [ensureReported, findVisible, hoverAndClick, wait, waitForVisible]);

  const runStage = useCallback(async (nextStage: PawTraceFlowStageId) => {
    const key = `${epochRef.current}:${nextStage}:${eventIndex}`;
    if (actionRef.current === key) return;
    actionRef.current = key;
    post({ type: 'state', phase: 'waiting' });

    if (nextStage === 'observe') {
      openAgentIncident();
      await wait(400);
      const rail = await waitForVisible('[aria-label="打开工作记录"]');
      if (rail) {
        await hoverAndClick(rail, 'agent:open-records');
        await wait(600);
      }
      const row = await waitForVisible('[data-trace-target="session:session-reliability-incident"]');
      if (row) {
        await moveCursor(row, 'session:session-reliability-incident');
        row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        await wait(700);
      }
      const handoff = await waitForVisible('[data-trace-action="trace-handoff"][data-trace-session-id="session-reliability-incident"]');
      if (handoff) {
        await hoverAndClick(handoff, 'trace:handoff');
        await wait(800);
      }
    } else if (nextStage === 'report') {
      await ensureReported();
    } else if (nextStage === 'repair') {
      await ensureRepairReady();
    } else {
      let recheck = findVisible('[data-trace-action="recheck"]');
      if (!recheck) recheck = await ensureRepairReady();
      if (recheck) {
        await hoverAndClick(recheck, 'trace:recheck');
        await wait(800);
      }
      const table = await waitForVisible('[data-trace-comparison="before-after"]');
      if (table) {
        await wait(2_200);
        const evidence = await waitForVisible('[data-trace-action="open-evidence"]');
        if (evidence) await hoverAndClick(evidence, 'trace:evidence');
      }
    }
    post({ type: 'state', phase: 'complete' });
  }, [ensureRepairReady, ensureReported, eventIndex, findVisible, hoverAndClick, moveCursor, openAgentIncident, post, wait, waitForVisible]);

  const applyCommand = useCallback((command: PawTraceShowcaseCommand) => {
    if (command.instanceId !== instanceId || command.replayEpoch < epochRef.current) return;
    if (command.replayEpoch > epochRef.current) {
      epochRef.current = command.replayEpoch;
      setReplayEpoch(command.replayEpoch);
      actionRef.current = '';
      clearTimers();
    }
    if (command.command === 'replay.reset') {
      epochRef.current = command.replayEpoch;
      setReplayEpoch(command.replayEpoch);
      setStageId('observe');
      setEventIndex(0);
      cursorVisibleRef.current = false;
      setCursor((current) => ({ ...current, visible: false, pressed: false }));
      clearTimers();
      actionRef.current = '';
      api.getState().closeAllWindows();
      openAgentIncident();
    } else if (command.command !== 'playback.set') {
      setStageId(command.stageId ?? stageId);
      setEventIndex(command.eventIndex ?? 0);
      actionRef.current = '';
    }
    post({ type: 'ack', requestId: command.requestId, command: command.command, accepted: true, phase: 'idle' });
  }, [api, clearTimers, instanceId, openAgentIncident, post, stageId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || event.origin !== parentOriginRef.current) return;
      if (!isPawTraceShowcaseCommand(event.data)) return;
      applyCommand(event.data);
    };
    window.addEventListener('message', onMessage);
    const ready = () => post({ type: 'ready', phase: 'idle', capabilities: { stage: true, seek: true, playback: true, cursor: true, stream: true } });
    ready();
    const retry = window.setTimeout(ready, 240);
    timersRef.current.add(retry);
    openAgentIncident();
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimers();
    };
  }, [applyCommand, clearTimers, openAgentIncident, post]);

  useEffect(() => {
    void runStage(stageId);
  }, [replayEpoch, runStage, stageId]);

  return (
    <span
      aria-hidden="true"
      className="paw-trace-flow-cursor"
      data-cursor-target={cursor.targetId || undefined}
      data-pressed={cursor.pressed || undefined}
      data-visible={cursor.visible || undefined}
      data-replay-epoch={replayEpoch}
      data-stage={stageId}
      data-testid="paw-trace-flow-director"
      style={{ transform: `translate3d(${cursor.x - 3}px,${cursor.y - 3}px,0)` }}
    ><MousePointer2 fill="currentColor" size={20} strokeWidth={1.7}/></span>
  );
}

function parentOrigin(): string {
  try {
    return document.referrer ? new URL(document.referrer).origin : window.location.origin;
  } catch {
    return window.location.origin;
  }
}
