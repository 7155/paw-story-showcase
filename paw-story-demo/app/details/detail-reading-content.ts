export type ReadingExample = { title: string; paragraphs: string[] };
export type ReadingSection = {
  explanation: string[];
  example?: ReadingExample;
};
export type ReadingArticle = {
  title: string;
  introduction: string;
  example: ReadingExample;
  sections: Record<string, ReadingSection>;
};

export const readingArticles: Record<string, ReadingArticle> = {
  agents: {
    title: 'PAW 多 Agent：执行归属、交接与恢复',
    introduction: 'PAW 将 Room 收敛为普通 Pi Sessions 的组合：Pi 持有模型与工具循环，Room 保留派发、公共事件和一个终态 Root。关键改动集中在派发与真实执行轮次的绑定，以及 ACK 丢失、迟到事件和取消时的状态归属。',
    example: {
      title: '一个输入助手，需要四条工作线',
      paragraphs: [
        '示例需求：一个能记住纠正、又不会把草稿存进长期记忆的输入助手。输入伙伴定义稳定提交事件，记忆伙伴实现保存与召回，协作伙伴记录任务和回执，界面伙伴接入同一组状态。',
        '下面用 PAW 的公开合成任务说明这条链路。每条工作线都有具体交付文件，可以在文末的真实工作区中打开。',
      ],
    },
    sections: {
      'agents-objective': {
        explanation: [
          '主 Session 保留原始目标，Partner 各自使用独立上下文执行有界任务。交接包含目标、范围、验收条件、输入引用与输出交付；下游读取已交付的接口，而不是复制所有伙伴的完整对话。',
          '公开任务按输入、记忆、协作事件和 OS 四条工作线分工。输入事件格式是记忆工作的前置依赖；窗口布局可以并行推进，最终再接入相同身份与回执。主 Session 核对交付后形成一次 Root 汇总。',
        ],
        example: { title: '先交接口，再继续下游工作', paragraphs: [
          '输入伙伴交出 Input Event v2，里面有 projectId、phase 和 consent。记忆伙伴据此约定：只处理 phase=committed 且已授权的输入。界面伙伴可以先设计窗口，等事件字段确定后再接入真实状态。',
          '主会话始终保留最初的要求。即使打开了四个伙伴窗口，用户仍在原来的主会话里继续追问和接收汇总。',
        ] },
      },
      'agents-ownership': {
        explanation: [
          'RoomSessionDispatchService.dispatch_target() 构造有界任务上下文，调用普通 host.prompt()，并把 dispatchId 作为 clientMessageId 进入 Pi。PiRuntimeHostManager.prompt() 再发送 session.prompt；Room 不另起模型或工具循环。',
          '0a9f5c9c 将 Room 改为 Pi Sessions 的组合，收敛重复的执行生命周期。代价是派发绑定、ACK 恢复、公共投影和取消扇出仍需协调层维护；轻量化没有消除这些异步边界。',
        ],
        example: { title: '用户中途要求停止', paragraphs: [
          '主会话发起停止 → Room 把停止请求送到本次已派发的伙伴 → 各伙伴的 Pi 处理取消 → Room 收集结果并更新任务状态。已经完成的文件与尚未结束的调用仍分别保留记录。',
        ] },
      },
      'agents-tool-chain': {
        explanation: [
          'integrations/pi/rag-ime-control.ts 用 pi.registerTool() 注册 execute()。callGateway() 携带 sessionId、toolCallId、参数和取消信号，把调用交给能力 owner；结果沿同一工具边界返回。',
          'Pi 的 tool_execution_start/update/end 被适配为 tool_started/progress/finished。AgentEventProjectionService.mirror_to_room() 处理 Room 公共归属，reduceRoomEvent() 按事件顺序更新前端。文本增量和业务回执因此有各自的来源。',
        ],
        example: { title: '“正在写文件”与“文件已写入”是两个时刻', paragraphs: [
          '开始事件让界面显示工具正在运行；成功回执说明写入操作已完成；交付记录再提供文件入口。读者可以从工具卡片继续打开文件，核对文件里是否真的包含约定的输入字段。',
        ] },
      },
      'agents-ack-gap': {
        explanation: [
          '实际故障窗口位于“Pi 已接纳派发”和“Room 已记录 ACK”之间。协调层在此处崩溃，会留下仍在执行的 Session 和尚未确认的派发；把未知状态直接归类为失败，会产生错误重派或漏记交付。',
          'agent_room_turn_registry.py 的 begin()/accept() 维护待确认派发与真实 turn 的绑定，allows_room_event() 限制未归属派发的事件进入公共 Root。69ccce70 随后修复了未路由 Session 形成 ghost root 的投影问题。',
        ],
        example: { title: '伙伴已经开始，主窗口却显示等待', paragraphs: [
          '派发 D-17 被伙伴接收，伙伴进入执行轮次 T-8；随后确认连接中断。恢复时先核对 D-17 与 T-8 的关联，再续接这一轮的事件。D-17、T-8 是用于解释关联关系的示意编号。',
          '直接再派发一次，会带来重复执行的风险；直接宣布失败，也可能遗漏已经完成的工作。',
        ] },
      },
      'agents-evidence': {
        explanation: [
          '这四份文件把分工变成了可以检查的接口：输入事件提供来源，限定召回返回当前有效的记忆，工作事件记录一次尝试的交付和回执，窗口映射让每个伙伴始终回到自己的工作窗口。',
          '其中“文件写入”和“文档登记”有各自的回执。文件已经写成功而登记失败时，应保留有效文件、单独重试登记。公开任务中的 Reviewer 正是在交付后发现了这个问题；后续修复与复验在评测专题继续展开。',
        ],
      },
      'agents-native': {
        explanation: ['在下面的工作区中，可以沿着消息、伙伴交付和文件继续核对。自动流程会实际点击组件中的入口，也可以暂停后自己操作。工作区使用真实 PAW 前端，执行记录为公开合成回放。'],
      },
    },
  },
  context: {
    title: 'PAW Memory：来源、生命周期与限定召回',
    introduction: 'PAW 将原始输入与当前有效条目分开保存。稳定提交先经过治理，召回再限定 project、owner 与 scope；纠正和撤销状态跨重新导入、回放与上下文恢复持续生效。',
    example: {
      title: '从“先试深色”，到“改用白色和冷灰”',
      paragraphs: [
        '公开合成记录里，用户先提出深色主页，后来纠正为白色和冷灰。下一次讨论 PAW 页面时，助手应该采用后来的决定，同时还能说明这个决定来自哪次输入。',
        '旧话仍然是可追溯的来源，却不能继续作为当前偏好。这个例子贯穿采集、纠正、检索和上下文恢复。',
      ],
    },
    sections: {
      'context-owners': {
        explanation: [
          '项目决定、Knowledge 文档版本和 Memory 生命周期使用各自的事实源。上下文装配保留来源引用，避免把摘要副本升级成原始决定或当前有效记忆。',
          '公开回放的 Scoped Recall v2 要求传入 projectId、query、sourceKinds 和 maxItems，返回 atomId、sourceIds、适用范围和选取理由。调用方既拿到内容，也保留进一步回溯的入口。',
        ],
        example: { title: '同一个问题，可能需要三类材料', paragraphs: ['询问“输入助手应怎样保存纠正”时，项目文档提供接口约定，Knowledge 提供检索方案，Memory 提供用户已经确认的偏好。模型拿到的是为这个问题选择的材料，而不是全部历史。'] },
      },
      'context-capture': {
        explanation: [
          '输入过程中会出现拼音组合、草稿、语音临时识别和最后提交等阶段。只有稳定提交才有资格进入后续整理，之后仍需检查授权、敏感内容和有效状态。稳定历史条数因此不等于长期记忆条数。',
          '这里的 64、58 和 6 来自同一份公开合成来源集：64 条来源中，58 条已提交，6 条处于其他阶段。这个分组解释了哪些记录首先被排除，不能把 58 条都当成已保存的长期记忆。',
        ],
        example: { title: '打到一半的文字不应成为用户偏好', paragraphs: ['用户先输入一段拼音，又删掉重打，最后提交“主页改用白色”。拼音组合和删除过程只属于临时输入状态；最后这句已提交文本才进入授权检查与记忆整理。'] },
      },
      'context-lifecycle': {
        explanation: [
          '治理过程同时维护条目集合和被替代／撤销的来源状态。再次导入旧来源时先检查失效关系，避免仅靠“当前集合里不存在”就重新创建条目。Undo 也必须同时恢复集合与关系。',
          '下方对照取自公开合成来源：主题风格被纠正、学习进度被更新、昵称保留许可被撤销。这三种变化都需要更新“现在可用的内容”，而不是只向历史末尾追加一句话。',
        ],
        example: { title: '重新读到旧话，也不恢复旧偏好', paragraphs: ['source-003 已纠正 source-002 的深色方案。之后即使重新导入 source-002，当前集合也不应再次出现“主页使用深色”。若撤销这次整理，恢复的应同时包含条目和替代关系。'] },
      },
      'context-retrieval': {
        explanation: [
          '当前调用链为 SessionMemoryRecallBuilder.build → HybridRagQuery → retrieve_hybrid_rag_candidates → _active_docs。SQL 先限定 active、project/app、owner 与 scope，再执行有界检索；权限过滤不依赖后置的相似度阈值。',
          '返回片段保留来源 ID、应用和时间。这个顺序会牺牲一部分隐含跨项目背景，需要调用方显式扩大范围；相似度更高的越域内容不会自动进入本轮上下文。',
        ],
        example: { title: '相似度最高的一条，也可能不可用', paragraphs: ['当前问题是“PAW 主页用什么底色”。其他项目的一条深色设计建议即使更相似，也不应越过项目范围；PAW 里已被纠正的旧建议同样被排除，最终使用当前有效的白色／冷灰决定。'] },
      },
      'context-recovery': {
        explanation: [
          'Pi 持有 Session 的上下文与压缩生命周期。恢复材料保留原目标、已接受决定、未完成项和下一步；最终消息与原始历史、来源片段分别保留可检查的对应关系。',
          '恢复摘要不覆盖 Memory 的治理状态。本轮召回仍检查有效来源，避免旧摘要把已经撤销或被纠正的内容重新带回当前认识。',
        ],
        example: { title: '压缩前后，用户的纠正继续有效', paragraphs: ['旧对话曾讨论深色主页，当前有效决定已经改为白色／冷灰。恢复后继续做界面时，应携带当前决定及其来源；旧讨论可以用于解释过程，但不能重新变成设计要求。'] },
      },
      'context-native': {
        explanation: ['下面用另一条公开示例演示来源回溯：从“PAW · 写入、登记与恢复”主题，打开当前认识，再回到原始输入的正文、应用和时间。读者可以核对一条记忆到底依据了什么。'],
      },
    },
  },
  input: {
    title: 'MiniMind-IME 训练与 AIOS 推理优化',
    introduction: '目标是本地短前缀补全：以冻结输入约束候选质量，以完整 Top-3 的尾延迟检查响应。实现分为 Completion 训练、模型对照和 Runtime 优化三段，分别保留输入协议、结果与适用范围。',
    example: {
      title: '用户已经输入“登记失败”',
      paragraphs: ['补全可以尝试接上“只重试登记”等后续文字；用户也可能马上继续输入或退格。系统需要利用稳定前缀生成多条候选，并避免旧请求的结果覆盖新输入。这里的句子是解释机制的示例，不是模型实测输出。'],
    },
    sections: {
      'input-boundaries': {
        explanation: [
          '集成边界保留 Rime 的拼音解析、候选分页与提交；MiniMind-IME 接收稳定中文前缀，AIOS-IME 持有 Prefix KV、分支生成和 Top-3 选择。被动按键路径保持本地且有界，复杂工具任务由显式 Agent 入口发起。',
          '模型补全与原生候选保持可区分，避免将生成排序侵入 Rime 解码。Input Studio 的词库更新是另一条维护路径，也有独立回执和撤销。',
        ],
        example: { title: '拼音解码与中文续写的输入不同', paragraphs: ['拼音组合仍在编辑时，由 Rime 决定汉字候选；已有稳定中文“登记失败”后，补全模型才以这段中文为条件尝试续写。用户选不选建议，不影响原生输入路径继续工作。'] },
      },
      'input-training': {
        explanation: [
          'Completion SFT 沿 prefix/target 边界构造 labels：prefix 位置设为 −100，保留为条件；损失只累积在待续写部分。既有流程包含文本过滤、去重、继续预训练和冻结生成评测，评测样本标记 train_eligible=false。',
          '生成验收在 loss 之外分别检查整句命中、候选多样性、规则违规和尾延迟。训练样本与冻结评测样本隔离，避免同一输入同时用于优化参数和证明生成质量。',
        ],
        example: { title: '一条训练样本怎样切分', paragraphs: [
          '示意文本：“登记失败只重试登记。”条件前缀是“登记失败”，训练目标是“只重试登记。”模型读取整条样本，但只在目标部分累积损失，避免把“复述已输入内容”当成主要任务。',
          '实际样本按 tokenizer 的 token 边界对齐 labels，避免字符切分与分词边界不一致；上面仅展示样本组织形式。',
        ] },
      },
      'input-models': {
        explanation: [
          '对照固定 40 个前缀、[BOS]+裸中文、同 seed、BF16 和 RTX 4080 Laptop；max_new_tokens=12，首轮 8 路，最多 24 路补采样。计时对象是完整 Top-3，排除模型加载与 JIT。',
          '这份结果支持 MiniMind 0.1B 在该协议下比两个 Qwen3 模型更快，同时明确违规更少。0.06B 还要更快，因此速度本身不能证明 0.1B 是所有场景的最佳选择；自然度和较长补全仍需要自己的比较。',
        ],
        example: { title: '怎样读懂 40/40 与 0/120', paragraphs: ['40 个前缀各要求三条候选，共 120 条。0.1B 在 40 个请求里都返回了三条互异候选，规则检查发现的明确违规为 0/120。这两个计数分别衡量候选是否齐全、是否触发已定义规则，不能解读成“自然度 100%”。'] },
      },
      'input-runtime': {
        explanation: [
          'AIOS ime.py 的调用链为 complete → _complete_locked → _prepare_prefix。token_longest_common_prefix 比较 token ID，保留稳定前缀页、释放变化尾部；不能仅凭字符前缀决定 KV 复用。',
          '_generate_branch_batch 以 CandidateGroup 推进分支，各分支保留后续状态；select_top_candidates 进行合法性、显示去重和多样性选择。new_generation 取消旧代际，让旧请求的迟到结果失效。',
        ],
        example: { title: '缓存复用看 token，不只看相同汉字', paragraphs: [
          '假设旧输入分成 [41, 72, 9]，新输入分成 [41, 72, 16]，前两个 token 相同，可以复用对应前缀状态；从第三个开始重新处理。这些编号只是计算示意，不是实际分词结果。',
          '用户退格或修改尾部时，即使字符串仍有共同部分，也要重新核对 token 边界。若缺少继续生成所需的尾部状态，就重新做前缀计算。',
        ] },
      },
      'input-latency': {
        explanation: [
          '这组对照固定 MiniMind 0.1B BF16，5 次预热后运行 30 个计时请求；首轮 8 路、最多 12 路候选。比较 PyTorch 串行基线与 AIOS，计时包含 prefill、decode 和后处理。',
          '它使用 30 个计时请求，候选采样上限也与上面的 40 前缀模型比较不同。两张表各自回答模型选择和运行实现的问题，不能把数字拼接成一次实验。',
        ],
        example: { title: '速度改善与输入体验分别验证', paragraphs: ['p50 从 258.64 ms 到 81.98 ms，说明该协议下的完整候选生成更快。它还没有测量按键到原生候选显示的整条前台链路，也没有用这一个延迟数字证明候选更自然。'] },
      },
      'input-native': {
        explanation: ['Input Studio 展示输入能力的配置与维护入口。下面可以选择词条、加入词库，再撤销这次更新并查看回执。这是使用合成词条的真实前端操作，不是上面 GPU 补全基准的重跑。'],
      },
    },
  },
  sandbox: {
    title: 'PAW 评测：冻结对照、失败候选与修复复验',
    introduction: '评测同时保留任务终态、逐项业务验收和 Runtime 回执。模型替换、Prompt 适配与运行后重评分分别记录；候选通过当前质量条件后，才进入成本比较和采用。',
    example: {
      title: '文件写成功，文档登记却失败了',
      paragraphs: ['公开故障示例中，文件已经写入，辅助登记服务返回 503。旧流程把整个任务回滚，删掉了有效文件。修复应该保留文件、只重试登记；评测需要实际检查文件和回执，才能判断这个修改有没有解决问题。'],
    },
    sections: {
      'execution-and-quality': {
        explanation: ['当前 RAG 基线的 outputProtocolRate=1、toolSuccessRate=1，引用事实硬门却未通过。实现分别记录输出协议、Tool 回执、答案正确性、逐事实引用支持和拒答；EnterpriseOps 也把 taskSuccessCount 与 verifierPassCount 分开统计。'],
        example: { title: '搜索成功，回答仍可能不合格', paragraphs: ['工具顺利返回了资料，模型也按要求输出 JSON，但答案漏掉一条必要事实，或者引用并不支持结论。工具成功率可以是 100%，这次业务验收仍应失败。当前 RAG 回执中就分别记录了这两类结果。'] },
      },
      'frozen-controls': {
        explanation: [
          '冻结语料 manifest、split、case、工具和 Runtime 身份；Host 持有的 Gold、qrels 和核验器不进入执行 Agent 上下文。三阶段分别是 Sol 基线、仅替换 Luna、固定 Luna 后适配通用 Prompt。',
          'RAG r6 在运行后校准标准，对三个已有阶段统一评分，candidateAware=true、candidateBlind=false。它没有新增 Provider、Judge 或候选运行，也没有新增 Held-out，因此保留为候选可见重评分结果。',
        ],
        example: { title: '把“换模型”和“换提示词”拆开比较', paragraphs: ['同一组任务先运行 Sol 基线，再保持其他条件换成 Luna；如果质量不过关，保留失败记录。下一阶段固定 Luna，只调整通用提示约束，再重新比较。这样，失败和恢复发生在哪一步是可追踪的。'] },
      },
      'retrieval-ranking': {
        explanation: [
          '这份历史检索实验在 5,101 篇文档、29,846 个向量上，用 16 个 Validation 问题比较 14 个候选配置。表中保留词法基线与 hybrid + rerank 的 MRR、Recall@10 和 nDCG@10。',
          '候选选择发生在同一 Validation 集上，selected 尚不等于 promoted；未做 Held-out，P@K 也未报告。后续回答实验没有重测这组检索指标，两轮数据保持独立。',
        ],
        example: { title: '找资料和写答案，是两道检查', paragraphs: ['例如询问“登记失败后文件应该怎么处理”，检索首先应找到解释写入与登记边界的文档。文档排得越靠前，模型越容易看到；但模型是否正确使用这段文档，仍需下一阶段的回答评测。'] },
      },
      'retrieval-measures': {
        explanation: [
          '计算示例固定 3 份相关资料，截取前 K 个返回项。Precision@K=命中数/K，Recall@K=命中数/3，RR@K=首个命中名次的倒数；nDCG 使用相同 K 下的理想排序归一化。',
          '该交互用于核对分母和截断口径，不产生实验结果。当前回答实验的“引用事实覆盖”没有进入这些检索指标，避免把两种质量分数混用。',
        ],
      },
      'answer-evidence': {
        explanation: [
          '回答评测进一步核对：答案结论对不对，引用是否覆盖需要说明的事实，资料不足时有没有拒答。这里的四个案例包括两个可回答问题和两个应拒答问题；引用事实总数是 9，因此 9/9 与 4/4 是不同的分母。',
          '下方阶段记录显示基线、仅换模型和适配提示后的结果。r6 使用候选可见的统一重评分，尚未做独立 Held-out，也没有在这一轮重测检索 MRR 或延迟。',
        ],
        example: { title: '引用一篇文档，不等于每句话都有依据', paragraphs: ['假设答案说“文件保留，登记最多重试三次”，而来源只说明“文件保留、登记单独重试”。前半句有支持，“最多三次”没有。这个示例说明为什么引用检查要细到事实，而不能只数答案末尾有几个链接。'] },
      },
      'current-quality': {
        explanation: [
          '不同任务要用不同标准：客户运营检查业务约束，RAG 检查回答和引用，CloudOps 检查故障根因，Memory 检查条目及治理行为。CloudOps 的 CA 表示组件定位正确，JRA 表示组件与故障类型同时正确。',
          '表中的记忆决策次数和 atom 数量说明发生了多少工作，不是正确率。四行结果保留自己的案例数量和验收范围，因此不能合并成一个“系统总准确率”。',
        ],
      },
      'mock-and-faults': {
        explanation: [
          '下面四组公开业务案例由本地规则执行：客户分配、资料检索、事故诊断和记忆治理都能产生实际的演示状态变化，再逐案例检查结果。它们是可操作的开发样例，不是新的模型推理实验。',
          '案例数也不等于资料数。例如 RAG 有 22 份文档和 24 个检查案例，同一份资料可以参与多个问题。导出的 App 带着相同的数据和执行逻辑，离线打开后可以继续操作。',
        ],
        example: { title: '用反例检查业务规则', paragraphs: ['客户负责人容量不足时，应拒绝转交；当前项目找不到依据时，应拒答；一条记忆已被撤销，再导入原始来源也不应让它复活。正常成功和这些反例共同决定案例是否通过。'] },
      },
      'recovery-faults': {
        explanation: [
          '修复评测回到开头的文件与登记故障。八类固定故障从相同的虚拟工作区出发，分别执行原流程、省步骤候选和修复候选，再检查文件内容、写入次数、登记状态和回执恢复。',
          '省步骤的候选可能更便宜，却仍遗漏回执未知等情况。只有通过当前冻结检查的候选才能被采用；改变输入或规则后，旧报告不能继续授权本轮采用。',
        ],
        example: { title: '登记明确失败，与写入结果未知，恢复动作不同', paragraphs: ['文件写入成功、登记返回 503：保留文件，只重试登记。写入超时且结果未知：先回读当前文件并核对本次操作，再决定是否重试，防止产生第二次业务写入。', '这些检查实际运行在网页内的固定虚拟工作区，不代表生产文件系统或真实网络并发已经通过同样验证。'] },
      },
      'native-lab-workflow': {
        explanation: ['下面的 Lab 使用真实前端完成导入数据、运行本地逐题测评、生成 App 和导出。可以暂停自动步骤，查看案例输入、输出和检查结果，再试用生成的应用。'],
      },
    },
  },
  frontend: {
    title: 'PAWOS 演进：公共记录、任务投影与工作窗口',
    introduction: 'PAWOS 的几次重构围绕并行责任、执行归属和恢复展开：公开记录补上因果顺序，Light Room 收敛生命周期，时间线与独立窗口保留任务关系和执行细节。下面按对应提交说明取舍。',
    example: {
      title: '输入伙伴交付后，记忆伙伴才能继续',
      paragraphs: ['沿用输入助手的公开合成任务：输入伙伴先确定事件字段，记忆伙伴据此实现治理规则，界面伙伴把来源与状态显示出来。用户既要看清交接顺序，也要能打开某个伙伴的完整对话和交付文件。'],
    },
    sections: {
      'frontend-questions': {
        explanation: [
          '公开记录按时间说明发生过什么，任务表列出责任人、依赖和阻塞，协同关系图展示谁与谁交接，Session 窗口保留某条执行的完整细节。它们观察同一个任务，但回答不同的问题。',
          '这些视图共享执行身份。用户换一个查看角度，不应该因此创建新会话，也不应该看到互相矛盾的完成状态。',
        ],
        example: { title: '同一份交付，三个查看入口', paragraphs: ['任务表说明“输入事件契约由输入伙伴负责”；公开记录说明它何时交给记忆伙伴；伙伴窗口提供原始对话、工具回执和文件。读者可以从概览一路追到具体内容。'] },
      },
      'frontend-readable-process': {
        explanation: [
          '早期成员与角色结构解决“谁参与”，控制面补充预算和终态，连续公开对话再把消息、工具进展和交付串起来。一个面板能显示约束，并不意味着读者能读懂事情为什么走到这一步。',
          '公开对话让因果顺序更容易阅读，但很长的对话仍不适合一眼查看并行责任。因此后来继续增加任务视图，而不是要求一种布局承担所有信息。',
        ],
        example: { title: '“等待中”需要补充原因', paragraphs: ['只看成员列表，只知道记忆伙伴正在等待。公开记录补充“正在等输入事件字段”；任务表再把这条依赖连到输入伙伴。读者才知道应该关注哪项交付。'] },
      },
      'frontend-runtime-owner': {
        explanation: [
          '任务卡和依赖可以保留在界面中，执行生命周期则应回到 Pi。Light Room 把协作建立在普通 Pi Sessions 上，减少协调层与 Pi 分别决定取消、恢复和完成时产生的冲突。',
          'reduceRoomEvent() 以派发身份、sequence 和 Root 终态约束公共进度；消息、任务和工具卡片复用这个状态。69ccce70 对 ghost root 的修复说明了归属过滤为何必须发生在投影边界。',
        ],
        example: { title: '伙伴的普通聊天，不自动变成协作任务', paragraphs: ['某个 Session 自己产生了消息，如果它没有属于当前 Room 的有效派发，消息不应被拼进 Room 的主任务。派发身份决定归属，不能只看作者是不是同一个伙伴。'] },
      },
      'frontend-time-and-space': {
        explanation: [
          '星球和关系网络容易表达参与者与连接，却不擅长说明先后顺序。纵向时间线把身份分列、把事件按顺序排列；独立窗口再承载长对话和实际操作。',
          '这里列出的是项目实现的几次变化。空间关系、时间顺序和操作细节各有合适的表达方式，历史提交本身没有提供这些布局的同条件可用性实验。',
        ],
        example: { title: '一条连线与一次交接表达不同信息', paragraphs: ['输入伙伴与记忆伙伴有连线，说明双方相关；时间线上“输入契约已交付 → 记忆规则开始实现”，才说明这次工作的因果顺序。打开窗口还能继续核对契约的真实字段。'] },
      },
      'frontend-projection': {
        explanation: [
          'use-room-live-session.ts 先读 snapshot，再通过 resumeToken 订阅 agent.room.events。reduceRoomEvent() 按 sequence 归并，过滤重复；序号缺口返回 snapshot-required，触发重新读取。',
          'Root 终态和 dispatch 归属继续约束重连后的迟到事件，避免已完成任务回到运行中。这条链恢复前端投影，原 Session 的执行和恢复仍由 Pi 持有。',
        ],
        example: { title: '断线后收到重复和缺失事件', paragraphs: ['界面已确认到事件 18，重连时再次收到 18，可以跳过它；接着直接收到 20，说明中间可能缺了 19，应重读快照补齐状态。编号是机制示例，展示的是恢复判断。'] },
      },
      'frontend-native': {
        explanation: ['下面打开真实上下文检查器：选择某一轮，展开当时的系统指令，并生成报告。它让读者核对某次模型调用实际装配了哪些内容；公开演示中的记录使用合成数据。'],
      },
    },
  },
};
