export type ResearchReplay = {
  title: string;
  corpus: { attempted: number; readable: number; failed: number };
  documents: { id: string; name: string; pages: number; status: 'ready' | 'failed' }[];
  topics: { id: string; title: string; turns: {
    id: string; question: string; answer: string; version: number; sourceCount: number; createdAtMs?: number;
    sources: { number: number; title: string; page: number | null; text: string; excerptSha256?: string }[];
    assistantUsage?: Record<string, unknown>;
    receipt: { totalTokens: number | null; estimatedCostUsd: number | null; elapsedMs: number | null; modelCalls: number | null };
  }[] }[];
};

/** Offline data adapter only. PAW's PortableConversation owns all conversation rendering. */
export function createResearchReplayBridge(replay: ResearchReplay) {
  const records = replay.topics.flatMap(topic => topic.turns.map((turn, index) => {
    const r = turn.receipt;
    return { requestId: turn.id, actionId: 'research', state: 'completed', version: turn.version, createdAtMs: turn.createdAtMs,
      input: { question: turn.question, conversation: JSON.stringify(topic.turns.slice(0, index).map(prior => ({ question: prior.question, answer: prior.answer }))) },
      result: { text: turn.answer,
        sources: turn.sources.map(source => ({ sourceId: source.title, title: source.title, originalFilename: source.title + '.pdf',
          chunkId: source.excerptSha256 || `${turn.id}-${source.number}`, citationNumber: source.number, text: source.text,
          citation: { sourceId: source.title, chunkId: source.excerptSha256 || `${turn.id}-${source.number}`, snapshotSha256: source.excerptSha256 || turn.id, page: source.page } })),
        assistantUsage: turn.assistantUsage || { calls: 1, totalTokens: r.totalTokens, totalTokensComplete: r.totalTokens !== null,
          estimatedCostUsd: r.estimatedCostUsd, estimateComplete: r.estimatedCostUsd !== null, costComplete: false,
          elapsedMs: r.elapsedMs, elapsedMsComplete: r.elapsedMs !== null, elapsedComplete: r.elapsedMs !== null,
          modelCallCount: r.modelCalls, modelCallCountComplete: r.modelCalls !== null },
      } };
  }));
  return {
    models: async () => ({ selected: { provider: 'offline', model: '已保存回答', thinkingLevel: 'off' }, catalog: { providers: [] } }),
    capabilities: { progress: false, cancel: false, sourceReader: false, reportExport: typeof window === 'undefined' || window.parent === window },
    history: async () => records,
    downloadReport: (turn: { question: string; output: string }) => {
      if (!['http:', 'https:'].includes(window.location.protocol)) return false;
      const topic = replay.topics.find(topic => topic.title === turn.question);
      const record = records.find(record => record.result.text === turn.output
        && (record.input.question === turn.question || record.requestId === topic?.turns[0].id));
      if (!record || !/^[a-z0-9-]+$/.test(record.requestId)) return false;
      const link = document.createElement('a');
      link.href = new URL(`./reports/${record.requestId}.md`, window.location.href).href;
      link.download = `${record.requestId}-report.md`;
      document.body.appendChild(link); link.click(); link.remove();
      return true;
    },
    invoke: async (_action: string, values: { question?: string }) => {
      const question = values.question?.trim();
      const topic = replay.topics.find(topic => topic.title === question);
      const record = records.find(record => record.input.question === question || record.requestId === topic?.turns[0].id);
      if (!record) throw Object.assign(new Error('离线包只收录已保存的研究回答。请从示例问题或最近对话中选择；新问题需要在 PAW Runtime 中运行。'), { state: 'rejected' });
      return record.result;
    },
  };
}

export function researchConversationDocument(replay: ResearchReplay, assets: { js: string; css: string }) {
  const data = JSON.stringify(replay).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>极地深度研究</title><style>${assets.css}</style><style>
  html,body,#research-app{height:100%;margin:0}.paw-portable-app{--color-accent:#66548f;--color-accent-soft:#f0edf7;--color-focus:#806aad;--color-text:#272b36;--color-text-secondary:#747b88;--color-surface-hover:#f7f6fa;--color-border:#e6e5ed}.paw-portable-composer-dock .agent-composer{border-radius:20px}.paw-portable-workspace[data-source-open=true]{grid-template-columns:minmax(0,1fr)}.paw-portable-workspace>.paw-source-reader{position:absolute;inset:12% auto auto 50%;transform:translateX(-50%);z-index:12;width:min(540px,calc(100% - 32px));max-height:76%;overflow:auto;background:var(--color-surface);border:1px solid var(--color-border);border-radius:14px;box-shadow:0 18px 80px #28223e30}.paw-portable-footer{padding-inline:8px}.paw-portable-header{padding-block:14px}
  </style></head><body><main id="research-app"></main><script>${assets.js.replace(/<\/script/gi, '<\\/script')}</script><script>
  const replay=${data};window.pawApp=(${createResearchReplayBridge.toString()})(replay);
  window.pawAgentUI.mountConversation(document.getElementById('research-app'),{
    title:'极地深度研究',description:'211 份论文项目 · 4 条已保存回答 · 离线回放',welcome:'你想研究什么？',
    suggestions:replay.topics.map(topic=>topic.title),placeholder:'选择示例问题，或继续已保存的追问…',
    actionId:'research',questionField:'question',contextField:'conversation',
    footer:window.parent===window?'已保存回答；从最近对话查看报告与追问。点击引用核对片段，报告可导出。':'已保存回答；从最近对话查看追问。报告可从页面上方下载。'
  });
  </script></body></html>`;
}
