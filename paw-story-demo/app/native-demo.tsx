"use client";
import "./native-demo.css";
import { useRef, useState, useSyncExternalStore } from 'react';
import { HandsOnHint } from "./hands-on-hint";
import { SquareArrowOutUpRight } from 'lucide-react';
const subscribe = () => () => {};
const browserReady = () => true;
const serverReady = () => false;
export function NativeDemo({ id, route, title }: { id: string; route: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [epoch, setEpoch] = useState(0);
  const ready = useSyncExternalStore(subscribe, browserReady, serverReady);
  const [loaded, setLoaded] = useState(false);
  const query = `?controlTransport=mock&frontend=paw-os&showcase=hands-on-${id}&showcaseInstance=hands-on-${id}-${epoch}#${route}`;
  const local = process.env.NODE_ENV !== 'production' && ready && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const source = ready ? local ? `${window.location.protocol}//${window.location.hostname}:5174/${query}` : `/pawos/index.html${query}` : undefined;
  return <section id={id} className="native-demo" aria-label={title}>
    <div className="native-demo-bar"><HandsOnHint frame={frame} source={source}/><button className="native-demo-reset" onClick={() => { setLoaded(false); setEpoch(value => value + 1); }}>重新开始</button>{source && <a href={source} target="_blank" rel="noreferrer">全屏操作<SquareArrowOutUpRight size={16}/></a>}</div>
    <div className="native-demo-frame" data-loaded={loaded || undefined}>
      {!loaded && <p role="status">正在打开 PAW 工作区…</p>}
      <iframe key={epoch} ref={frame} title={title} src={source} loading="lazy" onLoad={() => { if (source) setLoaded(true); }} allow="clipboard-read; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-downloads"/>
    </div>
    <p className="native-demo-boundary">真实 PAW 前端 · 公开合成数据 · 操作不连接私有 Runtime</p>
  </section>;
}
