/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ControlTransportProvider } from './control-transport';
import { createPreviewTransport } from './preview-control-transport';
import { EvalLabFeature } from '@/features/eval-lab';

let client: QueryClient;
afterEach(() => { cleanup(); client?.clear(); localStorage.clear(); sessionStorage.clear(); vi.unstubAllGlobals(); });

it('walks page04 from reviewed intake to a separate mock download receipt and acceptance', async () => {
  vi.stubGlobal('crypto', webcrypto);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<MemoryRouter initialEntries={['/eval-lab?project=lab-page04-rag']}><QueryClientProvider client={client}><ControlTransportProvider transport={createPreviewTransport()}>
    <EvalLabFeature />
  </ControlTransportProvider></QueryClientProvider></MemoryRouter>);
  expect(screen.queryByText('8/16')).not.toBeInTheDocument();
  for (const name of ['确认范围与验收标准','导入并审核 15 项材料','保存并运行基线','比较 600 / 1800 字候选','展开失败与引用审查','用通过候选生成 Mock 应用','打开预览并试用','取得 Mock 下载回执','人工验收当前场景']) {
    fireEvent.click(await screen.findByRole('button',{name}));
  }
  expect(await screen.findByText(/已验收 · 未部署生产/)).toBeVisible();
  expect(screen.getByText('候选 B · 1800 字').parentElement).toHaveTextContent('16/16');
  expect(screen.getByText(/生产部署始终为 false/)).toBeVisible();
}, 30_000);
