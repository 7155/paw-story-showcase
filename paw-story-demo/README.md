# PAW Story

一个可交互的项目案例：从用户目标出发，展示多 Agent 如何协作交付、通过评测发现问题、验证并保留改进，再在下一次工作中继续。

## 阅读顺序

当前主入口 `/` 是分阶段的真实前端工作区，`/?view=full` 保持兼容。固定导航一次聚焦一个模块；Room、Trace、Agent Lab、Memory、Input Studio、Context Debug 都嵌入 `control-center-web` 的实际组件。紫色描边指向真实控件，观察到普通点击及其界面结果后才推进引导。不会自动调用控件、用计时器跳过操作或通过模拟卡片宣布成功。所有详情页也先呈现真实工作区，技术说明与历史示意默认折叠。

四个案例放在 `/lab`，首页的 Lab 阶段复用同一操作页：深度研究、云上故障诊断、企业交付、记忆整理。通过 `?scenario=rag|cloudops|enterpriseops|memory` 定位案例，按「资料与基线 → 设定目标 → 基线测评 → 优化实验 → 结果对比 → 应用交付」操作；浏览器分别保存四个案例的资料、参数和进度。深度研究支持多文件和文件夹，使用 PDF.js 在浏览器内提取 PDF 文字层，也可导入 TXT、Markdown 或 JSON；扫描 PDF 会显示未读取原因，离线模式不含 OCR。另三个场景支持对应的 `records` / `cases` JSON。

深度研究示例选自仓库已有的 EnterpriseRAG-Bench 公开合成资料：200 份文档、16 道已公开训练题，包含这些题目的全部相关来源。切片、重叠、检索数量、证据上限和标题权重实际参与本地计算。其余场景比较具体业务规则。测评结果、字符量与历史模型实验分别呈现；推荐仅适用于本轮资料和检查题。修改资料、题集或保存新的基线后，旧结果不再用于应用交付。下载的独立 HTML 携带采用的参数、资料和检查结果，并执行同一算法。

论文项目的 72 条历史记录可在深度研究的优化实验步骤展开，包含 211 份来源的处理、检索、回答、应用版本与调用；公开快照仅包含白名单元数据和聚合指标，不含论文正文或问题、回答、个人路径。历史 Agent 候选矩阵、对照条件与回执保留在折叠的独立证据区，仍使用 `showcase/lab-evidence.ts` 的同一份公开快照；它们不是本轮规则演示的成绩。展开原始 PAW Lab 工作区后，其 ZIP 导出含 `index.html`、数据、本轮测评回执与 README，解压后直接打开页面即可运行。`control-center-web/scripts/export-lab-demo-apps.mjs [输出目录]` 使用同一导出代码生成四个示例包，可用于不支持浏览器下载的预览宿主。

1. 任务开场：一起设计 PAW，先看目标与预期交付。
2. 协作交付：四条产品线分工、交接并汇总结果。
3. 评测问题：对照原始要求、实际行为与测试，沿 Trace 定位缺口。
4. 验证改进：比较基线与候选，检查其他样本，作出有范围的 Keep / Reject。
5. 继续工作：整理并召回上下文，再从文档输入或语音继续。
6. 框架与技术：查看任务流、改进回路、运行结构、技术职责及实验来源。

## 场景和证据

现场讲述可以从首页「从一个任务开始」直接操作 Room；「探索项目设计」进入框架与深入路线，再选择协作、评测、前端演进、上下文或输入。五个详情页都有可展开的设计提纲，依次解释选择、替代方案、失败、代价和证据；协作页另用 ACK 持久化缺口图解释执行与协调失配。提纲不替代原始来源，也不虚构个人贡献。

Room、Trace、Memory 和输入演示复用实际前端组件与公开合成场景。共享任务数据在 `../showcase/task-story.v1.json`：四线方案交付、文件回滚、候选 A 拒绝与 B 保留、下一次召回。它们是专门编写的演示，不是同一次真实端到端运行。

