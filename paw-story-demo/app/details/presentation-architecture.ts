import type { PresentationDeck, PresentationSource } from "./presentation-types";

const repository = "https://github.com/7155/personal-agent-workbench";
const commit = (hash: string, label: string): PresentationSource => ({
  label: `${hash} · ${label}`,
  href: `${repository}/commit/${hash}`,
});
const ownership: PresentationSource = {
  label: "PAW 执行与协作职责图",
  href: "/evidence/agents/paw-runtime-ownership.svg",
};
const featureSlice: PresentationSource = {
  label: "PAW 功能与实现边界图",
  href: "/evidence/agents/paw-feature-slice.svg",
};

export const agentsDeck: PresentationDeck = {
  id: "agents",
  title: "Pi Session 与轻量 Room 协作",
  summary: "Pi 管理执行与恢复；Room 维护成员、派发、公共事件和一个最终结果。",
  slides: [
    {
      id: "agents-objective",
      title: "一个主 Session 与独立 Partner",
      takeaway: "一条主会话、多个独立执行单元、一个 Root 最终结果。",
      visual: {
        kind: "flow",
        nodes: [
          { label: "用户目标", detail: "任务目标、工作范围与验收条件" },
          { label: "主 Session", detail: "保留主线，决定分工并整合结果" },
          { label: "Partner Sessions", detail: "各自执行有界任务，返回进展与交付" },
          { label: "交付证据", detail: "核对文件、Tool 回执和检查结果" },
          { label: "最终答复", detail: "汇总已完成、未验证与下一步" },
        ],
        caption: "独立执行与统一责任同时成立。",
      },
      notes: [
        "普通 Session 是默认执行单元。需要可见、独立承担责任的协作时使用 Room Partner；私有 Tool Agent 的结果先交给父 Session 核对与整合。",
        "PROJECT.md 与 DECISIONS.md 的 D-001、D-002 确立当前职责：Pi 管执行；Room 管协作身份、显式派发、有序公共事件、取消扇出和一个终态 Root。",
        "工程取舍：分工带来上下文传递、等待与整合成本。任务能由一个 Session 连贯完成时，增加 Agent 数量本身不构成收益。",
      ],
      sources: [ownership, commit("0a9f5c9c", "Room 改为 Pi Sessions 的组合")],
    },
    {
      id: "agents-ownership",
      title: "Pi 执行，Room 组织协作",
      takeaway: "Pi 持有执行循环；Room 持有协作身份、派发和公共事件。",
      visual: {
        kind: "layers",
        nodes: [
          { label: "Pi Session", detail: "模型与 Tool 循环、上下文、停止和恢复" },
          { label: "Light Room", detail: "成员、派发、交接、公共事件与汇总" },
          { label: "PAWOS", detail: "对话、任务和窗口投影相同执行事实" },
        ],
        caption: "每层拥有明确职责，生命周期保持一致。",
      },
      notes: [
        "rag_ime/agent_room_session_dispatch.py 的 RoomSessionDispatchService.dispatch_target() 构建有界任务上下文，再调用普通 host.prompt()。dispatchId 作为 clientMessageId 进入同一 Session 路径。",
        "rag_ime/pi_runtime_v2.py 的 PiRuntimeHostManager.prompt() 发送 session.prompt，接纳回执、Steer 与 Stop 继续通过 Pi Host 的并发请求边界处理。源码范围为当前 v2 适配器，安装版本验收独立记录。",
        "工程取舍：复用生命周期减少重复状态的一致性维护；Room 的执行控制受 Pi 的接纳、取消与恢复语义约束。固定事务流程与跨服务补偿属于另一个设计问题。",
      ],
      sources: [commit("0a9f5c9c", "收敛 Session 执行归属"), commit("9e706207", "Pi 原生 Session 与 Room 工作台")],
    },
    {
      id: "agents-tool-chain",
      title: "Tool 执行与公共事件链",
      takeaway: "execute 调用 Gateway；Pi 事件投影为文本与 Tool 状态。",
      visual: {
        kind: "flow",
        nodes: [
          { label: "Tool 请求", detail: "Pi 调用注册的 execute，携带调用身份" },
          { label: "实际执行", detail: "Gateway 路由到能力 owner，返回结果" },
          { label: "Pi 事件", detail: "分别报告开始、进展、结束或失败" },
          { label: "公共投影", detail: "绑定 Session、turn、dispatch 与 Root" },
          { label: "工作窗口", detail: "从快照与事件流显示文本和 Tool 卡片" },
        ],
        caption: "模型输出、业务操作与前端呈现各有来源。",
      },
      notes: [
        "integrations/pi/rag-ime-control.ts 通过 pi.registerTool() 注册 execute()；callGateway() 发送 sessionId、toolCallId、参数和取消信号，再返回受限的 Tool 结果。",
        "rag_ime/pi_runtime_v2.py 的 _handle_host_event() 接收 assistantMessageEvent.text_delta，并把 tool_execution_start/update/end 映射为 tool_started/progress/finished。适配器转发已有事件，不生成模型 token。",
        "AgentEventProjectionService.mirror_to_room() 处理公共归属；control-center-web/src/contracts/room-reducer.ts 的 reduceRoomEvent() 负责有序归并。逐字出现的文字只说明流式呈现，业务成功还需要对应回执与结果核对。",
      ],
      sources: [featureSlice, commit("96aab4e8", "Room 流式进展与共享渲染"), commit("43de6111", "Room、Trace 与桌面交付")],
    },
    {
      id: "agents-ack-gap",
      title: "ACK 缺口与执行归属恢复",
      takeaway: "派发身份与 Session turn 绑定后，公共进度才归属到 Root。",
      visual: {
        kind: "flow",
        nodes: [
          { label: "已派发", detail: "协作层提交任务，Pi 可能已经接纳" },
          { label: "回执未知", detail: "确认途中中断，执行结果尚不能断言" },
          { label: "恢复关联", detail: "核对 Session turn、dispatch 与 Root" },
          { label: "恢复结果", detail: "原执行事件重新归并，继续与取消可路由" },
        ],
        caption: "超时、失败、取消和完成需要分别处理。",
      },
      notes: [
        "既有项目记录包含 Dispatch 已被 Pi 接纳、协调层尚未记录 ACK 就崩溃的反例。当前架构将执行归属留在 Pi，并通过派发身份和回执恢复协作关系。",
        "rag_ime/agent_room_turn_registry.py 的 begin()/accept() 维护待确认派发与真实 Session turn 的绑定；allows_room_event() 限制没有已接受 Room 派发的 Session 事件进入公共进度。",
        "69ccce70 修复未路由 Session 产生 ghost root 的投影。轻 Room 仍要维护 ACK、重放和取消扇出；删掉重复执行循环没有消除异步协调成本。",
      ],
      sources: [commit("0a9f5c9c", "移除重复执行循环"), commit("69ccce70", "过滤未路由 Session 的幽灵 Root")],
    },
    {
      id: "agents-evidence",
      title: "四条工作线，四份接口交付",
      takeaway: "输入事件进入限定召回；工作事件驱动主会话与伙伴窗口。",
      visual: {
        kind: "layers",
        nodes: [
          { label: "输入事件", detail: "Input Event v2：稳定提交、项目范围、授权与来源位置" },
          { label: "限定召回", detail: "Scoped Recall v2：治理后检索，返回 atomId 与 sourceIds" },
          { label: "协作事件", detail: "Work Event v2：任务、尝试、交付与写入／登记回执" },
          { label: "窗口映射", detail: "4 个 Partner 对应 4 个工作窗口，主 Session 持续保留" },
        ],
        caption: "公开合成回放 · 四份契约文件可在 Room 交付窗口打开。",
      },
      notes: [
        "world.v2.json 的四份交付为 demo/contracts/input-event.v2.json、scoped-recall.v2.md、work-event.v2.md 和 demo/ui/stellar-window-map.json。它们是公开回放数据，原文与稳定 ID 可从来源文件核对。",
        "输入与记忆工作线通过 projectId 和来源身份连接；协作事件保存输入、输出交付 ID 与 attemptId；OS 映射保存主 Session 和四个 Partner 的窗口身份。",
        "完整 world 包含后续评审和修复。当前协作章节停在 Reviewer 发现登记失败导致有效文件回滚；后续修复与八类故障复验在评测章节展开。真实 Pi 并发与原生 macOS 前台验收另有范围。",
      ],
      sources: [{ label: "四条工作线与原始契约文件", href: "/evidence/world.v2.json" }, ownership],
    },
    {
      id: "agents-native",
      title: "PAW Room 协作工作区",
      takeaway: "主会话、伙伴窗口、Tool 与交付文件共用同一 Room。",
      visual: {
        kind: "native",
        id: "agents",
        route: "/agent?room=room-preview",
        title: "真实 PAW Room 协作工作区",
      },
      notes: [
        "工作区包含用户目标、公开进展、Partner 对话、Tool 回执与交付文件。Partner 窗口共享原 Room 身份，主会话保留原目标与汇总位置。",
        "嵌入真实 PAWOS 前端组件，数据为公开合成回放。无私人 Runtime 连接和真实 Provider 调用；文件和状态变化仅作用于演示副本。",
      ],
      sources: [ownership, featureSlice],
    },
  ],
};

