import type { PortableTurn } from './conversation-types';
import { safeOriginalSourceUrl } from './SourceReader';

/** Export only the selected, completed receipt and its own frozen evidence. */
export function researchReportMarkdown(title: string, turn: PortableTurn): string {
  if (turn.state !== 'completed' || turn.finalOutputConfirmed !== true || !turn.output.trim()) throw new Error('研究尚未完成，暂不能导出最终报告。');
  const lines = [`# ${title}`, '', '## 研究问题', '', turn.question, '', '## 研究报告', '', turn.output, '', '## 证据来源', ''];
  if (!turn.sources.length) lines.push('本次回执未提供可定位的来源；报告中的结论需要进一步核对。', '');
  turn.sources.forEach((source, index) => {
    const number = source.citationNumber ?? index + 1;
    lines.push(`### [${number}] ${source.title}`, '');
    const url = safeOriginalSourceUrl(source.uri);
    if (url) lines.push(`来源链接：<${url}>`, '');
    if (source.originalFilename) lines.push(`原文件：${source.originalFilename}`, '');
    if (source.citation?.page) lines.push(`引用页码：${source.citation.page}`, '');
    for (const [label, value] of [['来源 ID', source.sourceId], ['片段 ID', source.citation?.chunkId ?? source.chunkId], ['快照 SHA-256', source.citation?.snapshotSha256], ['章节', source.citation?.heading], ['片段序号', source.citation?.ordinal]]) {
      if (value !== undefined && value !== null && value !== '') lines.push(`${label}：${value}`, '');
    }
    if (source.text) lines.push('本轮采用的证据片段：', '', ...source.text.split('\n').map((line) => `> ${line}`), '');
  });
  lines.push('## 运行记录', '', `- 记录 ID：${turn.requestId ?? turn.id}`,
    `- 开始时间：${new Date(turn.createdAtMs).toISOString()}`,
    ...(turn.version !== undefined ? [`- 应用版本：v${turn.version}`] : []),
    '- 状态：已完成', '', '来源为本轮实际返回的证据；完成状态不等于结论已通过独立评测。', '');
  return lines.join('\n');
}

export function downloadResearchReport(title: string, turn: PortableTurn): void {
  const text = researchReportMarkdown(title, turn);
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${title.replace(/[\\/:*?"<>|\u0000-\u001f]/gu, '-').slice(0, 60) || 'research'}-${new Date(turn.createdAtMs).toISOString().slice(0, 10)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
