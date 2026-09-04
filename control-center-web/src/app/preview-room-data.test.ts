import { describe, expect, it } from 'vitest';
import { createRoomProjection, parseRoomEventSnapshot, reduceRoomEvents } from '@/contracts/room-reducer';
import { roomTranscript } from '@/features/conversation-ui/adapters/room-transcript';
import { previewRoomSnapshot } from './preview-room-data';
import { selectRoomRoundTaskSheets } from '@/paw-os/apps/room-round-task-sheet';

describe('PAW kickoff Room fixture', () => {
  it('keeps the gated Reviewer contract-valid until review starts', () => {
    const gated = previewRoomSnapshot('room-preview', { throughSequence: 1 });
    expect(() => parseRoomEventSnapshot(gated)).not.toThrow();
    expect(gated.room.participants.find((item) => item.id === 'participant-review')?.status).toBe('muted');

    const reviewing = previewRoomSnapshot('room-preview', { throughSequence: 58 });
    expect(() => parseRoomEventSnapshot(reviewing)).not.toThrow();
    expect(reviewing.room.participants.find((item) => item.id === 'participant-review')?.status).toBe('active');
  });

  it('contains four visible intercom receipts in the 69-event replay', () => {
    const snapshot = previewRoomSnapshot('room-preview');
    const intercom = snapshot.events.filter((event) => event.payload.activityKind === 'intercom');
    expect(snapshot.events).toHaveLength(69);
    expect(intercom).toHaveLength(4);
    expect(intercom.map((event) => event.payload.targetParticipantId)).toEqual([
      'participant-runtime',
      'participant-context',
      'participant-room',
      'participant-input',
    ]);
  });

  it('uses ordinary project conversation instead of test-script answers', () => {
    const snapshot = previewRoomSnapshot('room-preview', { throughSequence: 20 });
    const text = JSON.stringify(snapshot.events);

    expect(text).toContain('Pi 可以做成网关型 Agent 吗');
    expect(text).toContain('Sidecar 权威会话状态中间层会影响效率');
    expect(text).toContain('杜绝噪声和单个词注入 Agent 上下文');
    expect(text).toContain('应该是工具，不是技能，因为这个涉及结构化返回');
    expect(text).toContain('最开始那套强规范多 Agent');
    expect(text).toContain('可能好几天的工作才有一次真正有价值的变化');
    expect(text).not.toContain('DECISION：');
  });

  it('renders complete transcript for Mars participant lane', () => {
    const rawSnapshot = previewRoomSnapshot('room-preview', { throughSequence: 52 });
    const snapshot = parseRoomEventSnapshot(rawSnapshot);
    let projection = createRoomProjection('room-preview');
    projection = reduceRoomEvents(projection, snapshot.events);

    const mars = roomTranscript(projection, {
      actorName: (id: string | null) => (id === 'participant-input' ? 'Mars' : id === 'participant-facilitator' ? 'Sol' : id || 'Sol'),
      actorRole: () => '实施',
      participantId: 'participant-input',
    });
    expect(mars.messages.length).toBeGreaterThan(0);
  });

  it('has continuous event sequences from 1 to 69', () => {
    const raw = previewRoomSnapshot('room-preview', { throughSequence: 69 });
    const sequences = raw.events.map((e) => e.sequence);
    expect(sequences).toEqual(Array.from({ length: 69 }, (_, i) => i + 1));
  });
});
