import type { JsonValue, ProjectReceipt } from './types';
import { projectCommandRejected } from './api';
import { knowledgeFileName } from './knowledge-files';

export type KnowledgeUploadCheckpoint = {
  name: string; bytes: number; sha256: string; uploadId?: string; chunkBytes?: number;
  nextIndex: number; phase: 'idle' | 'begin' | 'chunk' | 'seal' | 'complete';
};
/** Advance only from a receipt for the operation whose outcome was unknown. */
export function recoverKnowledgeUpload(checkpoint: KnowledgeUploadCheckpoint, upload: NonNullable<ProjectReceipt['upload']>): KnowledgeUploadCheckpoint {
  const next = { ...checkpoint };
  if (next.uploadId && upload.uploadId !== next.uploadId) throw new Error('上传回执不属于原文件。');
  if (next.phase === 'begin') {
    if (upload.sha256 !== next.sha256 || upload.bytes !== next.bytes || upload.name !== next.name) throw new Error('上传回执与原文件不匹配。');
    next.uploadId = upload.uploadId; next.chunkBytes = upload.chunkBytes; next.phase = 'idle';
  } else if (next.phase === 'chunk') {
    if (upload.index !== next.nextIndex || upload.receivedBytes !== Math.min(next.chunkBytes!, next.bytes - next.nextIndex * next.chunkBytes!)) throw new Error('上传分片回执与原操作不匹配。');
    next.nextIndex += 1; next.phase = 'idle';
  } else if (next.phase === 'seal') {
    if (!upload.ready) throw new Error('文件接收尚未确认。');
    next.phase = 'complete';
  }
  return next;
}
export async function uploadKnowledgeFile(file: File, command: (input: Record<string, JsonValue>) => Promise<ProjectReceipt | undefined>,
  progress: (message: string) => void, stopped: () => boolean = () => false,
  resume?: { checkpoint?: KnowledgeUploadCheckpoint; save: (checkpoint: KnowledgeUploadCheckpoint) => void }): Promise<string> {
  if (file.size <= 0 || file.size > 300 * 1024 * 1024) throw new Error('请选择非空文件，最多 300 MB。');
  const name = knowledgeFileName(file);
  progress(`正在读取 ${name}…`);
  const bytes = await file.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((value) => value.toString(16).padStart(2, '0')).join('');
  let checkpoint: KnowledgeUploadCheckpoint = resume?.checkpoint ?? { name, bytes: file.size, sha256: hash, nextIndex: 0, phase: 'idle' };
  if (checkpoint.sha256 !== hash || checkpoint.name !== name || checkpoint.bytes !== file.size) throw new Error('请重新选择原资料文件以继续上传。');
  const save = (patch: Partial<KnowledgeUploadCheckpoint>) => { checkpoint = { ...checkpoint, ...patch }; resume?.save(checkpoint); };
  const invoke = async (input: Record<string, JsonValue>) => {
    try { return await command(input); }
    catch (reason) { if (projectCommandRejected(reason)) save({ phase: 'idle' }); throw reason; }
  };
  if (checkpoint.phase === 'complete' && checkpoint.uploadId) return checkpoint.uploadId;
  if (checkpoint.phase !== 'idle') throw new Error('原上传操作尚未确认，请先核对原操作。');
  if (stopped()) throw new Error('上传已停止，已接收的材料仍保留。');
  if (!checkpoint.uploadId) {
    save({ phase: 'begin' });
    const started = await invoke({ operation: 'upload_begin', name, bytes: file.size, sha256: hash });
    if (!started?.upload?.uploadId) throw new Error('上传尚未确认，请先核对原操作。');
    save({ uploadId: started.upload.uploadId, chunkBytes: started.upload.chunkBytes ?? 512 * 1024, phase: 'idle' });
  }
  const uploadId = checkpoint.uploadId!; const chunkBytes = checkpoint.chunkBytes!;
  if (!Number.isInteger(chunkBytes) || chunkBytes <= 0 || chunkBytes > 512 * 1024) throw new Error('上传服务返回的分片大小无效。');
  for (let offset = checkpoint.nextIndex * chunkBytes; offset < bytes.byteLength; offset += chunkBytes) {
    if (stopped()) throw new Error('上传已停止，已接收的材料仍保留。');
    const part = new Uint8Array(bytes.slice(offset, offset + chunkBytes)); let binary = '';
    for (let start = 0; start < part.length; start += 8192) binary += String.fromCharCode(...part.subarray(start, start + 8192));
    progress(`正在上传 ${file.name} · ${Math.round(offset / file.size * 100)}%`);
    save({ phase: 'chunk' });
    if (!await invoke({ operation: 'upload_chunk', uploadId, index: offset / chunkBytes, data: btoa(binary) })) throw new Error('上传分片尚未确认，请先核对原操作。');
    save({ phase: 'idle', nextIndex: offset / chunkBytes + 1 });
  }
  if (stopped()) throw new Error('上传已停止，已接收的材料仍保留。');
  save({ phase: 'seal' });
  if (!await invoke({ operation: 'upload_seal', uploadId })) throw new Error('文件接收结果尚未确认，请核对原操作。');
  save({ phase: 'complete' });
  return uploadId;
}
