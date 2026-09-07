import { expect, it } from 'vitest';
import { createPreviewTransport } from './preview-control-transport';
import { canonicalWorkspaceReadPath } from '@/features/files/WorkspaceTextEditor';

it('opens a Room participant deliverable through the real Files ownership check', async () => {
  const transport = createPreviewTransport();
  for (const [sessionId, name, phrase] of [
    ['session-room-input', 'input-method-plan.md', 'Rime 原生候选'],
    ['session-room-runtime', 'memory-value-loop.md', 'Input History'],
    ['session-room-context', 'multi-agent-room-plan.md', '唯一 Root final'],
    ['session-room-room', 'pawos-projection-plan.md', '真实 App'],
  ]) {
    const path = `/Volumes/work/wisdom-weasel-rag-ime/${name}`;
    const value = await transport.request({ pathId: 'agent.session.workspace.read', params: { sessionId }, query: { path } }) as Record<string, unknown>;
    expect(canonicalWorkspaceReadPath(value, path, sessionId)).toBe(path);
    expect(value.content).toContain(phrase);
    expect(value.byteSize).toBe(new TextEncoder().encode(String(value.content)).byteLength);
    const listing = await transport.request({ pathId: 'agent.session.workspace.list', params: { sessionId }, query: { path: '/Volumes/work/wisdom-weasel-rag-ime' } }) as Record<string, unknown>;
    expect(listing.sessionId).toBe(sessionId);
  }
});
