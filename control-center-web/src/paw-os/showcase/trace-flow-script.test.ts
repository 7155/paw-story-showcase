import { describe, expect, it } from 'vitest';
import {
  PAW_TRACE_FLOW_SHOWCASE_ID,
  isPawTraceFlowShowcase,
  isPawTraceShowcaseCommand,
  pawTraceFlowAnomalies,
  pawTraceFlowShowcaseInstance,
  pawTraceFlowShowcaseStages,
} from './trace-flow-script';

describe('Trace showcase contract', () => {
  it('covers incident, diagnosis, repair, and before-after verification', () => {
    expect(pawTraceFlowShowcaseStages.map((stage) => stage.id)).toEqual(['observe', 'report', 'repair', 'verify']);
    expect(pawTraceFlowAnomalies.map((item) => item.label)).toEqual([
      'Tool error',
      '耗时过长',
      'Sub Agent 前台化',
      'Skill 测评异常',
    ]);
  });

  it('accepts only the versioned host envelope', () => {
    const command = {
      channel: 'paw.showcase',
      version: 1,
      type: 'command',
      showcaseId: PAW_TRACE_FLOW_SHOWCASE_ID,
      instanceId: 'story-context-reliability',
      requestId: 'trace-seek-1',
      replayEpoch: 3,
      command: 'seek',
      stageId: 'repair',
      eventIndex: 2,
    };
    expect(isPawTraceShowcaseCommand(command)).toBe(true);
    expect(isPawTraceShowcaseCommand({ ...command, instanceId: '../bad' })).toBe(false);
    expect(isPawTraceShowcaseCommand({ ...command, stageId: 'unknown' })).toBe(false);
  });

  it('is scoped to the public preview and stable instance query', () => {
    expect(isPawTraceFlowShowcase('?showcase=context-reliability')).toBe(true);
    expect(isPawTraceFlowShowcase('?showcase=memory-flow')).toBe(false);
    expect(pawTraceFlowShowcaseInstance('?showcaseInstance=trace-1')).toBe('trace-1');
  });
});
