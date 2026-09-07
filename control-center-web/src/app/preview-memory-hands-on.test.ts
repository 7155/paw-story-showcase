import { expect, it } from 'vitest';
import { createPreviewTransport } from './preview-control-transport';
import { previewMemoryReference } from './preview-memory-data';

it('keeps a topic, source reference and input-history detail on the same readable record', async () => {
  const transport = createPreviewTransport();
  const page = await transport.request({ pathId: 'history.page' }) as { items: { id: number }[] };
  expect(page.items[0].id).toBe(201);
  const entity = await transport.request({ pathId: 'memory.entity.get', params: { kind: 'book', entityId: 'book:preview-memory-governance' }, responseContract: 'memory-entity.v1' });
  expect(entity).toMatchObject({ topicPage: { bookId: 'book:preview-memory-governance', authority: 'atom_projection', coverage: { visibleAtomCount: 2 } } });
  for (const eventId of [10001, 10002, 10003, 10004, 10005]) {
    const ref = previewMemoryReference('event', `event:sanitized:${eventId}`);
    const response = await transport.request({ pathId: 'history.detail', query: { eventId } }) as { ok: boolean; item: { text: string } };
    expect(response.ok).toBe(true);
    expect(response.item.text).toBe(ref.item?.text);
    expect(ref.item?.sourceContextAvailable).toBe(true);
  }
});

it('opens every expanded topic and resolves each atom back to its exact source', async () => {
  const { publicMemoryTopics, publicMemoryCorpus } = await import('./preview-memory-corpus');
  const transport = createPreviewTransport();
  expect(publicMemoryTopics).toHaveLength(8);
  for (const topic of publicMemoryTopics) {
    const entity = await transport.request({ pathId: 'memory.entity.get', params: { kind: 'book', entityId: topic.id }, responseContract: 'memory-entity.v1' });
    expect(entity).toMatchObject({ topicPage: { bookId: topic.id, coverage: { visibleAtomCount: 4 } } });
  }
  for (const source of publicMemoryCorpus) {
    const result = await transport.request({ pathId: 'history.detail', query: { eventId: source.eventId } }) as { item: { text: string } };
    expect(result.item.text).toBe(source.text);
    if (source.scope === 'durable') expect(previewMemoryReference('atom', source.atomId).item?.text).toBe(source.text);
  }
});
