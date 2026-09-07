// Reproducible public diagram redraw. Facts are transcribed from the existing
// project-owned SVGs; measurements and training paths are never interpolated.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/evidence/", import.meta.url));
const esc = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const text = (x, y, value, cls = "body") => `<text x="${x}" y="${y}" class="${cls}">${esc(value)}</text>`;
const frame = (title, subtitle, content, height = 740) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">${esc(subtitle)}</desc><metadata>PAW public source-grounded redraw, 2026-09-05. Renderer: scripts/render-story-diagrams.mjs. Existing diagram facts retained; no new measurements.</metadata><style>text{font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif}.title{font-size:34px;font-weight:600;fill:#22272d}.sub{font-size:18px;fill:#5d6570}.body{font-size:21px;fill:#22272d}.label{font-size:16px;fill:#5d6570}.accent{font-size:19px;fill:#5447a0;font-weight:600}.small{font-size:15px;fill:#5d6570}</style><rect width="1200" height="${height}" fill="#fafaf7"/>${text(48,64,title,"title")}${text(48,102,subtitle,"sub")}<path d="M48 128 H1152" stroke="#dddeda"/>${content}</svg>`;
const row = (y, number, title, detail) => `<rect x="48" y="${y}" width="1104" height="82" rx="3" fill="${number % 2 ? "#efefec" : "#fafaf7"}"/>${text(68,y+48,String(number).padStart(2,"0"),"accent")}${text(124,y+34,title)}${text(124,y+63,detail,"label")}`;
const list = (title, subtitle, rows, footer) => frame(title,subtitle,rows.map((r,i)=>row(154+i*90,i+1,...r)).join("")+text(48,180+rows.length*90,footer,"small"),220+rows.length*90);
const emit = (name, svg) => writeFileSync(`${root}${name}.svg`,svg+"\n");

