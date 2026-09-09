import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ControlTransportProvider } from '@/app/control-transport';
import { MockControlTransport } from '@/test/mock-transport';
import { ProjectRequirements } from './ProjectRequirements';
import type { LabProject } from './types';
const project = { projectId:'p', description:'保留用户事实。明确预算 50 元。', briefVersion:2 } as LabProject;
const transport = new MockControlTransport({ routes:{} });
const mount = (onSave = vi.fn(async () => true), current = project) => render(<ControlTransportProvider transport={transport}><ProjectRequirements project={current} busy={false} onSave={onSave} /></ControlTransportProvider>);
afterEach(() => { cleanup(); sessionStorage.clear(); });

it('saves qualitative preferences with original user requirements only after the save action', async () => {
  const save = vi.fn(async () => true); mount(save);
  fireEvent.change(screen.getByRole('slider',{name:'准确率要求'}),{target:{value:.95}});
  fireEvent.change(screen.getByRole('slider',{name:'成本接受程度'}),{target:{value:.15}});
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'保存需求与偏好'}));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save).toHaveBeenCalledWith(expect.stringContaining('保留用户事实。明确预算 50 元。'));
  expect(save).toHaveBeenCalledWith(expect.stringContaining('准确率：严格要求'));
  expect(save).toHaveBeenCalledWith(expect.stringContaining('成本：优先控制成本'));
});
it('preserves an unsaved edit across pages and does not overwrite a newer requirement', async () => {
  const save = vi.fn(async () => true), first = mount(save);
  fireEvent.click(screen.getByRole('button',{name:'编辑需求'}));
  fireEvent.change(screen.getByRole('textbox',{name:'需求正文'}),{target:{value:'尚未保存的新要求'}});
  first.unmount();
  mount(save, { ...project, description:'其他任务补充的新要求', briefVersion:3 });
  expect(screen.getByRole('textbox',{name:'需求正文'})).toHaveValue('尚未保存的新要求');
  fireEvent.click(screen.getByRole('button',{name:'保存需求与偏好'}));
  expect(await screen.findByText('项目需求已有更新，请对照完整需求合并更改。')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'已合并，保存编辑稿'}));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save).toHaveBeenCalledWith(expect.stringContaining('尚未保存的新要求'));
});
