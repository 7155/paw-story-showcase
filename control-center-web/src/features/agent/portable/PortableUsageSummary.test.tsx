import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PortableUsageSummary } from './PortableResearchReceipt';
afterEach(cleanup);
it('shows recorded task totals and labels estimates separately from billing', () => {
  render(<PortableUsageSummary compact value={{assistantUsage:{totalTokens:1500,totalTokensComplete:true,estimatedCostUsd:.018,estimateComplete:true,elapsedMs:3100,elapsedComplete:true}}} />);
  expect(screen.getByText('总 Token 1,500')).toBeVisible();
  expect(screen.getByText('目录估算 $0.0180')).toBeVisible();
  expect(screen.getByText('累计执行 3.1 秒')).toBeVisible();
});
it('does not promote incomplete or answer-only usage to a complete task total', () => {
  const view = render(<PortableUsageSummary compact value={{assistantUsage:{totalTokens:1500,totalTokensComplete:false,knownTotalTokens:1500,costUsd:0,costComplete:false}}} />);
  expect(screen.getByText('总 Token 未完整（已知 1,500）')).toBeVisible();
  expect(screen.getByText('费用未完整提供')).toBeVisible();
  expect(screen.queryByText('费用 $0.0000')).not.toBeInTheDocument();
  view.rerender(<PortableUsageSummary compact value={{usage:{totalTokens:300,costUsd:0,costUsdComplete:false}}} />);
  expect(screen.getByText('回答 Token 300')).toBeVisible();
  expect(screen.getByText('回答费用未提供')).toBeVisible();
  expect(screen.queryByText(/总 Token/)).not.toBeInTheDocument();
});
