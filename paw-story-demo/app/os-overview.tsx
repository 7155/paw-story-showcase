"use client";
import {useEffect,useState} from 'react';
import {NativeDemo} from './native-demo';
const features=[['桌面','/','打开应用、切换窗口与工作区'],['Agent','/agent','持续对话、工具执行与任务记录'],['Room','/agent','按需协作与伙伴交付'],['Trace','/trace-agent','查看执行轨迹与改进依据'],['Lab','/eval-lab','整理材料、比较实验与准备成果'],['记忆','/memory','查看长期记忆及其来源'],['应用','/plugins','管理已交付的应用']] as const;
export function OSOverview(){
 const [local,setLocal]=useState(false),[selected,setSelected]=useState(0);
 useEffect(()=>setLocal(['localhost','127.0.0.1'].includes(location.hostname)),[]);
 return <section id="os" aria-label="PAW OS 主要功能导览">
  <nav className="os-feature-tour" aria-label="OS 功能导览">{features.map(([name,route,hint],i)=><button key={name} aria-pressed={selected===i} onClick={()=>setSelected(i)}><strong>{name}</strong><small>{hint}</small></button>)}</nav>
  {local?<div className="os-local-entry"><h3>PAW 工作区模拟演示</h3><p>这里展示公开合成数据，用来说明桌面、Agent、Room 与工具之间的关系；它不是正式产品页面，也不会读取你的真实账号数据。</p><p className="os-local-unavailable">本机 PAW 服务未启动，当前仅展示 OShow 模拟内容。</p></div>:<NativeDemo key={selected} id="os-desktop" route={features[selected][1]} title="PAW OS 界面模拟 · 公开合成数据"/>}
 </section>;
}
