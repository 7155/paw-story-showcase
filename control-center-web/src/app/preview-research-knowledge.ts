import { searchWithResearchProfile } from '../../../showcase/portable-research-app';
import type { KnowledgeCorpus, KnowledgeDataset, KnowledgeEvaluation, KnowledgeIndex, KnowledgeJob, KnowledgeState, RetrievalProfile } from '@/features/eval-lab/projects/knowledge-types';
import { defaultCleaning, defaultRetrieval } from '@/features/eval-lab/projects/knowledge-types';
import { object, type ProjectReceipt } from '@/features/eval-lab/projects/types';
import { createChunks, defaultLabConfig, documentsFromDataset, searchResearch, type LabDocument, type LabQuestion } from '../../../showcase/guided-lab';
import sample from '../../../paw-story-demo/public/evidence/guided-research.v1.json';
import { digestText } from './preview-lab-app-package';

type ResearchDocument = LabDocument & { rawPages: string[]; cleanedPages: string[] };
type Upload = { name: string; bytes: number; sha256: string; parts: Uint8Array[]; ready: boolean };
type Corpus = { value: KnowledgeCorpus; documents: ResearchDocument[] };
type DatasetQuestion=LabQuestion & {referenceAnswer?:string};
type Dataset = { value: KnowledgeDataset; questions: DatasetQuestion[] };
type Chunk = ReturnType<typeof createChunks>[number];
type Snapshot = { version: 1; corpora: Corpus[]; indexes: KnowledgeIndex[]; datasets: Dataset[]; jobs: KnowledgeJob[]; evaluations: KnowledgeEvaluation[] };

/** Browser-only implementation of the product's knowledge resource contract.
 * Components use their normal project commands; this adapter never calls PAW,
 * Pi, a Provider, or the filesystem. Uploaded PDFs retain page boundaries.
 */
export class PreviewResearchKnowledge {
  private corpora: Corpus[] = [];
  private indexes: KnowledgeIndex[] = [];
  private datasets: Dataset[] = [];
  private jobs: KnowledgeJob[] = [];
  private evaluations: KnowledgeEvaluation[] = [];
  private uploads = new Map<string, Upload>();
  readonly ready: Promise<void>;

  constructor(readonly projectId: string, private readonly seed = projectId === 'lab-showcase-rag') {
    this.ready = this.initialize();
  }

  private async initialize() {
    const saved = await readPublicLabRecord<Snapshot>(this.projectId);
    if (saved?.version === 1 && Array.isArray(saved.corpora) && Array.isArray(saved.jobs)) {
      this.corpora = saved.corpora; this.indexes = saved.indexes; this.datasets = saved.datasets;
      this.jobs = saved.jobs; this.evaluations = saved.evaluations;
      return;
    }
    if (!this.seed) return;
    const documents = documentsFromDataset(sample).map(doc => ({ ...doc, rawPages: [doc.text], cleanedPages: [doc.text] }));
    const corpus = await this.addCorpus(documents, '200 份公开合成研究资料', { ...defaultCleaning }, 'import_corpus');
    await this.addDataset(corpus.value, sample.cases, '16 道公开训练题');
  }

  get state(): KnowledgeState {
    return structuredClone({ schemaVersion: 'paw.lab-knowledge-resource.v1',
      corpora: this.corpora.map(row => row.value), indexes: this.indexes, datasets: this.datasets.map(row => row.value),
      evaluations: this.evaluations, jobs: this.jobs, embedding: { provider: 'none', model: '' },
      availableParsers: [{ id: 'builtin', name: 'PDF 文字层与文本', available: true, status: '浏览器内提取；不含 OCR' },
        { id: 'mineru', name: 'MinerU OCR', available: false, status: '离线展示未连接 OCR 服务' }],
    });
  }

  get trials() {
    return this.jobs.map(job => ({ ...job, sceneId: 'knowledge-resource', clientRequestId: job.jobId,
      cancelRequested: false, sessions: [], resumeAvailable: false as const }));
  }

