"use client";
import { useMemo, useRef, useState } from 'react';
import { Download, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import { verticalAppDocument, verticalAppNames } from '../../showcase-vertical';
import { labFlowSamples, evaluateLabDemo } from '../../../showcase/lab-flow';
import { storedZip } from '../../../showcase/zip';
import type { LabKey } from '../../../showcase/lab-evidence';
import { HandsOnHint } from '../hands-on-hint';
import './vertical-apps.css';

const keys: LabKey[] = ['enterpriseops', 'rag', 'cloudops', 'memory'];
export function VerticalApps({ embedded = false }: { embedded?: boolean }) {
  const [selected, setSelected] = useState<LabKey>('enterpriseops');
  const [epoch, setEpoch] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const instanceId = `vertical-${selected}-${epoch}`;
  const dataset = labFlowSamples[selected];
  const { html, report } = useMemo(() => {
    const data = labFlowSamples[selected]; const report = evaluateLabDemo(selected, data, 'bounded');
    return { report, html: verticalAppDocument(selected, data, 'bounded', report, `vertical-${selected}-${epoch}`) };
  }, [selected, epoch]);
  const download = () => {
    const files = { 'index.html': html, 'data.json': JSON.stringify(dataset, null, 2), 'evaluation.json': JSON.stringify(report, null, 2),
      'README.md': `# ${verticalAppNames[selected].title}\n\n解压后打开 index.html，即可使用本地应用。无需依赖、Key 或生产服务。输入与工作记录仅保存在当前浏览器；页面内可导出工作记录。\n\n来源字段区分公开设计摘要与人工合成样例。本地规则检查不是模型能力或生产运行证明。\n` };
    const bytes = storedZip(files); const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
    const link = document.createElement('a'); link.href = url; link.download = `paw-${selected}-app.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const open = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  return <section className={`vertical-apps ${embedded ? 'vertical-apps--embedded' : ''}`} aria-label="四个独立垂直应用" id={embedded ? 'apps' : 'app-workspace'}>
    {!embedded && <header className="vertical-apps-heading"><a href="/#apps">← 返回演示总览</a><h1>四个场景，四个可操作的 App。</h1><p>打开即可使用；与 Lab 生成的应用共用同一份源码和数据。</p></header>}
    <nav className="vertical-app-tabs" aria-label="选择垂直应用">{keys.map(key => <button type="button" key={key} aria-pressed={selected === key} onClick={() => { setSelected(key); setEpoch(0); }}><strong>{verticalAppNames[key].title}</strong><span>{labFlowSamples[key].records.length} 条记录</span></button>)}</nav>
    <div className="vertical-app-toolbar"><HandsOnHint frame={frame} source={`/apps?showcaseInstance=${encodeURIComponent(instanceId)}`} opaque/>
      <div><button onClick={() => setEpoch(value => value+1)}><RotateCcw size={15}/>重新演示</button><button onClick={open}><SquareArrowOutUpRight size={15}/>打开 App</button><button onClick={download}><Download size={15}/>下载 App</button></div>
    </div>
    <iframe key={instanceId} ref={frame} title={verticalAppNames[selected].title} srcDoc={html} sandbox="allow-scripts allow-forms allow-downloads" loading="lazy"/>
  </section>;
}
