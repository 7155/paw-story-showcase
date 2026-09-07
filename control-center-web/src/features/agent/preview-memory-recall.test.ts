import { describe, expect, it } from 'vitest';
import { previewAgentSnapshot } from './preview-data';

function snapshotText(sessionId: string): string {
  return JSON.stringify(previewAgentSnapshot(sessionId).messages);
}

describe('Memory recall showcase conversation', () => {
  it('continues the shared task with one recalled delivery turn', () => {
    const text = snapshotText('session-memory-greeting');

    expect(previewAgentSnapshot('session-memory-greeting').messages).toHaveLength(2);
    expect(text).toContain('继续昨天的 PAW 工作台方案，先告诉我交付到了哪里。');
    expect(text).toContain('四条产品线的方案已经汇总');
    expect(text).toContain('pawos-projection-plan.md');
    expect(text).not.toContain('为什么保留候选 B，没有选择候选 A？');
  });

  it('adds a follow-up turn about the accepted and rejected candidates', () => {
    const text = snapshotText('session-memory');

    expect(previewAgentSnapshot('session-memory').messages).toHaveLength(4);
    expect(text).toContain('继续昨天的 PAW 工作台方案，先告诉我交付到了哪里。');
    expect(text).toContain('为什么保留候选 B，没有选择候选 A？');
    expect(text).toContain('候选 A');
    expect(text).toContain('候选 B');
    expect(text).toContain('恢复');
    expect(text).not.toContain('我最近反复强调的偏好有哪些？');
  });
});
