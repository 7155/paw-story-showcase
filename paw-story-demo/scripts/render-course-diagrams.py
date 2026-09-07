"""Render editable graph specs to SVG and Mermaid; diagrams contain no measurements."""
from pathlib import Path
import json,html
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/diagrams/course';OUT.mkdir(parents=True,exist_ok=True)
SPECS=[
 ('two-tracks','同一个执行基础，两条应用主线','个人任务持续工作；企业任务经过评测后形成应用候选。',
 [('u',55,170,'个人工作目标','研究 / 开发 / 持续任务'),('r',425,170,'Room + Session','分工 / 工具 / 汇总'),('m',795,170,'Memory + Knowledge','来源 / 召回 / 下一次工作'),('b',55,405,'企业业务任务','Cases / 标准 / 基线'),('e',425,405,'Lab 实验','执行 / 评分 / Keep 或 Reject'),('a',795,405,'Extension App 候选','前端 + Skill + 套件绑定'),('p',425,640,'共享 Pi 执行基础','模型 / Tool loop / transcript')],
 [('u','r','目标与上下文'),('r','m','产物与来源'),('b','e','固定业务验收'),('e','a','选定版本'),('r','p','Session 执行'),('e','p','Trial 适配执行')]),
 ('room-binding','Room 怎样关联一个 Session 回合','只有明确派发的回合才归入这次公共协作。',
 [('f',55,170,'Facilitator','roomRoot = root-7'),('b',425,170,'begin','session → pending root / dispatch'),('s',795,170,'Pi Session','返回 sessionTurn = turn-9'),('o',795,405,'事件先到','按 session + turn 暂存'),('a',425,405,'accept','pending root 匹配才绑定'),('p',55,405,'公共协作事件','带 root / dispatch 身份'),('x',425,640,'不匹配的 ACK','返回空元组，不抢占新派发')],
 [('f','b','显式派发'),('b','s','请求执行'),('s','o','先到事件'),('s','a','接受 ACK'),('o','a','匹配后释放'),('a','p','附加协作身份'),('a','x','root 不匹配')]),
 ('context-delivery','存下、选中、送达，是三件事','once 优先避免重复，代价是发送前崩溃可能遗漏。',
 [('s',55,170,'上下文记录','pending + 生命周期 + 来源'),('m',425,170,'materialize','到期过滤 / lane / 条数与预算'),('r',795,170,'预留 deliveryId','once/turn → consumed'),('p',795,405,'Pi Runtime','实际收到内容才可使用'),('a',425,405,'mark_delivered','关联真实 turnId'),('c',55,405,'再次读取','persistent 可保留；once 不重入'),('x',795,640,'预留后、送达前崩溃','可能遗漏；不伪称 exactly-once')],
 [('s','m','候选记录'),('m','r','选中 items'),('r','p','Runtime RPC'),('p','a','接受回执'),('a','c','后续读取'),('r','x','进程中断')]),
 ('trial-lifecycle','一个 Trial，从接受到收口','重放请求返回旧任务；恢复记录不自动恢复付费执行。',
 [('a',55,170,'admit','请求 ID + 配置指纹'),('q',425,170,'queued','已持久接受'),('r',795,170,'running','claim 后才执行 adapter'),('d',795,405,'completed / failed','实际执行与清理收口'),('c',425,405,'cancelling → cancelled','停止请求 / abort / 清理'),('i',55,405,'interrupted','旧 owner 停止后的中断记录'),('x',55,640,'409 request_id_conflict','同 ID 却换了配置')],
 [('a','q','新身份'),('q','r','事务领取'),('r','d','正常返回或失败'),('r','c','请求停止'),('q','i','替换 Application'),('a','x','指纹不同')]),
 ('eval-gates','便宜的候选，先过质量门','模型调用成本与质量分开判断，失败候选保留。',
 [('b',55,170,'基线','固定任务 / 配置 / 分母'),('m',425,170,'仅换模型','隔离模型切换影响'),('p',795,170,'再改 Prompt','固定低成本模型'),('g',795,405,'质量与证据门','缺指标 = unknown；失败 = reject'),('c',425,405,'成本比较','只在合格候选中选择'),('k',55,405,'有范围的 Keep','单轮 Validation 结论'),('h',55,640,'独立验证 / 应用验收','新的证据，可能再次拒绝')],
 [('b','m','相同任务'),('m','p','质量不足时适配'),('p','g','实际运行结果'),('g','c','门禁通过'),('c','k','比较估算'),('k','h','不能跳过')]),
 ('app-delivery','从优化配置到 App，还要跨过哪些门','现有证据支持源码候选；独立 Web 导出不是同一个结论。',
 [('c',55,170,'选定场景配置','模型 / Prompt / 工具 / 标准'),('a',425,170,'Extension App','App.tsx + manifest + Pi Package'),('v',795,170,'validate_extension_app','绑定 / Skill / 套件 / 路径'),('s',795,405,'Sandbox 候选验收','Trace + Eval + 隔离回执'),('i',425,405,'安装 / 更新 / 回滚','生命周期动作需独立证据'),('f',55,405,'真实前台验收','运行目标版本并完成业务任务'),('w',55,640,'独立 Web 应用导出','产品方向；完整交付链尚未证实')],
 [('c','a','封装业务入口'),('a','v','版本与来源'),('v','s','校验通过'),('s','i','获准应用候选'),('i','f','安装后验证'),('f','w','另需部署与运行合同')])]
