"use client";

import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { NativeDemo } from '../native-demo';
import { PawMark } from '../ui-shared';
import type { PresentationDeck, PresentationSlide, PresentationVisual } from './presentation-types';
import { readingArticles, type ReadingExample } from './detail-reading-content';
import './presentation.css';

const subjects = [
  ['agents','协作架构'],['sandbox','评测优化'],['context','记忆与检索'],['input','模型与推理'],['frontend','前端演进'],
] as const;

export function PresentationShell({ deck, children }: { deck: PresentationDeck; children: ReactNode }) {
  const [appendix,setAppendix]=useState(false);
  const article=readingArticles[deck.id];
  const sections=deck.slides.filter(section=>section.visual.kind!=='native');
  const native=deck.slides.find(section=>section.visual.kind==='native');
  return <main className="technical-detail-page" data-deck={deck.id}>
    <header className="detail-top">
      <a className="detail-brand" href="/"><PawMark/><span>PAW</span></a>
      <nav aria-label="技术专题">{subjects.map(([id,label])=><a key={id} href={`/details/${id}`} aria-current={deck.id===id?'page':undefined}>{label}</a>)}</nav>
      {native&&<a className="detail-workspace-link" href={`#${native.id}`}>打开工作区<ArrowRight size={16}/></a>}
    </header>
    {native&&native.visual.kind==='native'&&<>
      <div className="detail-workspace-intro"><h2>{native.title}</h2><p>{article.sections[native.id]?.explanation.join(' ')}</p></div>
      <section className="detail-native-stage" id={native.id} aria-label={native.title}>
        <NativeDemo id={native.visual.id} route={native.visual.route} title={native.visual.title} fillViewport backHref="#technical-detail"/>
      </section>
    </>}
    <div className="detail-reading-layout">
      <aside className="detail-outline" aria-label="本页目录">
        <a href="/"><ArrowLeft size={15}/>返回主线</a>
        <nav>{sections.map(section=><a key={section.id} href={`#${section.id}`}>{section.title}</a>)}{native&&<a href={`#${native.id}`}>{native.title}<ArrowRight size={14}/></a>}</nav>
      </aside>
      <article className="detail-article" aria-label="技术说明">
        <header className="detail-introduction" id="technical-detail">
          <h1>{article.title}</h1><p>{article.introduction}</p>
        </header>
        <ReadingExampleBlock example={article.example} lead/>
        {sections.map(section=>{
          const reading=article.sections[section.id];
          return <section className="detail-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            <div className="detail-prose">{reading?.explanation.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</div>
            <SlideVisual visual={section.visual}/>
            {reading?.example&&<ReadingExampleBlock example={reading.example}/>}
            <SlideEvidence slide={section}/>
          </section>;
        })}
        <section className="detail-appendix">
          <button type="button" aria-expanded={appendix} onClick={()=>setAppendix(value=>!value)}><BookOpen size={17}/>完整历史记录<ChevronDown size={17}/></button>
          <div className="presentation-appendix-body" hidden={!appendix}>{children}</div>
        </section>
      </article>
    </div>

  </main>;
}

