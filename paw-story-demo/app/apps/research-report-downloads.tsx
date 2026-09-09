import replay from '../../public/evidence/research-conversations.v1.json';
import './research-report-downloads.css';

export function ResearchReportDownloads() {
  return <details className="research-export-menu"><summary>下载研究报告</summary><nav aria-label="选择保存的研究报告">{replay.topics.flatMap(topic => topic.turns.map((turn, index) => <a key={turn.id} href={`/real-apps/deep-research/reports/${turn.id}.md`} download={`${turn.id}-report.md`}><span>{topic.title}{index ? ' · 追问' : ''}</span><small>保存记录 v{turn.version}</small></a>))}</nav></details>;
}
