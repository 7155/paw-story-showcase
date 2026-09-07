"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import story from "../../showcase/task-story.v1.json";

export function CandidateComparison() {
  const [selected, setSelected] = useState<"rejected" | "kept">("rejected");
  const candidate = story[selected];
  return <section className="story-candidates" aria-labelledby="candidate-heading">
    <h3 id="candidate-heading">两种修复，同一组检查。</h3>
    <p>切换候选，查看方案保留、登记恢复与重复执行的结果。</p>
    <div className="story-comparison-body">
    <div className="story-candidate-controls" role="group" aria-label="比较修复候选">
      {(["rejected", "kept"] as const).map(key => <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)}>{story[key].name}</button>)}
    </div>
    <div className="story-candidate-result" data-verdict={selected} aria-live="polite" aria-atomic="true">
      <ul>{story.checkLabels.map((label, index) => <li key={label}>{candidate.checks[index] ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}<span>{label}</span><strong>{candidate.checks[index] ? "通过" : "未通过"}</strong></li>)}</ul>
      <p><strong>{selected === "kept" ? "保留候选 B。" : "拒绝候选 A。"}</strong>{candidate.result}</p>
    </div>
    </div>
    <small>公开合成重放 · 展示决策过程，不代表生产改进率或 Runtime 验收。</small>
  </section>;
}
