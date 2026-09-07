"use client";
import { useRef, useState } from 'react';
import { Download, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import { HandsOnHint } from '../hands-on-hint';
import './vertical-apps.css';

const apps = [
  { key:'support', title:'松果售后助手', count:'原版 v11 · 已完成咨询', path:'/real-apps/support/index.html', description:'实际候选 App 的原版界面与已保存咨询。打开最近咨询可恢复原问题、规则依据和建议；公开页不调用新模型。' },
  { key:'wix', title:'Wix 知识助手', count:'原版 v4 · 检索与失败记录', path:'/real-apps/wix/index.html', description:'实际候选 App 的原版界面与调用记录。保留成功检索的原始来源和未完成的回答状态，不补造答案。' },
  { key:'rag', title:'EnterpriseRAG 实验台', count:'5,101 份实验文档 · 原版 Viewer', path:'/real-apps/enterprise-rag/index.html', description:'原实验的语料、问题与检索结果。EnterpriseRAG-Bench 本身为模拟企业数据；这里保留实际实验输入，验证集标签与留出集继续隐藏。' },
  { key:'geo', title:'地理研判台', count:'2 个研判计划 · 5 个历史任务', path:'/real-apps/geo/index.html', description:'原版 ScoutPi 地图工作台，读取 v11 已完成的空间计算、结论和原始产物。底图可联网加载；没有启动新的 Earth Engine 计算。' },
] as const;
export function VerticalApps({ embedded = false }: { embedded?: boolean }) {
 const [selected,setSelected]=useState(0),[epoch,setEpoch]=useState(0);
 const frame=useRef<HTMLIFrameElement>(null), app=apps[selected];
 const instance=`real-${app.key}-${epoch}`,source=`${app.path}?showcaseInstance=${instance}&embedded=1`;
 return <section className={`vertical-apps ${embedded?'vertical-apps--embedded':''}`} aria-label="真实应用与实验界面" id={embedded?'apps':'app-workspace'}>
  {!embedded&&<header className="vertical-apps-heading"><a href="/#apps">← 返回演示总览</a><h1>原版界面，真实实验记录。</h1><p>在已有应用中查看原始数据、计算结果与来源。</p></header>}
  <nav className="vertical-app-tabs" aria-label="选择真实应用">{apps.map((item,i)=><button type="button" key={item.key} aria-pressed={selected===i} onClick={()=>{setSelected(i);setEpoch(0);}}><strong>{item.title}</strong><span>{item.count}</span></button>)}</nav>
  <p className="real-app-context">{app.description}</p>
  <div className="vertical-app-toolbar"><HandsOnHint frame={frame} source={source}/><div><button onClick={()=>setEpoch(v=>v+1)}><RotateCcw size={15}/>重新演示</button><a href={source} target="_blank" rel="noreferrer"><SquareArrowOutUpRight size={15}/>打开原版界面</a><a href={`/real-apps/${app.key==='rag'?'enterprise-rag':app.key}-historical-app.zip`} download><Download size={15}/>下载回放 App</a></div></div>
  <iframe key={instance} ref={frame} title={app.title} src={source} sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups" loading="lazy"/>
 </section>;
}
