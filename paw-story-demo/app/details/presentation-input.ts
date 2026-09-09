import type {PresentationDeck} from './presentation-types';
const shortMatrix={label:'40 条冻结短前缀 · 五模型对照',href:'https://github.com/7155/aios/blob/main/reports/aios_ime_short_prefix_matrix_20260821.md'};
const runtime={label:'30 条同权重推理对照 · 2026-08-14',href:'https://github.com/7155/aios/blob/main/reports/aios_ime_benchmark_final_20260814.md'};
const code={label:'AIOS IME 执行源码',href:'https://github.com/7155/aios/blob/main/python/aios/ime.py'};
export const inputDeck:PresentationDeck={
 id:'input',title:'输入模型与推理',summary:'Rime 分工、Completion 训练、Prefix KV 与同条件延迟。',
 slides:[
  {id:'input-boundaries',title:'Rime 解码与中文补全分工',takeaway:'拼音原生候选与模型补全保持独立。',
   visual:{kind:'layers',nodes:[{label:'Rime / Squirrel',detail:'拼音解析、原生候选、分页与提交'},{label:'MiniMind-IME',detail:'基于已确认中文前缀生成后续文本'},{label:'AIOS-IME',detail:'Prefix KV、并行候选、过滤与排序'},{label:'显式 Agent',detail:'用户明确触发后处理资料、工具与复杂任务'}],caption:'被动按键预测保持本地、有界；原生解码顺序继续由 Rime 负责。'},
   notes:['补全模型针对单用户输入场景；小模型延迟、候选质量和通用问答能力是不同目标。','公开演示使用真实 Input Studio 前端与合成数据，不验证安装后的前台候选行为。'],sources:[code,{label:'推理架构',href:'/evidence/aios-ime/runtime-architecture.svg'}]},
  {id:'input-training',title:'Completion 训练与冻结评测',takeaway:'prefix labels = −100；训练目标落在待续写部分。',
   visual:{kind:'flow',nodes:[{label:'语料清洗',detail:'HTML / code / style 过滤，文本去重'},{label:'继续预训练',detail:'中文 token 与下一 token 预测'},{label:'Completion SFT',detail:'前缀只做条件；续写部分计算损失'},{label:'独立生成评测',detail:'冻结前缀与参考答案，比较完整候选'}],caption:'训练 loss、整句命中、候选多样性与尾延迟分别记录。'},
   notes:['既有训练流程资料标注 IME-weighted 16K tokenizer、prefix labels=-100、冻结样本 train_eligible=false。流程图为源码资料重绘，不是新的训练运行。','现有页面曾列 Daily Long v3 指标；当前未取得可直接核对的公开原始报告，因此主讲页不列这些数值为已验证结果。'],sources:[{label:'既有训练流程资料',href:'/evidence/minimind-ime/training-pipeline.svg'}]},
  {id:'input-models',title:'同协议短前缀模型对照',takeaway:'40 个冻结前缀 · BF16 · RTX 4080 Laptop。',
   visual:{kind:'metrics',beforeLabel:'Top-3 p50',afterLabel:'Top-3 p95',rows:[{label:'MiniMind 0.1B · 100.69M',before:'86.34 ms',after:'99.06 ms',note:'完整 Top-3 p50 / p95；明确违规 0/120'},{label:'MiniMind 0.06B · 63.91M',before:'47.62 ms',after:'61.16 ms',note:'更小模型更快；自然度与长补全需另测'},{label:'Qwen3 0.6B · 596.05M',before:'171.74 ms',after:'331.36 ms',note:'完整 Top-3 p50 / p95；明确违规 85/120'},{label:'Qwen3 4B · 4.02B',before:'308.07 ms',after:'313.11 ms',note:'完整 Top-3 p50 / p95；明确违规 14/120'}],caption:'左列 p50，右列 p95；规则违规数不等于自然度或任务准确率。'},
   notes:['五模型报告中选列四个有直接比较意义的模型。固定 [BOS]+裸中文、同 seed、首轮8路、max_new_tokens=12、最多24路补采样。','MiniMind 0.1B 满三条互异 40/40。计时是完整候选生成，不是首 token 延迟，不含模型加载/JIT。','该短前缀协议与长补全、不同初始候选数或不同采样上限的实验不能拼接为同一 A/B。'],sources:[shortMatrix]},
  {id:'input-runtime',title:'Prefix KV 与候选并行',takeaway:'token-LCP 复用稳定前缀；新输入使旧代际失效。',
   visual:{kind:'flow',nodes:[{label:'前缀对齐',detail:'token_longest_common_prefix 比较 token ID'},{label:'复用 Prefix KV',detail:'保留稳定页，释放变化尾部'},{label:'候选分支',detail:'CandidateGroup 共享前缀，分支批处理'},{label:'过滤与 Top-3',detail:'合法性、显示去重、评分与多样性选择'}],caption:'latest-wins：旧生成即使晚到，也不能覆盖新的输入结果。'},
   notes:['AIOS ime.py：complete → _complete_locked → _prepare_prefix；_generate_branch_batch 生成候选，select_top_candidates 排序。new_generation 取消旧代际。','纯退格时若缺少尾 token logits，重新 prefill；字符前缀相同不足以证明 token 前缀或 KV 可复用。','每个生成分支有自己的后续状态；只共享已确认的前缀。'],sources:[code,{label:'Prefix KV 实现图',href:'/evidence/aios-ime/prefix-kv.svg'}]},
  {id:'input-latency',title:'同权重 Runtime 延迟对照',takeaway:'MiniMind 0.1B BF16 · 5 次预热 · 30 次计时。',
   visual:{kind:'metrics',rows:[{label:'完整 Top-3 p50',before:'258.64 ms',after:'81.98 ms',note:'PyTorch 串行基线 → AIOS'},{label:'完整 Top-3 p95',before:'279.43 ms',after:'109.97 ms',note:'相同模型权重与冻结请求'},{label:'完整互异候选',before:'30 个计时请求',after:'30/30',note:'AIOS 全部返回三条互异候选'}],caption:'计时含 prefill、decode 与后处理；不含加载与编译。'},
   notes:['2026-08-14 协议：初始8路、最多12路候选；同权重对照与2026-08-21的最多24路协议独立。','延迟降低证明该协议下 Runtime 的候选生成改善；候选质量、真实按键前台和长期稳定性需要各自验收。'],sources:[runtime,{label:'同条件性能图',href:'/evidence/aios-ime/performance.svg'}]},
  {id:'input-native',title:'Input Studio 词库与撤销',takeaway:'选择词条 → 更新词库 → 查看回执 → 撤销更新。',
   visual:{kind:'native',id:'input',route:'/input',title:'真实 PAW Input Studio'},
   notes:['真实前端操作公开合成词条。操作只作用于演示副本，不修改系统 Rime 词库。','输入法、语音和词库分别由自己的能力边界负责；服务、构建与原生前台证据不能互相替代。'],sources:[code]}
 ]
};
