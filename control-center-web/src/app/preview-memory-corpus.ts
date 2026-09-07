import corpus from '../../../showcase/datasets/memory-corpus.v1.json';
import type { MemoryReferenceV1 } from '@/contracts/generated/memory-reference.v1';
export const publicMemoryCorpus = corpus.map((row, index) => ({ ...row, eventId: 11001 + index, atomId: `atom:corpus-${row.id}` }));
export const publicMemoryTopics = [...new Map(publicMemoryCorpus.map(row => [row.topic, { key: row.topic, title: row.topicTitle, id: `book:corpus-${row.topic}` }])).values()];
const reference = (eventId: number) => ({ kind: 'event' as const, id: `event:sanitized:${eventId}`, referenceKind: 'event' as const, referenceId: `event:sanitized:${eventId}`, label: '已清洗输入依据' });
export function corpusBooks() {
  return publicMemoryTopics.map(topic => ({ id: topic.id, title: topic.title, summary: '公开设计摘要与人工边界样例；每条记录可回到同一份来源。', status: 'active', type: 'topic', ownerKind: 'user', ownerId: 'default',
    source: { type: 'memory_book', id: topic.id }, ref: { type: 'book', id: topic.id }, tags: [topic.title],
    evidenceRefs: publicMemoryCorpus.filter(row => row.topic === topic.key && row.scope === 'durable').map(row => ({ kind: 'atom', referenceId: row.atomId, title: row.title })), updatedAtMs: Date.now() - 3600000 }));
}
export function corpusAtoms() {
  return publicMemoryCorpus.filter(row => row.scope === 'durable').map(row => ({ id: row.atomId, title: row.title, text: row.text, status: 'active', claimState: 'current', quality: 1,
    source: { type: 'memory_atom', id: row.atomId }, ref: { type: 'atom', id: row.atomId }, tags: [row.topicTitle], evidenceRefs: [reference(row.eventId)], updatedAtMs: Date.now() - 3600000 }));
}
export function corpusEvidence() {
  return publicMemoryCorpus.map(row => ({ id: `source:corpus-${row.id}`, title: row.text, detail: row.origin === 'public-design-summary' ? '项目设计规则改写 · 公开摘要' : '人工编写的边界样例',
    status: row.scope === 'durable' ? 'consolidated' : 'active', sourceChannel: 'agent_capture', ownerKind: 'user', ownerId: 'default', type: 'session_digest',
    source: { type: 'input_event', id: `event:sanitized:${row.eventId}` }, ref: { type: 'evidence', id: `source:corpus-${row.id}` }, evidenceRefs: [reference(row.eventId)], updatedAtMs: Date.now() - 3600000 }));
}
export function corpusReference(kind: string, referenceId: string): MemoryReferenceV1 | undefined {
  const row = publicMemoryCorpus.find(item => kind === 'atom' ? item.atomId === referenceId : kind === 'evidence' && `source:corpus-${item.id}` === referenceId);
  if (!row || (kind !== 'atom' && kind !== 'evidence')) return;
  return { schemaVersion: 'rag-ime.memory-reference.v1', ok: true, settingsRevision: 'settings:preview', runtimeRevision: 7, kind, referenceId,
    source: { kind: kind === 'atom' ? 'memory_atom' : 'agent_memory_evidence', id: referenceId },
    ref: { kind, id: referenceId, referenceKind: kind, referenceId }, item: { id: referenceId, title: row.title, text: row.text, status: 'active', claimState: 'current', ownerKind: 'user', ownerId: 'default', updatedAtMs: Date.now() - 3600000 }, evidenceRefs: [reference(row.eventId)] };
}
export function corpusEntity(kind: string, entityId: string): Record<string, unknown> | undefined {
  const topic = kind === 'book' && publicMemoryTopics.find(item => item.id === entityId || item.id === `book:${entityId}`);
  if (!topic) return;
  const rows = publicMemoryCorpus.filter(row => row.topic === topic.key && row.scope === 'durable');
  const now = Date.now() - 3600000;
  return { schemaVersion: 'rag-ime.memory-entity.v1', ok: true, settingsRevision: 'settings:preview', runtimeRevision: 7, kind: 'book', entityId, entityRevision: `sha256:${'c'.repeat(64)}`, project: 'wisdom-weasel-rag-ime',
    entity: { id: topic.id, entityId: topic.id.slice(5), kind: 'book', label: topic.title, description: '从公开设计规则整理的主题；每条认识均保留来源。', color: 'teal', status: 'active', source: 'preview', project: 'wisdom-weasel-rag-ime', qualityScore: 1, memberCount: rows.length, edgeCount: 0, updatedAtMs: now },
    topicPage: { schemaVersion: 'rag-ime.memory-topic-page.v1', bookId: topic.id, revision: `sha256:${'c'.repeat(64)}`, authority: 'atom_projection', freshness: 'current', summary: '公开设计摘要，用于检索、来源回溯和整理演示。',
      sections: { current: rows.map(row => ({ id: row.atomId, text: row.text, kind: 'principle', status: 'active', claimState: 'current', atomIds: [row.atomId], references: [reference(row.eventId)], sourceStatus: 'available', lineageId: row.atomId, validFromMs: now, validToMs: null, supersedesId: '', supersededByIds: [], reason: null })), constraints: [], openQuestions: [], history: [] },
      sources: rows.map(row => reference(row.eventId)), coverage: { memberCount: rows.length, visibleAtomCount: rows.length, omittedAtomCount: 0, truncated: false } },
    attributes: { type: 'topic', aliases: [], tags: [topic.title] }, connections: { items: [], nextCursor: '', limit: 40, hasMore: false }, members: { items: [], nextCursor: '', limit: 40, hasMore: false }, limits: { connectionsLimit: 40, membersLimit: 40 } };
}