for ident,title,desc,nodes,edges in SPECS:
 esc=html.escape;parts=[];lookup={n[0]:n for n in nodes};w=230;h=94
 for start,end,label in edges:
  _,x,y,*_=lookup[start];_,xx,yy,*_=lookup[end]
  if y==yy:
   x1=x+w if xx>x else x;x2=xx if xx>x else xx+w;y1=y2=y+h/2
  elif x==xx:
   x1=x2=x+w/2;y1=y+h if yy>y else y;y2=yy if yy>y else yy+h
  else:
   x1=x+w/2;y1=y+h if yy>y else y;x2=xx+w/2;y2=yy if yy>y else yy+h
  route=f'M{x1},{y1} L{x2},{y2}'
  if x==xx and abs(yy-y)>300:
   corridor=1050 if x<700 else x-70
   route=f'M{x1},{y1} L{x1},{y1+46} L{corridor},{y1+46} L{corridor},{y2+h/2} L{xx+w if x<700 else xx},{y2+h/2}'
  parts.append(f'<path d="{route}" stroke="#77788c" stroke-width="2" fill="none" marker-end="url(#arrow)"/>')
  lx=(x1+x2)/2;ly=(y1+y2)/2
  if x==xx and abs(yy-y)>300: lx=(x1+corridor)/2;ly=y1+40
  parts.append(f'<rect x="{lx-len(label)*7}" y="{ly-18}" width="{len(label)*14}" height="25" fill="#f7f8fa"/><text x="{lx}" y="{ly}" text-anchor="middle" class="edge">{esc(label)}</text>')
 for nid,x,y,label,sub in nodes:
  parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="white" stroke="#b8bdcb"/><text x="{x+16}" y="{y+34}" class="node">{esc(label)}</text>')
  # Split long captions while retaining normal English word breaks where possible.
  lines=[sub] if len(sub)<26 else sub.split(' / ',1)
  if len(lines)==1 and len(sub)>=26:lines=[sub[:25],sub[25:]]
  for j,line in enumerate(lines):parts.append(f'<text x="{x+16}" y="{y+60+j*19}" class="caption">{esc(line)}</text>')
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="810" viewBox="0 0 1080 810" role="img" aria-labelledby="title desc"><title id="title">{esc(title)}</title><desc id="desc">{esc(desc)}</desc><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#77788c"/></marker></defs><style>text{{font-family:'PingFang SC','Microsoft YaHei',sans-serif;fill:#202532}}.node{{font-size:18px;font-weight:600}}.caption{{font-size:13px;fill:#586375}}.edge{{font-size:14px;fill:#5143ae}}</style><rect width="1080" height="810" fill="#f7f8fa"/><text x="55" y="65" font-size="30" font-weight="600">{esc(title)}</text><text x="55" y="110" font-size="17">{esc(desc)}</text>{''.join(parts)}<text x="55" y="786" font-size="13" fill="#586375">PAW · 2026-09-05 源码教学图；不是实时运行或收益图</text></svg>'''
 (OUT/f'{ident}.svg').write_text(svg)
 mmd='flowchart TB\n'+''.join(f'  {n[0]}["{n[3]}<br/>{n[4]}"]\n' for n in nodes)+''.join(f'  {a} -->|"{l}"| {b}\n' for a,b,l in edges)
 (OUT/f'{ident}.mmd').write_text(mmd)
(OUT/'graph-specs.json').write_text(json.dumps(SPECS,ensure_ascii=False,indent=2)+'\n')
print(f'Rendered {len(SPECS)} SVG + Mermaid diagrams')