视觉使用浅色阅读面、清晰的阶段导航和紫色控件高亮。原生窗口默认最大化，保持实际字号；上方提示当前点击，下方保留模块详情和下一步入口。

当前四场景结果由同一份公开快照生成：首页摘要与实验室阶段表共用 `app/lab-evidence.ts`。EnterpriseOps、Enterprise RAG、CloudOps 保留 Sol → Luna model-only → Luna 通用 Prompt 的三阶段；Memory 仅有实际运行的模型替换两阶段。成本是 API 估算，非 Provider 账单；Memory 使用 reported usage 定价估算，其余三项使用 Runtime 对账估算。

RAG r6 是 candidate-aware Validation，非盲测、非 Held-out，标准修订不代表模型能力提升；历史 Judge 条件按回执记录，不宣称评审模型固定。Memory Keep 仅限固定五例 shadow Validation；EnterpriseOps 历史 one-shot Held-out 1/8 的拒绝推广仍保留在历史矩阵。检索 nDCG、答案质量、记忆生命周期和多 Agent 收益分别陈述；没有同预算 matched 多 Agent A/B 收益比例。

## 代码地图

| 内容 | 文件 |
| --- | --- |
| 页面顺序与应用演示 | `app/page.tsx` |
| 原生应用容器与点击提示 | `app/native-demo.tsx`、`app/hands-on-hint.tsx` |
| 主线导航与单阶段布局 | `app/guided-showcase.tsx`、`app/guided-showcase.css` |
| 开场、交付与改进证据 | `app/story-journey.tsx` |
| 合成修复候选比较 | `app/candidate-comparison.tsx` |
| 跨章节的共享合成任务 | `../showcase/task-story.v1.json` |
| 可切换系统图 | `app/system-explorer.tsx` |
| 技术与案例 | `app/resume-section.tsx` |
| 四场景同源指标与展示适配 | `app/lab-evidence.ts` |
| 当前公开实验快照 | `public/evidence/vertical-evals/agent-lab-current-20260905.v1.json` |
| 整站视觉 | `app/story-system.css` |
| 演示组件样式 | `app/globals.css` |
| 深入阅读与实验矩阵 | `app/details/` |
| 五条设计讲述提纲 | `app/details/decision-guide.tsx` |
| 主线图原稿 | `public/diagrams/` |
| 专题技术图 | `public/evidence/` |

## 本地运行

需要 Node.js 22.13+，同仓库 PAWOS 使用 pnpm 11.9+。保持现有 lockfile。

先在仓库根目录启动实际展示前端：

```bash
cd control-center-web
pnpm install --frozen-lockfile
pnpm dev --port 5174
```

另一个终端从仓库根目录启动叙事站：

```bash
cd paw-story-demo
npm ci
npm run dev -- --port 4191
```

打开 `http://127.0.0.1:4191/`。本地 Story 使用 5174 的公开 PAWOS；正式构建把同仓库产物装入 `/pawos/`。

## 验证与图示维护

更新实验时，在 PAW 事实源仓库运行白名单导出器，显式指定本站快照的绝对输出路径：

```bash
python3 scripts/export_agent_lab_showcase.py --output /path/to/oshow/paw-story-demo/public/evidence/vertical-evals/agent-lab-current-20260905.v1.json
python3 scripts/export_agent_lab_showcase.py --check --output /path/to/oshow/paw-story-demo/public/evidence/vertical-evals/agent-lab-current-20260905.v1.json
```

导出器按四个固定当前实验 ID 读取 `agent-experiments.v1.json`，只输出公开元数据、聚合指标与回执文件名/哈希，不输出问题、答案、Gold、原始会话或本机路径。`sourceSha256` 使用快照声明的 canonical JSON 编码；回执哈希使用原始文件字节。更新快照后同步 `vertical-evals/manifest.v1.json` 的公开文件哈希；旧失败回执保留。公开构建只读取导出的 JSON，不依赖私有 PAW checkout。

```bash
npm run lint
npm exec tsc -- --noEmit --pretty false --incremental false
CI=true npm test
node scripts/render-story-diagrams.mjs
```

