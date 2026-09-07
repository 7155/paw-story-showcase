# PAW Story

一个可交互的项目案例：从用户目标出发，展示多 Agent 如何协作交付、通过评测发现问题、验证并保留改进，再在下一次工作中继续。

## 阅读顺序

当前主入口 `/` 是分阶段的真实前端工作区，`/?view=full` 保持兼容。固定导航一次聚焦一个模块；Room、Trace、Agent Lab、Memory、Input Studio、Context Debug 都嵌入 `control-center-web` 的实际组件。紫色描边指向真实控件，观察到普通点击及其界面结果后才推进引导。不会自动调用控件、用计时器跳过操作或通过模拟卡片宣布成功。所有详情页也先呈现真实工作区，技术说明与历史示意默认折叠。

四个垂直场景独立放在 `/lab`：EnterpriseOps、RAG、CloudOps、Memory 各有对应的真实 Lab 项目入口。场景可用 `?scenario=enterpriseops|rag|cloudops|memory` 直接定位。每个项目从零材料开始，按「导入数据 → 保存测评策略 → 逐题比较 → 生成、试用并导出 App」操作；可以导入示例或自己的 `records` / `cases` JSON。这里实际执行离线规则并导出同源离线 App，不调用 Provider。修改数据或已保存配置后，需要重新测评才能生成新版本。

历史 Agent 候选矩阵、对照条件与回执保留在折叠的独立证据区，仍使用 `showcase/lab-evidence.ts` 的同一份公开快照；它们不是本轮规则演示的成绩。导出的 ZIP 含 `index.html`、数据、本轮测评回执与 README，解压后直接打开页面即可运行。`control-center-web/scripts/export-lab-demo-apps.mjs [输出目录]` 使用同一导出代码生成四个示例包，可用于不支持浏览器下载的预览宿主。

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

四个独立应用入口为 `/apps`，首页「应用」阶段直接嵌入同一份可执行界面。客户交接、知识台、事故诊断和记忆整理各自有业务操作；不再共用单个查询表单。生成代码位于 `../showcase/vertical-app.ts`，Lab 导出与独立入口共用它。数据与清洗来源见 `../showcase/datasets/README.md`。
