import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PawMemoryFlowShowcaseDirector } from './PawMemoryFlowShowcaseDirector';
import { PawTraceFlowShowcaseDirector } from './PawTraceFlowShowcaseDirector';

const harness = vi.hoisted(() => {
  const state = { setCollaborationFocusGroup: vi.fn(), openApp: vi.fn((_appId: string, _options: unknown) => 'window-demo'), windows: {}, toggleMaximize: vi.fn(), closeAllWindows: vi.fn() };
  return { state, api: { getState: () => state } };
});
vi.mock('../runtime/desktop-context', () => ({ usePawDesktopApi: () => harness.api }));

afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

describe('Memory showcase stage continuity', () => {
  it('does not reopen the incident window when Trace advances', () => {
    vi.useFakeTimers();
    const view = render(<PawTraceFlowShowcaseDirector />);
    harness.state.openApp.mockClear();
    act(() => window.dispatchEvent(new MessageEvent('message', {
      source: window.parent, origin: window.location.origin,
      data: { channel: 'paw.showcase', version: 1, type: 'command', showcaseId: 'context-reliability', instanceId: 'trace-preview', requestId: 'test-trace-stage', replayEpoch: 0, command: 'stage.set', stageId: 'report', eventIndex: 1, playing: false },
    })));
    expect(view.getByTestId('paw-trace-flow-director').getAttribute('data-stage')).toBe('report');
    expect(harness.state.openApp.mock.calls.some(([app]) => app === 'agent')).toBe(false);
    view.unmount();
  });
  it('does not reopen the initial History window when a stage command changes', () => {
    vi.useFakeTimers();
    const view = render(<PawMemoryFlowShowcaseDirector />);
    harness.state.openApp.mockClear();
    act(() => window.dispatchEvent(new MessageEvent('message', {
      source: window.parent,
      origin: window.location.origin,
      data: { channel: 'paw.showcase', version: 1, type: 'command', showcaseId: 'memory-flow', instanceId: 'memory-preview', requestId: 'test-stage', replayEpoch: 0, command: 'stage.set', stageId: 'graph', eventIndex: 3, playing: false },
    })));
    expect(view.getByTestId('paw-memory-flow-showcase').getAttribute('data-stage')).toBe('graph');
    expect(harness.state.openApp.mock.calls.some(([app]) => app === 'input-studio')).toBe(false);
    view.unmount();
  });
});