  corpus(id: string) {
    const corpus = this.corpora.find(row => row.value.jobId === id);
    if (!corpus) throw new Error('资料版本不存在，请重新选择。');
    return corpus;
  }

  index(id: string) {
    const index = this.indexes.find(row => row.jobId === id);
    if (!index) throw new Error('索引版本不存在，请先建立索引。');
    return index;
  }

  exportEvaluation(jobId: string) {
    const evaluation = this.evaluations.find(row => row.jobId === jobId);
    if (!evaluation || evaluation.evaluatedCount !== evaluation.plannedCount) throw new Error('请先完成并选择一项检索评测。');
    const index = this.index(evaluation.indexId), corpus = this.corpus(index.corpusId);
    const dataset = this.datasets.find(row => row.value.datasetId === evaluation.datasetId);
    if (!dataset || dataset.value.sha256 !== evaluation.datasetHash || corpus.value.corpusHash !== evaluation.corpusHash) throw new Error('评测与资料版本不匹配。');
    return { evaluation, index, documents: corpus.documents, questions: dataset.questions,
      chunks: chunkResearchDocuments(corpus.documents, index.chunking) };
  }

  private job(operation: string, result: KnowledgeJob['result'], input: Record<string, unknown> = {}, id = crypto.randomUUID()) {
    const now = Date.now();
    const value: KnowledgeJob = { jobId: `showcase-knowledge:${id}`, state: 'completed', progress: '本地处理完成', error: '',
      createdAtMs: now, updatedAtMs: now, publicSpec: { ...input, operation, projectId: this.projectId }, result };
    this.jobs.unshift(value); return value;
  }

  private async addCorpus(documents: ResearchDocument[], title: string, cleaning: typeof defaultCleaning, operation: string, input: Record<string, unknown> = {}) {
    const hash = await digestText(JSON.stringify(documents.map(doc => [doc.id, doc.text, doc.status])));
    const intake = { attemptedCount: documents.length, scannedCount: documents.length,
      successfulCount: documents.filter(doc => doc.status === 'ready').length, failedCount: documents.filter(doc => doc.status === 'failed').length,
      pageCount: documents.reduce((sum, doc) => sum + doc.pages, 0), cleaning, skippedCount: 0,
      documents: documents.map(doc => ({ sourceId: doc.id, status: doc.status, warnings: doc.error ? [doc.error] : [],
        pageCount: Math.max(1, doc.cleanedPages.length), pageMappingAvailable: true, ...(doc.error ? { message: doc.error } : {}) })) };
    const value: KnowledgeCorpus = { jobId: '', title, corpusHash: hash, documentCount: intake.successfulCount,
      byteSize: documents.reduce((sum, doc) => sum + new TextEncoder().encode(doc.text).length, 0), intake,
      preview: documents.map(doc => ({ sourceId: doc.id, title: doc.name, uri: `preview://research/${encodeURIComponent(doc.id)}`,
        byteSize: new TextEncoder().encode(doc.text).length, excerpt: doc.text.slice(0, 1200) })) };
    const job = this.job(operation, null, input); value.jobId = job.jobId;
    job.result = { kind: 'corpus', ...value, message: `${intake.successfulCount} 个文件可读，${intake.failedCount} 个未读取。` };
    const corpus = { value, documents: structuredClone(documents) }; this.corpora.unshift(corpus); return corpus;
  }

  private async addDataset(corpus: KnowledgeCorpus, questions: DatasetQuestion[], title: string) {
    if (!questions.length) throw new Error('题集至少需要一道问题。');
    const sourceIds = new Set(this.corpus(corpus.jobId).documents.map(doc => doc.id));
    for (const question of questions) {
      if (!question.id || !question.input?.trim() || !(question.expectedIds?.length || question.expected)) throw new Error('每道题需要问题和预期来源。');
      if ((question.expectedIds ?? [question.expected]).some(id => !sourceIds.has(id))) throw new Error(`题目 ${question.id} 的预期来源不在当前资料版本中。`);
    }
    const value: KnowledgeDataset = { datasetId: `showcase-dataset:${crypto.randomUUID()}`, corpusId: corpus.jobId, corpusHash: corpus.corpusHash,
      title, sha256: await digestText(JSON.stringify(questions)), caseCount: questions.length,
      splits: { development: questions.length, holdout: 0 }, referenceAnswerCount: questions.filter(row=>row.referenceAnswer?.trim()).length, retrievalEvaluableCount: questions.length,
      officialSplit: false, preview: questions.map(row => ({ caseId: row.id, question: row.input })) };
    this.datasets.unshift({ value, questions: structuredClone(questions) });
    return this.job('import_dataset', { kind: 'dataset', dataset: value }, { corpusId: corpus.jobId });
  }