emit("agents/paw-runtime-ownership",list("PAW：谁负责执行，谁负责协作？","运行责任分开，用户看到同一条工作链。",[
  ["用户 Goal 与控制","提出目标、补充要求，并控制继续与停止。"],
  ["Pi Session","Transcript、Agent / Tool loop、上下文、Steer / Stop 与恢复。"],
  ["Room","围绕 Session 增加身份、显式派发、公共顺序与一个汇总结果。"],
  ["Tool Gateway","接收策略内工具调用，检查合同与权限，返回执行回执。"],
  ["Memory / Knowledge","按当前任务检索获准的有界上下文，保留各自来源。"],
  ["Trace / Eval 与 PAWOS","Trace 记录执行，Eval 对照案例；界面投影同一份运行状态。"],
],"Session 执行 → 结果与事件 → 状态投影；Room 不创建第二套 Agent loop。"));
emit("agents/project-story-spine",list("一个任务，怎样成为下一次工作的起点？","PAW 展示主线：目标、交付、验证、改进与继续。",[
  ["提出任务","先说明用户要什么，以及什么结果才算有用。"],
  ["协作交付","独立责任并行推进，依赖通过交接解决，最后汇总。"],
  ["评测问题","原始要求对照实际行为、测试与 Trace，定位具体缺口。"],
  ["验证并保留改进","比较候选、检查其他样本；有效时保留，退步时拒绝。"],
  ["下一次继续工作","已采用的策略与按需召回的上下文支持后续任务。"],
],"每个案例分别标明合成回放、实验结果和适用范围。"));
emit("agents/paw-feature-slice",list("从一个需求，到一份可以检查的交付","按可观察结果连接各层责任。",[
  ["用户 → PAWOS","提出目标和可观察验收；界面提交 typed intent。"],
  ["Room → Pi Session","按需要分派工作；Session 计划并执行最小纵向闭环。"],
  ["Pi Session → Tool Gateway","在已授予范围内执行工具，返回结果与回执。"],
  ["AgentResult → Facilitator","整合各项结果、依赖与未完成项，形成一个终态。"],
  ["Trace / Eval → 改进决策","固定案例检查结果；Keep / Reject / Promote 标明范围。"],
  ["Runtime 事件 → PAWOS","投影同一份运行状态；失败返回具体责任方继续处理。"],
],"图中箭头表示信息与结果的传递，不代表每步新增一次审批。"));
emit("aios-ime/runtime-architecture",list("AIOS-IME：一次按键，到三条候选","Local single user · one Prefill · complete Top-3",[
  ["Chinese prefix → Tokenizer","对当前中文前缀重新分词，计算 token-LCP。"],
  ["Prefix Prefill","稳定 token 前缀复用 KV，新尾部只执行一次 Prefill。"],
  ["Candidate Group","8 条独立候选共享前缀，按仍活跃的 decode rows 推进。"],
  ["Filter / Dedup / MMR","保留 raw LM score，过滤、去重并选择不同的候选。"],
  ["Top-3 → Candidate Bar","显示完整三条中文后缀，等待用户选择或下一次按键。"],
],"主路径直接生成中文后缀，不要求经过拼音词典召回。"));
emit("aios-ime/prefix-kv",list("Prefix KV：按 token 复用，按新输入接管","重新分词 → 找到稳定前缀 → 重算变化尾部。",[
  ["上一次按键","没关系，你先忙你 · 3497 243 192 144 297 518 3035 297"],
  ["当前按键","没关系，你先忙你的， · 3497 243 192 144 297 518 3559 243 192 144"],
  ["token-LCP = 6","只复用前 6 个稳定 token；字符前缀长度不能代替 token-LCP。"],
  ["重算发生重切的尾部","3035 + 297 → 3559 + …；避免复用不对应的旧 KV。"],
  ["latest-wins","旧候选组在 token-step 边界失效，丢弃旧输出并释放缓存。"],
],"只有当前 generation 的候选组可以继续显示。"));
emit("aios-ime/vllm-comparison",frame("相同推理原语，不同工作负载","Paged KV · Prefix Cache · Parallel Sampling",`
  <rect x="48" y="162" width="532" height="386" fill="#efefec"/><rect x="620" y="162" width="532" height="386" fill="#efefec"/>
  ${text(76,210,"vLLM · 通用服务","title")}${text(648,210,"AIOS-IME · 本地输入","title")}
  ${text(76,275,"多个用户的独立请求")}${text(648,275,"一个用户的连续按键")}
  ${text(76,335,"跨请求 Continuous Batching")}${text(648,335,"latest-wins + token-LCP KV")}
  ${text(76,395,"并发调度，提升 GPU 吞吐")}${text(648,395,"一次 Prefill，内部八路候选解码")}
  ${text(76,475,"指标：tokens/s 与请求吞吐","accent")}${text(648,475,"指标：完整 Top-3 尾延迟","accent")}
  ${text(48,605,"比较的是调度目标、生命周期、排序与指标；不将通用服务吞吐等同于输入延迟。","label")}
`,670));
const bars = [
  ["p50 · MiniMind PyTorch",258.64,196,"#5d6570"],
  ["p50 · AIOS-IME",81.98,274,"#5447a0"],
  ["p95 · MiniMind PyTorch",279.43,394,"#5d6570"],
  ["p95 · AIOS-IME",109.97,472,"#5447a0"],
];
emit("aios-ime/performance",frame("完整 Top-3 延迟：同一测试条件下比较","RTX 4080 Laptop GPU · BF16 · 5 warmups · 30 timed prompts",bars.map(([label,value,y,color])=>`${text(48,y+26,label,"label")}<rect x="330" y="${y}" width="${value*2.4}" height="36" fill="${color}"/>${text(345+value*2.4,y+26,`${value} ms`,"accent")}`).join("")+`
  ${text(48,585,"p50 3.15× · p95 2.54× · peak allocated 227.10 MiB","accent")}
  ${text(48,627,"完整候选 100% · 不同候选 100% · low-memory KV 256 pages","label")}
  ${text(48,670,"测量 complete Top-3 wall-clock；不包含模型加载和首次 JIT。","label")}
`,710));
emit("minimind-ime/training-pipeline",list("MiniMind-IME：数据怎样变成输入候选","每阶段保留数据合同、泄漏检查与可重放报告。",[
  ["原始语料 → 清洗","MiniMind / Wiki / blog / 用户提供文本；HTML/code/style 过滤与 SHA / MinHash 去重。"],
  ["Tokenizer → NTP","IME-weighted 16K；最终 0.1B 分支继续预训练，546M → 646M tokens。"],
  ["Completion SFT","prefix labels = -100；9 stages、99,990 rows。"],
  ["教师与偏好实验","50,894 教师样本；450 listwise groups 隔离 13 后保留 437；682 → 317 pairs。"],
  ["冻结评测 → 拒绝不稳候选","15 generation、145 context、40 same-pinyin；train_eligible = false。"],
  ["独立候选池 → Top-3","8 sampled attempts，过滤、去重、打分；记录接受与拒绝反馈。"],
],"20% teacher + 80% replay probe 未过 held-out/stability；reranker probe 未提升到线上。"));

// Preserve every measured curve and its coordinates. Only replace the visual
// palette and type styling of the source-owned training trace diagram.
const curvePath = `${root}minimind-ime/training-curves.svg`;
let curves = readFileSync(curvePath,"utf8");
for(const [before,after] of Object.entries({"#07090d":"#fafaf7","#0b0e13":"#efefec","#e5e9f0":"#22272d","#929aa6":"#5d6570","#2a3039":"#dddeda","#252b34":"#dddeda","#55bd8a":"#5447a0","#e8bd5b":"#9d6500","#9e83e8":"#7549b8","#ef5f66":"#b13a43"})) curves=curves.replaceAll(before,after);
for (const [before, after] of Object.entries({"#ffffff":"#fafaf7","#f2f5fb":"#efefec","#172033":"#22272d","#526074":"#5d6570","#d8dee8":"#dddeda","#244bcb":"#5447a0","#9d6500":"#e8bd5b","#7549b8":"#b79aef","#b13a43":"#f68e96"})) curves = curves.replaceAll(before, after);
for (const [before, after] of Object.entries({"#e6edf9":"#22272d","#a5b3ca":"#5d6570","#a8a3ff":"#5447a0","#29344b":"#dddeda","#111a2b":"#efefec","#080d18":"#fafaf7","#e8bd5b":"#946400","#b79aef":"#7956a9","#f68e96":"#b13a43"})) curves = curves.replaceAll(before, after);
writeFileSync(curvePath,curves);
console.log("Rendered 8 source-grounded diagrams; restyled training curves without changing measured paths.");
