# PAW RAG 与 Memory Eval 数据集候选

本记录为 2026-08-28 的选型调研，不代表数据已经下载、接入或产生了 PAW 实测成绩。展示页中的 `Precision@5 0.76`、`Recall@5 0.82` 等均为明确标注的合成示例。

## 第一批候选

| 基准 | 官方来源 | 能证明什么 | 在 PAW 中的建议用途 |
| --- | --- | --- | --- |
| BEIR | [beir-cellar/beir](https://github.com/beir-cellar/beir) | 跨领域零样本检索；可比较 lexical、sparse、dense、late interaction、rerank | 建立 BM25、Embedding、Hybrid、Rerank 的离线检索基线；主要看 nDCG@10、Recall@K、MRR |
| MTEB / RTEB | [MTEB 官方基准目录](https://docs.mteb.org/overview/available_benchmarks/) | 多语言、领域和任务的 embedding、retrieval、reranking 能力 | 选择中英检索、代码、金融、企业文档子集，避免只在一个英文 QA 集上调参 |
| RAGBench | [论文](https://arxiv.org/abs/2407.11005) / [官方数据](https://huggingface.co/datasets/rungalileo/ragbench) | 约 10 万条、五类行业领域的端到端 RAG 样本与可解释标签 | 评估检索上下文与答案是否相关、忠实和充分；AI Judge 分数必须单列为估计 |
| CRAG | [facebookresearch/CRAG](https://github.com/facebookresearch/CRAG) | 4,409 个事实问答，覆盖动态事实、长尾实体、Web 与 KG 检索 | 用于 Knowledge Mount、Browser/Knowledge Graph 和 Agentic RAG 的动态事实与拒答测试 |
| LongMemEval | [xiaowu0162/LongMemEval](https://github.com/xiaowu0162/LongMemEval) | 500 个长期交互问题；信息抽取、多 Session 推理、知识更新、时间推理、拒答 | 评估跨 compact 周期的召回、更新覆盖和不知道时的拒答；需同时记录检索命中与最终答案 |
| LoCoMo | [snap-research/LoCoMo](https://github.com/snap-research/LoCoMo) | 超长对话的问答和事件总结 | 检查时间线、远距离偏好召回和事件摘要，但不能替代 PAW 的授权测试 |
| LongMemEval-V2 | [xiaowu0162/LongMemEval-V2](https://github.com/xiaowu0162/LongMemEval-V2) | 面向 Web/企业 Agent 轨迹的长期经验、状态、流程与延迟 | 后续垂直 Agent 自建/自测阶段候选；数据规模较大，先不作为展示站构建依赖 |

## 公共基准无法证明的 PAW 边界

PAW 仍需自建一套小而严格的合成黄金集，因为公开数据集通常不验证以下产品约束：

- `Project Docs`、`User Memory`、`Knowledge Mount` 的范围隔离；
- 未授权 User Memory 的召回率必须为零；关闭、删除或修订后的旧记忆不得继续泄漏；
- 每个 compact / 大对话周期的主动召回次数上限；
- 引用是否精确落到本轮已授权的文件、段落或记忆来源；
- 同名项目、冲突事实、过时指标与用户偏好更新时，系统是否选择当前权威来源；
- Agent 自主优化前后是否使用同一冻结 Eval 集，避免只优化展示样例。

建议的最小黄金集结构：

```text
dataset_version
query_id
query + session_id + compact_cycle
allowed_scopes + denied_scopes
gold_evidence_ids + forbidden_evidence_ids
expected_answer_or_abstention
expected_citations
privacy_classification
```

## 指标边界

- 真实检索指标：Precision@K、Recall@K、nDCG@K、MRR、citation precision/coverage、P50/P95 latency。
- 治理指标：unauthorized recall rate、cross-scope leakage rate、deleted-memory leakage rate；这些应以 `0` 为目标并保留失败 Trace。
- 端到端指标：答案正确率、拒答准确率、时间/更新推理准确率。
- AI 估计：groundedness、answer usefulness、failure taxonomy。必须显示 Judge、模型版本和 prompt 版本，且不能覆盖人工或程序标签。
- 自动优化：只有在冻结数据集上重跑并产生可比较回执后，才能从“建议”升级为“已验证优化”；当前产品状态仍是“正在添加”。

## 建议接入顺序

1. 先做 24–50 条 PAW 合成治理黄金集，覆盖权限、范围、删除和 citation。
2. 用 BEIR/MTEB 子集建立 Embedding、Hybrid、Rerank 可重复基线。
3. 用 LongMemEval/LoCoMo 验证跨 Session 记忆能力，分别保存 retrieval 与 answer 两类结果。
4. 用 RAGBench/CRAG 验证 Knowledge Mount 与 Agentic RAG 的端到端质量。
5. 自动优化只读取失败 Trace 生成候选配置；Reviewer 在同一冻结 Eval 上复测，通过后才允许晋级。
