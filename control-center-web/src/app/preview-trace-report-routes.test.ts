import { afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createPreviewTransport } from './preview-control-transport';
import { buildTraceAuditReportModel } from '@/features/trace-agent/report-model';
import type { TraceDiagnosticReportV1 } from '@/contracts/generated/trace-diagnostic-report.v1';

afterEach(() => vi.unstubAllGlobals());
it('persists a contract-valid public diagnosis with source limits and does not claim repair', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const transport = createPreviewTransport();
  const report = await transport.request<TraceDiagnosticReportV1>({ pathId: 'observability.traceDiagnosticReports.create', body: { diagnosticSessionId: 'session-demo', targets: [{ kind: 'session', id: 'session-reliability-incident', title: 'Workflow 事故', traceIds: [] }] }, responseContract: 'trace-diagnostic-report.v1' });
  expect(report.title).toContain('公开合成');
  expect(report.result?.summary).toContain('修复尚未在本轮执行');
  expect(buildTraceAuditReportModel(report).summary).toContain('公开合成');
  expect(await transport.request({ pathId: 'observability.traceDiagnosticReport.get', params: { reportId: report.reportId }, responseContract: 'trace-diagnostic-report.v1' })).toEqual(report);
  await expect(transport.request({ pathId: 'observability.traceDiagnosticReports.list', responseContract: 'trace-diagnostic-report-list.v1' })).resolves.toMatchObject({ total: 1 });
});
