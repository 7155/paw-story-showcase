import {
  currentLabExperiments,
  currentLabEvidenceHref,
  labBenefitBoundary,
  type CurrentLabExperiment,
} from '../../../showcase/lab-evidence';
import { evaluateLabDemo, labFlowSamples } from '../../../showcase/lab-flow';
import { evaluateRepairSuite } from '../../../showcase/optimization';
import retrieval from '../../public/evidence/vertical-evals/enterprise-rag-validation-20260831.v1.json';
import type { PresentationDeck, PresentationSource } from './presentation-types';

const currentSource: PresentationSource = {
  label: '当前四场景评测回执 · 2026-09-05',
  href: currentLabEvidenceHref,
};
const retrievalSource: PresentationSource = {
  label: '独立检索评测 · 16 Query Validation',
  href: '/evidence/vertical-evals/enterprise-rag-validation-20260831.v1.json',
};
const rag = currentLabExperiments.find(experiment => experiment.key === 'rag')!;
const score = (value: number) => value.toFixed(4);
const metric = (experiment: CurrentLabExperiment, side: 'baseline' | 'candidate', name: string) =>
  experiment[side].metrics[name];
const count = (value: number | undefined) => value === undefined ? '未报告' : String(value);
const factRatio = (side: 'baseline' | 'candidate') =>
  `${count(metric(rag, side, 'exactCitationFactsCovered'))}/${count(metric(rag, side, 'citationFactCount'))}`;
const caseRatio = (experiment: CurrentLabExperiment, side: 'baseline' | 'candidate', name: string) => {
  const value = metric(experiment, side, name);
  return value === undefined ? '未报告' : `${Math.round(value * experiment.dataset.caseCount)}/${experiment.dataset.caseCount}`;
};
const quality = (experiment: CurrentLabExperiment, side: 'baseline' | 'candidate') => {
  if (experiment.key === 'cloudops') {
    return `CA ${caseRatio(experiment, side, 'ca')} · JRA ${caseRatio(experiment, side, 'jra')}`;
  }
  if (experiment.key === 'memory') {
    return `${count(metric(experiment, side, 'modelDecisionCount'))} 次决策 · ${count(metric(experiment, side, 'governedCurrentAtomCount'))} 个 atom`;
  }
  return side === 'baseline' ? experiment.qualityBefore : experiment.qualityAfter;
};
const world = currentLabExperiments.map(experiment => ({
  key: experiment.key,
  label: experiment.label,
  dataset: labFlowSamples[experiment.key],
  result: evaluateLabDemo(experiment.key, labFlowSamples[experiment.key], 'bounded'),
}));
const worldCaseCount = world.reduce((sum, scenario) => sum + scenario.result.total, 0);
const repairBaseline = evaluateRepairSuite('baseline');
const repairCheap = evaluateRepairSuite('cheap');
const repairCandidate = evaluateRepairSuite('repaired');

