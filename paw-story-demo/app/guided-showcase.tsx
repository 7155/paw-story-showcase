"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode, type MouseEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { ShowcaseDirectory, showcaseChapters } from './showcase-directory';
import './guided-showcase.css';

function subscribe(listener: () => void) { window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }
function snapshot() {
  const id = window.location.hash.slice(1);
  if (['framework', 'resume', 'story-route'].includes(id)) return 'framework-overview';
  return showcaseChapters.some(item => item.id === id) ? id : 'agents';
}
const serverSnapshot = () => 'agents';
function navigateTo(id: string) {
  window.history.pushState(null, '', `#${id}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  requestAnimationFrame(() => document.querySelector('.guided-workspace')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
}
export function navigateGuidedChapter(event: MouseEvent<HTMLElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element).closest('a[href^="#"]');
  const id = anchor?.getAttribute('href')?.slice(1);
  if (!id || !showcaseChapters.some(item => item.id === id)) return;
  event.preventDefault();
  navigateTo(id);
}


export function GuidedShowcase({ panels }: { panels: Record<string, ReactNode> }) {
  const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const position = showcaseChapters.findIndex(item => item.id === current);
  const chapter = showcaseChapters[position];
  const workspace = useRef<HTMLDivElement>(null);
  const previous = useRef(current);
  useEffect(() => {
    if (previous.current === current) return;
    previous.current = current;
    const frame = requestAnimationFrame(() => workspace.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    return () => cancelAnimationFrame(frame);
  }, [current]);
  return <>
    <header className="guided-intro"><h1>从协作，到可交付的结果。</h1><p>选一个阶段，直接动手体验。</p></header>
    <div className="guided-workspace" ref={workspace}>
      <aside className="guided-rail"><h2>体验路线</h2><ShowcaseDirectory current={current}/><p>真实前端 · 公开合成数据</p></aside>
      <label className="guided-mobile-nav">选择演示<select value={current} onChange={event => { navigateTo(event.target.value); }}>{showcaseChapters.map(item => <option key={item.id} value={item.id}>{item.title} · {item.action}</option>)}</select></label>
      <div className="guided-stage">
        <header className="guided-stage-heading"><div><h2>{chapter.action}</h2><p>{chapter.hint}</p></div><a href={chapter.href}>查看详情<ArrowUpRight size={17}/></a></header>
        <div className="guided-panels">{showcaseChapters.map(item => <div className="guided-panel" key={item.id} hidden={current !== item.id} aria-label={`${item.title}演示`}>{panels[item.id]}</div>)}</div>
        <nav className="guided-next" aria-label="继续体验"><span>{position + 1} / {showcaseChapters.length}</span><div>{position>0 && <a href={`#${showcaseChapters[position-1].id}`}><ArrowLeft size={16}/>上一步</a>}{position<showcaseChapters.length-1 ? <a className="guided-next-primary" href={`#${showcaseChapters[position+1].id}`}>下一步：{showcaseChapters[position+1].title}<ArrowRight size={17}/></a> : <a className="guided-next-primary" href="#agents">回到协作<ArrowRight size={17}/></a>}</div></nav>
      </div>
    </div>
  </>;
}
