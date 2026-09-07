import type { LabApp, LabAppVersion } from '@/features/eval-lab/projects/apps';
import { runLabDemo, type DemoDataset, type DemoMode } from '../../../showcase/lab-flow';
import type { LabKey } from '../../../showcase/lab-evidence';

export const digestBytes = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))].map((value) => value.toString(16).padStart(2, '0')).join('');
export const digestText = (text: string) => digestBytes(new TextEncoder().encode(text));
const json = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (value) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[value]!));

export async function buildLabDemoApp(projectId: string, title: string, key: LabKey, dataset: DemoDataset, mode: DemoMode, report: unknown, version = 1) {
  const appId = `extension:lab-${(await digestText(projectId)).slice(0, 32)}`;
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#f7f8fc;color:#202532;font:15px/1.7 system-ui,sans-serif}main{max-width:850px;margin:40px auto;padding:24px}small{color:#6455af}h1{font-size:28px;line-height:1.35}p{color:#606a7b}form{display:flex;gap:10px;margin:24px 0}input{flex:1;min-width:0;padding:12px;border:1px solid #ccd2df;border-radius:6px;font:inherit}button{padding:10px 16px;background:#5143ae;color:white;border:0;border-radius:6px;cursor:pointer;font:inherit}nav{display:flex;flex-wrap:wrap;gap:8px}nav button{background:#eeebf8;color:#5143ae;font-size:12px}article{background:white;border:1px solid #dce0e8;border-radius:8px;padding:24px;margin-top:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:32px;font-size:12px;color:#626b7c}@media(max-width:500px){main{margin:0;padding:20px}form{flex-direction:column}}</style></head><body><main><small>PAW LAB · 离线演示 APP</small><h1>${escapeHtml(title)}</h1><p>使用导入的数据和本轮测评通过的规则。所有处理都在当前浏览器内完成，不调用模型或外部服务。</p>
<form id="query-form"><label for="query" hidden>问题或记录 ID</label><input id="query" aria-label="问题或记录 ID" placeholder="${key === 'rag' ? '输入问题' : '输入记录 ID'}" required><button>运行</button></form><nav id="examples" aria-label="示例输入"></nav><article aria-live="polite"><strong id="result">等待输入</strong><pre id="detail">选择一条示例，或输入自己的问题。</pre></article><footer>导出内容包含源数据、评测回执与页面源码。本 App 是可运行的离线演示，不包含生产 Provider、业务系统连接或个人记忆。</footer></main>
<script>const execute=${runLabDemo.toString()};const records=${json(dataset.records)};const examples=${json(dataset.cases.map((row) => row.input))};const key=${json(key)};const mode=${json(mode)};const field=document.getElementById('query');function run(){const result=execute(key,records,field.value.trim(),mode);document.getElementById('result').textContent=result.value;document.getElementById('detail').textContent=result.detail}document.getElementById('query-form').addEventListener('submit',e=>{e.preventDefault();run()});for(const input of examples){const b=document.createElement('button');b.type='button';b.textContent=input;b.onclick=()=>{field.value=input;run()};document.getElementById('examples').append(b)}</script></body></html>`;
  const files = {
    'index.html': html,
    'data.json': JSON.stringify(dataset, null, 2),
    'evaluation.json': JSON.stringify(report, null, 2),
    'README.md': `# ${title}\n\n解压后直接在浏览器中打开 index.html。无需安装依赖、填写 Key 或启动服务。\n\n本 App 使用与演示测评相同的离线规则；不是模型能力、生产运行或跨任务泛化证明。data.json 和 evaluation.json 保留本轮输入与评测结果。\n`,
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

/** ZIP STORE: browser-only, valid CRCs, UTF-8 filenames, no external runtime. */
function storedZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder(); const local: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  const crc32 = (bytes: Uint8Array) => { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; };
  for (const [name, text] of Object.entries(files)) {
    const filename = encoder.encode(name); const content = encoder.encode(text); const crc = crc32(content);
    const head = new Uint8Array(30 + filename.length); const view = new DataView(head.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint16(12, 33, true);
    view.setUint32(14, crc, true); view.setUint32(18, content.length, true); view.setUint32(22, content.length, true); view.setUint16(26, filename.length, true); head.set(filename, 30);
    const directory = new Uint8Array(46 + filename.length); const entry = new DataView(directory.buffer);
    entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint16(8, 0x800, true); entry.setUint16(14, 33, true);
    entry.setUint32(16, crc, true); entry.setUint32(20, content.length, true); entry.setUint32(24, content.length, true); entry.setUint16(28, filename.length, true); entry.setUint32(42, offset, true); directory.set(filename, 46);
    local.push(head, content); central.push(directory); offset += head.length + content.length;
  }
  const centralSize = central.reduce((sum, bytes) => sum + bytes.length, 0); const end = new Uint8Array(22); const footer = new DataView(end.buffer);
  footer.setUint32(0, 0x06054b50, true); footer.setUint16(8, central.length, true); footer.setUint16(10, central.length, true); footer.setUint32(12, centralSize, true); footer.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + end.length); let cursor = 0;
  for (const bytes of [...local, ...central, end]) { output.set(bytes, cursor); cursor += bytes.length; }
  return output;
}