export const frontendDeck: PresentationDeck = {
  id: "frontend",
  title: "多 Agent 界面的三次关键转折",
  summary: "结构化 Room 到公开对话，任务控制到 Light Room，空间关系到时间线与真实窗口。",
  slides: [
    {
      id: "frontend-questions",
      title: "公开记录、任务与 Session 窗口",
      takeaway: "公开记录、任务表、协同关系和 Session 窗口投影同一执行状态。",
      visual: {
        kind: "layers",
        nodes: [
          { label: "公开记录", detail: "用户消息、伙伴更新与交付的因果顺序" },
          { label: "任务表", detail: "责任人、任务依赖、阻塞与终态" },
          { label: "协同关系", detail: "伙伴、工作线与交接关系" },
          { label: "Session 窗口", detail: "完整对话、Tools、Steer、Stop 与恢复" },
        ],
        caption: "不同视图共享执行身份，各自呈现不同信息。",
      },
      notes: [
        "历史范围为 2026.07.16–08.29，包含结构化 Room、Kernel 控制面、公开对话、任务图、Light Room、空间关系和时间线窗口。Git 提交证明实现变化，因果归纳属于工程分析。",
        "当前职责对应 PawRoomConversation.tsx、PawRoomRoundSheet.tsx、PawRoomFocusOverview.tsx 与 PawRoomWorkspace.tsx。不同表面展示同一份 Room 事实，不分别创建生命周期。",
      ],
      sources: [commit("43de6111", "Room、Trace 与桌面工作区"), ownership],
    },
    {
      id: "frontend-readable-process",
      title: "转折一：控制面与公开对话",
      takeaway: "成员与角色、Kernel 控制面、公开流式对话依次落地。",
      visual: {
        kind: "timeline",
        nodes: [
          { label: "成员与角色", detail: "07.16：结构化 Room 说明谁在参与" },
          { label: "预算与终态", detail: "07.19：控制面展开约束和执行状态" },
          { label: "连续公开对话", detail: "07.21：消息、Tool 与交付按过程展开" },
        ],
        caption: "结构化身份与控制信息，叠加连续工作记录。",
      },
      notes: [
        "9b320d0d 建立结构化成员与 Room；e62a67f8 增加 Kernel 控制面；96aab4e8 接入 Room 流式进展和共享富内容渲染。",
        "当前工程判断：控制面适合检查约束，对话适合阅读因果。连续对话仍难一眼呈现并行责任、依赖与阻塞，因此后续继续补充任务视图。",
        "图示为对应提交的信息结构重建。现有提交记录不包含这几种布局的同条件可用性对照指标。",
      ],
      sources: [commit("9b320d0d", "结构化 Agent Room"), commit("e62a67f8", "Kernel 控制面"), commit("96aab4e8", "公开流式工作过程")],
    },
    {
      id: "frontend-runtime-owner",
      title: "转折二：任务投影与 Pi 执行",
      takeaway: "0a9f5c9c 将 Room 改为普通 Pi Sessions 的组合。",
      visual: {
        kind: "timeline",
        nodes: [
          { label: "任务卡与依赖", detail: "07.31 起：并行责任和验收变得可见" },
          { label: "重复生命周期", detail: "协调层与 Pi 的取消、恢复语义出现分歧" },
          { label: "Light Room", detail: "08.15：保留任务投影，复用 Pi 执行" },
        ],
        caption: "工作对象继续可见，执行归属收敛。",
      },
      notes: [
        "923a9e14 是 governed Agent/Room Runtime 的阶段性实现。0a9f5c9c 将 Room 改为普通 Pi Sessions 的组合；69ccce70 随后修复无 Room 派发的 Session 事件形成 ghost root。",
        "control-center-web/src/contracts/room-reducer.ts 的 reduceRoomEvent() 拒绝未归属派发的 Session 进度，并处理 Root 终态之后的迟到事件。任务卡呈现这些结果，不解析聊天文案来猜完成。",
        "代价：轻量化仍需准确维护 Root、dispatch、WorkItem 与尝试身份。只删除控制面会损失可观察性，因此公共记录、责任与失败恢复入口必须保留。",
      ],
      sources: [commit("923a9e14", "统一 governed Runtime"), commit("0a9f5c9c", "组合普通 Pi Sessions"), commit("69ccce70", "修复幽灵 Root 投影")],
    },
    {
      id: "frontend-time-and-space",
      title: "转折三：空间关系与纵向时间线",
      takeaway: "ea001717 将圆形轨道改为按身份分列的纵向时间线。",
      visual: {
        kind: "timeline",
        nodes: [
          { label: "星球与卫星", detail: "08.24：用空间层级解释参与者身份" },
          { label: "关系 Mesh", detail: "08.25：把伙伴与工作交接放在同一图中" },
          { label: "纵向时间线", detail: "08.25：按身份分列，按事件顺序排列" },
          { label: "真实窗口", detail: "继续阅读完整对话、Tool 与交付证据" },
        ],
        caption: "身份分列、事件排序、Session 细节保留在窗口中。",
      },
      notes: [
        "7a3e5a74 引入 Session 星球与 Room 太阳系；7283bec7 将任务树和行星列表改为协作 Mesh；ea001717 再把圆形轨道改为纵向时间线。43de6111 记录后续 Room、Trace 与桌面交付。",
        "工程取舍：空间图有助于表达身份和连接，却容易弱化先后顺序；时间线便于追溯因果，长对话和实际操作仍需要独立窗口。3D 还增加 GPU、分辨率、加载与暂停处理成本。",
        "OSHOW 用 3D 作为叙事入口，随后切入真实 PAWOS 工作区。视觉拓扑只解释关系，不决定 Session 或 Room 是否正在运行。",
      ],
      sources: [commit("7a3e5a74", "Session 星球与 Room 太阳系"), commit("7283bec7", "协作关系 Mesh"), commit("ea001717", "纵向时间线替换圆形轨道")],
    },
    {
      id: "frontend-projection",
      title: "快照、事件游标与投影恢复",
      takeaway: "快照恢复历史，游标续接事件，序号缺口触发重读。",
      visual: {
        kind: "flow",
        nodes: [
          { label: "读取快照", detail: "恢复已有消息、任务与执行身份" },
          { label: "续接事件流", detail: "从已确认游标接收后续变化" },
          { label: "校验顺序", detail: "忽略重复，发现缺口后重新读取快照" },
          { label: "归并投影", detail: "保留终态边界与正确派发归属" },
          { label: "更新窗口", detail: "对话、任务与协同视图共享同一结果" },
        ],
        caption: "连接恢复与工作完成分别判断。",
      },
      notes: [
        "control-center-web/src/features/rooms/runtime/use-room-live-session.ts 先读取 snapshot，再通过 resumeToken 订阅 agent.room.events；room-reducer.ts 的 reduceRoomEvent() 按 sequence 归并，缺口触发 snapshot-required。",
        "这条源码链支撑重复过滤、断线恢复与终态防护。实际安装版本的多窗口、长时间重连和移动端体验仍需前台验收；不能从构建通过或演示截图推导全部通过。",
        "当前实现用一个 Runtime 事实源驱动多种视图。复合视图增加导航、响应式布局与投影维护成本。",
      ],
      sources: [commit("69ccce70", "Session 与 Room 投影恢复"), commit("43de6111", "Room 与桌面交付"), ownership],
    },
    {
      id: "frontend-native",
      title: "PAW 上下文检查工作区",
      takeaway: "上下文检查展示逐轮输入、来源关系与片段内容。",
      visual: {
        kind: "native",
        id: "framework-overview",
        route: "/context-debug",
        title: "真实 PAW 上下文检查工作区",
      },
      notes: [
        "PAWOS 的 /context-debug 路由加载 ContextDebugFeature，展示逐轮上下文记录、来源与片段。展示内容来自已有上下文投影。",
        "工作区使用真实前端与公开合成数据，无个人上下文读取和真实模型推理。",
      ],
      sources: [featureSlice, commit("43de6111", "PAWOS 工作区交付")],
    },
  ],
};
