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

it('preserves the selected optimization scope and exposes honest public library states', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const transport = createPreviewTransport();
  const intent = { mode: 'distill', scopeMode: 'selected', focusAreas: ['skill'], objective: '提取可复用步骤' };
  const report = await transport.request<TraceDiagnosticReportV1>({ pathId: 'observability.traceDiagnosticReports.create', body: { diagnosticSessionId: 'session-demo', intent, targets: [{ kind: 'session', id: 'session-reliability-incident', title: 'Workflow 事故', traceIds: [] }] }, responseContract: 'trace-diagnostic-report.v1' });
  expect(report.intent).toEqual(intent);
  await expect(transport.request({ pathId: 'observability.traceDiagnosticReports.list', responseContract: 'trace-diagnostic-report-list.v1' })).resolves.toMatchObject({ items: [{ intent }] });
  await expect(transport.request({ pathId: 'observability.traceOptimization.library' })).resolves.toMatchObject({ patterns: [], dataMode: 'synthetic-preview-only' });
  await expect(transport.request({ pathId: 'observability.traceOptimization.capabilities' })).resolves.toMatchObject({ items: [], unavailable: ['公开演示未连接本机能力目录。'] });
  await expect(transport.request({ pathId: 'observability.traceDiagnosticReport.optimizationCommand', params: { reportId: report.reportId }, body: { operation: 'install', clientRequestId: 'trace-preview-install-test' } })).rejects.toThrow('公开演示没有可安装');
});
