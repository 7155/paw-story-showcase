import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortableConversation } from './PortableConversation';
import type { PortableBridge, PortableRecord, PortableResult } from './conversation-types';
import type { PortableSource } from './SourceReader';

afterEach(() => { cleanup(); sessionStorage.clear(); });
const selection = { provider: 'openai-codex', model: 'gpt-5.6-terra', thinkingLevel: 'high' };
const source: PortableSource = { sourceId: 'paper-1', title: 'Published ice observations', text: 'Measured discharge is 487 Gt/year.',
  chunkId: 'chunk-9', citationNumber: 7, citation: { sourceId: 'paper-1', chunkId: 'chunk-9', snapshotSha256: 'frozen-1', page: 3 } };
function bridge(patch: Partial<PortableBridge> = {}): PortableBridge {
  return { models: async () => ({ selected: selection, catalog: { providers: [{ id: selection.provider, models: [{ id: selection.model, name: 'Terra', thinkingLevels: ['low', 'high'] }] }] } }),
    invoke: vi.fn(async () => ({ text: 'Answer.' })), history: vi.fn(async () => []), capabilities: { progress: true, cancel: true, sourceReader: true }, ...patch };
}
function mount(owner: PortableBridge) { return render(<PortableConversation bridge={owner} options={{ title: 'Paper researcher', actionId: 'answer', sourcesActionId: 'sources', contextField: 'conversation' }} />); }
async function input(question: string) { await waitFor(() => expect(screen.getByRole('button', { name: /模型与推理：Terra/u })).toBeEnabled()); fireEvent.change(screen.getByRole('textbox', { name: '消息' }), { target: { value: question } }); }

