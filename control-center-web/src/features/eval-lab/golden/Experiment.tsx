import { useEffect, useId, useRef, useState } from 'react';
import { Button, Disclosure } from '@/components/primitives';
import { useOptionalControlTransport } from '@/app/control-transport';
import { KnowledgeVariants, knowledgeVariant } from './KnowledgeVariants';
import { QualityComparison, QualityDefinitions, QualityObservations, RetrievalComparison, RetrievalObservations } from './QualityComparison';
import './experiment-quality.css';
import { labConnectionKey } from '../control-request';
import { EvidenceView, formatRate, formatTime, ModelFields } from './Shared';
import { isExperimentResult, isRunnableGoldenModel, jobStateLabel, object, verdictLabel, type CaseRun, type ExperimentResult, type ExperimentUsage, type GoldenCommand, type GoldenSource, type GoldenSuite, type PhaseReport } from './types';

const DEVELOPMENT_TRIAL_DEFAULT_COUNT = 12;
const DEVELOPMENT_TRIAL_MAX_COUNT = 16;

export function GoldenExperiment({ suite, disabled, onFreeze, onExperiment, onReview, onCalibrate, unsaved = false, initialJobId='',onSelectJob }: {
  suite: GoldenSuite; disabled: boolean; onFreeze: () => void;
  onExperiment: (input: GoldenCommand['input']) => Promise<boolean>;
  onReview?: () => void; onCalibrate?: () => void;
  unsaved?: boolean; initialJobId?:string;onSelectJob?:(jobId:string)=>void;
}) {
  const id = useId();
  const transport = useOptionalControlTransport();
  const draftKey = `paw.lab.experiment-draft.v1:${transport ? labConnectionKey(transport) : 'local'}:${suite.suiteId}`;
  const [saved] = useState(() => { try { return object(JSON.parse(sessionStorage.getItem(draftKey) ?? '{}')); } catch { return {}; } });
  const answerDefaults = { ...suite.judgeConfig, prompt: '' };
  const savedModel = (value: unknown) => { const row = object(value); return ['provider','model','thinkingLevel','prompt'].every((key) => typeof row[key] === 'string') ? row as typeof answerDefaults : answerDefaults; };
  const [baseline, setBaseline] = useState(() => savedModel(saved.baseline));
  const [candidate, setCandidate] = useState(() => savedModel(saved.candidate));
  const knowledge = suite.snapshot?.knowledge ?? suite.knowledge;
  const [baselineKnowledge, setBaselineKnowledge] = useState(() => knowledge ? knowledgeVariant(saved.baselineKnowledge, knowledge) : undefined);
  const [candidateKnowledge, setCandidateKnowledge] = useState(() => knowledge ? knowledgeVariant(saved.candidateKnowledge, knowledge) : undefined);
  const bindingKey = knowledge ? `${knowledge.projectId}:${knowledge.indexId}:${knowledge.corpusHash}` : '';
  const previousBinding = useRef(bindingKey);
  useEffect(() => {
    if (previousBinding.current !== bindingKey) {
      setBaselineKnowledge(knowledge ? knowledgeVariant(undefined, knowledge) : undefined);
      setCandidateKnowledge(knowledge ? knowledgeVariant(undefined, knowledge) : undefined);
      previousBinding.current = bindingKey;
    }
  }, [bindingKey, knowledge]);
  const [draftError, setDraftError] = useState('');
  const previousDefaults = useRef(answerDefaults);
  const modelDefaults = JSON.stringify(answerDefaults);
  useEffect(() => {
    const previous = JSON.stringify(previousDefaults.current);
    const next = JSON.parse(modelDefaults);
    setBaseline((value) => JSON.stringify(value) === previous ? next : value);
    setCandidate((value) => JSON.stringify(value) === previous ? next : value);
    previousDefaults.current = next;
  }, [modelDefaults]);
  const [optimizePrompt, setOptimizePrompt] = useState(saved.optimizePrompt !== false);
  const [maxCandidates, setMaxCandidates] = useState(typeof saved.maxCandidates === 'number' && [1,2,3].includes(saved.maxCandidates) ? saved.maxCandidates : 1);
  const approvedDevelopment = suite.cases.filter((item) => item.split === 'development' && item.review.status === 'approved');
  const approvedDevelopmentIds = approvedDevelopment.map((item) => item.caseId);
  const [trialCaseIds, setTrialCaseIds] = useState<string[]>(() => {
    const stored = Array.isArray(saved.trialCaseIds) ? saved.trialCaseIds.filter((value): value is string => typeof value === 'string') : [];
    const validStored = stored.filter((value) => approvedDevelopmentIds.includes(value));
    return validStored.length ? validStored.slice(0, DEVELOPMENT_TRIAL_MAX_COUNT) : approvedDevelopmentIds.slice(0, DEVELOPMENT_TRIAL_DEFAULT_COUNT);
  });
  const approvedDevelopmentKey = approvedDevelopmentIds.join('|');
  useEffect(() => {
    setTrialCaseIds((current) => {
      const valid = current.filter((value) => approvedDevelopmentIds.includes(value));
      return valid.length ? valid : approvedDevelopmentIds.slice(0, DEVELOPMENT_TRIAL_DEFAULT_COUNT);
    });
  }, [approvedDevelopmentKey]);
  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({baseline,candidate,optimizePrompt,maxCandidates,baselineKnowledge,candidateKnowledge,trialCaseIds})); setDraftError(''); }
    catch { setDraftError('当前浏览器未能保存实验配置，关闭前请保留回答规则。已经运行的实验仍使用其冻结配置。'); }
  }, [draftKey,baseline,candidate,optimizePrompt,maxCandidates,baselineKnowledge,candidateKnowledge,trialCaseIds]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  useEffect(()=>setSelectedJobId(initialJobId),[initialJobId]);
  const snapshot = suite.snapshot;
  const compatibleSnapshot = !suite.currentJudgeProtocolVersion || snapshot?.judgeProtocolVersion === suite.currentJudgeProtocolVersion;
  const approved = suite.cases.filter((item) => item.review.status === 'approved');
  const developmentCount = approved.filter((item) => item.split === 'development').length;
  const holdoutCount = approved.filter((item) => item.split === 'holdout').length;
  const calibrationReady = suite.calibration?.ready && suite.calibration.suiteRevision === suite.revision;
  const currentSnapshot = snapshot?.sourceRevision === suite.revision && compatibleSnapshot;
  const experiments = suite.jobs.filter((job) => job.kind === 'experiment').sort((left, right) => right.createdAtMs - left.createdAtMs);
  const selectedJob = experiments.find((job) => job.jobId === selectedJobId) ?? (initialJobId ? undefined : experiments[0]);
  const modelsRunnable = isRunnableGoldenModel(baseline) && isRunnableGoldenModel(candidate);
  const trialSelectionValid = trialCaseIds.length > 0 && trialCaseIds.length <= DEVELOPMENT_TRIAL_MAX_COUNT
    && trialCaseIds.every((caseId) => approvedDevelopmentIds.includes(caseId))
    && new Set(trialCaseIds).size === trialCaseIds.length;
  const plannerIdentities = [
    baselineKnowledge?.workflow?.kind === 'bilingual_multiquery' ? stableJson({ knowledge: baselineKnowledge, model: { provider: baseline.provider, model: baseline.model, thinkingLevel: baseline.thinkingLevel } }) : '',
    candidateKnowledge?.workflow?.kind === 'bilingual_multiquery' ? stableJson({ knowledge: candidateKnowledge, model: { provider: candidate.provider, model: candidate.model, thinkingLevel: candidate.thinkingLevel } }) : '',
  ].filter(Boolean);
  const trialCallsPerCase = 4 + new Set(plannerIdentities).size;
  const adaptiveResearch = [baselineKnowledge, candidateKnowledge].some((value) => value?.workflow?.kind === 'adaptive_research');
  const start = async () => {
    if (!snapshot || !modelsRunnable || !compatibleSnapshot) return;
    if (await onExperiment({ snapshotId: snapshot.snapshotId, baseline, candidate, runMode: 'full', optimizePrompt, maxCandidates, ...(knowledge && baselineKnowledge && candidateKnowledge ? { baselineKnowledge, candidateKnowledge } : {}) })) setSelectedJobId('');
  };
  const startDevelopmentTrial = async () => {
    if (!snapshot || !modelsRunnable || !compatibleSnapshot || !trialSelectionValid) return;
    if (await onExperiment({ snapshotId: snapshot.snapshotId, baseline, candidate, runMode: 'development_trial', caseIds: trialCaseIds, optimizePrompt: false, maxCandidates: 1, ...(knowledge && baselineKnowledge && candidateKnowledge ? { baselineKnowledge, candidateKnowledge } : {}) })) setSelectedJobId('');
  };
  const settings = <div className="golden-section">
    {draftError ? <p role="status" className="golden-note">{draftError}</p> : null}
    <header className="golden-section__heading"><div><h3 id={`${id}-freeze-title`}>冻结标准，再比较 Agent</h3><p>基线与候选使用同一份不可变题集。先在开发题调整 Prompt，固定候选后再评留出题。</p></div></header>
    <div className="golden-freeze">
      <div><h4>{currentSnapshot ? `已冻结快照 v${snapshot.version}` : '当前标准待冻结'}</h4><p className="golden-note">标准版本 {suite.revision} · 已通过 {developmentCount} 道开发题、{holdoutCount} 道留出题 · {calibrationReady ? '校准通过' : '需要当前版本的有效校准'}</p></div>
      <Button variant={snapshot ? 'secondary' : 'primary'} disabled={disabled || unsaved || currentSnapshot || !calibrationReady || !developmentCount || !holdoutCount} onClick={onFreeze}>{currentSnapshot ? (unsaved ? '已保存标准已冻结' : '当前标准已冻结') : '冻结当前标准'}</Button>
    </div>
    {snapshot ? <>
      <div className="golden-snapshot" aria-label="冻结快照">
        <dl><div><dt>实验使用</dt><dd>快照 v{snapshot.version}</dd></div><div><dt>标准版本</dt><dd>{snapshot.sourceRevision}</dd></div><div><dt>题目</dt><dd>{snapshot.developmentCount} 开发 · {snapshot.holdoutCount} 留出</dd></div><div><dt>冻结时间</dt><dd>{formatTime(snapshot.createdAtMs)}</dd></div></dl>
        {!currentSnapshot ? <p className="golden-note">当前标准已修改，旧快照仍保持不变。下方实验继续使用 v{snapshot.version}；如需新标准，请先校准并重新冻结。</p> : null}
        {unsaved ? <p className="golden-note">未保存的标准与评审修改不包含在此快照中。下方实验仍只使用已冻结的 v{snapshot.version}。</p> : null}
        <p className="golden-note">冻结评审：{snapshot.judgeConfig.provider} / {snapshot.judgeConfig.model} · {snapshot.judgeConfig.thinkingLevel || '默认推理'}。候选优化不会改动它。</p>
        {typeof snapshot.judgeProtocolVersion === 'string' ? <p className="golden-note">评审协议：{snapshot.judgeProtocolVersion}</p> : null}
        {!compatibleSnapshot ? <p className="golden-note">当前运行器使用新的评审协议，请重新校准并冻结后开始下一轮。旧结果仍保留。</p> : null}
      </div>
      <form className="golden-experiment-form" onSubmit={(event) => { event.preventDefault(); if (!disabled) void start(); }}>
        <div className="golden-model-comparison"><section><p className="golden-note">当前使用的方案，作为比较起点</p><ModelFields label="基线" value={baseline} onChange={setBaseline} disabled={disabled} /></section><section><p className="golden-note">准备尝试的新方案</p><ModelFields label="候选" value={candidate} onChange={setCandidate} disabled={disabled} /></section></div>
        {knowledge && baselineKnowledge && candidateKnowledge ? <KnowledgeVariants binding={knowledge} baseline={baselineKnowledge} candidate={candidateKnowledge} onBaseline={setBaselineKnowledge} onCandidate={setCandidateKnowledge} disabled={disabled} /> : null}
        <div className="golden-experiment-options"><label className="golden-check"><input type="checkbox" checked={optimizePrompt} disabled={disabled} onChange={(event) => setOptimizePrompt(event.target.checked)} />基于开发题自动优化 Prompt</label>
          {optimizePrompt ? <label htmlFor={`${id}-budget`}>最多尝试<select id={`${id}-budget`} value={maxCandidates} disabled={disabled} onChange={(event) => setMaxCandidates(Number(event.target.value))}>{[1, 2, 3].map((number) => <option key={number} value={number}>{number} 个候选</option>)}</select></label> : null}
        </div>
        <DevelopmentTrialPanel cases={approvedDevelopment} selected={trialCaseIds} maxCount={DEVELOPMENT_TRIAL_MAX_COUNT} callsPerCase={trialCallsPerCase} adaptiveResearch={adaptiveResearch} disabled={disabled || !modelsRunnable || !compatibleSnapshot} onChange={setTrialCaseIds} onStart={() => void startDevelopmentTrial()} />
        <div className="golden-run-plan" aria-label="完整评测执行范围"><strong>完整评测将实际执行</strong><ol><li>{snapshot.developmentCount} 道开发题：基线与候选分别作答并接受评审。</li><li>{optimizePrompt ? `最多尝试 ${maxCandidates} 个候选，只按开发题调整回答规则。` : '使用你填写的候选规则，不自动调整。'}</li><li>{snapshot.holdoutCount} 道留出题：验证最终候选，保存答案、评审和用量。</li></ol></div>
        <div className="golden-section__footer golden-action-bar"><p className="golden-note">点击后会调用所选模型。运行中可以离开页面，回来查看真实进度与结果。</p><Button type="submit" variant="primary" disabled={disabled || !modelsRunnable || !compatibleSnapshot}>开始冻结集实验</Button></div>
      </form>
    </> : <div className="golden-empty"><h4>还没有冻结快照</h4><p>完成逐题人审和评审校准后，即可冻结同一套标准用于自动实验。</p>{!developmentCount || !holdoutCount ? onReview ? <Button size="small" onClick={onReview}>去审核题目</Button> : null : !calibrationReady && onCalibrate ? <Button size="small" onClick={onCalibrate}>去校准评审</Button> : null}</div>}
  </div>;
  const results = selectedJob ? <section className="golden-experiment-results" aria-label="实验结果">
      <header className="golden-section__heading"><div><h3>实验结果</h3><p>{formatTime(selectedJob.createdAtMs)} · {jobStateLabel[selectedJob.state]}</p></div>
        {experiments.length > 1 ? <label>查看实验<select value={selectedJob.jobId} onChange={(event) => {setSelectedJobId(event.target.value);onSelectJob?.(event.target.value);}}>{experiments.map((job) => <option key={job.jobId} value={job.jobId}>{formatTime(job.createdAtMs)} · {jobStateLabel[job.state]}</option>)}</select></label> : null}
      </header>
      {selectedJob.state === 'completed' && isExperimentResult(selectedJob.result) ? <ExperimentReport result={selectedJob.result} sources={suite.sources} />
        : selectedJob.state === 'completed' ? <p role="alert" className="golden-field-error">实验结果回执不完整，尚无法比较基线与候选。请重新读取状态。</p>
          : selectedJob.state === 'running' || selectedJob.state === 'queued' ? <p className="golden-note">{selectedJob.progress || '结果将在真实执行结束后显示。'}</p>
            : <div><p className="golden-field-error">{selectedJob.error || '本次实验未完成，尚无完整比较结论。'}</p>{object(selectedJob.result).usage ? <UsageSummary usage={object(object(selectedJob.result).usage)} /> : null}</div>}
    </section> : null;
  return <section className="golden-section golden-experiment" aria-label="冻结与实验">
    {initialJobId && !selectedJob ? <p role="alert">指定实验未能读取，请返回原记录重新打开。</p> : null}
    {selectedJob?.state === 'completed' || initialJobId ? <>{results}<Disclosure className="golden-next-experiment" summary="设置下一轮实验">{settings}</Disclosure></> : <>{settings}{results}</>}
  </section>;
}

