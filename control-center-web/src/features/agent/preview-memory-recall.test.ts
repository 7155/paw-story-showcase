import { describe, expect, it } from 'vitest';
import { previewAgentSnapshot } from './preview-data';

function snapshotText(sessionId: string): string {
  return JSON.stringify(previewAgentSnapshot(sessionId).messages);
}

describe('Memory recall showcase conversation', () => {
  it('starts with one ordinary greeting while recall stays implicit', () => {
    const text = snapshotText('session-memory-greeting');

    expect(text).toContain('嗨，今天怎么样？');
    expect(text).toContain('你今天其实推进了不少');
    expect(text).not.toContain('还行，就是今天有点累');
    expect(text).not.toContain('我今天主要做了什么？');
  });

  it('adds the next chat turn and naturally uses remembered preferences', () => {
    const text = snapshotText('session-memory');

    expect(text).toContain('嗨，今天怎么样？');
    expect(text).toContain('还行，就是今天有点累。');
    expect(text).toContain('你最近反复在意的不是“功能堆得多”');
    expect(text).toContain('几个 Agent 之间最难的交接跑通了');
    expect(text).toContain('真实、有用');
    expect(text).not.toContain('行星之间真的能沟通');
    expect(text).not.toContain('我最近反复强调的偏好有哪些？');
  });
});