  async command(input: Record<string, unknown>): Promise<{ job?: KnowledgeJob; upload?: ProjectReceipt['upload'] }> {
    await this.ready;
    const operation = String(input.operation);
    if (operation.startsWith('upload_')) return { upload: await this.upload(operation, input) };
    let job: KnowledgeJob;
    if (operation === 'import_corpus' || operation === 'repair_document') {
      if (input.path) throw new Error('请使用文件选择器上传资料；离线展示不读取本机路径。');
      const ids = Array.isArray(input.uploadIds) ? input.uploadIds.map(String) : input.uploadId ? [String(input.uploadId)] : [];
      if (!ids.length) throw new Error('请先上传资料文件。');
      const imported: ResearchDocument[] = [];
      for (const id of ids) imported.push(...await this.readCorpusUpload(id,object(input.fields)));
      if(new Set(imported.map(doc=>doc.id)).size!==imported.length)throw new Error('资料的来源 ID 重复，请先修正。');
      const cleaning = { ...defaultCleaning, ...object(input.cleaning) };
      const documents = imported.map(doc => cleanResearchDocument(doc, cleaning));
      if (operation === 'repair_document') {
        const previous = this.corpus(String(input.corpusId)); const sourceId = String(input.sourceId);
        if (!previous.documents.some(doc => doc.id === sourceId) || documents.length !== 1) throw new Error('请选择当前资料版本中的一个文件进行替换。');
        const replacement = { ...documents[0], id: sourceId };
        const corpus = await this.addCorpus(previous.documents.map(doc => doc.id === sourceId ? replacement : doc), previous.value.title, cleaning, operation, input);
        job = this.jobs.find(row => row.jobId === corpus.value.jobId)!;
      } else {
        // A new upload is its own immutable corpus version, as in PAW's owner.
        const corpus = await this.addCorpus(documents, String(input.title || `${documents.length} 份上传资料`), cleaning, operation, input);
        job = this.jobs.find(row => row.jobId === corpus.value.jobId)!;
      }
      for(const id of ids)this.uploads.delete(id);
    } else if (operation === 'reclean_corpus' || operation === 'reparse_document') {
      if (object(input.parsing).mode === 'mineru') throw new Error('此离线展示未连接 MinerU。');
      const previous = this.corpus(String(input.corpusId)); const cleaning = { ...defaultCleaning, ...object(input.cleaning) };
      const sourceId = operation === 'reparse_document' ? String(input.sourceId) : undefined;
      if (sourceId && !previous.documents.some(doc => doc.id === sourceId)) throw new Error('文件不属于当前资料版本。');
      const documents = previous.documents.map(doc => !sourceId || doc.id === sourceId ? cleanResearchDocument(doc, cleaning) : doc);
      const corpus = await this.addCorpus(documents, previous.value.title, cleaning, operation, input);
      job = this.jobs.find(row => row.jobId === corpus.value.jobId)!;
    } else if (operation === 'inspect_document') {
      const corpus = this.corpus(String(input.corpusId)); const doc = corpus.documents.find(row => row.id === input.sourceId);
      if (!doc) throw new Error('文件不属于当前资料版本。');
      if (doc.status !== 'ready') throw new Error(doc.error || '此文件未能读取。');
      const page = Number(input.page ?? 1), pageCount = doc.cleanedPages.length;
      if (!Number.isInteger(page) || page < 1 || page > pageCount) throw new Error('页码超出范围。');
      job = this.job(operation, { kind: 'document_inspection', corpusId: corpus.value.jobId,
        document: corpus.value.intake.documents!.find(row => row.sourceId === doc.id), page, pageCount,
        rawMarkdown: doc.rawPages[page - 1], cleanedMarkdown: doc.cleanedPages[page - 1], rawTruncated: false, cleanedTruncated: false }, input);
    } else if (operation === 'index') {
      if (input.embedding !== 'none') throw new Error('离线展示未配置向量模型，请选择关键词索引。');
      const corpus = this.corpus(String(input.corpusId)); const raw = object(input.chunking);
      const chunking = { strategy: String(raw.strategy), size: Number(raw.size), overlap: Number(raw.overlap) };
      const chunks = chunkResearchDocuments(corpus.documents, chunking);
      job = this.job(operation, null, input);
      const index: KnowledgeIndex = { jobId: job.jobId, corpusId: corpus.value.jobId, corpusHash: corpus.value.corpusHash,
        title: '浏览器关键词索引', documentCount: corpus.value.documentCount, chunkCount: chunks.length,
        sourceCount: corpus.value.documentCount, configHash: await digestText(JSON.stringify(chunking)), chunking,
        dense: { available: false, provider: { semantic: false, provider: 'none' }, vectorCount: 0 }, reranker: { configured: false } };
      this.indexes.unshift(index); job.result = { kind: 'index', ...index };
    } else if (operation === 'search') {
      const index = this.index(String(input.indexId)); const profile = researchProfile(input.profile);
      const query = String(input.query || '').trim(); if (!query) throw new Error('请输入检索问题。');
      const hits = this.search(index, query, profile);
      job = this.job(operation, { kind: 'search', indexId: index.jobId, query, hits }, input);
    } else if (operation === 'import_dataset') {
      const corpus = this.corpus(String(input.corpusId));
      let rows: unknown = input.rows;
      if (input.uploadId) {
        const upload = this.uploads.get(String(input.uploadId)); if (!upload?.ready) throw new Error('题集文件尚未上传完成。');
        const text = new TextDecoder().decode(joinUpload(upload));
        try { rows = JSON.parse(text); } catch { rows = text.trim().split(/\n/).map(line => JSON.parse(line)); }
      }
      if (!Array.isArray(rows)) rows = object(rows).cases;
      if (!Array.isArray(rows)) throw new Error('题集需要 cases 数组或 JSONL 记录。');
      const fields = object(input.fields);
      const questions: DatasetQuestion[] = rows.map((value, i) => {
        const row = object(value);
        const expected = row[String(fields.sources || fields.expectedSourceIds || 'expectedSourceIds')] ?? row.article_ids ?? row.sourceIds ?? row.expectedIds ?? row.expected;
        const ids = Array.isArray(expected) ? expected.map(String) : String(expected ?? '').split(',').map(id => id.trim()).filter(Boolean);
        return { id: String(row[String(fields.id || 'id')] || row.caseId || `case-${i + 1}`), input: String(row[String(fields.question || 'question')] || row.input || ''), expected: ids[0] || '', expectedIds: ids, referenceAnswer:String(row[String(fields.answer || 'answer')] ?? '') };
      });
      job = await this.addDataset(corpus.value, questions, String(input.title || '上传的评测题'));
    } else if (operation === 'evaluate') {
      const index = this.index(String(input.indexId)); const dataset = this.datasets.find(row => row.value.datasetId === input.datasetId);
      if (!dataset || dataset.value.corpusHash !== index.corpusHash) throw new Error('资料、索引与题集版本不匹配。');
      if (input.split !== 'development') throw new Error('当前题集全部为公开开发题，没有独立留出集。');
      const profile = researchProfile(input.profile), key = String(profile.topK);
      let recall = 0, precision = 0, f1 = 0, mrr = 0, ndcg = 0, totalMs = 0;
      const rows = dataset.questions.map(question => {
        const start = performance.now(); const hits = this.search(index, question.input, profile); totalMs += performance.now() - start;
        const expected = new Set(question.expectedIds?.length ? question.expectedIds : [question.expected]);
        const ids = [...new Set(hits.map(hit => hit.sourceId))], found = ids.filter(id => expected.has(id));
        const r = found.length / expected.size, p = found.length / Math.max(1, ids.length);
        recall += r; precision += p; f1 += p + r ? 2 * p * r / (p + r) : 0;
        const first = ids.findIndex(id => expected.has(id)); mrr += first < 0 ? 0 : 1 / (first + 1);
        const ideal = Array.from({ length: Math.min(profile.topK, expected.size) }, (_, i) => 1 / Math.log2(i + 2)).reduce((a, b) => a + b, 0);
        ndcg += ids.reduce((sum, id, i) => sum + (expected.has(id) ? 1 / Math.log2(i + 2) : 0), 0) / ideal;
        return { caseId: question.id, question: question.input, expectedSourceIds: [...expected], sourceIds: ids, recall: r, precision: p, hits };
      });
      const count = rows.length;
      job = this.job(operation, null, input);
      const value: KnowledgeEvaluation = { jobId: job.jobId, indexId: index.jobId, corpusHash: index.corpusHash,
        datasetId: dataset.value.datasetId, datasetHash: dataset.value.sha256, split: 'development', plannedCount: count, evaluatedCount: count,
        unlabeledCount: 0, holdoutUseNumber: 0, profile, indexConfig: { chunking: index.chunking, embedding: { provider: 'none', model: '' } },
        report: { metrics: { metrics: { mrr: mrr / count, recallAtK: { [key]: recall / count }, precisionAtK: { [key]: precision / count },
          f1AtK: { [key]: f1 / count }, ndcgAtK: { [key]: ndcg / count } } },
          costs: { meanRetrievalLatencyMs: totalMs / count, retrievalCalls: count }, receiptSha256: await digestText(JSON.stringify(rows)) } };
      this.evaluations.unshift(value); job.result = { kind: 'evaluation', ...value, rows, dataMode: 'browser-keyword-retrieval' };
    } else if (operation === 'cancel') {
      const previous = this.jobs.find(row => row.jobId === input.jobId); if (!previous) throw new Error('任务不存在。');
      return { job: structuredClone(previous) };
    } else throw new Error('此操作需要 PAW Runtime；离线展示支持资料处理、关键词检索与检索测评。');
    await this.persist(); return { job: structuredClone(job) };
  }