describe('shared portable Agent conversation', () => {
  it('lets an embedded host own report downloads without showing an unavailable action', async () => {
    mount(bridge({ capabilities: { reportExport: false }, invoke: vi.fn(async () => ({ text: 'Saved report.' })) }));
    await input('Question'); fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveTextContent('Saved report.'));
    expect(screen.queryByRole('button', { name: '导出研究报告' })).not.toBeInTheDocument();
  });
  it('restores a prior cited report from its exact saved receipt when opening a follow-up', async () => {
    const owner = bridge({ downloadReport: vi.fn(() => true), history: async (): Promise<PortableRecord[]> => [
      { requestId: 'first', actionId: 'answer', state: 'completed', version: 9, input: { question: 'First report' }, result: { text: 'Saved report [7].', sources: [source] } },
      { requestId: 'follow-up', actionId: 'answer', state: 'completed', version: 9, input: { question: 'Follow-up', conversation: JSON.stringify([{ question: 'First report', answer: 'Saved report [7].' }]) }, result: { text: 'The saved follow-up.' } },
    ] });
    mount(owner); await input(''); fireEvent.click(screen.getByRole('button', { name: '最近对话' }));
    fireEvent.click(await screen.findByRole('button', { name: /Follow-up.*回答已完成/u }));
    expect(await screen.findByRole('button', { name: '查看引用 7' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: '导出研究报告' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: '导出研究报告' })[0]);
    expect(owner.downloadReport).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'first', output: 'Saved report [7].' }));
    expect(screen.queryByText(/最终报告尚未确认/u)).not.toBeInTheDocument();
    expect(owner.invoke).not.toHaveBeenCalled();
  });
  it('streams through the shared transcript and opens the actual numbered source while preventing double send', async () => {
    let finish!: (result: PortableResult) => void;
    const readSource = vi.fn(async () => ({ kind: 'extracted_source' as const, source: { sourceId: source.sourceId, title: source.title }, citation: source.citation!,
      chunks: [{ chunkId: 'chunk-9', ordinal: 9, page: 3, text: source.text, isCited: true }], offset: 9, totalChunks: 10, nextOffset: null, previousOffset: 0, originalUrl: null }));
    const invoke = vi.fn<NonNullable<PortableBridge['invoke']>>((_action, _values, options) => { options.onProgress({ stage: 'answering', sources: [source], text: 'Discharge is 487 Gt/year [7].\n\n`[7]` stays literal.' }); return new Promise<PortableResult>((resolve) => { finish = resolve; }); });
    mount(bridge({ invoke, readSource })); await input('What is the discharge?');
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0]?.[2]).toMatchObject({ model: selection, requestId: expect.stringMatching(/^[a-f0-9-]{36}$/u) });
    expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(screen.getAllByRole('button', { name: '查看引用 7' })).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '查看引用 7' }));
    await waitFor(() => expect(screen.getByText('Measured discharge is 487 Gt/year.')).toBeVisible());
    expect(readSource).toHaveBeenCalledWith(expect.objectContaining({ sourceId: 'paper-1', chunkId: 'chunk-9', snapshotSha256: 'frozen-1' }));
    await act(async () => finish({ text: 'Discharge is 487 Gt/year [7].', sources: [source] }));
    expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveAttribute('aria-busy', 'false');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('keeps research queries, raw versus selected sources, and complete stage usage visible', async () => {
    const raw = [{ ...source, usedInContext: true }, { sourceId: 'paper-2', title: 'Another paper', preview: 'Raw candidate' }];
    const invoke = vi.fn(async () => ({ text: '综合结论 [7]。', sources: [source],
      knowledge: { workflow: { queries: ['原问题', 'English terms'], searchCount: 2, candidateSources: 2, selectedSources: 1, contextChars: 512 }, retrievalHits: raw },
      usageScopes: { planning: { usage: { inputTokens: 20, outputTokens: 10, costUsd: 0.002 } }, answer: { usage: { inputTokens: 50, outputTokens: 20, costUsd: 0.003 } } },
      assistantUsage: { calls: 2, inputTokens: 70, outputTokens: 30, totalTokens: 100, totalTokensComplete: true,
        cacheReadTokens: null, knownCacheReadTokens: 4, cacheReadTokensComplete: false,
        cacheWriteTokens: null, knownCacheWriteTokens: 0, cacheWriteTokensComplete: false,
        elapsedMs: 3000, elapsedComplete: true, costUsd: 0.005, costComplete: true } }));
    mount(bridge({ invoke })); await input('研究这个问题'); fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveTextContent('综合结论'));
    expect(screen.getByText('执行回执 2 条')).toBeVisible();
    expect(screen.getByText('缓存读 Token')).toBeVisible();
    expect(screen.getByText('未完整（已知 4）')).toBeVisible();
    expect(screen.getByText('执行阶段累计耗时')).toBeVisible();
    expect(screen.getByText('Tool 调用尝试')).toBeVisible();
    expect(screen.getByText('Tool 调用尝试').closest('div')).toHaveTextContent('未提供');
    fireEvent.click(screen.getByText(/本次研究/u));
    expect(screen.getByText('English terms')).toBeVisible();
    expect(screen.getByText('Another paper')).toBeVisible();
    expect(screen.getByText('已入上下文')).toBeVisible();
    expect(screen.getByText('未入上下文')).toBeVisible();
  });

  it('shows unknown or failed delivery without claiming all service hits became answer context', async () => {
    mount(bridge({ invoke: vi.fn(async () => ({ text: '证据待核对。', sources: [], knowledge: {
      contextDelivery: { complete: false, failedToolCallIds: ['late-search'], unknownToolCallIds: ['unconfirmed-read'] },
      retrievalHits: [{ ...source, usedInContext: false }],
      workflow: { execution: 'pi_tool_loop', searchCount: 1, sourceReadCount: 1, toolCallCount: 2,
        candidateSources: 3, selectedSources: 0, contextChars: 0 },
    } })) }));
    await input('检查送达'); fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByText(/本次研究/u)).toHaveTextContent('上下文待核对'));
    fireEvent.click(screen.getByText(/本次研究/u));
    expect(screen.getByText(/部分工具结果是否送达模型尚未确认/u)).toBeVisible();
    expect(screen.getByText(/1 次工具结果未送达模型/u)).toBeVisible();
    expect(screen.getByText(/研究服务收到 2 次调用/u)).toBeVisible();
    expect(screen.getByText('送达待核对')).toBeVisible();
  });

  it('keeps adaptive model requests and actual tool calls separate from one execution receipt', async () => {
    const invoke = vi.fn(async () => ({ text: '按原文回答 [7]。', sources: [source],
      knowledge: { workflow: { execution: 'pi_tool_loop', queries: ['glacier flow'], searchCount: 1,
        sourceReadCount: 1, toolCallCount: 2, candidateSources: 1, selectedSources: 1 } },
      assistantUsage: { calls: 1, modelCallCount: 3, modelCallCountComplete: true, toolCallCount: 4, toolCallCountComplete: true, toolCallCountScope: 'native_tool_attempts',
        knownCostUsd: 0.004, costComplete: false },
      usageScopes: { research: { latencyMs: 853, receipt: { elapsedMs: null, elapsedMsComplete: false }, usage: { inputTokens: 60, outputTokens: 20,
        totalTokens: 80, totalTokensComplete: false, costUsd: 0.004, costUsdComplete: false } } } }));
    mount(bridge({ invoke })); await input('按需检查资料'); fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByText('执行回执 1 条')).toBeVisible());
    expect(screen.getByText('实际模型请求').closest('div')).toHaveTextContent('3');
    expect(screen.getByText('Tool 调用尝试').closest('div')).toHaveTextContent('4');
    expect(screen.getByText('按需研究与回答')).toBeVisible();
    expect(screen.getByText('费用未完整提供（已知 $0.0040）')).toBeVisible();
    expect(screen.getByText('按需研究与回答').closest('div')).toHaveTextContent('未提供 Token · 费用未提供 · 执行阶段 未提供');
    fireEvent.click(screen.getByText(/本次研究/u));
    expect(screen.getByText(/研究服务收到 2 次调用，其中搜索 1 次、原文读取 1 次/u)).toBeVisible();
  });

  it('does not discard partial output when the settled receipt has no text', async () => {
    const invoke = vi.fn<NonNullable<PortableBridge['invoke']>>((_action, _values, options) => {
      options.onProgress({ stage: 'answering', text: 'Partial evidence remains visible.' });
      return Promise.resolve({ sources: [source] });
    });
    mount(bridge({ invoke })); await input('保留部分结果'); fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveTextContent('Partial evidence remains visible.'));
  });

  it('keeps partial output after unknown admission and reconciles without a new invocation', async () => {
    const invoke = vi.fn<NonNullable<PortableBridge['invoke']>>(async (_action, _values, options) => { options.onProgress({ stage: 'answering', text: 'Partial evidence', sources: [source] }); throw Object.assign(new Error('lost response'), { state: 'unconfirmed', requestId: 'known-request' }); });
    const reconcile = vi.fn(async () => ({ requestId: 'known-request', actionId: 'answer', input: { question: 'Check the source' }, state: 'completed', result: { text: 'Confirmed answer [7]', sources: [source] } }));
    mount(bridge({ invoke, reconcile })); await input('Check the source'); fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByText('Partial evidence')).toBeVisible());
    const check = await screen.findByRole('button', { name: '核对原调用' });
    expect(screen.queryByRole('button', { name: '重试本轮' })).toBeNull();
    await waitFor(() => expect(check).toBeEnabled()); fireEvent.click(check);
    expect(await screen.findByText(/Confirmed answer/u)).toBeVisible();
    expect(reconcile).toHaveBeenCalledWith('known-request'); expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('restores history without calling a model and carries the restored turn into a follow-up', async () => {
    const owner = bridge({ history: vi.fn(async () => [{ requestId: 'past', actionId: 'answer', input: { question: 'Original question' }, state: 'completed', result: { text: 'Original answer', sources: [source] } }]) });
    mount(owner); fireEvent.click(screen.getByRole('button', { name: '最近对话' }));
    fireEvent.click(await screen.findByRole('button', { name: /Original question/u }));
    expect(await screen.findByText('Original answer')).toBeVisible(); expect(owner.invoke).not.toHaveBeenCalled();
    await input('And its limits?'); fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(owner.invoke).toHaveBeenCalledWith('answer', { question: 'And its limits?', conversation: JSON.stringify([{ question: 'Original question', answer: 'Original answer' }]) }, expect.anything()));
  });

  it('keeps both settled turns visible across a sequential follow-up', async () => {
    const invoke = vi.fn(async (_action: string, values: Record<string, string>) => ({ text: `回答：${values.question}` }));
    mount(bridge({ invoke }));

    await input('第一问');
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByText('回答：第一问')).toBeVisible());

    await input('第二问');
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(screen.getByText('回答：第二问')).toBeVisible());

    expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveTextContent('第一问');
    expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveTextContent('第二问');
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1]?.[1]).toMatchObject({ question: '第二问', conversation: JSON.stringify([{ question: '第一问', answer: '回答：第一问' }]) });
  });

  it('follows an explicit follow-up to the latest row after the reader scrolled away', async () => {
    const answer = (question: string) => `${question} ${'long answer '.repeat(160)}`;
    let finish!: (result: PortableResult) => void;
    const invoke = vi.fn<NonNullable<PortableBridge['invoke']>>((_action, values) => values.question === '第二问'
      ? new Promise<PortableResult>((resolve) => { finish = resolve; })
      : Promise.resolve({ text: answer(values.question) }));
    mount(bridge({ invoke }));
    const log = screen.getByRole('log', { name: 'Agent 对话时间线' });
    Object.defineProperty(log, 'clientHeight', { configurable: true, value: 320 });
    Object.defineProperty(log, 'scrollHeight', {
      configurable: true,
      get: () => Number.parseFloat((log.querySelector('.ccui-transcript-sizer') as HTMLElement | null)?.style.height ?? '0') || 0,
    });

    await input('第一问');
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(log.textContent).toContain('第一问 long answer'));
    await waitFor(() => expect(log.scrollHeight).toBeGreaterThan(log.clientHeight));

    log.scrollTop = 0;
    fireEvent.scroll(log);
    await input('第二问');
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(log.scrollTop).toBeGreaterThan(0));
    fireEvent.scroll(log);
    await act(async () => finish({ text: answer('第二问') }));
    await waitFor(() => expect(log.textContent).toContain('第二问 long answer'));
    expect(log.scrollTop).toBe(log.scrollHeight);
  });

  it('keeps a restored queued state and its reconciliation control without making the surface busy', async () => {
    const key = 'paw.app.conversation.v2:Paper researcher';
    sessionStorage.setItem(key, JSON.stringify({ draft: '', turns: [{ id: 'queued', requestId: 'queued', question: 'Queued question', actionId: 'answer', values: { question: 'Queued question' }, createdAtMs: 1, state: 'queued', output: 'Partial queued output', sources: [source], stages: [] }] }));
    const owner = bridge({ reconcile: vi.fn(async () => ({ requestId: 'queued', actionId: 'answer', input: { question: 'Queued question' }, state: 'queued', progress: { stage: 'queued', text: 'Partial queued output', sources: [source] } })) });
    mount(owner);
    await waitFor(() => expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveTextContent('Partial queued output'));
    expect(screen.getByRole('button', { name: '核对原调用' })).toBeVisible();
    expect(screen.getByRole('log', { name: 'Agent 对话时间线' })).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('textbox', { name: '消息' })).toBeEnabled();
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem(key) ?? '{}').turns[0].state).toBe('queued'));
  });

  it('reconciles a repeated normal Send after uncertain admission instead of charging a second call', async () => {
    const invoke = vi.fn(async () => { throw Object.assign(new Error('Response lost'), { state: 'unconfirmed', requestId: 'retained-request' }); });
    const reconcile = vi.fn(async () => ({ requestId: 'retained-request', actionId: 'answer', input: { question: 'Check again' }, state: 'completed', result: { text: 'The original call completed.' } }));
    mount(bridge({ invoke, reconcile })); await input('Check again');
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    await screen.findByRole('button', { name: '核对原调用' });
    await waitFor(() => expect(screen.getByRole('button', { name: '发送' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(await screen.findByText('The original call completed.')).toBeVisible();
    expect(reconcile).toHaveBeenCalledWith('retained-request'); expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('does not submit Enter during composition, and Stop reaches the owning abort signal', async () => {
    const invoke = vi.fn<NonNullable<PortableBridge['invoke']>>((_action, _values, options) => new Promise<PortableResult>((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Stopped'), { state: 'cancelled' })))));
    mount(bridge({ invoke })); await input('中文问题');
    fireEvent.keyDown(screen.getByRole('textbox', { name: '消息' }), { key: 'Enter', isComposing: true, keyCode: 229 }); expect(invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '发送' })); fireEvent.click(await screen.findByRole('button', { name: '停止本轮' }));
    expect(await screen.findByRole('button', { name: '重试本轮' })).toBeEnabled(); expect(invoke).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: '消息' })).toHaveValue('中文问题');
  });
});
