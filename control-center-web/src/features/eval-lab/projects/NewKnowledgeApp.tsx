import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, FileText, FolderOpen, Upload, X } from 'lucide-react';
import { Button, IconButton } from '@/components/primitives';
import { projectError, projectCommandRejected } from './api';
import { uploadKnowledgeFile, recoverKnowledgeUpload, type KnowledgeUploadCheckpoint } from './knowledge-upload';
import { droppedKnowledgeFiles, knowledgeFileName, supportedKnowledgeFile } from './knowledge-files';
import { OptimizationGoalSpace } from './OptimizationGoalSpace';
import { DEFAULT_OPTIMIZATION_GOALS, normalizeGoals, requirementWithGoals } from './optimization-goals';
import type { JsonValue, LabProject, ProjectReceipt } from './types';

export function NewKnowledgeApp({ connection, blocked, recoveredReceipt, onCreate, onKnowledge, onReadProject, onReady }: {
  connection: string; blocked: boolean;
  recoveredReceipt?: ProjectReceipt;
  onCreate: (input: Record<string, JsonValue>) => Promise<ProjectReceipt | undefined>;
  onKnowledge: (input: Record<string, JsonValue>, project: LabProject) => Promise<ProjectReceipt | undefined>;
  onReadProject?: (projectId: string) => Promise<LabProject>;
  onReady: (receipt: ProjectReceipt, message: string) => Promise<void>;
}) {
  const key = `paw.lab.knowledge-app-intake.v1:${connection}`;
  const [requirement, setRequirement] = useState(() => { try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; } });
  const goalsKey = `${key}:optimization-preferences.v2`;
  const [goals, setGoals] = useState(() => { try { return normalizeGoals(JSON.parse(sessionStorage.getItem(goalsKey) ?? 'null')); } catch { return { ...DEFAULT_OPTIMIZATION_GOALS }; } });
  const [files, setFiles] = useState<File[]>([]); const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(''); const [intakeNotice, setIntakeNotice] = useState(''); const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ bytes: number; totalBytes: number; files: number; totalFiles: number }>();
  const checkpointKey = `${key}:uploads`;
  const saved = useRef<{ project?: LabProject; files?: string[]; activeFile?: string; uploads: Record<string, KnowledgeUploadCheckpoint> }>((() => { try { return JSON.parse(sessionStorage.getItem(checkpointKey) ?? 'null') ?? { uploads: {} }; } catch { return { uploads: {} }; } })());
  const persist = () => { try { sessionStorage.setItem(checkpointKey, JSON.stringify(saved.current)); } catch { /* Current upload checkpoints remain available. */ } };
  const fileKey = (file: File) => `${knowledgeFileName(file)}:${file.size}:${file.lastModified}`;
  const project = useRef<LabProject | undefined>(saved.current.project); const submitted = useRef(false);
  const stop = useRef(false); const active = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  useEffect(() => {
    if (!recoveredReceipt) return;
    project.current = recoveredReceipt.project; saved.current.project = recoveredReceipt.project;
    const activeFile = saved.current.activeFile;
    if (recoveredReceipt.upload && activeFile && saved.current.uploads[activeFile]) {
      try { saved.current.uploads[activeFile] = recoverKnowledgeUpload(saved.current.uploads[activeFile], recoveredReceipt.upload); }
      catch (reason) { setError(projectError(reason)); return; }
    }
    persist();
    if (recoveredReceipt.job?.jobId) {
      submitted.current = true;
      void onReady(recoveredReceipt, '').then(() => { try { sessionStorage.removeItem(checkpointKey); sessionStorage.removeItem(key); } catch { /* Project owns the files. */ } });
    } else { submitted.current = false; setError('原操作已核对。可以继续上传，完成接入；刷新页面后需重新选择原资料文件。'); }
  }, [recoveredReceipt]);
  useEffect(() => { try { sessionStorage.setItem(key, requirement); } catch { /* The current input remains. */ } }, [key, requirement]);
  useEffect(() => { try { sessionStorage.setItem(goalsKey, JSON.stringify(goals)); } catch { /* The current target remains. */ } }, [goalsKey, goals]);
  const add = (incoming: FileList | File[] | null) => {
    if (!incoming?.length || busy || (project.current && files.length)) return;
    const supported = Array.from(incoming).filter(supportedKnowledgeFile);
    const skipped = incoming.length - supported.length;
    const next = [...files, ...supported.filter((file) => !files.some((old) => fileKey(old) === fileKey(file)))];
    if (next.some((file) => file.size <= 0 || file.size > (/\.zip$/iu.test(file.name) ? 300 : /\.pdf$/iu.test(file.name) ? 100 : 4) * 1024 * 1024)) { setError('请选择非空资料：PDF 每份最多 100 MB，文本最多 4 MB，ZIP 最多 300 MB。'); return; }
    if (next.length > 200 || next.reduce((size, file) => size + file.size, 0) > 300 * 1024 * 1024) { setError('一次最多选择 200 个文件，合计 300 MB；较大的资料文件夹可压缩成 ZIP 接入。'); return; }
    setIntakeNotice(skipped ? `已略过 ${skipped} 个暂不支持的文件；接入 PDF、TXT、Markdown、HTML 和 ZIP。` : '');
    setFiles(next); setError('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (active.current || blocked || !files.length || !requirement.trim() || submitted.current) return;
    active.current = true; stop.current = false; setBusy(true); setError('');
    try {
      const selectedKeys = files.map(fileKey);
      const updateUploadProgress = () => setUploadProgress({
        bytes: selectedKeys.reduce((total, id) => { const current = saved.current.uploads[id]; return total + (!current ? 0 : current.phase === 'complete' ? current.bytes : Math.min(current.bytes, current.nextIndex * (current.chunkBytes ?? 0))); }, 0),
        totalBytes: files.reduce((total, file) => total + file.size, 0),
        files: selectedKeys.filter(id => saved.current.uploads[id]?.phase === 'complete').length, totalFiles: files.length,
      });
      updateUploadProgress();
      if (saved.current.files && JSON.stringify([...saved.current.files].sort()) !== JSON.stringify([...selectedKeys].sort())) throw new Error('请重新选择全部原资料文件，再继续上传。');
      saved.current.files = selectedKeys; persist();
      if (project.current && onReadProject) { project.current = await onReadProject(project.current.projectId); saved.current.project = project.current; persist(); }
      if (!project.current) {
        setProgress('正在创建应用项目…');
        const receipt = await onCreate({ description: requirementWithGoals('构建深度研究 App：支持多篇资料研究、逐项引用、原文阅读、继续追问、历史恢复、停止和报告导出。用户先在第一步设计知识库基线，再沿用该配置评测和优化。\n\n研究任务：'+requirement, goals) });
        if (!receipt) throw new Error('项目创建尚未确认，请先核对原操作；已选文件与要求保留在当前页面。');
        project.current = receipt.project; saved.current.project = receipt.project; persist();
      }
      const command = async (input: Record<string, JsonValue>) => {
        const receipt = await onKnowledge(input, project.current!);
        if (receipt) { project.current = receipt.project; saved.current.project = receipt.project; persist(); }
        return receipt;
      };
      const ids: string[] = [];
      for (const [index, file] of files.entries()) {
        const identity = fileKey(file); saved.current.activeFile = identity; persist();
        const id = await uploadKnowledgeFile(file, command, (text) => setProgress(`${index + 1} / ${files.length} · ${text}`), () => stop.current,
          { checkpoint: saved.current.uploads[identity], save: (checkpoint) => { saved.current.uploads[identity] = checkpoint; persist(); updateUploadProgress(); } });
        ids.push(id);
      }
      if (stop.current) throw new Error('上传已停止，已接收的材料仍保留。');
      setProgress('材料已接收，正在交给 Lab 整理…');
      submitted.current = true;
      const receipt = await command({ operation: 'import_corpus', uploadIds: [...new Set(ids)], cleaning: { removeRepeatedMargins: true, normalizeWhitespace: true } });
      if (!receipt?.job?.jobId) throw new Error('资料整理的接纳结果尚未确认。请核对原操作后，在已创建项目中继续，避免重复启动。');
      try { sessionStorage.removeItem(key); } catch { /* The project owns the requirement now. */ }
      await onReady(receipt, '');
      try { sessionStorage.removeItem(checkpointKey); } catch { /* Project owns the files. */ }
    } catch (reason) { if (projectCommandRejected(reason)) submitted.current = false; setError(projectError(reason)); }
    finally { active.current = false; setBusy(false); setProgress(''); }
  };
  const disabled = busy || blocked;
  return <form className="lab-app-intake" onSubmit={(event) => void submit(event)}>
    <div className="lab-app-intake__drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!disabled && !project.current) void droppedKnowledgeFiles(event.dataTransfer).then(add).catch((reason) => setError(projectError(reason))); }}>
      <Upload size={25} strokeWidth={1.5} /><div><strong>拖入资料文件或文件夹</strong><p>支持 PDF、TXT、Markdown、HTML、ZIP 和文件夹。</p></div>
      <label className="lab-project-file-picker">选择文件或 ZIP<input aria-label="选择资料文件或 ZIP" type="file" accept=".pdf,.txt,.md,.markdown,.html,.htm,.zip" multiple disabled={disabled || Boolean(project.current && files.length)} onChange={(event) => { add(event.target.files); event.target.value = ''; }} /></label>
      <label className="lab-project-file-picker"><FolderOpen size={14} />选择文件夹<input aria-label="选择资料文件夹" type="file" multiple {...{ webkitdirectory: '', directory: '' }} disabled={disabled || Boolean(project.current && files.length)} onChange={(event) => { add(event.target.files); event.target.value = ''; }} /></label>
    </div>
    {intakeNotice ? <p className="lab-project-muted" role="status">{intakeNotice}</p> : null}
    {files.length ? <div className="lab-app-intake__files"><p>{files.length} 个文件 · {(files.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(1)} MB</p><ul>{files.map((file, index) => <li key={`${file.name}:${index}`}><FileText size={14} /><span>{knowledgeFileName(file)}</span><IconButton icon={<X size={13} />} label={`移除 ${file.name}`} disabled={disabled || Boolean(project.current)} onClick={() => setFiles((rows) => rows.filter((_, i) => i !== index))} /></li>)}</ul></div> : null}
    <label className="lab-app-intake__requirement">研究任务<textarea aria-label="应用要求" rows={3} maxLength={19000} value={requirement} disabled={disabled || Boolean(project.current)} onChange={(event) => setRequirement(event.target.value)} placeholder="例如：比较极地冰架论文的研究方法、主要发现与局限，给每个结论附上可核查的来源。" /></label>
    <OptimizationGoalSpace value={goals} disabled={disabled || Boolean(project.current)} onChange={setGoals} />
    {uploadProgress ? <section className="lab-app-intake__progress" aria-label="资料上传进度"><div><strong>{busy ? '正在接入资料' : '已保留上传进度'}</strong><span>{uploadProgress.files} / {uploadProgress.totalFiles} 个文件接收完成</span></div><progress aria-label="已确认上传字节" value={uploadProgress.bytes} max={uploadProgress.totalBytes} /><p>{(uploadProgress.bytes / 1024 / 1024).toFixed(1)} / {(uploadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB 已收到 · 上传完成后继续解析与检查</p></section> : null}
    {error ? <p className="lab-project-error" role="alert">{error}{project.current ? ' 项目和已接收材料仍保留在最近项目中。' : ''}</p> : null}
    <footer><p role="status">{progress || '导入完成后，在第一步设计知识库基线。'}</p><Button type="submit" disabled={disabled || !files.length || !requirement.trim() || submitted.current}>{busy ? '正在接入资料' : project.current ? '继续上传资料' : '导入资料并设计基线'}<ArrowRight size={15} /></Button>{busy ? <Button type="button" size="small" onClick={() => { stop.current = true; }}>停止上传</Button> : null}</footer>
  </form>;
}