`npm test` 构建 PAWOS 和 Story，再运行页面检查。专题图生成器保存已有技术事实与测量数值；训练曲线保留原始曲线路径。主线图的 Mermaid 与 React 投影修改时应同步。

主线 Latin 字体 Manrope 自托管，来源为 Google Fonts 的 `ofl/manrope`；`public/manrope-OFL.txt` 保留许可证。交互特写采用原生几何、DOM 和现有 Lucide 图标，不使用生成图片冒充产品截图。

浏览器验收检查真实点击链：Room 伙伴交付 → Files 内容；Trace 对象 → 开始诊断 → 网页报告；Lab 已有实验 → 设置 → 结果；Memory 主题 → 来源 → 输入原文；词库加入 → 撤销；Context Debug 首轮 → 指令 → HTML 报告；Lab 导入 → 离线测评 → App 预览与导出。步骤提示必须跟随已观察的原生结果。浏览器触发下载与成功保存分别报告。

公开文件有变动时，在仓库根目录更新并检查清单：

```bash
python3 scripts/build_manifest.py
python3 scripts/check_public_showcase.py
```

对外源码包需要同时包含 `paw-story-demo` 和 `control-center-web`；不依赖旁边的私有 PAW 仓库。私有规划、原始会话、个人数据、缓存和构建输出不进入公开源码。Git 推送与站点部署分别执行和报告。

每页顶部显示简短操作流程，并高亮当前真实控件。协作页按消息流、完整记录、汇总结果、伙伴交付、交付文件的顺序展示；只有真实点击和对应界面结果同时出现才推进。上下文检查与词库更新使用准确的功能名称。

自动演示：可见页面默认显示演示鼠标并按顺序点击真实控件，每步等待界面结果；支持暂停和继续。切换页面或隐藏标签时暂停。自动导出可能受浏览器下载策略限制，可以直接点击导出按钮。完整部署命令见仓库根目录 README。

四个应用入口为 `/apps?scenario=rag|cloudops|enterpriseops|memory`，首页「应用」阶段嵌入同一份界面。深度研究直接复用 `control-center-web/src/features/agent/portable` 的 PAW 对话、输入框、Markdown、引用阅读器和报告导出；`showcase/research-conversation-app.ts` 只提供离线记录适配及轻量布局。其余三例复用 `showcase/vertical-app.ts` 的业务工作台，保留交接、撤销、诊断计划和记忆来源操作。

`/lab` 直接嵌入 PAW 的 Lab 项目工作台，为四例提供六步操作：资料与基线 → 目标 → 基线测评 → 候选实验 → 逐题比较 → 应用交付。资料列表、文档阅读、基线表单、需求偏好、实验记录、比较表和应用交付均来自 PAW 组件；展示层只连接浏览器内的离线数据适配器。文件和操作进度保存在当前浏览器；新资料或新基线会使旧结果退出当前比较。PDF 读取文字层，不包含 OCR。深度研究示例取自现有公开合成语料的 200 份资料，使用 16 道 train 检查题；本地词法检索与字符开销不代表模型回答质量、Token 或账单。

`research-history.v1.json` 回放论文项目的 72 条记录，其中包含失败和阅读操作；211 份论文中 209 份已读取、2 份未读取。`research-conversations.v1.json` 单独保留 4 条实际保存的回答、引用片段和聚合用量，未包含原始会话或完整论文。它们与 200 份合成资料的本地实验分开呈现。

构建时先从本站 PAW 源码生成可携带对话组件，再由 `scripts/materialize-guided-apps.mjs` 生成 HTML 和 ZIP 到忽略目录 `public/real-apps/`。解压后直接打开 `index.html`；预览与下载使用同一文件。业务 App 使用本轮测评的参数与计算函数；没有后端或 Provider 调用。开发时可先运行 `node ../control-center-web/scripts/build-portable-agent-ui.mjs` 和 `node scripts/materialize-real-apps.mjs` 刷新导出应用。
