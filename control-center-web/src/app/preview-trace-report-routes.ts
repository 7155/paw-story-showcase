import type { ControlRequest } from '@/platform/transport';
import type { MockRouteHandler } from '@/test/mock-transport';
import type { ControlPathId } from '@/platform/routes';
import type { TraceDiagnosticReportV1, Target } from '@/contracts/generated/trace-diagnostic-report.v1';
import taskStory from '../../../showcase/task-story.v1.json';
import { defaultTraceOptimizationIntent, freezeTraceOptimizationIntent, type TraceOptimizationIntent } from '@/features/trace-agent/optimization-intent';

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function createPreviewTraceReportRoutes(): Partial<Record<ControlPathId, MockRouteHandler>> {
  const reports = new Map<string, TraceDiagnosticReportV1>();
  const read = (request: ControlRequest) => {
    const report = reports.get(String(record(request.params).reportId));
    if (!report) throw new Error('公开演示报告不存在，请重新选择对象。');
    return report;
  };
  return {
    'observability.traceDiagnosticReports.create': async (request: ControlRequest) => {
      const body = record(request.body);
      const intent = freezeTraceOptimizationIntent((body.intent ?? defaultTraceOptimizationIntent()) as TraceOptimizationIntent);
      const input = Array.isArray(body.targets) ? body.targets.map(record) : [];
      if (!input.length || input.length > 12 || !body.diagnosticSessionId) throw new Error('请选择 1–12 个诊断对象。');
      const targets = input.map(item => {
        if (!['session', 'room', 'run'].includes(String(item.kind)) || !item.id) throw new Error('诊断对象无效。');
        return { targetKey: `${item.kind}:${item.id}`, kind: item.kind, id: item.id, title: String(item.title || item.id), traceIds: Array.isArray(item.traceIds) ? item.traceIds.filter(value => typeof value === 'string') : [], sourceAvailable: item.id === 'session-reliability-incident' } as Target;
      });
      const incident = targets.find(item => item.id === 'session-reliability-incident');
      const evidence = incident ? [{ evidenceId: 'synthetic:workflow-rollback', sourceKind: 'session', sourceRef: `session:${incident.id}`, targetKey: incident.targetKey, status: 'available', summary: taskStory.incident }] : [];
      const inspection = { intent, dataMode: 'synthetic-preview-only', evidence, environment: { status: 'synthetic', limitations: ['仅展示公开合成事故；没有执行 Provider 或读取私有 Runtime。'] } };
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(inspection)));
      const inspectionSha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
      const now = Date.now();
      const report: TraceDiagnosticReportV1 = {
        schemaVersion: 'rag-ime.trace-diagnostic-report.v1', reportId: `trace-report:${crypto.randomUUID().replaceAll('-', '')}`, revision: 1, status: 'completed',
        intent: intent as NonNullable<TraceDiagnosticReportV1['intent']>,
        title: `公开合成演示 · ${String(body.title || 'Trace 诊断')}`, diagnosticSessionId: String(body.diagnosticSessionId),
        targets: targets as TraceDiagnosticReportV1['targets'], traceIds: [...new Set(targets.flatMap(item => item.traceIds))], inspectionSha256, inspection,
        result: { summary: incident ? `公开合成场景：${taskStory.incident} 修复尚未在本轮执行。` : '公开演示未提供所选对象的专用诊断证据；结论保留为未知，未执行新模型诊断。',
          findings: incident ? [{ findingId: 'workflow-rollback', severity: 'high', title: '辅助登记失败撤销了真实文件', observation: taskStory.incident, evidenceIds: ['synthetic:workflow-rollback'], recommendation: '保留成功写入的文件，把辅助登记失败记录为可恢复待办。', verification: '本轮未执行修复或重放，不标记 verified。' }] : [],
        },
        failureReason: '', createdAtMs: now, updatedAtMs: now,
      };
      reports.set(report.reportId, report);
      return report;
    },
    'observability.traceOptimization.library': () => ({ dataMode: 'synthetic-preview-only', projectId: 'project-showcase', projects: [{ projectId: 'project-showcase', title: '公开演示项目' }], patterns: [], truncated: false }),
    'observability.traceOptimization.capabilities': () => ({ dataMode: 'synthetic-preview-only', items: [], unavailable: ['公开演示未连接本机能力目录。'] }),
    'observability.traceDiagnosticReport.optimizationCommand': () => { throw new Error('公开演示没有可安装的真实优化候选；请在 PAW Runtime 中验证和应用。'); },
    'observability.traceDiagnosticReport.get': read,
    'observability.traceDiagnosticReport.finalize': read,
    'observability.traceDiagnosticReports.list': () => ({ schemaVersion: 'rag-ime.trace-diagnostic-report-list.v1', total: reports.size, truncated: false, nextCursor: null, items: [...reports.values()].map(report => ({ intent: report.intent, reportId: report.reportId, revision: report.revision, status: report.status, title: report.title, diagnosticSessionId: report.diagnosticSessionId, targets: report.targets, traceIds: report.traceIds, targetKeys: report.targets.map(target => target.targetKey), repairState: 'not_recorded', failureReason: report.failureReason, createdAtMs: report.createdAtMs, updatedAtMs: report.updatedAtMs })) }),
  };
}
