/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ControlTransportProvider } from './control-transport';
import { createPreviewTransport } from './preview-control-transport';
import { EvalLabFeature } from '@/features/eval-lab';

let client: QueryClient;
afterEach(() => { cleanup(); client?.clear(); localStorage.clear(); sessionStorage.clear(); vi.unstubAllGlobals(); });

it('walks the actual Lab UI from empty input through reject, correction, App preview and export', async () => {
  vi.stubGlobal('crypto', webcrypto);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<MemoryRouter initialEntries={['/eval-lab?project=lab-showcase-rag']}><QueryClientProvider client={client}><ControlTransportProvider transport={createPreviewTransport()}>
    <EvalLabFeature />
  </ControlTransportProvider></QueryClientProvider></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '导入示例数据' }));
  expect(await screen.findByRole('heading', { name: 'rag-demo.json' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '设置候选策略' }));
  fireEvent.change(await screen.findByRole('combobox', { name: /候选策略/ }), { target: { value: '简化基线' } });
  expect(screen.getByRole('button', { name: '运行演示测评' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '保存新版本' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '运行演示测评' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '运行演示测评' }));
  expect(await screen.findByText('基线 1/3 · 候选 1/3 · REJECT · 离线规则实测')).toBeVisible();
  expect(screen.getByRole('button', { name: '生成 App' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '设置候选策略' }));
  fireEvent.change(await screen.findByRole('combobox', { name: /候选策略/ }), { target: { value: '完整规则与证据' } });
  fireEvent.click(screen.getByRole('button', { name: '保存新版本' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '运行演示测评' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '运行演示测评' }));
  expect(await screen.findByText('基线 1/3 · 候选 3/3 · KEEP · 离线规则实测')).toBeVisible();
  await waitFor(() => expect(screen.getByRole('button', { name: '生成 App' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '生成 App' }));
  expect(await screen.findByRole('button', { name: '下载独立 App' }, { timeout: 5000 })).toBeEnabled();
  expect(screen.getByTitle('Enterprise RAG · 企业知识问答 · 应用预览')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '添加至 PAW' })).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
}, 30_000);
