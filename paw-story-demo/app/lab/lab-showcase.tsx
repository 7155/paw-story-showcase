"use client";

import { ArrowLeft, ArrowRight, FlaskConical, SquareArrowOutUpRight } from 'lucide-react';
import { useRef, useState, useSyncExternalStore } from 'react';
import { currentLabExperiment, type LabKey } from '../lab-evidence';
import { labDemoProjectId } from '../../../showcase/lab-demo';
import { CurrentExperimentPanel } from '../details/sandbox/sandbox-lab';
import { guidedScenarios } from '../../../showcase/guided-lab';
import { PawMark } from '../ui-shared';
import './lab-showcase.css';

const subscribe = () => () => {};
const browserReady = () => true;
const serverReady = () => false;

export function LabShowcase({ scenario: initialScenario, embedded = false }: { scenario: LabKey; embedded?: boolean }) {
  const [selection, setSelection] = useState<LabKey>(initialScenario);
  const scenario = embedded ? selection : initialScenario;
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h2" : "h1";
  const Evidence = embedded ? "details" : "section";
  const frame = useRef<HTMLIFrameElement>(null);
  const experiment = currentLabExperiment(scenario);
  const demo = guidedScenarios.find(item=>item.key===scenario)!;
  const ready = useSyncExternalStore(subscribe, browserReady, serverReady);
  const [loadedSource, setLoadedSource] = useState('');
  const route = `/eval-lab?project=${labDemoProjectId(scenario)}&projectPage=${scenario==='rag'?'journey':'materials'}&step=materials`;
  const query = `?controlTransport=mock&frontend=paw-os&showcase=context-lab-projects&showcaseInstance=lab-${scenario}#${route}`;
  const local = process.env.NODE_ENV !== 'production' && ready && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const source = ready ? (local ? `http://127.0.0.1:5174/${query}` : `/pawos/index.html${query}`) : '';

  return <Container className={`lab-showcase${embedded ? " lab-showcase--embedded" : ""}`} id={embedded ? "lab" : "top"}>
    {!embedded && <header className="lab-showcase-nav"><div>
      <a className="lab-showcase-brand" href="/#lab"><PawMark/><strong>PAW</strong><span>Agent Lab</span></a>
      <nav aria-label="Lab 页面导航"><a href="/#lab"><ArrowLeft size={14}/>返回总览</a><a href={`/details/sandbox?scenario=${scenario}`}>历史实验与技术详情<ArrowRight size={14}/></a></nav>
    </div></header>}

    <section className="lab-showcase-intro" aria-labelledby="lab-title">
      <div><span className="lab-showcase-eyebrow"><FlaskConical size={14}/> AGENT LAB / VERTICAL SCENARIOS</span><Heading id="lab-title">应用实验室</Heading></div>
      <p>{embedded ? "资料与基线 → 比较实验 → 应用交付" : <>选资料、设基线，逐题比较候选。<br/>按本轮结果选择参数，下载可离线使用的应用。</>}</p>
    </section>

    <div className="lab-showcase-content">
      <nav className="lab-scenario-nav" aria-label="选择 Lab 垂直场景">
        {guidedScenarios.map((item, index) => <a key={item.key} href={embedded ? "#lab" : `/lab?scenario=${item.key}`} onClick={embedded ? (event) => { event.preventDefault(); setSelection(item.key); } : undefined} aria-current={scenario === item.key ? 'page' : undefined}>
          <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>{item.files}</small></div><ArrowRight size={15}/>
        </a>)}
      </nav>

      {embedded && <a className="lab-detail-entry" href={`/lab?scenario=${scenario}`}>查看 {demo.title} 完整演示详情<ArrowRight size={16}/></a>}
      <section className="lab-live-workspace" aria-labelledby="lab-workspace-title">
        <header><div><h2 id="lab-workspace-title">{demo.title}</h2>{!embedded && <p>{demo.goal}</p>}</div>{source && <a href={source} target="_blank" rel="noreferrer">全屏操作 Lab<SquareArrowOutUpRight size={14}/></a>}</header>
        <div className="lab-live-frame" data-loaded={Boolean(source) && loadedSource === source || undefined}>
          <div className="lab-live-loading" role="status">正在打开 PAW Lab 项目…</div>
          <iframe ref={frame} key={scenario} src={source || undefined} loading={embedded ? "lazy" : "eager"} title={`${demo.title} · 真实 PAW Lab 项目工作区`}
            onLoad={() => { if (source) setLoadedSource(source); }} allow="clipboard-read; clipboard-write"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-downloads"/>
        </div>
        <footer>{!embedded && <p><strong>从第一步开始</strong>导入资料 → 设计基线 → 设定目标 → 比较候选 → 试用与导出应用。</p>}<span>真实 Lab 前端 · 本轮执行离线规则 · 不启动新模型运行</span></footer>
      </section>

      <Evidence className="lab-public-results current-lab" aria-labelledby="lab-results-title">
        {embedded && <summary>查看 {experiment.label} 历史实验依据</summary>}
        <header className="lab-results-heading"><div><span className="lab-showcase-eyebrow">PUBLIC EXPERIMENT / 2026-09-05</span><h2 id="lab-results-title">历史实验记录</h2></div><p>下面读取固定的公开实验快照，<br/>工作区里的演示编辑不会改变这些结果。</p></header>
        <details className="lab-historical-evidence"><summary>展开 {experiment.label} 的历史候选与模型实验结果</summary><CurrentExperimentPanel experiment={experiment}/></details>
        <a className="lab-history-link" href={`/details/sandbox?scenario=${scenario}`}>继续看 {experiment.label} 的历史失败、诊断与候选演进<ArrowRight size={16}/></a>
      </Evidence>
    </div>
    {!embedded && <footer className="lab-showcase-footer"><span>PAW Agent Lab · 任务、候选与证据</span><a href="/#lab">返回总览<ArrowRight size={14}/></a></footer>}
  </Container>;
}
