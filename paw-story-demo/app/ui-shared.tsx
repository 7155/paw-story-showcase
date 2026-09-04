import { CircleDot, Pause, Play, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement>(rootMargin = "240px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

export function useLoop(length: number, delay: number, initialPlaying = true, enabled = true) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(initialPlaying);

  useEffect(() => {
    if (!playing || !enabled) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % length), delay);
    return () => window.clearInterval(timer);
  }, [delay, length, playing, enabled]);

  return { step, playing, setStep, setPlaying, restart: () => { setStep(0); setPlaying(true); } };
}

// Continuous (non-latching) visibility — drives play/pause of demo loops.
export function useOnScreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = Boolean(entry?.isIntersecting);
      setOnScreen((prev) => (prev === visible ? prev : visible));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, onScreen };
}

export function useTimedLoop(durations: readonly number[], manualGateSteps: readonly number[] = [], enabled = true) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || !enabled) return;
    const timer = window.setTimeout(
      () => setStep((value) => {
        const next = (value + 1) % durations.length;
        if (manualGateSteps.includes(next)) setPlaying(false);
        return next;
      }),
      durations[step] ?? 700,
    );
    return () => window.clearTimeout(timer);
  }, [durations, manualGateSteps, playing, step, enabled]);

  return {
    step,
    playing,
    setPlaying,
    goTo: (next: number, shouldPlay = !manualGateSteps.includes(next)) => { setStep(next); setPlaying(shouldPlay); },
    restart: () => { setStep(0); setPlaying(true); },
  };
}

export function PawMark() {
  return <span className="paw-mark" aria-hidden="true"><i /><i /><i /><i /></span>;
}

export function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="currentColor" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function GithubBadge({ href, label }: { href: string; label: string }) {
  return (
    <a aria-label={`GitHub 项目 · ${label}`} className="gh-badge" href={href} rel="noreferrer" target="_blank">
      <GithubMark size={13}/><span>{label}</span>
    </a>
  );
}

export function PlaybackControls({ playing, onToggle, onRestart, lockedLabel }: { playing: boolean; onToggle: () => void; onRestart: () => void; lockedLabel?: string }) {
  return (
    <div className="playback-controls">
      <button disabled={Boolean(lockedLabel)} onClick={onToggle} type="button">{lockedLabel ? <CircleDot size={14} /> : playing ? <Pause size={14} /> : <Play size={14} />}{lockedLabel ?? (playing ? "暂停" : "继续")}</button>
      <button onClick={onRestart} type="button"><RefreshCw size={14} />重播</button><span>真实组件状态回放</span>
    </div>
  );
}
