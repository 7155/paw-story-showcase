import { describe, expect, it } from 'vitest';
import {
  PAW_MEMORY_FLOW_SHOWCASE_ID,
  isPawMemoryShowcaseCommand,
  isPawMemoryFlowShowcase,
  pawMemoryFlowShowcaseInstance,
  pawMemoryFlowShowcaseStageIsReady,
  pawMemoryFlowShowcaseStages,
} from './memory-flow-script';

describe('memory-flow showcase contract', () => {
  it('walks from one raw input through Memory, Graph, recall, and evidence return', () => {
    expect(PAW_MEMORY_FLOW_SHOWCASE_ID).toBe('memory-flow');
    expect(pawMemoryFlowShowcaseStages.map((stage) => stage.id)).toEqual([
      'history-list',
      'history-detail',
      'daily-memory',
      'graph',
      'recall',
      'evidence',
    ]);
    expect(pawMemoryFlowShowcaseStages.map((stage) => stage.route)).toEqual([
      '/history',
      '/history',
      '/memory?view=timeline',
      '/memory?view=relations',
      '/agent?session=session-memory',
      '/agent?session=session-memory',
    ]);
    expect(pawMemoryFlowShowcaseStages.map((stage) => stage.appId)).toEqual([
      'input-studio',
      'input-studio',
      'memory',
      'memory',
      'agent',
      'agent',
    ]);
    expect(pawMemoryFlowShowcaseStages.find((stage) => stage.id === 'evidence')?.detail).toContain('History 202');
  });

  it('starts reading time only after the real owning App renders the stage result', () => {
    const detail = pawMemoryFlowShowcaseStages.find((stage) => stage.id === 'history-detail');
    expect(detail?.readyText).toBe('完整文本');
    expect(detail && pawMemoryFlowShowcaseStageIsReady(detail, '正在读取详情')).toBe(false);
    expect(detail && pawMemoryFlowShowcaseStageIsReady(detail, '输入详情 完整文本')).toBe(true);

    const result = pawMemoryFlowShowcaseStages.find((stage) => stage.id === 'daily-memory');
    expect(result?.readyText).toBe('5 个可核对任务');
  });

  it('is scoped to the public preview query only', () => {
    expect(isPawMemoryFlowShowcase('?showcase=memory-flow')).toBe(true);
    expect(isPawMemoryFlowShowcase('?showcase=room-flow')).toBe(false);
    expect(isPawMemoryFlowShowcase('')).toBe(false);
  });

  it('accepts only the versioned host command for the matching showcase', () => {
    const command = {
      channel: 'paw.showcase',
      version: 1,
      type: 'command',
      showcaseId: 'memory-flow',
      instanceId: 'story-memory-flow',
      requestId: 'seek-1',
      replayEpoch: 2,
      command: 'seek',
      stageId: 'graph',
      eventIndex: 3,
      playing: false,
    };
    expect(isPawMemoryShowcaseCommand(command)).toBe(true);
    expect(isPawMemoryShowcaseCommand({ ...command, channel: 'wrong' })).toBe(false);
    expect(isPawMemoryShowcaseCommand({ ...command, replayEpoch: -1 })).toBe(false);
    expect(pawMemoryFlowShowcaseInstance('?showcaseInstance=story-memory-flow')).toBe('story-memory-flow');
  });
});
