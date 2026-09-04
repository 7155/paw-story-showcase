"use client";

import { ArrowRight, Brain, Check, FileText, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOnScreen, useTimedLoop } from "../app/ui-shared";

const demoInputs = [
  { id: "in-evidence", text: "测试通过、合成 Replay 和真实 Runtime 要分开说，不能互相冒充…" },
  { id: "in-precision", text: "不要把 resourceRevision、原子写入和多 Agent 并发安全混成一个概念…" },
  { id: "in-conclusion", text: "架构复盘先讲问题、选择、反证与当前边界，再补实现细节…" },
] as const;

const demoAtoms = [
  { id: "evidence", title: "证据等级不能越级", text: "源码、测试、合成 Replay、安装态与真实前台分别陈述；下一层证据不能替上一层作证。", topic: "证据规则", tags: ["证据规则", "验收边界"], from: "in-evidence" },
  { id: "precision", title: "安全机制按责任层命名", text: "resourceRevision 处理陈旧快照，atomic replace 处理半写入；只有明确的共享写冲突机制才叫并发协调。", topic: "技术表达", tags: ["技术表达", "并发边界"], from: "in-precision" },
  { id: "conclusion", title: "复盘要保留架构反转", text: "先记录问题、选择、反证与当前边界，再用代码路径和指标解释为什么改选。", topic: "工程复盘", tags: ["工程复盘", "技术判断"], from: "in-conclusion" },
] as const;

// 0 idle · 1-3 inputs arrive · 4 atoms form · 5 topics group · 6 cut to the real
// Agent frontend · 7+ hold on the live conversation with the recall chip up
const STEP_DURATIONS = [900, 1_100, 1_100, 1_100, 1_500, 1_300, 900, 2_600] as const;

export function MemoryAgentDemo({ agentSrc, active = true }: { agentSrc: string; active?: boolean }) {
  const { ref: viewRef, onScreen } = useOnScreen<HTMLDivElement>();
  const playback = useTimedLoop(STEP_DURATIONS, [], onScreen && active);
  const [jumpedAtom, setJumpedAtom] = useState<string | null>(null);
  const [iframeEverShown, setIframeEverShown] = useState(false);
  const jumpTimer = useRef<number | null>(null);

  const step = playback.step;
  const scene = jumpedAtom ? "library" : step <= 5 ? "library" : "chat";
  const showIframe = active && (iframeEverShown || step >= 6);

  useEffect(() => {
    if (step >= 6 && !iframeEverShown) {
      const timer = window.setTimeout(() => setIframeEverShown(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [step, iframeEverShown]);

  useEffect(() => () => {
    if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
  }, []);

  const jumpToAtom = (atomId: string) => {
    playback.setPlaying(false);
    setJumpedAtom(atomId);
    if (jumpTimer.current !== null) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => {
      setJumpedAtom(null);
      playback.goTo(6, true);
    }, 2_800);
  };

  return (
    <div className="memdemo" data-scene={scene} ref={viewRef}>
      <div className="memdemo-topbar">
        <span className="memdemo-brand"><Brain size={14} /> 用户记忆 · 从原始输入到召回</span>
        <nav aria-label="演示场景">
          <span data-active={scene === "library"}>01 · 记忆库整理</span>
          <ArrowRight size={12} />
          <span data-active={scene === "chat"}>02 · Agent 召回 · 真实前端</span>
        </nav>
      </div>

      <div className="memdemo-stage">
        <section className="memdemo-library" aria-label="记忆库：原始输入整理为原子与主题">
          <div className="memdemo-inputs">
            <header><FileText size={13} /> 原始输入 <small>strong-final 才写入</small></header>
            {demoInputs.map((input, index) => (
              <p data-visible={step > index} key={input.id}>{input.text}</p>
            ))}
          </div>
          <div className="memdemo-flow" aria-hidden="true">
            {demoInputs.map((input, index) => (
              <i data-visible={step >= 4} key={input.id} style={{ transitionDelay: `${index * 120}ms` }} />
            ))}
          </div>
          <div className="memdemo-organized">
            <header><Sparkles size={13} /> 整理为记忆 <small>Atom · 主题 · Tag</small></header>
            {demoAtoms.map((atom, index) => (
              <article
                data-highlight={jumpedAtom === atom.id || undefined}
                data-visible={step >= 4}
                key={atom.id}
                style={{ transitionDelay: `${index * 140}ms` }}
              >
                <header><b>ATOM</b><strong>{atom.title}</strong><em>quality .9{index + 3}</em></header>
                <p>{atom.text}</p>
                <footer data-visible={step >= 5}>
                  <span>{atom.topic}</span>
                  {atom.tags.map((tag) => <i key={tag}>#{tag}</i>)}
                </footer>
              </article>
            ))}
            {jumpedAtom ? (
              <div className="memdemo-jump-note"><Check size={13} /> 从 Agent 对话跳转到这条记忆</div>
            ) : null}
          </div>
        </section>

        <section className="memdemo-chat memdemo-chat--live" aria-label="Agent 对话：真实前端中的记忆召回">
          {showIframe && agentSrc ? (
            <iframe
              allow="clipboard-read; clipboard-write"
              className="memdemo-live-frame"
              loading="lazy"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
              src={agentSrc}
              title="实际 PAWOS Agent 会话 · 记忆召回"
            />
          ) : (
            <div className="memdemo-live-loading" role="status"><Brain size={16} /><span>正在打开实际 Agent 会话…</span></div>
          )}
          <button
            className="memdemo-recall memdemo-recall--floating"
            data-visible={step >= 7}
            onClick={() => jumpToAtom("evidence")}
            type="button"
          >
            <span className="memdemo-recall-lead"><Brain size={13} /> 本轮召回了 1 条偏好记忆</span>
            <strong>{demoAtoms[0].title}</strong>
            <span className="memdemo-recall-jump">跳转到记忆库 <ArrowRight size={12} /></span>
          </button>
        </section>
      </div>
    </div>
  );
}