function DevelopmentTrialPanel({ cases, selected, maxCount, callsPerCase, adaptiveResearch, disabled, onChange, onStart }: {
  cases: GoldenSuite['cases']; selected: string[]; maxCount: number; callsPerCase: number; disabled: boolean;
  adaptiveResearch: boolean;
  onChange: (caseIds: string[]) => void; onStart: () => void;
}) {
  const selectedSet = new Set(selected);
  const toggle = (caseId: string) => {
    if (selectedSet.has(caseId)) onChange(selected.filter((value) => value !== caseId));
    else if (selected.length < maxCount) onChange([...selected, caseId]);
  };
  const valid = selected.length > 0 && selected.length <= maxCount && selected.every((caseId) => cases.some((item) => item.caseId === caseId));
  return <section className="golden-trial" aria-label="开发题小批试跑">
    <header className="golden-trial__heading"><div><h4>开发题小批试跑</h4><p className="golden-note">先用一小批已审核开发题检查模型与检索改动。只发送所选开发题；留出题不会被读取、优化或消费。</p></div><Button type="button" variant="secondary" disabled={disabled || !valid} onClick={onStart}>开始开发试跑</Button></header>
    <div className="golden-trial__summary" role="status" aria-label="开发试跑计划"><strong>{selected.length} / {cases.length} 道开发题已选择</strong><span>{adaptiveResearch ? '计划执行回合' : '计划模型调用'}：{selected.length * callsPerCase} 次（每题两方案作答与评审{callsPerCase > 4 ? '，含研究规划' : ''}）</span>{adaptiveResearch ? <span>按需研究的一次执行可能包含多次模型请求，以实际用量回执为准。</span> : null}<span>上限 {maxCount} 题 · 试跑不产生留出集结论</span></div>
    {cases.length ? <div className="golden-trial__cases" role="group" aria-label="选择开发题">{cases.map((item) => {
      const checked = selectedSet.has(item.caseId);
      return <label key={item.caseId} className="golden-trial__case"><input type="checkbox" aria-label={`选择开发题 ${item.caseId}`} checked={checked} disabled={disabled || (!checked && selected.length >= maxCount)} onChange={() => toggle(item.caseId)} /><span><strong>{item.question}</strong><small>开发题 · 已审核</small></span></label>;
    })}</div> : <p className="golden-note">当前冻结标准没有已审核的开发题，先回到审核步骤。</p>}
    {!valid ? <p className="golden-field-error" role="alert">至少选择 1 道且不超过 {maxCount} 道已审核开发题，才能开始试跑。</p> : null}
  </section>;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function ExperimentReport({ result, sources }: { result: ExperimentResult; sources: GoldenSource[] }) {
  if (result.runMode === 'development_trial') return <DevelopmentTrialReport result={result} sources={sources} />;
  if (!result.holdout) return <p role="alert" className="golden-field-error">实验结果缺少留出题数据，尚无法形成完整比较结论。</p>;
  const conclusion = {
    improved: '候选在本次冻结题集上有改善',
    no_improvement: '本次未观察到候选改善',
    inconclusive: '证据不足，暂不能判断改善',
  }[result.comparison.decision];
  return <div className="golden-report">
    {result.referenceAuthority === 'agent_assisted' ? <p className="golden-note">此实验使用 Agent 辅助标注的冻结标准，不代表独立人工金标验收。该来源记录属于本次实验，后续修改评审配置不会改变它。</p> : null}
    <div className="golden-report__conclusion"><h4>{conclusion}</h4><p>开发题通过率变化 {difference(result.comparison.developmentDelta)}；留出题变化 {difference(result.comparison.holdoutDelta)}。</p>{result.comparison.improvementBasis === 'answer_cost_estimate' ? <p>成本改善依据模型目录估算，实际费用尚未完整提供。</p> : null}{result.comparison.reasons.length ? <ul>{result.comparison.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}<p className="golden-note">本次使用同一冻结快照，Golden 标准没有改变。结论只覆盖这份题集。</p></div>
    {result.overall ? <><p className="golden-note">全部冻结题汇总包含参与调优的开发题；留出题验证仍单独报告。</p><RetrievalComparison title="全部冻结题" baseline={result.overall.baselineMetrics} candidate={result.overall.candidateMetrics} /><QualityComparison title="全部冻结题" baseline={result.overall.baselineMetrics} candidate={result.overall.candidateMetrics} /></> : null}
    <PhaseResults title="开发题" phase={result.development} />
    {result.validationUse ? <p className="golden-note">{result.validationUse.reused ? `当前留出题中有 ${result.validationUse.overlappingQuestionCount ?? '部分'} 道题已用于此前 ${result.validationUse.priorStartedRuns} 次验证；若根据已有结果继续调整，应使用新的验证材料检查泛化。` : '当前 Lab 未记录这些留出题的先前验证运行；人工预览或外部使用需另行说明。'}</p>
      : <p className="golden-note">这份历史记录未提供留出题的使用次数，不能据此断言它们从未被查看或复用。</p>}
    <PhaseResults title="留出题" phase={result.holdout} />
    {result.overall?.baselineMetrics.quality || result.development.baselineMetrics.quality || result.holdout.baselineMetrics.quality || result.overall?.candidateMetrics.quality || result.development.candidateMetrics.quality || result.holdout.candidateMetrics.quality ? <QualityDefinitions /> : <p className="golden-note">此历史实验未记录扩展质量指标；保留原通过率，不能据此推算事实准确率或 F1。</p>}
    <UsageSummary usage={result.usage} title="实验总开销" />
    {result.usageByScope ? <ScopeUsage scopes={result.usageByScope} /> : null}
    <CaseComparisons title="开发题" phase={result.development} sources={sources} />
    <CaseComparisons title="留出题" phase={result.holdout} sources={sources} />
    <ActualKnowledgeConfig result={result} />
    <Disclosure className="golden-disclosure" summary="本次实际模型与候选规则"><dl className="golden-definition"><div><dt>基线</dt><dd>{result.baseline.provider} / {result.baseline.model} · {result.baseline.thinkingLevel || '默认推理'}</dd></div><div><dt>最终候选</dt><dd>{result.candidate.provider} / {result.candidate.model} · {result.candidate.thinkingLevel || '默认推理'}</dd></div><div><dt>基线 Prompt</dt><dd className="golden-preserve-text">{result.baseline.prompt || '未提供独立 Prompt'}</dd></div><div><dt>候选 Prompt</dt><dd className="golden-preserve-text">{result.candidate.prompt || '未提供独立 Prompt'}</dd></div><div><dt>固定评审</dt><dd>{result.judgeConfig.provider} / {result.judgeConfig.model}</dd></div><div><dt>快照</dt><dd>{result.snapshotId}</dd></div></dl></Disclosure>
    <Disclosure className="golden-disclosure" summary={`运行来源（${result.receipts.length} 条已收回执）`}><ol className="golden-call-receipts">{result.receipts.map((receipt, index) => <li key={`${receipt.requestId}:${index}`}><strong>{receipt.stage}</strong><span>Session {receipt.sessionId || '未提供'}</span><span>回合 {receipt.turnId || '未提供'}</span></li>)}</ol></Disclosure>
  </div>;
}

function DevelopmentTrialReport({ result, sources }: { result: ExperimentResult; sources: GoldenSource[] }) {
  const selection = result.caseSelection;
  const selectedCount = selection?.selectedCount ?? result.development.cases.length;
  const availableCount = selection?.frozenDevelopmentCount ?? result.development.cases.length;
  const paidCallPlan = selection?.paidCallPlan;
  return <div className="golden-report">
    {result.referenceAuthority === 'agent_assisted' ? <p className="golden-note">此试跑使用 Agent 辅助标注的冻结标准，不代表独立人工金标验收；结果只能用于开发题诊断，不能作为最终验收结论。</p> : null}
    <div className="golden-report__conclusion golden-trial-report"><p className="golden-trial-report__label">开发题小批试跑</p><h4>证据不足，暂不能判断最终改善</h4><p>本次执行 {selectedCount} / {availableCount} 道已冻结开发题；留出题未读取，未消费任何留出集答案或标签。</p>{paidCallPlan ? <p className="golden-note">准入时计划 {paidCallPlan.totalCalls} 次{paidCallPlan.callUnit === 'pi_turns' ? '执行回合' : '模型调用'}：作答 {paidCallPlan.answerCalls}、评审 {paidCallPlan.judgeCalls}{paidCallPlan.planningCalls ? `、研究规划 ${paidCallPlan.planningCalls}` : ''}；优化与留出题均为 0。{paidCallPlan.modelCallsKnownInAdvance === false ? '按需研究包含多次模型请求，实际次数另见用量。' : ''}</p> : null}<p className="golden-note">开发题通过率变化 {difference(result.comparison.developmentDelta)}。这次结果用于定位和筛选下一步候选，不代表完整 Golden 验收。</p>{result.comparison.reasons.length ? <ul>{result.comparison.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}</div>
    <PhaseResults title="本次开发题" phase={result.development} />
    <UsageSummary usage={result.usage} title="试跑总开销" />
    {result.usageByScope ? <ScopeUsage scopes={result.usageByScope} /> : null}
    <CaseComparisons title="本次开发题" phase={result.development} sources={sources} />
    <ActualKnowledgeConfig result={result} />
    <Disclosure className="golden-disclosure" summary="本次实际模型与候选规则"><dl className="golden-definition"><div><dt>基线</dt><dd>{result.baseline.provider} / {result.baseline.model} · {result.baseline.thinkingLevel || '默认推理'}</dd></div><div><dt>候选</dt><dd>{result.candidate.provider} / {result.candidate.model} · {result.candidate.thinkingLevel || '默认推理'}</dd></div><div><dt>固定评审</dt><dd>{result.judgeConfig.provider} / {result.judgeConfig.model}</dd></div><div><dt>快照</dt><dd>{result.snapshotId}</dd></div></dl></Disclosure>
    <Disclosure className="golden-disclosure" summary={`运行来源（${result.receipts.length} 条已收回执）`}><ol className="golden-call-receipts">{result.receipts.map((receipt, index) => <li key={`${receipt.requestId}:${index}`}><strong>{receipt.stage}</strong><span>Session {receipt.sessionId || '未提供'}</span><span>回合 {receipt.turnId || '未提供'}</span></li>)}</ol></Disclosure>
  </div>;
}

function ActualKnowledgeConfig({ result }: { result: ExperimentResult }) {
  const variants = result.knowledgeVariants;
  if (!variants) return null;
  const rows: [string, unknown, unknown][] = [
    ['索引', variants.baseline.indexId, variants.candidate.indexId],
    ['资料快照', variants.baseline.corpusHash, variants.candidate.corpusHash],
    ['分块', variants.baseline.chunking, variants.candidate.chunking],
    ['研究流程', variants.baseline.workflow ?? '单路检索', variants.candidate.workflow ?? '单路检索'],
    ...(['mode', 'topK', 'threshold', 'rerank', 'candidateDepth', 'contextChars'] as const).map((key): [string, unknown, unknown] => [
      ({ mode: '检索方式', topK: 'Top K', threshold: '分数阈值', rerank: '重排', candidateDepth: '重排候选数', contextChars: '证据字符预算' })[key], variants.baseline.profile[key], variants.candidate.profile[key],
    ]),
    ['索引配置指纹', variants.baseline.configHash, variants.candidate.configHash],
    ['检索方案指纹', variants.baseline.workflowConfigHash, variants.candidate.workflowConfigHash],
  ];
  const display = (value: unknown) => value === undefined || value === null ? '未提供' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  return <Disclosure className="golden-disclosure" summary="本次实际检索参数与变化"><p className="golden-note">以下来自本次执行的冻结配置；加粗行为两侧不同的参数。模型和两侧 Prompt 见下方记录。</p><div className="golden-table-scroll"><table className="golden-table golden-config-table"><thead><tr><th scope="col">参数</th><th scope="col">基线</th><th scope="col">候选</th></tr></thead><tbody>{rows.map(([label, before, after]) => <tr key={label}><th scope="row">{display(before) !== display(after) ? <strong>{label} · 已变化</strong> : label}</th><td>{display(before)}</td><td>{display(after)}</td></tr>)}</tbody></table></div>
    {result.retrievalStages ? <><h5>实际检索阶段</h5><p className="golden-note">检索包计时只覆盖预先检索；按需研究的模型与工具交替执行，不计入该平均值。完整用量单独记录。</p><dl className="golden-definition">{(['baseline', 'candidate'] as const).map((key) => { const row = result.retrievalStages![key]; return <div key={key}><dt>{key === 'baseline' ? '基线' : '候选'}</dt><dd>{row.packetCount} 个检索包，{row.timedPacketCount} 个有计时；平均 {typeof row.meanPacketLatencyMs === 'number' ? `${row.meanPacketLatencyMs.toFixed(1)} ms` : 'N/A'}；{row.sharedPacketCount} 个复用包；实际检索 {typeof row.searchCount === 'number' ? `${row.searchCount} 次` : '未提供'}；原文读取 {typeof row.sourceReadCount === 'number' ? `${row.sourceReadCount} 次` : '未提供'}；工具调用 {typeof row.toolCallCount === 'number' ? `${row.toolCallCount} 次` : '未采集'}；规划模型 {typeof row.plannerCalls === 'number' ? `${row.plannerCalls} 次` : '未提供'}</dd></div>; })}</dl></> : null}
  </Disclosure>;
}

function PhaseResults({ title, phase }: { title: string; phase: PhaseReport }) {
  return <section className="golden-phase" aria-label={`${title}比较`}>
    <h4>{title}</h4>
    <figure className="golden-rate-chart" aria-label={`${title}通过率对比图`}>
      <figcaption>{title === '留出题' ? '候选固定后的验证' : '调整阶段'}<span>通过率 · 相同的 0–100% 刻度</span></figcaption>
      {([['基线', phase.baselineMetrics], ['候选', phase.candidateMetrics]] as const).map(([label, metrics]) => <div className="golden-rate-row" data-version={label === '候选' ? 'candidate' : 'baseline'} key={label}><span>{label}</span><div className="golden-rate-track" aria-hidden="true">{typeof metrics.passRate === 'number' && Number.isFinite(metrics.passRate) ? <div style={{ width: `${Math.max(0, Math.min(1, metrics.passRate)) * 100}%` }} /> : null}</div><strong>{formatRate(metrics.passRate)}</strong><small>{metrics.passed} / {metrics.total} 题</small></div>)}
    </figure>
    <div className="golden-table-scroll"><table className="golden-table"><caption className="golden-visually-hidden">{title}基线与候选汇总</caption><thead><tr><th scope="col">版本</th><th scope="col">通过率</th><th scope="col">通过 / 总数</th><th scope="col">不通过</th><th scope="col">无法判定</th><th scope="col">运行错误</th></tr></thead><tbody>{([['基线', phase.baselineMetrics], ['候选', phase.candidateMetrics]] as const).map(([label, metrics]) => <tr key={label}><th scope="row">{label}</th><td>{formatRate(metrics.passRate)}</td><td>{metrics.passed} / {metrics.total}</td><td>{metrics.failed}</td><td>{metrics.uncertain}</td><td>{metrics.runtimeErrors}</td></tr>)}</tbody></table></div>
    <RetrievalComparison title={title} baseline={phase.baselineMetrics} candidate={phase.candidateMetrics} />
    <QualityComparison title={title} baseline={phase.baselineMetrics} candidate={phase.candidateMetrics} />
    {phase.businessCost ? <BusinessCost cost={phase.businessCost} scope={phase.usageScope} /> : <p className="golden-note">本阶段尚未提供可比较的业务答案费用。</p>}
  </section>;
}
function CaseComparisons({ title, phase, sources }: { title: string; phase: PhaseReport; sources: GoldenSource[] }) {
  return <section className="golden-phase" aria-label={`${title}逐题差异`}>
    <h4>{title} · 逐题差异</h4>
    <div className="golden-result-cases">{phase.cases.map((item) => <details key={item.caseId}><summary><strong>{item.question}</strong><span>基线 {runVerdict(item.baseline)} · 候选 {runVerdict(item.candidate)}</span></summary><div className="golden-answer-comparison"><AnswerResult label="基线答案" run={item.baseline} sources={sources} /><AnswerResult label="候选答案" run={item.candidate} sources={sources} /></div></details>)}</div>
  </section>;
}
function runVerdict(run: CaseRun) { return run.status === 'runtime_error' ? '运行错误' : verdictLabel[run.judgment.verdict]; }
function AnswerResult({ label, run, sources }: { label: string; run: CaseRun; sources: GoldenSource[] }) {
  return <section><h5>{label} · {runVerdict(run)}</h5><p className="golden-preserve-text">{run.answer || '没有返回答案'}</p>{run.retrieval ? <details><summary>回答前实际检索 · {run.retrieval.sourceCount} 个片段 / {run.retrieval.contextChars} 字符</summary>{run.retrieval.sources.map((source, index) => <div key={`${source.chunkId}:${index}`}><small>{source.sourceId} · {source.chunkId}</small>{source.excerpt ? <p className="golden-preserve-text">{source.excerpt}</p> : null}</div>)}</details> : null}<RetrievalObservations observation={run.retrieval?.sourceMetrics} /><QualityObservations quality={run.judgment.quality} /><h6>评审依据</h6><p>{run.judgment.reason || '未提供判断理由'}</p><EvidenceView evidence={run.judgment.evidence} sources={sources} /></section>;
}
function UsageSummary({ usage, title = '实际用量' }: { usage: Partial<ExperimentUsage> | Record<string, unknown>; title?: string }) {
  const metric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('zh-CN') : '未提供';
  const cost = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? `$${value.toFixed(4)}` : '未提供';
  const raw = usage as Record<string, unknown>;
  const resource = (field: string) => {
    const value = raw[field]; const complete = raw[`${field}Complete`] === true || (raw[`${field}Complete`] === undefined && typeof value === 'number');
    if (complete && typeof value === 'number' && Number.isFinite(value)) return metric(value);
    const known = raw[`known${field[0].toUpperCase()}${field.slice(1)}`];
    return typeof known === 'number' && Number.isFinite(known) ? `未完整（已知 ${metric(known)}）` : '未提供';
  };
  const elapsed = () => {
    const value = raw.elapsedMs; const complete = raw.elapsedComplete === true || raw.elapsedMsComplete === true || (raw.elapsedComplete === undefined && raw.elapsedMsComplete === undefined && typeof value === 'number');
    const format = (ms: number) => `${(ms / 1000).toFixed(1)} 秒`;
    if (complete && typeof value === 'number' && Number.isFinite(value)) return format(value);
    const known = raw.knownElapsedMs;
    return typeof known === 'number' && Number.isFinite(known) ? `未完整（已知 ${format(known)}）` : '未提供';
  };
  return <section className="golden-usage" aria-label={title}><h4>{title}</h4><dl><div><dt>已收回执</dt><dd>{metric(usage.calls)}</dd></div><div><dt>实际模型请求</dt><dd>{usage.modelCallCountComplete === true ? metric(usage.modelCallCount) : typeof usage.knownModelCallCount === 'number' ? `未完整（已知 ${usage.knownModelCallCount}）` : '未采集'}</dd></div><div><dt>输入 Token</dt><dd>{resource('inputTokens')}</dd></div><div><dt>输出 Token</dt><dd>{resource('outputTokens')}</dd></div><div><dt>缓存读 Token</dt><dd>{resource('cacheReadTokens')}</dd></div><div><dt>缓存写 Token</dt><dd>{resource('cacheWriteTokens')}</dd></div><div><dt>总 Token</dt><dd>{resource('totalTokens')}</dd></div><div><dt>执行阶段累计耗时</dt><dd>{elapsed()}</dd></div><div><dt>Tool 调用</dt><dd>{usage.toolCallCountComplete === true ? metric(usage.toolCallCount) : typeof usage.knownToolCallCount === 'number' ? `未完整（已知 ${usage.knownToolCallCount}）` : '未采集'}</dd></div><div><dt>实际总成本</dt><dd>{usage.costComplete === true ? cost(usage.costUsd) : '未提供完整成本'}</dd></div>{usage.estimateComplete === true && typeof usage.estimatedCostUsd === 'number' && usage.estimatedCostUsd > 0 ? <div><dt>模型目录估算</dt><dd>{cost(usage.estimatedCostUsd)}</dd></div> : null}</dl>{usage.estimateComplete === true && usage.estimatedCostUsd === 0 ? <p className="golden-note">模型目录只有默认零值，费用未提供。</p> : null}{usage.costComplete !== true && typeof usage.knownCostUsd === 'number' ? <p className="golden-note">已提供价格的 {metric(usage.pricedCalls)} 次调用合计 {cost(usage.knownCostUsd)}，其余调用成本未知。</p> : null}<p className="golden-note">已收回执数不是未完成任务的计划或尝试总数；执行阶段累计耗时不代表端到端或并行 wall time。</p>{title === '实验总开销' ? <p className="golden-note">包含全部试跑、评审与优化调用，不等于单次业务答案成本。</p> : null}</section>;
}
function BusinessCost({ cost, scope }: { cost: NonNullable<PhaseReport['businessCost']>; scope?: PhaseReport['usageScope'] }) {
  if (!['actual', 'model_catalog_estimate'].includes(cost.basis) || (cost.basis === 'model_catalog_estimate' && (cost.baselineUsd === 0 || cost.candidateUsd === 0))) return <p className="golden-note">业务答案费用未提供，不能据此判断节省。</p>;
  return <div className="golden-business-cost"><p>业务答案{cost.basis === 'actual' ? '实际费用' : '估算费用'}：基线 {money(cost.baselineUsd)}，候选 {money(cost.candidateUsd)}；变化 {money(cost.deltaUsd)}。</p><p className="golden-note">{scope === 'planning_and_answer_calls' ? '包含本阶段最终方案的检索规划与答案调用。' : '仅统计本阶段最终选中答案的调用。'}每个通过答案：基线 {money(cost.baselineCostPerSuccessUsd)}，候选 {money(cost.candidateCostPerSuccessUsd)}。{cost.basis === 'model_catalog_estimate' ? '估算来自模型目录价格。' : ''}</p></div>;
}
function ScopeUsage({ scopes }: { scopes: NonNullable<ExperimentResult['usageByScope']> }) {
  const labels = { baselineAnswers: '基线答案', candidateAnswers: '候选答案（含全部试跑）', baselinePlanning: '基线检索规划', candidatePlanning: '候选检索规划', judging: '评审开销', optimization: 'Prompt 优化开销', drafting: '起草开销', calibration: '校准开销' };
  const field = (usage: ExperimentUsage, name: string) => {
    const value = usage[name as keyof ExperimentUsage]; const complete = usage[`${name}Complete` as keyof ExperimentUsage] === true || (usage[`${name}Complete` as keyof ExperimentUsage] === undefined && typeof value === 'number');
    if (complete && typeof value === 'number') return value.toLocaleString('zh-CN');
    const known = usage[`known${name[0].toUpperCase()}${name.slice(1)}` as keyof ExperimentUsage];
    return typeof known === 'number' ? `未完整（已知 ${known.toLocaleString('zh-CN')}）` : '未提供';
  };
  const elapsed = (usage: ExperimentUsage) => typeof usage.elapsedMs === 'number' && (usage.elapsedComplete === true || usage.elapsedMsComplete === true || (usage.elapsedComplete === undefined && usage.elapsedMsComplete === undefined)) ? `${(usage.elapsedMs / 1000).toFixed(1)} 秒` : typeof usage.knownElapsedMs === 'number' ? `未完整（已知 ${(usage.knownElapsedMs / 1000).toFixed(1)} 秒）` : '未提供';
  return <Disclosure className="golden-disclosure" summary="按用途查看调用开销"><div className="golden-table-scroll"><table className="golden-table"><thead><tr><th scope="col">用途</th><th scope="col">已收回执</th><th scope="col">总 Token</th><th scope="col">缓存读</th><th scope="col">缓存写</th><th scope="col">执行阶段累计耗时</th><th scope="col">实际费用</th><th scope="col">目录估算</th></tr></thead><tbody>{(Object.keys(labels) as (keyof typeof labels)[]).filter((key) => scopes[key]).map((key) => { const usage = scopes[key]!; return <tr key={key}><th scope="row">{labels[key]}</th><td>{typeof usage.calls === 'number' ? usage.calls : '未提供'}</td><td>{field(usage, 'totalTokens')}</td><td>{field(usage, 'cacheReadTokens')}</td><td>{field(usage, 'cacheWriteTokens')}</td><td>{elapsed(usage)}</td><td>{usage.costComplete ? money(usage.costUsd) : '未提供完整成本'}</td><td>{usage.estimateComplete && typeof usage.estimatedCostUsd === 'number' && usage.estimatedCostUsd > 0 ? money(usage.estimatedCostUsd) : '未提供'}</td></tr>; })}</tbody></table></div><p className="golden-note">各行显示已收回执；一次执行可能包含多次模型请求。执行阶段累计耗时不代表端到端或并行 wall time。</p></Disclosure>;
}
function money(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.abs(value).toFixed(4)}` : '未提供'; }
function difference(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '无法比较';
  return `${value > 0 ? '+' : ''}${(value * 100).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 个百分点`;
}
