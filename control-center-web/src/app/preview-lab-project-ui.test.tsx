import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ControlTransportProvider } from './control-transport';
import { createPreviewTransport } from './preview-control-transport';
import { EvalLabFeature } from '@/features/eval-lab';

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); localStorage.clear(); sessionStorage.clear(); });

it('uses the current PAW project UI to browse artifacts, Knowledge and App delivery', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<MemoryRouter><QueryClientProvider client={client}><ControlTransportProvider transport={createPreviewTransport()}>
    <EvalLabFeature />
  </ControlTransportProvider></QueryClientProvider></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: '从你的项目开始' })).toBeVisible();
  fireEvent.click(await screen.findByRole('button', { name: /PAW 文档问答 · 演示/ }));
  expect(await screen.findByRole('heading', { name: 'PAW 文档问答 · 演示', level: 1 })).toBeVisible();
  expect(await screen.findByText(/公开合成项目，用来操作最新 PAW 前端/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '验收清单' }));
  expect(await screen.findByRole('columnheader', { name: '标准' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '知识库实验' }));
  expect(await screen.findByRole('heading', { name: '已整理的资料' })).toBeVisible();
  expect(screen.getByRole('combobox', { name: '资料版本' })).toHaveValue('lab-project-showcase-1:corpus');
  fireEvent.click(screen.getByRole('button', { name: '应用交付' }));
  await waitFor(() => expect(screen.queryByText('正在读取应用…')).not.toBeInTheDocument());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '返回 Lab 项目' }));
  expect(await screen.findByRole('heading', { name: '从你的项目开始' })).toBeVisible();
});
