"use client";

import { Pause, Play, RefreshCw } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

export type ShowcaseStage = {
  id: string;
  label: string;
  detail: string;
};

type ShowcasePlaybackProps = {
  ariaLabel: string;
  stages: readonly ShowcaseStage[];
  step: number;
  playing: boolean;
  onSeek: (step: number) => void;
  onToggle: () => void;
  onRestart: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
};

export function ShowcasePlayback({
  ariaLabel,
  stages,
  step,
  playing,
  onSeek,
  onToggle,
  onRestart,
  disabled = false,
  trailing,
}: ShowcasePlaybackProps) {
  const safeStep = Math.max(0, Math.min(stages.length - 1, step));
  const activeStage = stages[safeStep] ?? stages[0];
  const progress = stages.length <= 1 ? 100 : (safeStep / (stages.length - 1)) * 100;

  return (
    <section className="showcase-playback" aria-label={ariaLabel} data-playing={playing || undefined}>
      <div className="showcase-playback__status" aria-live="polite">
        <span>{String(safeStep + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}</span>
        <strong>{activeStage?.label}</strong>
        <small>{activeStage?.detail}</small>
      </div>
      <label className="showcase-playback__scrubber">
        <span className="sr-only">拖动演示进度</span>
        <input
          aria-label="拖动演示进度"
          max={Math.max(0, stages.length - 1)}
          min={0}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          step={1}
          style={{ "--showcase-progress": `${progress}%` } as CSSProperties}
          type="range"
          value={safeStep}
        />
        <div aria-hidden="true" className="showcase-playback__ticks">
          {stages.map((stage, index) => <i data-active={index <= safeStep || undefined} key={stage.id}/>) }
        </div>
      </label>
      <div className="showcase-playback__actions">
        <button
          aria-label={playing ? "暂停演示" : "继续演示"}
          disabled={disabled}
          onClick={onToggle}
          title={playing ? "暂停演示" : "继续演示"}
          type="button"
        >{playing ? <Pause size={14}/> : <Play size={14}/>}</button>
        <button aria-label="重新播放演示" onClick={onRestart} title="重新播放演示" type="button"><RefreshCw size={14}/></button>
        {trailing}
      </div>
    </section>
  );
}