  search(index: KnowledgeIndex, query: string, profile: RetrievalProfile) {
    const chunks = chunkResearchDocuments(this.corpus(index.corpusId).documents, index.chunking);
    return searchWithResearchProfile(chunks,query,profile,searchResearch).map(hit=>({sourceId:hit.sourceId,title:hit.title,
      uri:`preview://research/${encodeURIComponent(hit.sourceId)}`,chunkId:hit.id,content:hit.text,score:hit.score}));
  }

  private async upload(operation: string, input: Record<string, unknown>): Promise<NonNullable<ProjectReceipt['upload']>> {
    if (operation === 'upload_begin') {
      const bytes = Number(input.bytes), name = String(input.name || ''), sha256 = String(input.sha256 || '');
      if (!name || !Number.isSafeInteger(bytes) || bytes <= 0 || bytes > 100 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('请选择不超过 100 MB 的有效资料文件。');
      const uploadId = `showcase-upload:${crypto.randomUUID()}`; this.uploads.set(uploadId, { name, bytes, sha256, parts: [], ready: false });
      return { uploadId, name, bytes, sha256, chunkBytes: 512 * 1024 };
    }
    const uploadId = String(input.uploadId), upload = this.uploads.get(uploadId); if (!upload) throw new Error('上传记录不存在，请重新选择文件。');
    if (operation === 'upload_chunk') {
      const index = Number(input.index); if (!Number.isSafeInteger(index) || index !== upload.parts.length || upload.ready) throw new Error('上传分片顺序不匹配。');
      const bytes = Uint8Array.from(atob(String(input.data)), char => char.charCodeAt(0));
      const expected = Math.min(512 * 1024, upload.bytes - index * 512 * 1024); if (bytes.length !== expected || expected <= 0) throw new Error('上传分片大小不匹配。');
      upload.parts.push(bytes); return { uploadId, index, receivedBytes: bytes.length };
    }
    if (operation !== 'upload_seal') throw new Error('上传操作无效。');
    const bytes = joinUpload(upload); const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (bytes.length !== upload.bytes || hash !== upload.sha256) throw new Error('上传文件校验失败，请重新选择文件。');
    upload.ready = true; return { uploadId, ready: true, name: upload.name, bytes: upload.bytes, sha256: upload.sha256 };
  }

  private async readCorpusUpload(id:string,fields:Record<string,unknown>):Promise<ResearchDocument[]> {
    const upload=this.uploads.get(id);
    if(!upload?.ready)throw new Error('文件尚未上传完成。');
    if(!/\.(jsonl|ndjson)$/i.test(upload.name))return [await this.readUpload(id)];
    const rows=new TextDecoder().decode(joinUpload(upload)).trim().split(/\r?\n/).filter(Boolean);
    const documents=rows.map((line,index)=>{
      const row=object(JSON.parse(line)),text=String(row[String(fields.text || 'text')] ?? row.contents ?? row.content ?? '');
      if(!text.trim())throw new Error(`JSONL 第 ${index+1} 行缺少正文。`);
      const sourceId=String(row[String(fields.id || 'id')] ?? row.sourceId ?? `${upload.name}:${index+1}`);
      const title=String(row[String(fields.title || 'title')] ?? sourceId);
      return {id:sourceId,name:title,title,text,pages:1,status:'ready' as const,rawPages:[text],cleanedPages:[text]};
    });
    if(new Set(documents.map(doc=>doc.id)).size!==documents.length)throw new Error('JSONL 文档 ID 重复，请先修正。');
    return documents;
  }

  private async readUpload(id: string): Promise<ResearchDocument> {
    const upload = this.uploads.get(id); if (!upload?.ready) throw new Error('文件尚未上传完成。');
    const document: ResearchDocument = { id: `file:${upload.name}:${upload.sha256.slice(0, 12)}`, name: upload.name,
      title: upload.name.split('/').at(-1) || upload.name, text: '', pages: 0, status: 'ready', rawPages: [], cleanedPages: [] };
    try {
      if (/\.pdf$/i.test(upload.name)) {
        const pdfjs = await import('pdfjs-dist'); const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument({ data: joinUpload(upload) });
        try {
          const pdf = await task.promise; document.pages = pdf.numPages;
          for (let page = 1; page <= pdf.numPages; page++) {
            const content = await (await pdf.getPage(page)).getTextContent();
            document.rawPages.push(content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''));
          }
        } finally { await task.destroy(); }
      } else if (/\.html?$/i.test(upload.name)) document.rawPages=[new DOMParser().parseFromString(new TextDecoder().decode(joinUpload(upload)),'text/html').body.textContent || ''];
      else if (/\.(txt|md|markdown|json|csv|log)$/i.test(upload.name)) document.rawPages = [new TextDecoder().decode(joinUpload(upload))];
      else throw new Error('此离线展示支持 PDF、TXT、Markdown 和 JSON；请先解压 ZIP。');
      document.text = document.rawPages.join('\n\n'); if (!document.text.trim()) throw new Error('没有可读取的文字层；离线展示不含 OCR。');
      document.cleanedPages = [...document.rawPages];
      document.pages=document.rawPages.length;
    } catch (error) {
      document.status = 'failed'; document.error = error instanceof Error ? error.name === 'PasswordException' ? 'PDF 需要密码，请使用可读取的文件。' : error.message : '文件读取失败。';
    }
    return document;
  }

