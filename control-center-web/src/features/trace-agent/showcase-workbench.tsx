import { CheckCircle2, GitCompareArrows, Search, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import taskStory from '../../../../showcase/task-story.v1.json';
import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { Button } from '@/components/primitives';

type TraceShowcasePhase = 'idle' | 'diagnosing' | 'reported' | 'confirming' | 'repairing' | 'recheck' | 'comparing' | 'baseline' | 'candidate-a' | 'candidate-b' | 'applied' | 'restored' | 'verified';

const diagnosticReport = [
  taskStory.title + ' · ' + taskStory.incident,
  taskStory.diagnosis,
  '结论：四个异常不是同一个问题。Tool error 的第一根因是 Workflow 在辅助登记失败后撤销真实写入；耗时异常来自重复上下文与无效重试；Sub Agent 前台化来自错误的展示生命周期；Skill 测评则只看了 Worker 自我总结。',
  '',
  'Trace 证据：workspace_write receipt 已成功，rollback 发生在 documentSync owner；主 Session 等待前台 child，background 标记没有进入 projection；Reviewer SkillRef 已加载，但 Eval criteria 缺少 user_requirement、program_behavior 与 regression_tests。',
  '',
  '建议：保留真实 workspace mutation；documentSync 失败只记录一次。恢复 child=background 投影；Reviewer Skill 明确对照用户原话、需求文档、程序行为和测试证据，并增加同一 Case 的聚焦回归。修复需要用户授权。',
].join('\n');

const repairReport = [
  taskStory.repair,
  '已创建有界 Repair Session。',
  '1. 修改 documentSync owner：失败不再回滚真实产物。',
  '2. 修正 Sub Agent lifecycle projection：background 不进入前台工作区。',
  '3. 增加 Tool error、超时重试与 child visibility 聚焦测试。',
  '4. 更新 Reviewer Skill 的 Eval criteria，并冻结 SkillRef、Prompt 与测试 Case。',
  '5. 原版冻结回放为 5 / 12；候选 A 只修复一部分，保留 2 个失败分支。',
  '6. 当前仅为 applied + tested；测试通过不会自动应用候选或恢复原正文。',
].join('\n');

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
    const timer = window.setTimeout(() => {
      if (phase === 'comparing') setPhase('baseline');
    }, reducedMotion ? 60 : 720);
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
        <div><small>来自 PAW 工作台方案的合成执行记录</small><strong>Tool error · Workflow 事故</strong><p>{taskStory.incident}</p></div>
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
          {phase === 'recheck' ? <Button data-trace-action="recheck" leadingIcon={<GitCompareArrows size={14}/>} onClick={() => setPhase('comparing')} size="small" variant="primary">运行原版冻结回放</Button> : null}
        </section>
      ) : null}

      {['comparing', 'baseline', 'candidate-a', 'candidate-b', 'applied', 'restored', 'verified'].includes(phase) ? (
        <section className="trace-showcase-comparison" data-state={phase} data-trace-comparison="before-after">
          <header><GitCompareArrows size={16}/><div><strong>冻结 Case · 候选版本对比</strong><small>12 cases · synthetic fixture · 不代表真实执行</small></div><b>{phase === 'verified' ? '已验收 · 保留 B' : phase === 'applied' || phase === 'restored' ? 'B 已应用 · 原任务复验中' : phase === 'candidate-b' ? 'B · 12 / 12' : phase === 'candidate-a' ? 'A · 10 / 12' : '原版 · 5 / 12'}</b></header>
          <div aria-label="复检总览" className="trace-showcase-scorecard">
            <article data-tone="before"><small>原版冻结 · task_success</small><strong>5 / 12</strong><i><span style={{ transform: 'scaleX(.42)' }}/></i></article>
            <GitCompareArrows aria-hidden="true" size={18}/>
            <article data-tone="after"><small>{phase === 'candidate-a' ? '候选 A' : phase === 'candidate-b' || ['applied', 'restored', 'verified'].includes(phase) ? '候选 B' : '候选待运行'}</small><strong>{phase === 'candidate-a' ? '10 / 12' : ['candidate-b', 'applied', 'restored', 'verified'].includes(phase) ? '12 / 12' : '等待'}</strong><i><span style={{ transform: `scaleX(${phase === 'candidate-a' ? .83 : ['candidate-b', 'applied', 'restored', 'verified'].includes(phase) ? 1 : 0})` }}/></i></article>
            <dl><div><dt>原版回放</dt><dd>5 / 12 · 冻结</dd></div><div><dt>候选 A</dt><dd>{['candidate-a', 'candidate-b', 'applied', 'restored', 'verified'].includes(phase) ? '10 / 12 · 拒绝' : '待运行'}</dd></div><div><dt>候选 B</dt><dd>{['candidate-b', 'applied', 'restored', 'verified'].includes(phase) ? '12 / 12 · 已测' : '待运行'}</dd></div><div><dt>应用状态</dt><dd>{phase === 'verified' ? '已恢复 · 待用户验收' : phase === 'restored' ? 'B 已应用 · 原正文已恢复' : phase === 'applied' ? 'B 已应用 · 待原任务复验' : '未应用'}</dd></div></dl>
          </div>
          <div role="table" aria-label="Trace 修复前后对比">
            <div role="row"><b role="columnheader">检查项</b><b role="columnheader">Before</b><b role="columnheader">After</b><b role="columnheader">原始依据</b></div>
            {[
              ['Tool error', 'write succeeded → rollback', 'write kept · register pending', 'workspace_write → documentSync'],
              ['子 Agent', 'foreground · parent blocked', 'background · parent continues', 'child lifecycle events'],
              ['完成判据', '摘要称完成 · 文件 ENOENT', 'live file + digest + source chain', 'workspace_stat + file viewer'],
              ['版本选择', '原版仍生效', 'A rejected · B tested', 'candidate receipt + user approval'],
            ].map(([item, before, after, source], index) => <div role="row" key={item} style={{ '--comparison-row': index } as CSSProperties}><strong role="cell">{item}</strong><span role="cell">{before}</span><span className="trace-showcase-after" data-ready={phase === 'verified' || undefined} role="cell"><i aria-hidden={phase === 'verified'}>replaying…</i><b aria-hidden={phase !== 'verified'}>{after}</b></span><span role="cell"><button data-trace-action="open-evidence" disabled={phase !== 'verified'} onClick={() => setEvidence(source)} type="button">{phase === 'verified' ? source : '等待复检完成'}</button></span></div>)}
          </div>
          {phase === 'baseline' ? <div className="trace-showcase-actions"><p>原版冻结回放 5 / 12。现在运行候选 A；失败样本不会被改松。</p><Button data-trace-action="run-candidate-a" onClick={() => setPhase('candidate-a')} size="small" variant="primary">运行候选 A</Button></div> : null}
          {phase === 'candidate-a' ? <div className="trace-showcase-actions"><p>候选 A：10 / 12。unknown 回执与迟到代际仍失败，禁止应用。</p><Button data-trace-action="run-candidate-b" onClick={() => setPhase('candidate-b')} size="small" variant="primary">继续修复两个失败分支</Button></div> : null}
          {phase === 'candidate-b' ? <div className="trace-showcase-actions"><p>候选 B 在同一冻结条件下通过 12 / 12。测试完成不会改变原版状态。</p><Button data-trace-action="apply-candidate-b" onClick={() => setPhase('applied')} size="small" variant="primary">批准并应用候选 B</Button><Button data-trace-action="keep-original" onClick={() => setPhase('verified')} size="small" variant="quiet">保留原版</Button></div> : null}
          {phase === 'applied' ? <div className="trace-showcase-actions"><p>应用回执已返回。现在回原 Session，只有 revision 未变化且文件仍缺失时才恢复一次原正文。</p><Button data-trace-action="restore-original" onClick={() => setPhase('restored')} size="small" variant="primary">恢复原正文并对账登记</Button></div> : null}
          {phase === 'restored' ? <div className="trace-showcase-actions"><p>原正文已恢复，登记按原幂等键对账。请在原生文件卡与 Trace 前后对照中完成用户验收。</p><Button data-trace-action="finish-verification" onClick={() => setPhase('verified')} size="small" variant="primary">完成应用后复验</Button></div> : null}
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
