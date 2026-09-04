import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TraceShowcaseWorkbench } from './showcase-workbench';

afterEach(() => {
  vi.useRealTimers();
});

describe('TraceShowcaseWorkbench', () => {
  it('replays the same case before revealing the verification receipt comparison', () => {
    vi.useFakeTimers();
    render(<TraceShowcaseWorkbench />);

    fireEvent.click(screen.getByRole('button', { name: '开始诊断' }));
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.click(screen.getByRole('button', { name: '交给 Agent 修复' }));
    fireEvent.click(screen.getByRole('button', { name: '确认交给 Agent 修复' }));
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.click(screen.getByRole('button', { name: '运行同一 Case 并比较' }));

    expect(screen.getByText('REPLAYING SAME CASE')).toBeTruthy();
    expect(screen.getByText('复检中')).toBeTruthy();
    expect((screen.getAllByText('等待复检完成')[0].closest('button') as HTMLButtonElement).disabled).toBe(true);

    act(() => vi.advanceTimersByTime(800));

    expect(screen.getByText('VERIFIED · KEEP')).toBeTruthy();
    expect(screen.getByText('.92')).toBeTruthy();
    expect(screen.getByText('12/12 passed')).toBeTruthy();
    expect(screen.getByText('applied + tested')).toBeTruthy();
    expect(screen.getByText('完成')).toBeTruthy();
    expect(document.querySelectorAll('.trace-showcase-stream pre i')).toHaveLength(0);
    expect((screen.getByText('workspace_write → documentSync').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
