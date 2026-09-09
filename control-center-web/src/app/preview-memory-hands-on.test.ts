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
  expect(publicMemoryTopics.length).toBeGreaterThan(8);
  expect(publicMemoryTopics.some(topic=>topic.key.startsWith('world-project-paw'))).toBe(true);
  for (const topic of publicMemoryTopics) {
    const entity = await transport.request({ pathId: 'memory.entity.get', params: { kind: 'book', entityId: topic.id }, responseContract: 'memory-entity.v1' });
    expect(entity).toMatchObject({ topicPage: { bookId: topic.id, coverage: { visibleAtomCount: publicMemoryCorpus.filter(row=>row.topic===topic.key&&row.scope==='durable').length } } });
  }
  for (const source of publicMemoryCorpus.filter(row=>row.phase==='committed')) {
    const result = await transport.request({ pathId: 'history.detail', query: { eventId: source.eventId } }) as { item: { text: string } };
    expect(result.item.text).toBe(source.text);
    if (source.scope === 'durable') expect(previewMemoryReference('atom', source.atomId).item?.text).toBe(source.text);
  }
});

it('keeps world source dates, applications and voice provenance identical across history and memory', async () => {
  const { publicMemoryCorpus } = await import('./preview-memory-corpus');
  const transport = createPreviewTransport();
  const source = publicMemoryCorpus.find(row=>row.id==='world-source-011')!;
  const page = await transport.request({pathId:'history.page'}) as {items:{id:number;createdAtMs:number;source:string;app:string}[]};
  const detail = await transport.request({pathId:'history.detail',query:{eventId:source.eventId}}) as {item:{createdAtMs:number;source:string;app:string}};
  const reference = previewMemoryReference('event',`event:sanitized:${source.eventId}`);
  const recorded = Date.parse(source.sourceTime);
  expect(page.items.find(row=>row.id===source.eventId)).toMatchObject({createdAtMs:recorded,source:'voice',app:'Voice'});
  expect(detail.item).toMatchObject({createdAtMs:recorded,source:'voice',app:'Voice'});
  expect(reference.item).toMatchObject({occurredAtMs:recorded,app:'Voice',text:source.text});
});

it('keeps phase samples inspectable without turning drafts or partial input into stable history', async () => {
  const { publicMemoryCorpus, corpusAtoms } = await import('./preview-memory-corpus');
  const transport = createPreviewTransport();
  const page=await transport.request({pathId:'history.page'}) as {items:{id:number}[]};
  for(const source of publicMemoryCorpus.filter(row=>row.phase!=='committed')) {
    expect(page.items.some(row=>row.id===source.eventId)).toBe(false);
    expect(await transport.request({pathId:'history.detail',query:{eventId:source.eventId}})).toMatchObject({ok:false,reason:'not_found'});
    expect(previewMemoryReference('event',`event:sanitized:${source.eventId}`).item).toMatchObject({text:source.text,sourceContextAvailable:false});
    expect(corpusAtoms().some(atom=>atom.id===source.atomId)).toBe(false);
  }
});