  private async persist() {
    await writePublicLabRecord(this.projectId, { version: 1, corpora: this.corpora, indexes: this.indexes,
      datasets: this.datasets, evaluations: this.evaluations, jobs: this.jobs });
  }
}

function joinUpload(upload: Upload) {
  const bytes = new Uint8Array(upload.parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0; for (const part of upload.parts) { bytes.set(part, offset); offset += part.length; } return bytes;
}

export function researchProfile(value: unknown): RetrievalProfile {
  const profile = { ...defaultRetrieval, ...object(value) };
  if (profile.mode !== 'lexical' || profile.rerank) throw new Error('离线展示提供关键词检索，不包含向量模型或重排器。');
  if (!Number.isInteger(profile.topK) || profile.topK < 1 || profile.topK > 20 || !Number.isInteger(profile.candidateDepth)
      || profile.candidateDepth < profile.topK || profile.candidateDepth > 100 || !Number.isFinite(profile.threshold)
      || profile.threshold < 0 || profile.threshold > 1 || !Number.isInteger(profile.contextChars) || profile.contextChars < 1000 || profile.contextChars > 60000) throw new Error('检索参数无效。');
  return profile;
}

export function cleanResearchDocument(document: ResearchDocument, cleaning: typeof defaultCleaning): ResearchDocument {
  const margins = new Map<string, number>();
  if (cleaning.removeRepeatedMargins && document.rawPages.length > 1) for (const page of document.rawPages) {
    const lines = page.split('\n').map(line => line.trim()).filter(Boolean);
    for (const line of new Set([...lines.slice(0, 2), ...lines.slice(-2)])) margins.set(line, (margins.get(line) || 0) + 1);
  }
  const repeated = new Set([...margins].filter(([, count]) => count >= Math.max(2, Math.ceil(document.rawPages.length * .6))).map(([line]) => line));
  const cleanedPages = document.rawPages.map(page => {
    const lines = page.split('\n');
    const body = lines.filter((line, index) => !(index < 2 || index >= lines.length - 2) || !repeated.has(line.trim())).join('\n');
    return cleaning.normalizeWhitespace ? body.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : body;
  });
  return { ...document, cleanedPages, text: cleanedPages.join('\n\n') };
}

export function chunkResearchDocuments(documents: LabDocument[], chunking: KnowledgeIndex['chunking']): Chunk[] {
  if (!['fixed', 'general', 'markdown', 'paper', 'qa'].includes(chunking.strategy)) throw new Error('不支持此分块方式。');
  const config = { ...defaultLabConfig, strategy: chunking.strategy === 'fixed' ? 'fixed' as const : 'paragraph' as const,
    size: chunking.size, overlap: chunking.overlap, normalize: false };
  if (['fixed', 'general'].includes(chunking.strategy)) return createChunks(documents, config);
  const boundary = chunking.strategy === 'markdown' ? /(?=^#{1,6}\s+)/m
    : chunking.strategy === 'qa' ? /(?=^(?:Q(?:uestion)?\s*[:：]|问\s*[:：]))/im
      : /(?=^(?:\d+(?:\.\d+)*\s+)?(?:Abstract|Introduction|Methods?|Results?|Discussion|Conclusions?|References|摘要|引言|方法|结果|讨论|结论)(?:\s|$))/im;
  return documents.flatMap(doc => {
    let offset = 0;
    return doc.text.split(boundary).filter(Boolean).flatMap(section => {
      const start = offset; offset += section.length;
      return createChunks([{ ...doc, text: section }], config).map(chunk => ({ ...chunk, start: start + chunk.start,
        id: `${doc.id}:${start + chunk.start}` }));
    });
  });
}

// IndexedDB keeps uploaded text and page mappings out of URL, Git and Runtime.
// Unit tests without a browser database use the same in-memory resource.
const database = () => new Promise<IDBDatabase | null>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { resolve(null); return; }
  const request = indexedDB.open('paw-public-lab', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('research');
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
export async function readPublicLabRecord<T>(key: string): Promise<T | undefined> {
  const db = await database(); if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const request = db.transaction('research').objectStore('research').get(key);
    request.onsuccess = () => { db.close(); resolve(request.result); }; request.onerror = () => { db.close(); reject(request.error); };
  });
}
export async function writePublicLabRecord(key: string, value: unknown) {
  const db = await database(); if (!db) return;
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('research', 'readwrite'); transaction.objectStore('research').put(structuredClone(value), key);
    transaction.oncomplete = () => { db.close(); resolve(); }; transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}
