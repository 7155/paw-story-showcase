import { storedZip } from '../../../showcase/zip';
import type { LabApp, LabAppVersion } from '@/features/eval-lab/projects/apps';
import { type DemoDataset, type DemoMode } from '../../../showcase/lab-flow';
import { verticalAppDocument } from '../../../showcase/vertical-app';
import type { LabKey } from '../../../showcase/lab-evidence';

export const digestBytes = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))].map((value) => value.toString(16).padStart(2, '0')).join('');
export const digestText = (text: string) => digestBytes(new TextEncoder().encode(text));

export async function buildLabDemoApp(projectId: string, title: string, key: LabKey, dataset: DemoDataset, mode: DemoMode, report: unknown, version = 1) {
  const appId = `extension:lab-${(await digestText(projectId)).slice(0, 32)}`;
  const html = verticalAppDocument(key, dataset, mode, report, `${appId}:${version}`);
  const files = {
    'index.html': html,
    'data.json': JSON.stringify(dataset, null, 2),
    'evaluation.json': JSON.stringify(report, null, 2),
    'README.md': `# ${title}\n\n解压后直接在浏览器中打开 index.html。无需安装依赖、填写 Key 或启动服务。\n\n本 App 提供对应场景的业务操作、来源检查、工作记录保存与导出，使用与演示测评相同的离线规则；不是模型能力、生产运行或跨任务泛化证明。data.json 和 evaluation.json 保留本轮输入与评测结果。\n`,
  };
  const bytes = storedZip(files);
  const sourceFiles = await Promise.all(Object.entries(files).map(async ([path, text]) => ({ path, byteSize: new TextEncoder().encode(text).length, sha256: await digestText(text) })));
  const now = Date.now();
  const app: LabApp = { appId, projectId, title, description: '本轮离线规则测评通过的演示 App', revision: version, latestVersion: version, activeVersion: null, createdAtMs: now, updatedAtMs: now };
  const artifact: LabAppVersion = { appId, version, html, contentHash: await digestBytes(bytes), createdAtMs: now,
    fileCount: sourceFiles.length, byteSize: bytes.length, sourceFiles,
    spec: { title, description: app.description, html, skill: '', context: [], model: { provider: 'offline-showcase', model: '本地规则与检索 · 无模型调用', thinkingLevel: 'off' }, actions: [] } };
  let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return { app, version: artifact, download: { ok: true, appId, version, target: 'standalone', filename: `paw-lab-${key}-v${version}.zip`,
    base64: btoa(binary), byteSize: bytes.length, sha256: artifact.contentHash } };
}
