"use client";
import "./native-demo.css";
import { useEffect, useState, type RefObject } from 'react';
import { CheckCircle2, MousePointer2 } from 'lucide-react';

type Progress = { source: string; labels: string[]; instruction: string; step: number; total: number; complete: boolean; found: boolean };
export function HandsOnHint({ frame, source }: { frame: RefObject<HTMLIFrameElement | null>; source?: string }) {
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState<Progress>();
  useEffect(() => {
    if (!source) return;
    const url = new URL(source, window.location.href);
    const instance = url.searchParams.get('showcaseInstance');
    let visible = false;
    const sendControl = () => frame.current?.contentWindow?.postMessage({ channel: 'paw.hands-on-control', instanceId: instance, playing: playing && visible && !document.hidden }, url.origin);
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting === true && !frame.current?.closest('[hidden]'); sendControl(); }, { threshold: 0.15 });
    if (frame.current) observer.observe(frame.current);
    const timer = window.setInterval(sendControl, 500);
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (event.source !== frame.current?.contentWindow || event.origin !== url.origin || !data || data.channel !== 'paw.hands-on' || data.version !== 1 || data.instanceId !== instance) return;
      if (typeof data.instruction !== 'string' || !Number.isInteger(data.step) || !Number.isInteger(data.total) || data.step<1 || data.step>data.total || data.total>20) return;
      if (!Array.isArray(data.labels) || data.labels.length !== data.total || data.labels.some((label: unknown) => typeof label !== 'string' || label.length > 40)) return;
      setProgress({ source, labels: data.labels, instruction: data.instruction, step: data.step, total: data.total, complete: data.complete === true, found: data.found === true });
    };
    window.addEventListener('message', onMessage);
    return () => { clearInterval(timer); observer.disconnect(); frame.current?.contentWindow?.postMessage({ channel: 'paw.hands-on-control', instanceId: instance, playing: false }, url.origin); window.removeEventListener('message', onMessage); };
  }, [frame, source, playing]);
  const current = progress && progress.source === source && progress.labels ? progress : undefined;
  return <div className="hands-on-hint" aria-live="polite" aria-atomic="true">
    {current?.complete ? <CheckCircle2 size={20}/> : <MousePointer2 size={20}/>}<div>{current && <ol className="hands-on-path" aria-label="本页操作流程">{current.labels.map((label,index) => <li key={index} data-state={current.complete || index < current.step - 1 ? 'done' : index === current.step - 1 ? 'current' : 'next'} aria-current={!current.complete && index === current.step - 1 ? 'step' : undefined}>{label}</li>)}</ol>}<strong>{current ? current.complete ? '点击结果' : `第 ${current.step} / ${current.total} 步` : '自动点击演示'}</strong><p>{current?.instruction || '界面加载后，鼠标会自动按步骤操作。'}</p></div><button type="button" className="native-demo-reset" onClick={() => setPlaying(value => !value)}>{playing ? '暂停演示' : '继续演示'}</button>
  </div>;
}
