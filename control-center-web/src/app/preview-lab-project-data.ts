import { businessConfig, businessFields, evaluateBusiness, type BusinessEvaluation } from './preview-business-lab';
import { OPTIMIZATION_PROJECT_ID, PreviewOptimizationProject } from './preview-optimization-project';
import type { ControlPathId } from '@/platform/routes';
import type { ControlRequest } from '@/platform/transport';
import type { MockRouteHandler } from '@/test/mock-transport';
import { isArtifact, object, type LabArtifact, type LabMaterial, type LabProject, type ProjectReceipt } from '@/features/eval-lab/projects/types';
import type { KnowledgeJob, KnowledgeState } from '@/features/eval-lab/projects/knowledge-types';
import { currentLabExperiments } from '../../../showcase/lab-evidence';
import { labDemoProjectId, labDemoScenarios } from '../../../showcase/lab-demo';
import { evaluateLabDemo, parseLabDemoDataset, labFlowRules, type DemoDataset, type DemoMode } from '../../../showcase/lab-flow';
import { buildLabDemoApp } from './preview-lab-app-package';
import { PreviewResearchKnowledge, readPublicLabRecord, writePublicLabRecord } from './preview-research-knowledge';
import researchHistory from '../../../paw-story-demo/public/evidence/research-history.v1.json';
import { portableResearchDocument } from '../../../showcase/portable-research-app';
import { defaultLabConfig } from '../../../showcase/guided-lab';

const capturedAt = Date.UTC(2026, 8, 7, 8);
const supportedViews = ['markdown', 'table', 'form', 'code', 'html', 'json'];
const sourceTexts = [
  ['Runtime 职责 · 合成材料', 'Pi 负责 Session 对话记录、模型与 Tool 循环、上下文压缩和取消恢复。PAW 界面投影这些状态。'],
  ['协作与验证 · 合成材料', 'Room 组合多个 Pi Session，保存公开分工和交付。只有在同一任务、同一标准下复测，才能判断候选是否改进。'],
];
const previewDigest = '5'.repeat(64);

