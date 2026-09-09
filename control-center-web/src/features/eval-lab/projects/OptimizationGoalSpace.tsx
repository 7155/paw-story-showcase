import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_OPTIMIZATION_GOALS, goalLabels, normalizeGoals, type OptimizationGoals } from './optimization-goals';
import './optimization-goals.css';

const plot = { left: 74, top: 40, width: 458, height: 218 };
const presets: { label: string; goals: OptimizationGoals }[] = [
  { label: '控制成本', goals: { accuracyPriority: .7, costFlexibility: .15 } },
  { label: '均衡', goals: DEFAULT_OPTIMIZATION_GOALS },
  { label: '准确率优先', goals: { accuracyPriority: .95, costFlexibility: .85 } },
];
export function OptimizationGoalSpace({ value, disabled = false, onChange }: {
  value: OptimizationGoals; disabled?: boolean; onChange: (value: OptimizationGoals) => void;
}) {
  const id = useId(), svg = useRef<SVGSVGElement>(null), pointer = useRef<number | null>(null);
  const goals = normalizeGoals(value), labels = goalLabels(goals);
  const x = plot.left + goals.costFlexibility * plot.width, y = plot.top + (1 - goals.accuracyPriority) * plot.height;
  const change = (next: OptimizationGoals) => { if (!disabled) onChange(normalizeGoals(next)); };
  const updatePointer = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    change({ costFlexibility: (point.x - plot.left) / plot.width, accuracyPriority: 1 - (point.y - plot.top) / plot.height });
  };
  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || event.button !== 0 || pointer.current !== null) return;
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    updatePointer(event);
    event.preventDefault();
  };
  const stop = (event: PointerEvent<SVGSVGElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    if (disabled || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const delta = event.shiftKey ? .1 : .02;
    change({ accuracyPriority: goals.accuracyPriority + (event.key === 'ArrowUp' ? delta : event.key === 'ArrowDown' ? -delta : 0),
      costFlexibility: goals.costFlexibility + (event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0) });
  };
  return <section className="lab-goal-space" aria-labelledby={id + '-title'} data-disabled={disabled}>
    <div className="lab-goal-space__heading"><div><h3 id={id + '-title'}>优化偏好</h3><p>选择准确率要求和成本接受程度。</p></div><button type="button" className="lab-goal-space__reset" disabled={disabled} onClick={() => change(DEFAULT_OPTIMIZATION_GOALS)}><RotateCcw size={13} />重置偏好</button></div>
    <div className="lab-goal-space__body">
      <div className="lab-goal-space__visual">
        <svg ref={svg} viewBox="0 0 600 318" role="group" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-label="准确率与成本偏好图" aria-describedby={id + '-gesture'}
          onPointerDown={start} onPointerMove={event => { if (pointer.current === event.pointerId) updatePointer(event); }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={() => { pointer.current = null; }} onKeyDown={keyboard}>
          <title>准确率与成本</title><desc>纵轴为准确率要求，横轴为成本接受程度。点击或拖动选择偏好，也可使用方向键或下方滑块。</desc>
          <rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} className="lab-goal-space__plot" />
          {[.25,.5,.75].map(position => <g key={position}><line x1={plot.left + position * plot.width} x2={plot.left + position * plot.width} y1={plot.top} y2={plot.top + plot.height} className="lab-goal-space__grid" /><line x1={plot.left} x2={plot.left + plot.width} y1={plot.top + position * plot.height} y2={plot.top + position * plot.height} className="lab-goal-space__grid" /></g>)}
          <path d={'M 74 40 V 258 H 532'} className="lab-goal-space__axis" />
          <text x={74} y={20} className="lab-goal-space__axis-label">准确率</text>
          <text x={58} y={48} textAnchor="end" className="lab-goal-space__axis-end">严格</text>
          <text x={58} y={258} textAnchor="end" className="lab-goal-space__axis-end">基础</text>
          <text x={552} y={263} className="lab-goal-space__axis-label">成本</text>
          <text x={74} y={286} className="lab-goal-space__axis-end">优先控制成本</text>
          <text x={532} y={286} textAnchor="end" className="lab-goal-space__axis-end">接受更高投入</text>
          <path d={'M 74 ' + y + ' H ' + x + ' V 258'} className="lab-goal-space__projection" />
          <g className="lab-goal-space__target" aria-hidden="true"><circle cx={x} cy={y} r={22} fill="transparent" /><circle cx={x} cy={y} r={12} className="lab-goal-space__target-ring" /><circle cx={x} cy={y} r={5} fill="#28664d" /><text x={x > 350 ? x - 20 : x + 20} y={y < 60 ? y + 27 : y - 15} textAnchor={x > 350 ? 'end' : 'start'}>当前偏好</text></g>
        </svg>
        <p id={id + '-gesture'} className="lab-goal-space__gesture">点击或拖动选择 · 方向键微调</p>
      </div>
      <div className="lab-goal-space__controls">
        <div className="lab-goal-space__presets" aria-label="常用偏好">{presets.map(preset => <button type="button" key={preset.label} disabled={disabled} aria-pressed={preset.goals.accuracyPriority === goals.accuracyPriority && preset.goals.costFlexibility === goals.costFlexibility} onClick={() => change(preset.goals)}>{preset.label}</button>)}</div>
        <div className="lab-goal-space__control"><div className="lab-goal-space__control-top"><label htmlFor={id + '-accuracy'}>准确率要求</label><span>{labels.accuracy}</span></div><input id={id + '-accuracy'} type="range" min={0} max={1} step={.01} value={goals.accuracyPriority} aria-valuetext={labels.accuracy} disabled={disabled} onChange={event => change({ ...goals, accuracyPriority: Number(event.target.value) })} /><div className="lab-goal-space__range-ends"><span>基础</span><span>严格</span></div></div>
        <div className="lab-goal-space__control"><div className="lab-goal-space__control-top"><label htmlFor={id + '-cost'}>成本接受程度</label><span>{labels.cost}</span></div><input id={id + '-cost'} type="range" min={0} max={1} step={.01} value={goals.costFlexibility} aria-valuetext={labels.cost} disabled={disabled} onChange={event => change({ ...goals, costFlexibility: Number(event.target.value) })} /><div className="lab-goal-space__range-ends"><span>优先节省</span><span>更灵活</span></div></div>
        <p className="lab-goal-space__definition">费用取决于任务规模、资料长度和模型调用。基线评测后可查看具体用量与费用。</p>
      </div>
    </div>
    <div className="lab-goal-space__summary" role="status" aria-live="polite"><strong>当前选择</strong><span>准确率：{labels.accuracy}<i />成本：{labels.cost}</span></div>
  </section>;
}
