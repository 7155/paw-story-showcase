"use client";
import { useState } from 'react';
import { Download, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import type { LabKey } from '../../../showcase/lab-evidence';
import './vertical-apps.css';
import { ResearchReportDownloads } from './research-report-downloads';

const apps: { key: LabKey; title: string; count: string; path: string; description: string }[] = [
  { key: 'rag', title: '深度研究', count: '3 个主题 · 报告、追问与引用', path: 'deep-research', description: '发送示例问题，查看论文研究报告，再继续追问、点击引用或导出报告。这里回放论文项目的 4 条已保存回答。' },
  { key: 'cloudops', title: '云上故障诊断', count: '18 个告警 · 多重异常诊断', path: 'cloudops', description: '选择告警，读取异常信号和配置变化，定位责任组件；多个独立异常同时保留。应用使用前面实验中的资料和规则。' },
  { key: 'enterpriseops', title: '企业交付', count: '48 个客户 · 交接条件检查', path: 'enterpriseops', description: '选择客户，按地区、资格、容量和任期检查交接条件，查看允许或拒绝的具体依据。' },
  { key: 'memory', title: '记忆整理', count: '64 条输入 · 合并、纠正与撤销', path: 'memory', description: '选择输入记录，查看是否形成长期记忆，以及应当合并、纠正或撤销的来源。' },
];
export function VerticalApps({ embedded = false, initialScenario = 'rag' }: { embedded?: boolean; initialScenario?: LabKey }) {
  const [selected, setSelected] = useState(initialScenario), [epoch, setEpoch] = useState(0);
  const app = apps.find(item => item.key === selected) || apps[0];
  const source = `/real-apps/${app.path}/index.html`;
  return <section className={`vertical-apps ${embedded ? 'vertical-apps--embedded' : ''}`} aria-label="四个导出应用" id={embedded ? 'apps' : 'app-workspace'}>
    {!embedded && <header className="vertical-apps-heading"><a href="/#apps">← 返回演示总览</a><h1>应用交付</h1><p>打开、试用并下载实验后的应用。</p></header>}
    <nav className="vertical-app-tabs" aria-label="选择应用">{apps.map(item => <button type="button" key={item.key} aria-pressed={selected === item.key} onClick={() => { setSelected(item.key); setEpoch(0); if (!embedded) { const url = new URL(window.location.href); url.searchParams.set('scenario', item.key); window.history.replaceState({}, '', url); } }}><strong>{item.title}</strong><span>{item.count}</span></button>)}</nav>
    <p className="real-app-context">{app.description}</p>
    <div className="vertical-app-toolbar"><a href={`/lab?scenario=${app.key}`}>查看资料与优化过程</a><div>{app.key === 'rag' && <ResearchReportDownloads/>}<button onClick={() => { setEpoch(value => value + 1); }}><RotateCcw size={15}/>重新演示</button><a href={source} target="_blank" rel="noreferrer"><SquareArrowOutUpRight size={15}/>独立打开</a><a href={`/real-apps/${app.path}-app.zip`} download><Download size={15}/>下载应用</a></div></div>
    <iframe key={`${app.key}-${epoch}`} title={`${app.title}导出应用`} src={source} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups" loading="lazy"/>
  </section>;
}
