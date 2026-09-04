import { CheckCircle2, GitCompareArrows, Search, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { Button } from '@/components/primitives';
import type { TraceVerificationReceiptV1 } from '@/contracts/generated/trace-verification-receipt.v1';

type TraceShowcasePhase = 'idle' | 'diagnosing' | 'reported' | 'confirming' | 'repairing' | 'recheck' | 'comparing' | 'verified';

const diagnosticReport = [
  '结论：四个异常不是同一个问题。Tool error 的第一根因是 Workflow 在辅助登记失败后撤销真实写入；14m32s 来自重复上下文与 6 次无效重试；Sub Agent 前台化来自错误的展示生命周期；Skill 测评则只看了 Worker 自我总结。',
  '',
  'Trace 证据：workspace_write receipt 已成功，rollback 发生在 documentSync owner；主 Session 等待前台 child，background 标记没有进入 projection；Reviewer SkillRef 已加载，但 Eval criteria 缺少 user_requirement、program_behavior 与 regression_tests。',
  '',
  '建议：保留真实 workspace mutation；documentSync 失败只记录一次。恢复 child=background 投影；Reviewer Skill 明确对照用户原话、需求文档、程序行为和测试证据，并增加同一 Case 的聚焦回归。修复需要用户授权。',
].join('\n');

const repairReport = [
  '已创建有界 Repair Session。',
  '1. 修改 documentSync owner：失败不再回滚真实产物。',
  '2. 修正 Sub Agent lifecycle projection：background 不进入前台工作区。',
  '3. 增加 Tool error、超时重试与 child visibility 聚焦测试。',
  '4. 更新 Reviewer Skill 的 Eval criteria，并冻结 SkillRef、Prompt 与测试 Case。',
  '5. 12 / 12 focused tests passed；当前仅为 applied + tested。',
].join('\n');

const fingerprint = `sha256:${'a'.repeat(64)}`;
const verificationReceipt: TraceVerificationReceiptV1 = {
  schemaVersion: 'rag-ime.trace-verification-receipt.v1',
  verificationReceiptId: 'verification:trace-showcase:001',
  replayCaseId: 'replay:trace-showcase:001',
  repairReceiptId: 'receipt:trace-showcase:001',
  sourceTraceId: 'trace:before:preview-001',
  repairTraceId: 'trace:after:preview-001',
  baselineEvalRunId: 'eval:before:preview-001',
  repairEvalRunId: 'eval:after:preview-001',
  baselineSandboxRunId: 'sandbox:before:preview-001',
  repairSandboxRunId: 'sandbox:after:preview-001',
  regressionEvalRunIds: ['eval:regression:1', ...Array.from({ length: 11 }, (_, index) => `eval:regression:${index + 2}`)],
  replayCohort: {
    suiteId: 'trace-showcase',
    suiteRevision: '2026-08-31',
    caseId: 'workflow-owner-and-skill-eval',
    inputFingerprint: fingerprint,
    environmentFingerprint: fingerprint,
    configFingerprint: fingerprint,
    modelProfileFingerprint: fingerprint,
    toolProfileFingerprint: fingerprint,
    skillProfileFingerprint: fingerprint,
  },
  successCriterion: { metric: 'task_success', threshold: .8, direction: 'at_least' },
  repairPassed: true,
  regression: { count: 12, passed: true, failedEvalRunIds: [] },
  comparison: { status: 'available', metric: 'task_success', before: .25, after: .92, absoluteDelta: .67, relativeDelta: 2.68 },
  efficiency: {
    latencyMs: { before: 872_000, after: 138_000, delta: -734_000 },
    totalTokens: { before: 48_600, after: 17_300, delta: -31_300 },
  },
  decision: 'kept',
  rollbackTarget: 'config:trace-showcase:before',
  createdAtMs: 1_788_185_600_000,
};

export function TraceShowcaseWorkbench() {
  const [phase, setPhase] = useState<TraceShowcasePhase>('idle');
  const [diagnosticText, diagnosticDone] = useQuickStream(diagnosticReport, phase === 'diagnosing');
  const [repairText, repairDone] = useQuickStream(repairReport, phase === 'repairing');
  const [evidence, setEvidence] = useState('');

  useEffect(() => {
    if (phase === 'diagnosing' && diagnosticDone) setPhase('reported');
  }, [diagnosticDone, phase]);

  useEffect(() => {
    if (phase === 'repairing' && repairDone) setPhase('recheck');
  }, [phase, repairDone]);

  useEffect(() => {
    if (phase !== 'comparing') return undefined;
    const reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setPhase('verified'), reducedMotion ? 60 : 720);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return (
    <main className="trace-showcase-workbench" data-phase={phase}>
      <header>
        <div><Sparkles size={17}/><span><strong>Trace Agent</strong><small>只读诊断 → 用户授权 → Repair Session → 同题复检</small></span></div>
        <b>PUBLIC SYNTHETIC REPLAY</b>
      </header>

      <section className="trace-showcase-handoff">
        <span><Search size={16}/></span>
        <div><small>来自 Agent 工作记录</small><strong>Tool error · Workflow 事故</strong><p>同时关联耗时过长、Sub Agent 前台化与 Skill 测评漂移三条异常信号；先诊断，不自动写入。</p></div>
        <Button
          data-trace-action="start-diagnostic"
          disabled={phase !== 'idle'}
          leadingIcon={<Search size={14}/>}
          onClick={() => setPhase('diagnosing')}
          size="small"
          variant="primary"
        >{phase === 'idle' ? '开始诊断' : '诊断已启动'}</Button>
      </section>

      <ol className="trace-showcase-steps" aria-label="Trace Agent 工作阶段">
        {[
          ['读取 Trace', 'Session、Tool、Skill / Eval、child lifecycle'],
          ['定位根因', '区分四个异常的 owner'],
          ['授权修复', '另开有界 Repair Session'],
          ['同题验证', 'Before / After 与来源回跳'],
        ].map(([title, detail], index) => {
          const active = phaseIndex(phase);
          return <li data-state={index < active ? 'done' : index === active ? 'active' : 'waiting'} key={title}><span>{index < active ? <CheckCircle2 size={14}/> : index + 1}</span><div><strong>{title}</strong><small>{detail}</small></div></li>;
        })}
      </ol>

      {phase !== 'idle' ? (
        <section className="trace-showcase-stream" data-session-id="session-reliability" data-stream-complete={diagnosticDone ? 'true' : undefined} data-trace-stream="diagnostic">
          <header><Search size={15}/><strong>诊断报告 · READ ONLY</strong><small>{diagnosticDone ? '完成' : '流式生成中'}</small></header>
          <pre>{diagnosticText}{!diagnosticDone ? <i/> : null}</pre>
          {phase === 'reported' ? <Button data-trace-action="repair" leadingIcon={<Wrench size={14}/>} onClick={() => setPhase('confirming')} size="small" variant="primary">交给 Agent 修复</Button> : null}
        </section>
      ) : null}

      {phase === 'confirming' ? (
        <section aria-label="确认候选修复" className="trace-showcase-confirm" role="dialog">
          <ShieldCheck size={18}/><div><strong>确认有界修复</strong><p>仅修改两个 owner 与对应聚焦测试；不改 Trace Skill、评测标签或其他产品线。</p></div>
          <div><Button onClick={() => setPhase('reported')} size="small" variant="quiet">取消</Button><Button data-trace-action="repair-submit" onClick={() => setPhase('repairing')} size="small" variant="primary">确认交给 Agent 修复</Button></div>
        </section>
      ) : null}

      {['repairing', 'recheck', 'comparing', 'verified'].includes(phase) ? (
        <section className="trace-showcase-stream trace-showcase-stream--repair" data-session-id="session-reliability-repair" data-stream-complete={repairDone ? 'true' : undefined} data-trace-stream="repair">
          <header><Wrench size={15}/><strong>Repair Session · BOUNDED WRITE</strong><small>{repairDone ? 'applied + tested' : '流式修复中'}</small></header>
          <pre>{repairText}{!repairDone ? <i/> : null}</pre>
          {phase === 'recheck' ? <Button data-trace-action="recheck" leadingIcon={<GitCompareArrows size={14}/>} onClick={() => setPhase('comparing')} size="small" variant="primary">运行同一 Case 并比较</Button> : null}
        </section>
      ) : null}

      {phase === 'comparing' || phase === 'verified' ? (
        <section className="trace-showcase-comparison" data-state={phase} data-trace-comparison="before-after">
          <header><GitCompareArrows size={16}/><div><strong>同一 Case · 修复前后对比</strong><small>trace-verification-receipt.v1 · synthetic fixture</small></div><b>{phase === 'verified' ? 'VERIFIED · KEEP' : 'REPLAYING SAME CASE'}</b></header>
          <div aria-label="复检总览" className="trace-showcase-scorecard">
            <article data-tone="before"><small>修复前 · task_success</small><strong>{formatScore(verificationReceipt.comparison.before)}</strong><i><span style={{ transform: `scaleX(${verificationReceipt.comparison.before})` }}/></i></article>
            <GitCompareArrows aria-hidden="true" size={18}/>
            <article data-tone="after"><small>修复后 · task_success</small><strong>{phase === 'verified' ? formatScore(verificationReceipt.comparison.after) : '复检中'}</strong><i><span style={{ transform: `scaleX(${phase === 'verified' ? verificationReceipt.comparison.after : 0})` }}/></i></article>
            <dl><div><dt>回归测试</dt><dd>{phase === 'verified' ? `${verificationReceipt.regression.count}/${verificationReceipt.regression.count} passed` : '重放中'}</dd></div><div><dt>耗时</dt><dd>{phase === 'verified' ? '14m32s → 2m18s' : '对齐环境'}</dd></div><div><dt>Token</dt><dd>{phase === 'verified' ? '48.6k → 17.3k' : '冻结 cohort'}</dd></div><div><dt>判决</dt><dd>{phase === 'verified' ? 'KEEP · 保留修复' : 'PENDING'}</dd></div></dl>
          </div>
          <div role="table" aria-label="Trace 修复前后对比">
            <div role="row"><b role="columnheader">检查项</b><b role="columnheader">Before</b><b role="columnheader">After</b><b role="columnheader">原始依据</b></div>
            {[
              ['Tool error', 'failed + rollback', 'failed receipt · artifact kept', 'workspace_write → documentSync'],
              ['Wall clock', '14m32s · 6 retries', '2m18s · 1 retry', 'run timing + retry events'],
              ['Sub Agent', 'foreground · blocked', 'background · parent continues', 'child lifecycle events'],
              ['Skill / Eval', 'Worker summary only', 'user need + behavior + tests', 'SkillRef + Eval receipt'],
            ].map(([item, before, after, source], index) => <div role="row" key={item} style={{ '--comparison-row': index } as CSSProperties}><strong role="cell">{item}</strong><span role="cell">{before}</span><span className="trace-showcase-after" data-ready={phase === 'verified' || undefined} role="cell"><i aria-hidden={phase === 'verified'}>replaying…</i><b aria-hidden={phase !== 'verified'}>{after}</b></span><span role="cell"><button data-trace-action="open-evidence" disabled={phase !== 'verified'} onClick={() => setEvidence(source)} type="button">{phase === 'verified' ? source : '等待复检完成'}</button></span></div>)}
          </div>
          {evidence ? <aside data-trace-evidence-open="true"><strong>原始 Trace 事件</strong><code>{evidence}</code><p>点击来源只打开形成该判断的冻结事件；表格本身不成为新的事实 owner。</p></aside> : null}
        </section>
      ) : null}
    </main>
  );
}

function phaseIndex(phase: TraceShowcasePhase): number {
  if (phase === 'idle' || phase === 'diagnosing') return 0;
  if (phase === 'reported') return 1;
  if (phase === 'confirming' || phase === 'repairing') return 2;
  return 3;
}

function formatScore(value: number): string {
  return value.toFixed(2).replace(/^0/u, '');
}

function useQuickStream(source: string, active: boolean): [string, boolean] {
  const [state, setState] = useState({ complete: false, visible: source });
  useLayoutEffect(() => {
    if (!active) return undefined;
    setState({ complete: false, visible: '' });
    let count = 0;
    const timer = window.setInterval(() => {
      count = Math.min(source.length, count + 26);
      const complete = count >= source.length;
      setState({ complete, visible: source.slice(0, count) });
      if (complete) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [active, source]);
  return [state.visible, state.complete];
}
