import { world } from '../../../showcase/world';

export const worldRoomFiles = Object.fromEntries(world.artifacts.map(file => [
  `media_world${file.id.replace(/[^a-z0-9]/g, '')}`,
  { ...file, fileName: file.path.split('/').at(-1)!, mimeType: 'text/markdown', previewKind: 'text', language: 'markdown' },
]));

/** Add detailed mock evidence to native Room events; sequence/recovery stays owned by the original projection. */
export function enrichWorldRoomEvents<T extends { sequence: number; payload: Record<string, unknown> }>(events: T[]): T[] {
  const mapping: Record<number, string> = { 36:'task-input',37:'task-memory',38:'task-events',39:'task-os',44:'task-input',45:'task-memory',46:'task-events',47:'task-os',61:'task-review' };
  return events.map(event => {
    const taskId = mapping[event.sequence]; if (!taskId) return event;
    const task = world.tasks.find(task=>task.id===taskId)!;
    const messages = world.messages.filter(message=>message.taskId===taskId && message.fromAgentId===task.ownerId && (message.kind==='detail'||Number(message.id.replace('msg-',''))<=25) && (event.sequence<44 ? message.kind==='detail' : message.kind!=='detail'));
    const body = messages.map(message=>`**${message.id} · ${message.kind==='detail' ? '边界用例' : '工作记录'}**\n\n${message.text}`).join('\n\n');
    const payload = { ...event.payload };
    if (typeof payload.delta==='string') payload.delta += `\n\n### 合成场景 · ${task.title}\n\n${body}`;
    if (payload.post && typeof payload.post==='object') {
      const post = payload.post as Record<string,unknown>;
      const files = Object.entries(worldRoomFiles).filter(([,file])=>file.taskId===taskId);
      payload.post = { ...post, content: `${post.content}\n\n### 合成工作记录 · ${task.title}\n\n${body}\n\n${files.map(([,file])=>`[打开合同 ${file.fileName}](${file.path})`).join('\n\n')}\n\n依赖：${task.dependsOn.join('、')||'无'}。各线可先准备；依赖合同到达后才能接受交付。`, blocks: [...(Array.isArray(post.blocks)?post.blocks:[]), ...files.map(([mediaId,file])=>({
        schemaVersion:'rag-ime.agent-block.v1',id:`block-${file.id}`,type:'file',status:'completed',presentationKind:'file',summary:file.title,
        data:{ mediaId,name:file.fileName,mimeType:file.mimeType,byteSize:new TextEncoder().encode(file.content).byteLength,sha256:file.sha256 },source:{},visibility:'room_post',digest:file.sha256,ref:`ref:${file.id}`,generation:0,
      }))] };
    }
    return { ...event, payload };
  });
}