/** Public rehearsal state only: no Provider, filesystem, build or deployment. */
export function createPreviewLabProjectRoutes(): Partial<Record<ControlPathId, MockRouteHandler>> {
  const projects = new Map<string, LabProject>();
  const artifacts = new Map<string, LabArtifact>();
  const jobs = new Map<string, KnowledgeJob[]>();
  const receipts = new Map<string, { signature: string; receipt: ProjectReceipt }>();
  const evaluations = new Map<string, BusinessEvaluation>();
  const apps = new Map<string, Awaited<ReturnType<typeof buildLabDemoApp>>[]>();
  const research = new Map<string, PreviewResearchKnowledge>();
  const researchFor = (id: string) => {
    if (!research.has(id)) research.set(id, new PreviewResearchKnowledge(id));
    return research.get(id)!;
  };
  let sequence = 0;
  const optimization = new PreviewOptimizationProject();
  const artifactKey = (projectId: string, id: string, revision: number) => `${projectId}/${id}@${revision}`;
  const fail = (message: string, code = 'SHOWCASE_INVALID_REQUEST') => ({ ok: false, code, message });
  const unsupported = () => fail('公开演示仅保存本页的合成状态。真实 Agent 执行、索引构建和应用打包请在 PAW 中运行。');
  const material = (title: string, text: string, index: number): LabMaterial => ({
    sourceId: `preview-source-${index}`, title, text, kind: 'document', uri: `preview://paw/source-${index}`,
    origin: 'text', byteSize: new TextEncoder().encode(text).byteLength, contentHash: previewDigest, importedAtMs: capturedAt,
  });
  const demoKey = (id: string) => currentLabExperiments.find((item) => labDemoProjectId(item.key) === id)?.key;
  const flowSignature = (project: LabProject) => `${project.materialSetId}:${project.artifacts.find((item) => item.artifactId === 'demo-config')?.revision ?? 0}`;
  function putArtifact(project: LabProject, value: Omit<LabArtifact, 'revision' | 'createdAtMs' | 'updatedAtMs' | 'templateRef' | 'actions'>): LabArtifact {
    const previous = project.artifacts.find((item) => item.artifactId === value.artifactId);
    const artifact = { ...value, revision: (previous?.revision ?? 0) + 1, createdAtMs: previous?.createdAtMs ?? Date.now(), updatedAtMs: Date.now(), templateRef: null, actions: [] };
    artifacts.set(artifactKey(project.projectId, artifact.artifactId, artifact.revision), artifact);
    const { content: _content, ...summary } = artifact;
    project.artifacts = [...project.artifacts.filter((item) => item.artifactId !== artifact.artifactId), summary];
    project.artifactCount = project.artifacts.length;
    if (!project.workspace.artifactOrder.includes(artifact.artifactId)) project.workspace.artifactOrder.push(artifact.artifactId);
    return artifact;
  }

  function createProject(title: string, description: string, supplied: Record<string, unknown>[] = [], fixedId?: string): LabProject {
    sequence++;
    const projectId = fixedId ?? `lab-project-showcase-${sequence}`;
    const materials = supplied.length
      ? supplied.map((row, index) => material(String(row.title ?? '项目材料'), String(row.text ?? ''), index))
      : sourceTexts.map(([name, text], index) => material(name, text, index));
    const now = capturedAt + sequence;
    const values: LabArtifact[] = [
      { artifactId: 'task-brief', revision: 1, title: '任务与验收', kind: 'brief', view: 'markdown',
        summary: '从材料、问题到可核对答案的项目说明', templateRef: null, actions: [], createdAtMs: now, updatedAtMs: now,
        content: `# ${title}\n\n公开合成项目，用来操作最新 PAW 前端；以下内容不代表一次真实运行。\n\n## 要完成的工作\n\n${description}\n\n## 验收方式\n\n- 回答引用给定材料，不把无法确认的信息写成事实。\n- 保留每条答案的来源，能返回原文检查。\n- 用同一组问题和标准比较候选，分别记录正确性与执行成本。` },
      { artifactId: 'acceptance', revision: 1, title: '验收清单', kind: 'evaluation', view: 'table',
        summary: '分别核对任务完成、依据与成本', templateRef: null, actions: [], createdAtMs: now, updatedAtMs: now,
        content: { columns: [{ key: 'check', label: '检查项' }, { key: 'standard', label: '标准' }, { key: 'status', label: '当前状态' }],
          rows: [
            { check: '任务完成', standard: '问题得到正确回答，缺少依据时说明边界', status: '待实际执行' },
            { check: '来源可核对', standard: '每条主要结论可以回到对应材料', status: '待实际执行' },
            { check: '候选比较', standard: '冻结任务和标准后，分别核对质量与成本', status: '待实际执行' },
          ], caption: '公开合成验收计划，没有附会生产成绩。' } },
    ];
    for (const value of values) artifacts.set(artifactKey(projectId, value.artifactId, value.revision), value);
    const project: LabProject = { schemaVersion: 'rag-ime.agent-lab-project.v1', projectId, revision: 1, title, description,
      briefVersion: 1, materialCount: materials.length, artifactCount: values.length, guideSessionId: '',
      materialSetId: `${projectId}:materials:1`, materialSet: { materialSetId: `${projectId}:materials:1`, version: 1, materials, createdAtMs: now },
      materialVersions: [{ materialSetId: `${projectId}:materials:1`, version: 1, createdAtMs: now }],
      intake: { state: 'read', requestedPath: '', resolvedPath: '', readCount: materials.length,
        readBytes: materials.reduce((sum, value) => sum + value.byteSize, 0), skippedCount: 0, partial: false, issues: [], checkedAtMs: now },
      artifacts: values.map(({ content: _content, ...summary }) => summary), bindings: [],
      workspace: { artifactOrder: values.map((value) => value.artifactId), primaryArtifactId: values[0].artifactId, layout: 'focus' },
      workspaceBinding: null, createdAtMs: now, updatedAtMs: now };
    projects.set(projectId, project);
    return project;
  }

  function knowledge(project: LabProject): KnowledgeState {
    if (project.projectId === 'lab-showcase-rag' || project.projectId.startsWith('lab-project-showcase-') || research.has(project.projectId)) return researchFor(project.projectId).state;
    const materials = project.materialSet.materials;
    if (/^lab-showcase-(cloudops|enterpriseops|memory)$/.test(project.projectId)) return { schemaVersion: 'paw.lab-knowledge-resource.v1',
      corpora: [], indexes: [], datasets: [], evaluations: [], jobs: [], embedding: { provider: 'none', model: '' } };
    return { schemaVersion: 'paw.lab-knowledge-resource.v1',
      corpora: [{ jobId: `${project.projectId}:corpus`, title: 'PAW 设计材料 · 合成演示', corpusHash: previewDigest,
        documentCount: materials.length, byteSize: materials.reduce((sum, row) => sum + row.byteSize, 0), intake: { skippedCount: 0, scannedCount: materials.length },
        preview: materials.map((row) => ({ sourceId: row.sourceId, title: row.title, uri: row.uri, byteSize: row.byteSize, excerpt: row.text })) }],
      indexes: [{ jobId: `${project.projectId}:index`, corpusId: `${project.projectId}:corpus`, corpusHash: previewDigest,
        title: '内存中的演示索引', documentCount: materials.length, chunkCount: materials.length, configHash: previewDigest,
        sourceCount: materials.length, duplicateSourceCount: 0, chunking: { strategy: 'markdown', size: 1200, overlap: 160 },
        dense: { available: false, provider: { semantic: false, provider: 'synthetic-preview' }, vectorCount: 0 }, reranker: { configured: false } }],
      datasets: [], evaluations: [], jobs: jobs.get(project.projectId) ?? [], embedding: { provider: 'none', model: '' } };
  }

  createProject('PAW 文档问答 · 演示', '基于给定的 PAW 设计材料回答职责与协作问题，保留来源，检查答案后再比较不同方案。');

  for (const experiment of currentLabExperiments) {
    const scenario = labDemoScenarios[experiment.key];
    const project = createProject(`${experiment.label} · ${scenario.title}`, scenario.task, [
      { title: '演示任务与检查路线', text: `${scenario.task}\n\n${scenario.inspect}\n\n这是可编辑的演示工作区，不会启动新的模型运行。` },
      { title: '公开实验范围 · 2026-09-05', text: `${experiment.businessProblem}\n\n${experiment.scope}\n\n质量判据：\n${experiment.hardGates.join('\n')}\n\n未验证范围：\n${experiment.openGaps.join('\n')}` },
    ], labDemoProjectId(experiment.key));
    const now = project.createdAtMs;
    const historical: LabArtifact[] = [
      { artifactId: 'candidate-matrix', revision: 1, title: '候选矩阵', kind: 'evaluation', view: 'table',
        summary: '从 2026-09-05 公开快照投影的阶段结果', templateRef: null, actions: [], createdAtMs: now, updatedAtMs: now,
        content: { columns: [
          { key: 'stage', label: '阶段' }, { key: 'change', label: '改变' }, { key: 'quality', label: '质量' },
          { key: 'reliability', label: '可靠性 / 门禁' }, { key: 'cost', label: 'API 估算成本' }, { key: 'decision', label: '决策' },
        ], rows: experiment.stages.map((stage) => ({ stage: stage.label, change: stage.change, quality: stage.quality,
          reliability: stage.reliability, cost: stage.cost, decision: stage.decision.toUpperCase() })),
        caption: `公开历史回执 · ${experiment.scope} · ${experiment.id}。本页编辑仅改变演示副本，不能改写原始结果。成本为估算，非 Provider 账单。` } },
      { artifactId: 'experiment-method', revision: 1, title: '对照条件与边界', kind: 'document', view: 'markdown',
        summary: '改变对象、冻结条件、质量判据与未验证范围', templateRef: null, actions: [], createdAtMs: now, updatedAtMs: now,
        content: `# ${experiment.label} · 对照条件\n\n${experiment.scope}\n\n## 改了什么\n\n${experiment.factors.map((factor) => `- ${factor.name}：${factor.before} → ${factor.after}。${factor.reason}`).join('\n')}\n\n## 保持一致\n\n${experiment.frozenControls.map((control) => `- ${control.name}：${control.value}。${control.reason}`).join('\n')}\n\n## 质量判据\n\n${experiment.hardGates.map((gate) => `- ${gate}`).join('\n')}\n\n## 未验证范围\n\n${experiment.openGaps.map((gap) => `- ${gap}`).join('\n')}\n\n耗时只作诊断，API 成本为估算，非 Provider 账单。` },
      { artifactId: 'public-receipt', revision: 1, title: '公开结果回执', kind: 'evidence', view: 'json',
        summary: '原始公开实验 ID、阶段与来源哈希', templateRef: null, actions: [], createdAtMs: now, updatedAtMs: now,
        content: JSON.parse(JSON.stringify({ experimentId: experiment.id, scope: experiment.scope, dataMode: 'public-historical-receipt',
          baseline: experiment.baseline, candidate: experiment.candidate, evidence: experiment.evidence,
          notice: '公开回执的演示副本；没有运行新的 Agent、Provider 或生产实验。' })) },
    ];
    for (const artifact of historical) artifacts.set(artifactKey(project.projectId, artifact.artifactId, artifact.revision), artifact);
    project.artifacts.push(...historical.map(({ content: _content, ...summary }) => summary));
    project.artifactCount = project.artifacts.length;
    project.workspace.artifactOrder = ['candidate-matrix', 'task-brief', 'experiment-method', 'public-receipt', 'acceptance'];
    project.workspace.primaryArtifactId = 'candidate-matrix';
    project.materialSet.materials = []; project.materialCount = 0;
    project.intake.readCount = 0; project.intake.readBytes = 0; project.intake.state = 'needs_materials';
    putArtifact(project, { artifactId: 'demo-intake', title: '从导入数据开始', kind: 'brief', view: 'markdown', summary: '本轮输入、测评与 App 交付',
      content: `# ${scenario.title}\n\n## 1. 导入数据\n\n点击上方「导入示例数据」，或上传自己的 JSON 文件。数据文件包含 records（业务记录）和 cases（题目、输入与期望结果）。\n\n## 2. 设置测评标准\n\n${labFlowRules[experiment.key]}\n\n## 3. 运行演示测评\n\n对导入的每道题实际执行本地规则，逐项比较基线、候选与期望结果。全部题目通过后可以生成 App；修改数据或策略后需重新测评。\n\n## 4. 导出 App\n\n试用本轮生成的离线 App，下载 ZIP，解压后直接打开 index.html。\n\n本轮是离线规则演示，无模型调用。历史 Agent 实验成绩另列，不能当作本轮结果。` });
    putArtifact(project, { artifactId: 'demo-config', title: '基线处理策略', kind: 'configuration', view: 'form', summary: '保存配置后，比较相同输入上的基线与候选',
      content: { fields: businessFields(experiment.key),
        values: Object.fromEntries(businessFields(experiment.key).map(field=>[field.key,defaultLabConfig[field.key as keyof typeof defaultLabConfig]])), description: `${labFlowRules[experiment.key]}\n通过条件：本轮每道题的结果都必须与 expected 完全一致。历史实验指标不参与本轮计分。` } });
    project.workspace.artifactOrder = ['demo-intake', 'demo-config'];
    project.workspace.primaryArtifactId = 'demo-intake';
  }

  const repairProject = createProject('写入与登记恢复 · 优化演示', '四条工作线的合同已交付，OS 却找不到文件。沿 Trace 诊断并比较修复候选。', [{title:'故障描述',text:'公开合成：workspace_write 成功后 document_register 返回 503，旧补偿删除了已保存文件。'}], OPTIMIZATION_PROJECT_ID);
  optimization.initialize(repairProject, putArtifact);

  const researchProject = projects.get('lab-showcase-rag')!;
  researchProject.title = '深度研究';
  researchProject.description = '从研究资料出发，先设计解析、清洗、切片和检索基线，再用同一题集比较方案，交付带来源的研究应用。公开演示使用 200 份合成文档与 16 道已公开训练题；论文项目的历史记录另列。';
  const history = putArtifact(researchProject, { artifactId: 'paper-experiment-history', title: '论文项目 · 72 条历史记录', kind: 'evidence', view: 'table', summary: researchHistory.scope,
    content: { columns: [{key:'category',label:'类型'},{key:'title',label:'记录'},{key:'state',label:'状态'},{key:'config',label:'配置'},{key:'metrics',label:'记录结果'}],
      rows: researchHistory.records.map(row => ({category:row.category,title:row.title,state:row.state,config:JSON.stringify(row.config),metrics:JSON.stringify(row.metrics)})),
      caption: '211 份论文项目的历史元数据；209 份可读、2 份失败。这里只读已有回执，不将其成绩计入本轮公开资料的检索测评。' } });
  researchProject.workspace = { artifactOrder: [history.artifactId], primaryArtifactId: history.artifactId, layout: 'focus' };

  type SavedProjects = { version: 1; evaluations?:[string,BusinessEvaluation][]; projects: [string, LabProject][]; artifacts: [string, LabArtifact][];
    apps: [string, Awaited<ReturnType<typeof buildLabDemoApp>>[]][] };
  const restored = readPublicLabRecord<SavedProjects>('project-workspaces').then(saved => {
    if (saved?.version !== 1) return;
    for (const [id, project] of saved.projects) if (id !== OPTIMIZATION_PROJECT_ID) projects.set(id, project);
    for (const [id, artifact] of saved.artifacts) if (!id.startsWith(OPTIMIZATION_PROJECT_ID + '/')) artifacts.set(id, artifact);
    for (const [id, versions] of saved.apps) apps.set(id, versions);
    for (const [id, evaluation] of saved.evaluations ?? []) evaluations.set(id,evaluation);
  });
  const persistProjects = () => writePublicLabRecord('project-workspaces', { version: 1,
    projects: [...projects], artifacts: [...artifacts], apps: [...apps], evaluations:[...evaluations] } satisfies SavedProjects);

  return {
    'agent.eval-lab.projects.get': async (request: ControlRequest) => {
      await restored;
      const projectId = String(request.query?.projectId ?? '');
      const project = projects.get(projectId) ?? null;
      if (projectId === 'lab-showcase-rag' || projectId.startsWith('lab-project-showcase-') || research.has(projectId)) await researchFor(projectId).ready;
      if (projectId && !project) return fail('找不到这个演示项目，请返回项目列表。', 'SHOWCASE_NOT_FOUND');
      const artifactId = String(request.query?.artifactId ?? '');
      const revision = Number(request.query?.artifactRevision ?? project?.artifacts.find((item) => item.artifactId === artifactId)?.revision);
      const artifact = artifactId ? artifacts.get(artifactKey(projectId, artifactId, revision)) : undefined;
      if (artifactId && !artifact) return fail('找不到这个成果版本。', 'SHOWCASE_NOT_FOUND');
      return structuredClone({ ok: true, items: [...projects.values()], project, supportedViews,
        availableAdapters: [], historyCollections: [], ...(project ? { materialSet: project.materialSet, knowledge: knowledge(project) } : {}),
        ...(project && demoKey(project.projectId) ? { demoFlow: { evaluationCurrent: evaluations.get(project.projectId)?.signature === flowSignature(project),
          canGenerate: evaluations.get(project.projectId)?.signature === flowSignature(project) && evaluations.get(project.projectId)?.result.decision === 'keep',
          runs:evaluations.get(project.projectId)?.runs.map(run=>({id:run.id,name:run.name,passed:run.passed,total:run.total})) ?? [],
          decision: evaluations.get(project.projectId)?.result.decision ?? '', appVersion: apps.get(project.projectId)?.at(-1)?.version.version ?? 0 } } : {}),
        ...(project?.projectId === OPTIMIZATION_PROJECT_ID ? {optimization: optimization.status(project,id=>artifacts.get(artifactKey(project.projectId,id,project.artifacts.find(a=>a.artifactId===id)?.revision??0)))} : {}),
        ...(artifact ? { artifact } : {}) });
    },
    'agent.eval-lab.projects.command': async (request: ControlRequest) => {
      await restored;
      const body = object(request.body); const input = object(body.input); const clientRequestId = String(body.clientRequestId ?? '');
      const signature = JSON.stringify(body); const prior = receipts.get(clientRequestId);
      if (prior) return prior.signature === signature ? structuredClone({ ...prior.receipt, replayed: true }) : fail('该请求编号已经用于另一项操作。', 'SHOWCASE_CONFLICT');
      let project = projects.get(String(body.projectId ?? ''));
      if (body.action !== 'create' && !project) return fail('找不到这个演示项目。', 'SHOWCASE_NOT_FOUND');
      if (project && body.expectedRevision !== project.revision) return fail('项目版本已更新，请重新读取后继续。', 'SHOWCASE_CONFLICT');
      let artifact: LabArtifact | undefined; let job: KnowledgeJob | undefined; let upload: ProjectReceipt['upload'];
      let projectChanged = true;
      if (body.action === 'create') {
        if (input.path) return fail('公开演示不会读取本机路径，请添加文本文件或直接描述项目。');
        const description = String(input.description ?? '').trim();
        if (!description) return fail('请先描述要完成的工作。');
        project = createProject(`${String(input.title ?? description).slice(0, 40)} · 演示`, description,
          Array.isArray(input.materials) ? input.materials.map(object) : []);
      } else {
        project = structuredClone(project!);
        if (project.projectId === OPTIMIZATION_PROJECT_ID && body.action === 'knowledge' && String(input.operation).startsWith('optimization_')) {
          try { artifact = optimization.command(project, input, putArtifact, id => artifacts.get(artifactKey(project!.projectId, id, project!.artifacts.find(a => a.artifactId === id)?.revision ?? 0))); project.workspace.primaryArtifactId = artifact.artifactId; }
          catch (error) { return fail(error instanceof Error ? error.message : '优化演示未完成。'); }
        } else if (body.action === 'knowledge' && (project.projectId === 'lab-showcase-rag' || project.projectId.startsWith('lab-project-showcase-') || research.has(project.projectId) || String(input.operation).startsWith('upload_'))) {
          try { ({job, upload} = await researchFor(project.projectId).command(input)); projectChanged = false; }
          catch (error) { return fail(error instanceof Error ? error.message : '资料处理未完成。'); }
        } else if (body.action === 'publish_artifact' && !input.artifactId) {
          const value = { artifactId: `artifact:${crypto.randomUUID()}`, title: String(input.title || ''), kind: String(input.kind || 'document'),
            view: String(input.view), summary: String(input.summary || ''), content: input.content };
          if (input.expectedArtifactRevision !== 0 || !isArtifact({ ...value, revision: 1, createdAtMs: Date.now(), updatedAtMs: Date.now(), templateRef: null, actions: [] })) return fail('新成果的内容或初始版本无效。');
          artifact = putArtifact(project, value as Parameters<typeof putArtifact>[1]);
        } else if (body.action === 'publish_artifact') {
          const index = project.artifacts.findIndex((item) => item.artifactId === input.artifactId);
          const previous = project.artifacts[index];
          if (!previous || previous.revision !== input.expectedArtifactRevision) return fail('成果版本已更新，请重新读取。', 'SHOWCASE_CONFLICT');
          artifact = { ...previous, revision: previous.revision + 1, updatedAtMs: Date.now(), content: input.content as LabArtifact['content'] };
          if (!isArtifact(artifact)) return fail('成果内容与当前视图格式不匹配。');
          artifacts.set(artifactKey(project.projectId, artifact.artifactId, artifact.revision), artifact);
          const { content: _content, ...summary } = artifact; project.artifacts[index] = summary;
        } else if (body.action === 'update_brief') {
          project.title = String(input.title ?? project.title); project.description = String(input.description ?? project.description); project.briefVersion++;
        } else if (body.action === 'import_materials' || body.action === 'remove_materials') {
          if (input.path) return fail('公开演示不会读取本机路径，请添加文本文件或粘贴材料。');
          const values = Array.isArray(input.materials) ? input.materials.map(object) : [];
          const ids = Array.isArray(input.sourceIds) ? input.sourceIds : [];
          const existing = project.materialSet.materials.filter((row) => !ids.includes(row.sourceId));
          const materials = [...existing, ...values.map((row, index) => material(String(row.title ?? '新增材料'), String(row.text ?? ''), project!.revision * 100 + index))];
          const version = project.materialSet.version + 1; const materialSetId = `${project.projectId}:materials:${version}`;
          project.materialSet = { materialSetId, version, materials, createdAtMs: Date.now() }; project.materialSetId = materialSetId; project.materialCount = materials.length;
          project.materialVersions.push({ materialSetId, version, createdAtMs: Date.now() });
        } else if (body.action === 'knowledge' && input.operation === 'showcase_evaluate' && demoKey(project.projectId)) {
          try {
            const dataset = parseLabDemoDataset(project.materialSet.materials.map((item) => item.text));
            const configuration = project.artifacts.find((item) => item.artifactId === 'demo-config')!;
            const content = artifacts.get(artifactKey(project.projectId, configuration.artifactId, configuration.revision))!.content;
            const config = businessConfig(demoKey(project.projectId)!,object(object(content).values));
            const evaluated = evaluateBusiness(demoKey(project.projectId)!,dataset,config,input.phase !== 'baseline',flowSignature(project));
            const runs=evaluated.runs;
            artifact = putArtifact(project, { artifactId: 'demo-report', title: '本轮逐题结果', kind: 'evaluation', view: 'table',
              summary: runs.map(run=>`${run.name} ${run.passed}/${run.total}`).join(' · '),
              content: { columns: [{key:'caseId',label:'题目'},{key:'expected',label:'期望'},...runs.map((run,i)=>({key:`run${i}`,label:run.name}))],
                rows:dataset.cases.map((question,i)=>({caseId:question.id,expected:question.expected,...Object.fromEntries(runs.map((run,j)=>[`run${j}`,`${run.rows[i].passed?'通过':'失败'} · ${run.rows[i].actual}`]))})),
                caption:`同一批 ${dataset.records.length} 条记录、${dataset.cases.length} 道公开题。逐项执行本地规则，模型调用为 0。` } });
            evaluations.set(project.projectId,evaluated);
            project.workspace.primaryArtifactId = artifact.artifactId;
          } catch (error) { return fail(error instanceof Error ? error.message : '本轮数据未能测评。'); }
        } else if (body.action === 'prepare_app' && (project.projectId === 'lab-showcase-rag' || project.projectId.startsWith('lab-project-showcase-'))) {
          try {
            const resource = researchFor(project.projectId); await resource.ready;
            const selected = resource.exportEvaluation(String(input.evaluationJobId || resource.state.evaluations[0]?.jobId || ''));
            const versions = apps.get(project.projectId) ?? [], version = versions.length + 1;
            const config = { ...defaultLabConfig, strategy: selected.index.chunking.strategy === 'fixed' ? 'fixed' as const : 'paragraph' as const,
              size: selected.index.chunking.size, overlap: selected.index.chunking.overlap,
              topK: selected.evaluation.profile.topK, contextChars: selected.evaluation.profile.contextChars };
            const dataset: DemoDataset = { records: selected.documents.filter(doc => doc.status === 'ready').map(doc => ({ id:doc.id,title:doc.title,sourceTitle:doc.name,text:doc.text })), cases:selected.questions };
            const [js, css] = await Promise.all(['agent-ui.js','agent-ui.css'].map(async name => {
              const response = await fetch(`${import.meta.env.BASE_URL}portable-agent-ui/${name}`);
              if (!response.ok) throw new Error('研究对话组件尚未构建，请刷新后重试。'); return response.text();
            }));
            const html = portableResearchDocument({title:'研究资料助手',version,corpusHash:selected.evaluation.corpusHash,
              documentCount:dataset.records.length,chunks:selected.chunks,config,profile:selected.evaluation.profile,questions:dataset.cases.map(row=>row.input)}, {js,css});
            const app = await buildLabDemoApp(project.projectId,'研究资料助手','rag',dataset,'bounded',selected.evaluation,version,
              {html,config,extraFiles:{'parameters.json':JSON.stringify({chunking:selected.index.chunking,profile:selected.evaluation.profile},null,2)}});
            apps.set(project.projectId,[...versions,app]);
            artifact = putArtifact(project,{artifactId:'research-export',title:'研究应用交付记录',kind:'evidence',view:'markdown',
              summary:`v${version} · ${dataset.records.length} 份资料 · 采用已完成的检索评测`,
              content:`# 研究资料助手 v${version}\n\n使用本轮选定的资料、切片与检索参数，复用 PAW 的对话、引用与报告组件。\n\n- 资料：${dataset.records.length} 份\n- 切片：${selected.chunks.length} 个\n- 题集：${selected.evaluation.evaluatedCount} 道公开开发题\n- 来源召回率：${(selected.evaluation.report.metrics.metrics.recallAtK[String(config.topK)]*100).toFixed(1)}%\n\n独立包运行本地关键词检索并返回原文片段，不会调用模型生成研究结论。`});
          } catch(error) { return fail(error instanceof Error ? error.message : '研究应用未生成。'); }
        } else if (body.action === 'prepare_app' && demoKey(project.projectId)) {
          const evaluated = evaluations.get(project.projectId);
          if (!evaluated || evaluated.signature !== flowSignature(project)) return fail('请先对当前数据与已保存配置完成测评，再生成 App。');
          const chosen = evaluated.runs.find(run=>run.id===input.runId) ?? [...evaluated.runs].sort((a,b)=>b.passed-a.passed)[0];
          if (chosen.passed !== chosen.total) return fail('所选方案还有失败项，请修正数据或策略并重新测评。');
          const versions = apps.get(project.projectId) ?? [];
          const app = await buildLabDemoApp(project.projectId, project.title, demoKey(project.projectId)!, evaluated.dataset, evaluated.mode,
            { ...chosen, materialSetId: project.materialSetId, configurationRevision: project.artifacts.find((item) => item.artifactId === 'demo-config')?.revision }, versions.length + 1,
            {config:chosen.config,extraFiles:{'parameters.json':JSON.stringify(chosen.config,null,2)}});
          apps.set(project.projectId, [...versions, app]);
          artifact = putArtifact(project, { artifactId: 'demo-export', title: 'App 交付回执', kind: 'evidence', view: 'markdown', summary: `离线 App v${app.version.version} · ${app.version.fileCount} 份文件`,
            content: `# App 已生成\n\n打开「应用交付」，可以试用并下载独立 App。\n\n- 本轮题目：${evaluated.result.total}\n- 候选通过：${evaluated.result.candidatePassed}\n- 文件：${app.version.sourceFiles.map((item) => item.path).join('、')}\n- 数据版本：${project.materialSetId}\n\n导出包含实际源码、输入和测评回执。无模型服务、生产数据连接或 PAW 安装操作。` });
        } else if (body.action === 'set_workspace') {
          const layout = input.layout;
          if (layout === 'focus' || layout === 'split') project.workspace.layout = layout;
          if (project.artifacts.some((row) => row.artifactId === input.primaryArtifactId)) project.workspace.primaryArtifactId = String(input.primaryArtifactId);
        } else if (body.action === 'knowledge' && input.operation === 'search') {
          if (input.indexId !== `${project.projectId}:index`) return fail('请选择当前项目的演示索引。', 'SHOWCASE_NOT_FOUND');
          const query = String(input.query ?? '').trim();
          if (!query) return fail('请输入检索问题。');
          const hits = project.materialSet.materials.filter((row) => `${row.title} ${row.text}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
            .map((row) => ({ sourceId: row.sourceId, title: row.title, uri: row.uri, content: row.text, chunkId: `${row.sourceId}:0` }));
          const now = Date.now();
          job = { jobId: `preview-search:${project.projectId}:${project.revision}`, state: 'completed', progress: '已检索本页的合成材料', error: '', createdAtMs: now, updatedAtMs: now,
            publicSpec: { operation: 'search', projectId: project.projectId }, result: { kind: 'search', dataMode: 'synthetic-preview-only', query, indexId: input.indexId, hits } };
          jobs.set(project.projectId, [job, ...(jobs.get(project.projectId) ?? [])]);
        } else return unsupported();
        if (projectChanged) { project.revision++; project.updatedAtMs = Date.now(); projects.set(project.projectId, project); }
      }
      if (projectChanged) await persistProjects();
      const receipt: ProjectReceipt = { ok: true, project, clientRequestId, replayed: false, ...(artifact ? { artifact } : {}), ...(job ? { job } : {}), ...(upload ? {upload} : {}) };
      receipts.set(clientRequestId, { signature, receipt: structuredClone(receipt) });
      return structuredClone(receipt);
    },
    'agent.eval-lab.apps.get': async (request: ControlRequest) => {
      await restored;
      const projectId = String(request.query?.projectId ?? ''); const appId = String(request.query?.appId ?? '');
      const groups = [...apps.entries()].filter(([id, versions]) => (!projectId || id === projectId) && (!appId || versions[0]?.app.appId === appId));
      const versions = groups[0]?.[1] ?? []; const latest = versions.at(-1);
      const selected = versions.find((value) => value.version.version === Number(request.query?.version ?? latest?.version.version)) ?? latest;
      return structuredClone({ ok: true, items: groups.map(([, values]) => values.at(-1)!.app), app: appId ? latest?.app ?? null : null,
        ...(appId && selected ? { version: selected.version, versions: versions.map((value) => value.version) } : {}), calls: [] });
    },
    'agent.eval-lab.golden.get': () => ({ ok: true, items: [], suite: null }),
    'agent.eval-lab.trials.get': async (request: ControlRequest) => {
      await Promise.all([...research.values()].map(resource => resource.ready));
      const trialJobs = [...research.values()].flatMap(resource => resource.trials);
      const selected = trialJobs.find(job => job.jobId === request.query?.jobId);
      return { schemaVersion: 'rag-ime.agent-lab-trial.v1', jobs: trialJobs, registeredSceneIds: ['knowledge-resource'], ...(selected ? {job:selected} : {}) };
    },
    'agent.eval-lab.apps.command': unsupported,
    'agent.eval-lab.apps.download': (request: ControlRequest) => {
      const value = [...apps.values()].flat().find((item) => item.app.appId === request.query?.appId && item.version.version === Number(request.query?.version));
      return value && request.query?.target === 'standalone' ? structuredClone(value.download) : fail('请先生成本轮 App，再下载独立演示包。');
    },
    'agent.eval-lab.golden.command': unsupported,
    'agent.eval-lab.trials.start': unsupported,
    'agent.eval-lab.trials.cancel': unsupported,
  };
}
