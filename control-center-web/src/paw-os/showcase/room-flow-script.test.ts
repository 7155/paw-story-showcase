import { describe, expect, it } from 'vitest';
import {
  pawRoomFlowShowcaseDelayBeforeSequenceMs,
  pawRoomFlowShowcaseNavigationAtSequence,
  pawRoomFlowShowcaseReviewerGateHoldMs,
} from './room-flow-script';

describe('PAW kickoff showcase direction', () => {
  it('clicks real Room views at meaningful transitions', () => {
    expect([
      pawRoomFlowShowcaseNavigationAtSequence(1),
      pawRoomFlowShowcaseNavigationAtSequence(24),
      pawRoomFlowShowcaseNavigationAtSequence(53),
    ]).toEqual([
      { view: 'conversation', label: '公开记录' },
      { view: 'collaboration', label: '协同模式' },
      { view: 'conversation', label: '公开记录' },
    ]);
    expect(pawRoomFlowShowcaseNavigationAtSequence(2)).toBeNull();
  });

  it('leaves reading time after questions, handoffs, Docs, and review gates', () => {
    expect(pawRoomFlowShowcaseDelayBeforeSequenceMs(7, '?showcase=room-flow')).toBeGreaterThanOrEqual(2_200);
    expect(pawRoomFlowShowcaseDelayBeforeSequenceMs(32, '?showcase=room-flow')).toBeGreaterThanOrEqual(1_800);
    expect(pawRoomFlowShowcaseDelayBeforeSequenceMs(23, '?showcase=room-flow')).toBeGreaterThanOrEqual(2_200);
    expect(pawRoomFlowShowcaseReviewerGateHoldMs('?showcase=room-flow')).toBeGreaterThanOrEqual(4_000);

    expect(pawRoomFlowShowcaseDelayBeforeSequenceMs(7, '?showcase=room-flow&showcaseSpeed=fast')).toBe(180);
    expect(pawRoomFlowShowcaseDelayBeforeSequenceMs(23, '?showcase=room-flow&showcaseSpeed=fast')).toBeGreaterThanOrEqual(700);
    expect(pawRoomFlowShowcaseReviewerGateHoldMs('?showcase=room-flow&showcaseSpeed=fast')).toBe(1_200);
  });
});