function ReadingExampleBlock({example,lead=false}:{example:ReadingExample;lead?:boolean}){
  const Heading=lead?'h2':'h3';
  return <section className={lead?'detail-example detail-example--lead':'detail-example'} aria-label="具体示例"><Heading>{example.title}</Heading>{example.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</section>;
}

function SlideEvidence({slide}:{slide:PresentationSlide}){
  return <details className="presentation-evidence"><summary>实现细节与来源<span>{slide.sources.length} 份依据</span></summary><div>
    {slide.notes.length>0&&<ul>{slide.notes.map(note=><li key={note}>{note}</li>)}</ul>}
    <nav aria-label="本页来源">{slide.sources.map((source,i)=><a key={`${source.href}:${i}`} href={source.href} target="_blank" rel="noreferrer">{source.label}<ArrowRight size={14}/></a>)}</nav>
  </div></details>;
}

function SlideVisual({visual}:{visual:PresentationVisual}){
  if(visual.kind==='native')return <div className="presentation-native"><NativeDemo id={visual.id} route={visual.route} title={visual.title}/></div>;
  if(visual.kind==='ranking')return <RankingMeasure/>;
  if(visual.kind==='contrast')return <figure className="presentation-contrast"><div>{[visual.before,visual.after].map((side,index)=><section key={side.label} data-side={index===0?'before':'after'}><h3>{side.label}</h3><ul>{side.lines.map(line=><li key={line}>{line}</li>)}</ul></section>)}</div>{visual.caption&&<figcaption>{visual.caption}</figcaption>}</figure>;
  if(visual.kind==='metrics')return <figure className="presentation-metrics"><div className="presentation-table" role="table" aria-label="结果对比"><div role="row" className="presentation-table-head"><span role="columnheader">指标 / 条件</span><span role="columnheader">{visual.beforeLabel||'基线 / 输入'}</span><span role="columnheader">{visual.afterLabel||'候选 / 结果'}</span></div>{visual.rows.map(row=><div role="row" key={row.label}><div role="rowheader"><strong>{row.label}</strong><small>{row.note}</small></div><span role="cell" data-label={visual.beforeLabel||'基线 / 输入'}>{row.before}</span><strong role="cell" data-label={visual.afterLabel||'候选 / 结果'}>{row.after}</strong></div>)}</div>{visual.caption&&<figcaption>{visual.caption}</figcaption>}</figure>;
  return <figure className={`presentation-diagram presentation-diagram--${visual.kind}`}><ol>{visual.nodes.map((node,i)=><li key={node.label}><span className="presentation-node-order">{String(i+1).padStart(2,'0')}</span><div><strong>{node.label}</strong><p>{node.detail}</p></div>{i<visual.nodes.length-1&&<ArrowRight aria-hidden="true" className="presentation-edge" size={24}/>}</li>)}</ol>{visual.caption&&<figcaption>{visual.caption}</figcaption>}</figure>;
}

function RankingMeasure(){
  const [ranks,setRanks]=useState([false,true,false,true,false]);
  const [k,setK]=useState(3);
  const relevant=3;
  const hits=ranks.slice(0,k).filter(Boolean).length;
  const first=ranks.slice(0,k).findIndex(Boolean);
  const gain=ranks.slice(0,k).reduce((sum,hit,i)=>sum+(hit?1/Math.log2(i+2):0),0);
  const ideal=Array.from({length:Math.min(relevant,k)},(_,i)=>1/Math.log2(i+2)).reduce((a,b)=>a+b,0);
  return <figure className="presentation-ranking">
    <div className="ranking-toolbar"><span>计算示例 · 相关资料共 3 份</span><label>Top K <select aria-label="检索结果数量" value={k} onChange={event=>setK(Number(event.target.value))}>{[1,2,3,4,5].map(value=><option key={value}>{value}</option>)}</select></label></div>
    <ol aria-label="示例检索排序">{ranks.map((hit,i)=><li key={i} data-included={i<k}><button type="button" aria-label={`第${i+1}位${hit?'相关':'不相关'}`} aria-pressed={hit} disabled={!hit&&ranks.filter(Boolean).length>=relevant} onClick={()=>setRanks(values=>values.map((value,j)=>i===j?!value:value))}><span>{i+1}</span><strong>{hit?'相关资料':'无关资料'}</strong><small>{i<k?'进入上下文':'未取回'}</small></button></li>)}</ol>
    <dl><div><dt>Precision@{k}</dt><dd>{hits}/{k}</dd><small>返回结果中相关的比例</small></div><div><dt>Recall@{k}</dt><dd>{hits}/{relevant}</dd><small>全部相关资料中取回的比例</small></div><div><dt>RR@{k}</dt><dd>{first<0?'0':`1/${first+1}`}</dd><small>第一条相关结果的名次倒数</small></div><div><dt>nDCG@{k}</dt><dd>{(gain/ideal).toFixed(3)}</dd><small>位置折损后 / 理想排序</small></div></dl>
    <figcaption>单问题计算示例；MRR 是多问题 RR 的平均值。非 PAW 实验结果。</figcaption>
  </figure>;
}
