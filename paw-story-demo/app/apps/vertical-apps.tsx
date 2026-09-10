"use client";
import { useState } from 'react';
import { RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import './vertical-apps.css';
import { ResearchReportDownloads } from './research-report-downloads';


export type AppKey = 'rag' | 'support' | 'wix' | 'enterprise-rag' | 'geo';
const apps: {key:AppKey;path:string;title:string;count:string;description:string}[] = [
 {key:'rag',path:'deep-research',title:'深度研究',count:'研究对话 · 报告与引用',description:'打开实际研究应用的对话、追问、引用与报告界面，展示已保存的论文研究记录。'},
 {key:'support',path:'support',title:'松果售后助手',count:'原应用 v11',description:'原始售后应用前端，展示已完成的咨询记录。'},
 {key:'wix',path:'wix',title:'Wix 知识助手',count:'原应用 v4',description:'原始知识应用前端，保留来源检索与回答失败记录。'},
 {key:'enterprise-rag',path:'enterprise-rag',title:'EnterpriseRAG 实验台',count:'资料浏览 · 查询与评测',description:'原始实验查看器，浏览合成企业资料、公开查询和历史评测结果。'},
 {key:'geo',path:'geo',title:'地理研判台',count:'地图 · 图层 · 任务与成果',description:'原始 Geo 工作台前端，查看地图、方案、历史任务和已有成果。'},
];
export function VerticalApps({ embedded = false, initialScenario = 'rag' }: { embedded?: boolean; initialScenario?: AppKey }) {
  const [selected, setSelected] = useState(initialScenario), [epoch, setEpoch] = useState(0);
  const app = apps.find(item => item.key === selected) || apps[0];
  const source = `/real-apps/${app.path}/index.html`;
  return <section className={`vertical-apps ${embedded ? 'vertical-apps--embedded' : ''}`} aria-label="真实应用前端" id={embedded ? 'apps' : 'app-workspace'}>
    {!embedded && <header className="vertical-apps-heading"><a href="/#apps">← 返回演示总览</a><h1>应用交付</h1><p>打开交付版本，用示例问题试用真实 PAW 应用界面。</p></header>}
    <nav className="vertical-app-tabs" aria-label="选择应用">{apps.map(item => <button type="button" key={item.key} aria-pressed={selected === item.key} onClick={() => { setSelected(item.key); setEpoch(0); if (!embedded) { const url = new URL(window.location.href); url.searchParams.set('scenario', item.key); window.history.replaceState({}, '', url); } }}><strong>{item.title}</strong><span>{item.count}</span></button>)}</nav>
    <p className="real-app-context">{app.description}</p>
    <div className="vertical-app-toolbar"><span>原应用界面与保存记录 · 不发起新的模型或生产任务</span><div>{app.key === 'rag' && <ResearchReportDownloads/>}<button onClick={() => { setEpoch(value => value + 1); }}><RotateCcw size={15}/>重新演示</button><a href={source} target="_blank" rel="noreferrer"><SquareArrowOutUpRight size={15}/>独立打开</a></div></div>
    <iframe key={`${app.key}-${epoch}`} title={`${app.title}导出应用`} src={source} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups" loading="lazy"/>
  </section>;
}
