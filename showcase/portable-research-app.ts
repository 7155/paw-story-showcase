import { searchResearch, type LabConfig } from './guided-lab';

export type PortableResearchData = {
  title: string; version: number; corpusHash: string; documentCount: number;
  chunks: { id: string; sourceId: string; title: string; text: string; start: number }[];
  config: LabConfig; questions: string[];
  profile: {topK:number;candidateDepth:number;contextChars:number;threshold:number};
};

/** One search path for evaluation and the standalone App. */
export function searchWithResearchProfile(chunks:PortableResearchData['chunks'],question:string,profile:PortableResearchData['profile'],search:typeof searchResearch) {
  const candidates=search(chunks,question,{strategy:'fixed',size:900,overlap:120,normalize:true,topK:profile.candidateDepth,contextChars:60000,titleWeight:1,sourceCap:20,constraints:false,minTenure:90,useSignals:false,multiple:false,durableOnly:false,changes:false,merge:false});
  const maximum=Math.max(1,...candidates.map(hit=>hit.score));let remaining=profile.contextChars;
  return candidates.filter(hit=>hit.score/maximum>=profile.threshold).slice(0,profile.topK).flatMap(hit=>{
    if(remaining<=0)return [];
    const text=hit.text.slice(0,remaining);remaining-=text.length;
    return [{...hit,text,score:hit.score/maximum}];
  });
}

/** The exported App changes only the data/tool bridge. PAW renders the entire
 * conversation, composer, citations, report and recovery controls.
 */
export function createLocalResearchBridge(data: PortableResearchData, search: typeof searchResearch, retrieve: typeof searchWithResearchProfile) {
  type Record = { requestId: string; actionId: string; state: string; version: number; createdAtMs: number;
    input: { question: string }; result: { text: string; sources: object[] } };
  const storageKey = `paw.offline-research:${data.corpusHash}:v${data.version}`;
  let records: Record[] = [];
  try { records = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (!Array.isArray(records)) records = []; } catch { /* Opaque previews retain this tab's conversation. */ }
  return {
    models: async () => ({ selected: { provider: 'offline-showcase', model: '本地资料检索', thinkingLevel: 'off' }, catalog: { providers: [] } }),
    capabilities: { progress: false, cancel: false, sourceReader: true },
    readSource: async (locator:{sourceId:string;chunkId:string;snapshotSha256:string;offset?:number}) => {
      const chunks=data.chunks.filter(chunk=>chunk.sourceId===locator.sourceId).sort((a,b)=>a.start-b.start);
      const ordinal=chunks.findIndex(chunk=>chunk.id===locator.chunkId),offset=locator.offset ?? Math.max(0,ordinal-2);
      if(locator.snapshotSha256!==data.corpusHash || ordinal<0 || !Number.isSafeInteger(offset) || offset<0 || offset>=chunks.length) throw new Error('来源与此应用版本不匹配。');
      return {kind:'extracted_source' as const,source:{sourceId:locator.sourceId,title:chunks[0].title},citation:locator,
        chunks:chunks.slice(offset,offset+8).map((chunk,index)=>({chunkId:chunk.id,ordinal:offset+index,page:null,text:chunk.text,isCited:chunk.id===locator.chunkId})),
        offset,totalChunks:chunks.length,nextOffset:offset+8<chunks.length?offset+8:null,previousOffset:offset>0?Math.max(0,offset-8):null,originalUrl:null};
    },
    history: async () => records,
    invoke: async (_action: string, values: { question?: string }) => {
      const question = values.question?.trim(); if (!question) throw Object.assign(new Error('请输入研究问题。'), { state: 'rejected' });
      const hits = retrieve(data.chunks, question, data.profile, search);
      const sources = hits.map((hit, index) => ({ sourceId: hit.sourceId, title: hit.title, chunkId: hit.id,
        citationNumber: index + 1, text: hit.text,
        citation: { sourceId: hit.sourceId, chunkId: hit.id, snapshotSha256: data.corpusHash } }));
      const text = hits.length ? `找到 ${hits.length} 个相关片段，来自 ${new Set(hits.map(hit => hit.sourceId)).size} 份资料。以下为原文摘录。\n\n`
        + hits.map((hit, index) => `### ${hit.title}\n\n${hit.text}\n\n[${index + 1}]`).join('\n\n')
        + '\n\n当前应用执行离线关键词检索，未调用模型生成研究结论。'
        : '当前资料与检索配置没有找到匹配片段。请换用资料中的术语，或回到 Lab 调整资料和检索方案。';
      const result = { text, sources };
      records = [...records, { requestId: crypto.randomUUID(), actionId: 'research', state: 'completed', version: data.version,
        createdAtMs: Date.now(), input: { question }, result }];
      try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch { /* The current tab still owns the result. */ }
      return result;
    },
  };
}

export function portableResearchDocument(data: PortableResearchData, assets: { js: string; css: string }) {
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>研究资料助手</title><style>${assets.css}</style><style>
  html,body,#research-app{height:100%;margin:0}.paw-portable-app{--color-accent:#66548f;--color-accent-soft:#f0edf7;--color-focus:#806aad;--color-text:#272b36;--color-text-secondary:#747b88;--color-surface-hover:#f7f6fa;--color-border:#e6e5ed}.paw-portable-workspace[data-source-open=true]{grid-template-columns:minmax(0,1fr)}.paw-portable-workspace>.paw-source-reader{position:absolute;inset:12% auto auto 50%;transform:translateX(-50%);z-index:12;width:min(540px,calc(100% - 32px));max-height:76%;overflow:auto;background:var(--color-surface);border:1px solid var(--color-border);border-radius:14px;box-shadow:0 18px 80px #28223e30}
  </style></head><body><main id="research-app"></main><script>${assets.js.replace(/<\/script/gi, '<\\/script')}</script><script>
  const data=${serialized};window.pawApp=(${createLocalResearchBridge.toString()})(data,${searchResearch.toString()},${searchWithResearchProfile.toString()});
  window.pawAgentUI.mountConversation(document.getElementById('research-app'),{
    title:data.title,description:data.documentCount+' 份资料 · '+data.chunks.length+' 个片段 · 离线检索',
    welcome:'检索研究资料',suggestions:data.questions.slice(0,3),placeholder:'输入研究问题…',actionId:'research',questionField:'question',contextField:'conversation',
    footer:'使用本轮选定的资料和参数；回答展示原文摘录。点击引用核对片段，报告可以导出。'
  });
  </script></body></html>`;
}