export const evaluationDeck: PresentationDeck = {
  id: 'sandbox',
  title: '评测与迭代',
  summary: '检索、回答、任务终态与离线规则分别计分；质量门、样本和来源共同限定结果。',
  slides: [
    {
      id: 'execution-and-quality',
      title: '执行记录与质量验收',
      takeaway: 'Tool 成功率与业务正确率分别计分。',
      visual: {
        kind: 'contrast',
        before: {
          label: '执行记录',
          lines: ['Tool 返回、请求用量与终态回执', '答案覆盖与输出协议检查'],
        },
        after: {
          label: '质量验收',
          lines: ['任务终态与业务约束逐项对照', '引用事实、根因与记忆生命周期核验'],
        },
        caption: '质量门通过后，再比较候选的估算 API 成本。',
      },
      notes: [
        'EnterpriseOps 分开统计 taskSuccessCount 与 verifierPassCount；RAG 分开统计答案正确、逐事实引用支持和拒答；CloudOps 分开统计组件、故障类型和联合根因；Memory 检查受治理条目、来源、检索、回滚与重放。',
        '当前 RAG 基线的 outputProtocolRate=1、toolSuccessRate=1，但引用事实硬门未通过。Tool 成功不是最终回答正确的替代指标。',
        '来源定位：agent-lab-current-20260905.v1.json 的 experiments[].hardGates、baseline.metrics、candidate.metrics、stages[].decision。',
        labBenefitBoundary,
      ],
      sources: [currentSource],
    },
    {
      id: 'frozen-controls',
      title: '冻结条件与 Gold 隔离',
      takeaway: '模型替换和 Prompt 适配保留独立阶段与结果。',
      visual: {
        kind: 'flow',
        nodes: [
          { label: '冻结输入', detail: '固定语料、split、case、Tool 与 Runtime 身份' },
          { label: '隔离标准', detail: 'Host 私有 Gold、qrels 与核验器不进入 Agent 上下文' },
          { label: 'Sol 基线', detail: '记录任务结果、逐项评分、Tool 与用量回执' },
          { label: '仅换 Luna', detail: '其余控制保持相同；失败候选保留为 Reject' },
          { label: '适配 Prompt', detail: '固定 Luna，只修改通用约束与证据检查规则' },
        ],
        caption: 'Memory 仅比较模型替换；RAG r6 对已有阶段统一重评分。',
      },
      notes: [
        ...currentLabExperiments.map(experiment =>
          `${experiment.label}：${experiment.frozenControls.map(control => `${control.name}=${control.value}`).join('；')}`),
        'RAG r6 在运行后校准标准，再对三个阶段统一评分；candidateAware=true、candidateBlind=false。离线重评分没有新增 Provider、Judge 或候选运行，不能归因为模型能力提升。',
        '公开回执保留聚合指标、runId 与内容哈希，不包含问题、Gold、引用原文、答案或私人对话正文。公开 world 开发样例另有 cases.expected，执行器不读取这些期望标签。',
        '来源定位：experiments[].dataset.manifestSha256、frozenControls、factors、stages、validationBoundary。',
      ],
      sources: [currentSource, retrievalSource],
    },
    {
      id: 'retrieval-ranking',
      title: `RAG 检索：${retrieval.sample.validationQueryCount} 个冻结问题`,
      takeaway: `MRR ${score(retrieval.metrics.lexicalFloor.mrr)}→${score(retrieval.metrics.winner.mrr)}；P@K 未报告。`,
      visual: { kind:'metrics',beforeLabel:'词法基线',afterLabel:'Hybrid + rerank',rows:[
        {label:'MRR',before:score(retrieval.metrics.lexicalFloor.mrr),after:score(retrieval.metrics.winner.mrr),note:'首个相关结果名次倒数的平均'},
        {label:'Recall@10',before:score(retrieval.metrics.lexicalFloor.recallAt10),after:score(retrieval.metrics.winner.recallAt10),note:'前10条取回的相关项 / 全部相关项'},
        {label:'nDCG@10',before:score(retrieval.metrics.lexicalFloor.ndcgAt10),after:score(retrieval.metrics.winner.ndcgAt10),note:'位置折损相关性收益 / 理想排序收益'},
      ],caption:'16 个 Validation 问题 · 14 个候选 · 未测 Held-out；P@K 未报告。' },
      notes: [
        `${retrieval.dataset.source}；split=${retrieval.dataset.split}；${retrieval.dataset.corpusDocumentCount.toLocaleString('en-US')} 篇文档，${retrieval.configuration.embedding.vectorCount.toLocaleString('en-US')} 个向量；${retrieval.sample.validationQueryCount} 个 query 比较 ${retrieval.sample.candidateCount} 个候选。`,
        `词法基线 → hybrid + rerank：MRR ${score(retrieval.metrics.lexicalFloor.mrr)}→${score(retrieval.metrics.winner.mrr)}；Recall@10 ${score(retrieval.metrics.lexicalFloor.recallAt10)}→${score(retrieval.metrics.winner.recallAt10)}；nDCG@10 ${score(retrieval.metrics.lexicalFloor.ndcgAt10)}→${score(retrieval.metrics.winner.ndcgAt10)}。`,
        `Chunk=${retrieval.configuration.chunking.size}，overlap=${retrieval.configuration.chunking.overlap}；${retrieval.configuration.embedding.provider} ${retrieval.configuration.embedding.dimensions} 维、${retrieval.configuration.embedding.bits} bit；${retrieval.configuration.reranker.provider} 从 ${retrieval.configuration.reranker.candidateDepth} 条候选重排到 ${retrieval.configuration.reranker.finalDepth} 条结果。`,
        'Precision@K 是前 K 个结果中的相关项占比；Recall@K 的分母是该问题的全部相关项；MRR 是各问题首个相关结果名次倒数的平均；nDCG@K 将位置折损后的相关性收益与理想排序比较。',
        '交互排序中的示例计算与这份历史测量分开。历史回执没有 P@K、逐 query qrels 或答案正确率，不能从 Recall/MRR 反推这些指标。',
        `decision=${retrieval.decision}；heldOutEvaluated=${retrieval.heldOutEvaluated}。候选已选出但未 Promote；不是当前四题回答实验、官方榜单或生产泛化结果。`,
        '来源定位：enterprise-rag-validation-20260831.v1.json 的 sample、configuration、metrics.lexicalFloor、metrics.winner、claim。',
      ],
      sources: [
        retrievalSource,
        { label: 'Precision 与 Recall 定义', href: 'https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-unranked-retrieval-sets-1.html' },
        { label: '排序指标与 nDCG', href: 'https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html' },
        { label: 'NIST reciprocal-rank 实现', href: 'https://github.com/usnistgov/trec_eval/blob/main/m_recip_rank.c' },
      ],
    },
    {id:'retrieval-measures',title:'检索指标口径',takeaway:'相关性、召回覆盖与排序位置独立计分。',visual:{kind:'ranking'},
     notes:['单问题 RR 与多问题 MRR 分开。示例中共有3份相关资料；变动返回排序或K会改变Precision、Recall与nDCG。','此计算器仅解释指标，不代表PAW历史结果。'],
     sources:[{label:'Stanford · Precision / Recall',href:'https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-unranked-retrieval-sets-1.html'},{label:'NIST · Reciprocal Rank',href:'https://github.com/usnistgov/trec_eval/blob/main/m_recip_rank.c'}]},
    {
      id: 'answer-evidence',
      title: `RAG 回答：引用事实 ${factRatio('baseline')}→${factRatio('candidate')}`,
      takeaway: `${rag.dataset.caseCount} 个案例；r6 为候选可见重评分，未测 Held-out。`,
      visual: {
        kind: 'timeline',
        nodes: rag.stages.map(stage => ({ label: stage.label, detail: stage.quality })),
        caption: '相同 r6 标准；Model-only 被拒绝，Prompt-v4 通过质量门。',
      },
      notes: [
        `样本：${rag.dataset.unit}；split=${rag.dataset.split}。引用事实分母是 citationFactCount=${count(metric(rag, 'candidate', 'citationFactCount'))}，任务分母是 caseCount=${rag.dataset.caseCount}。`,
        `基线/最终 answerJudgeCorrectnessRate=${count(metric(rag, 'baseline', 'answerJudgeCorrectnessRate'))}/${count(metric(rag, 'candidate', 'answerJudgeCorrectnessRate'))}，分母分别为两个可回答案例；infoNotFoundAbstentionRecall=${count(metric(rag, 'baseline', 'infoNotFoundAbstentionRecall'))}/${count(metric(rag, 'candidate', 'infoNotFoundAbstentionRecall'))}，分母分别为两个应拒答案例。这些是两阶段的比率值，不是合并后的分数。`,
        ...rag.factors.map(factor => `${factor.name}：${factor.before} → ${factor.after}。${factor.reason}`),
        `三阶段 API 成本估算：${rag.stages.map(stage => `${stage.label} ${stage.cost}`).join('；')}。costAuthority=${rag.costAuthority}；不是 Provider 实际账单。`,
        '此轮没有重新测量检索 MRR、Recall@K 或 P@K。引用事实覆盖率不是检索 precision；引用 precision/F1 未报告。r6 未重新测量延迟。',
        ...rag.openGaps,
        '来源定位：experiments[key=rag].stages[].metrics、hardGates、validationBoundary；exactCitationFactsCovered/citationFactCount、agentSuccessRate、answerJudgeCorrectnessRate、infoNotFoundAbstentionRecall 各自保留分母。',
      ],
      sources: [currentSource],
    },
    {
      id: 'current-quality',
      title: '四场景质量与样本边界',
      takeaway: '当前结果均为单轮验证；成本为 Runtime 用量估算。',
      visual: {
        kind: 'metrics',
        rows: currentLabExperiments.map(experiment => ({
          label: experiment.label,
          before: quality(experiment, 'baseline'),
          after: quality(experiment, 'candidate'),
          note: `${experiment.dataset.caseCount} 个案例 · ${experiment.scope}`,
        })),
        caption: 'Sol 基线与最终 Luna 候选；各行分母与验收条件独立。',
      },
      notes: [
        ...currentLabExperiments.map(experiment =>
          `${experiment.label}：${experiment.dataset.unit}；split=${experiment.dataset.split}。${experiment.change} API 成本估算 ${experiment.costBefore}→${experiment.costAfter}；${experiment.costLabel}。`),
        'CloudOps：CA 核对首位故障组件，FA 核对故障类型，JRA 核对二者同时命中，Top-3 JRA 核对前三项联合命中。均以该轮冻结故障案例数为分母，Tool 可靠性与答案覆盖另计。',
        ...currentLabExperiments.filter(experiment => experiment.key === 'cloudops').map(experiment =>
          `CloudOps 补充指标：FA ${caseRatio(experiment, 'baseline', 'fa')}→${caseRatio(experiment, 'candidate', 'fa')}；Top-3 JRA ${caseRatio(experiment, 'baseline', 'top3Jra')}→${caseRatio(experiment, 'candidate', 'top3Jra')}。候选仍有联合根因未通过，耗时更慢，不能宣传提速。`),
        'Memory 的 modelDecisionCount 是模型决策次数，governedCurrentAtomCount 是受治理条目数，retrievalPassed 是布尔门禁。当前 Pi 合成投影没有逐案例 durable/abstention 通过数，不能把条目数写成正确率，也不能借用旧 CLI 的 4/4、1/1。',
        ...currentLabExperiments.map(experiment => `${experiment.label} 未覆盖项：${experiment.openGaps.join('；')}`),
        labBenefitBoundary,
        '来源定位：experiments[].dataset、baseline.metrics、candidate.metrics、stages、costAuthority、providerBillAvailable、openGaps。投影使用 showcase/lab-evidence.ts 的 currentLabExperiments。',
      ],
      sources: [currentSource],
    },
    {
      id: 'mock-and-faults',
      title: `离线业务规则：${worldCaseCount} 个案例`,
      takeaway: '152 条业务输入；Provider 调用为 0。',
      visual: {
        kind: 'metrics',
        rows: [
          ...world.map(scenario => ({
            label: `${scenario.label} · mock`,
            before: `${scenario.result.baselinePassed}/${scenario.result.total}`,
            after: `${scenario.result.candidatePassed}/${scenario.result.total}`,
            note: `${scenario.dataset.records.length} 条输入 · 离线规则标签核验`,
          })),

        ],
        caption: '同一执行器驱动评测与离线 App；开发样例通过率不代表模型增益。',
      },
      notes: [
        '业务规则分别检查客户交接权限、Top-1 文档 ID/拒答、诊断责任标签与记忆动作。每题 actual 与 expected 严格相等才通过；执行器不读取 cases.expected。',
        ...world.map(scenario =>
          `${scenario.label}：records=${scenario.dataset.records.length}，cases=${scenario.result.total}，baselinePassed=${scenario.result.baselinePassed}，candidatePassed=${scenario.result.candidatePassed}，dataMode=${scenario.result.dataMode}，providerCalls=${scenario.result.providerCalls}。`),
        `world RAG 的 ${labFlowSamples.rag.cases.length} 题含 ${labFlowSamples.rag.cases.filter(item => item.expected === '未命中').length} 个应拒答问题；结果只是 docId/拒答标签，不是生成回答质量、MRR 或 Recall@K。`,
        '故障重放覆盖登记 503、未知写入回执、重复提交、陈旧版本、写入后停止、登记超时、写入失败与无故障对照。每例同时检查文件保留、业务写入次数、登记次数、回执与恢复状态。',
        `故障结果：原流程 ${repairBaseline.passed}/${repairBaseline.total}；只忽略登记异常 ${repairCheap.passed}/${repairCheap.total}；拆分业务/登记回执并回读 ${repairCandidate.passed}/${repairCandidate.total}。dataMode=${repairCandidate.dataMode}；成本字段是 fictional-demo-estimate，不能与历史 Agent 成本比较。`,
        '来源定位：showcase/datasets/lab-world.v2.json；showcase/lab-flow.ts#evaluateLabDemo；showcase/optimization.ts#evaluateRepairSuite。这两组开发样例均无 Held-out，不与历史检索或模型结果合成增益曲线。',
      ],
      sources: [
        { label: '四场景离线操作与导出', href: '/lab?scenario=rag' },
        currentSource,
      ],
    },
    {id:'recovery-faults',title:'文件与登记恢复：8 类故障',takeaway:'保留业务写入；登记失败独立恢复。',visual:{kind:'metrics',beforeLabel:'通过 / 总数',afterLabel:'处理结果',rows:[
      {label:'原流程',before:`${repairBaseline.passed}/${repairBaseline.total}`,after:'拒绝',note:'辅助登记失败会回滚已成功写入的文件'},
      {label:'候选 A · 减少步骤',before:`${repairCheap.passed}/${repairCheap.total}`,after:'拒绝',note:'忽略登记异常，缺少回读与恢复待办'},
      {label:'候选 B · 独立回执',before:`${repairCandidate.passed}/${repairCandidate.total}`,after:'采用 · 当前条件',note:'未知回执先回读，同操作幂等，登记可恢复'},
     ],caption:'8 种内置合成故障 · 固定初始文件 · 0 Provider 调用。'},
     notes:['逐题核对文件内容、revision、写入次数、登记次数、回执状态与恢复路径。','修改不受支持的故障与材料会拒绝冻结，不能把原八题结果当作新输入结果。','仅验证虚拟工作区，不证明真实网络时序或生产修复。'],sources:[{label:'世界任务与故障来源',href:'/evidence/world.v2.json'}]},
    {
      id: 'native-lab-workflow',
      title: '原生 Lab：导入、冻结、导出',
      takeaway: '样例、评测与导出 App 使用同一份离线执行器。',
      visual: {kind:'native',id:'lab',route:'/eval-lab?project=lab-showcase-rag',title:'真实 PAW Lab · 企业知识项目'},
      notes: [
        'EnterpriseOps 操作负责人交接、冻结拒绝、重复提交、容量、revision 与完整撤销；RAG 操作范围选择、来源展开、拒答、答案保存与下载；CloudOps 操作证据、unknown/multiple 假设与计划保存；Memory 操作纠正、撤销、旧来源重放阻止、来源核对与召回。',
        '导出 ZIP 包含 index.html、data.json、evaluation.json 与 README.md。解压后直接打开 index.html，在浏览器副本内操作，不需要 Key、服务或 Provider。',
        'evaluation.json 保留 materialSetId、configurationRevision、逐题 rows 和总分；材料或配置变化后，旧报告不能作为新产物的验收依据。',
        '来源定位：control-center-web/src/app/preview-lab-app-package.ts#buildLabDemoApp；showcase/vertical-app.ts#verticalAppDocument；showcase/lab-flow.ts#runLabDemo。公开演示不调用私人 Runtime 或生产业务系统。',
      ],
      sources: currentLabExperiments.map(experiment => ({
        label: `打开 ${experiment.label} 原生项目`,
        href: `/lab?scenario=${experiment.key}`,
      })),
    },
  ],
};
