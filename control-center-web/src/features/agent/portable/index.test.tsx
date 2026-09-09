import { act, fireEvent, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import './index';

it('mounts a standalone conversation and renders retrieved code with its tooltip context',async()=>{
  const container=document.createElement('div');document.body.append(container);
  window.pawApp={models:async()=>({selected:{provider:'offline',model:'local',thinkingLevel:'off'},catalog:{}}),
    invoke:async()=>({text:'Use `audit_export` to configure the source.\n\n```json\n{"enabled":true}\n```',sources:[]})};
  let mounted:ReturnType<typeof window.pawAgentUI.mountConversation>;
  await act(async()=>{mounted=window.pawAgentUI.mountConversation(container,{title:'Research',actionId:'research',questionField:'question'});});
  try{
    fireEvent.change(container.querySelector('textarea')!,{target:{value:'Read audit settings'}});
    fireEvent.click(container.querySelector('button[aria-label="发送"]')!);
    await waitFor(()=>expect(container.textContent).toContain('audit_export'));
    expect(container.querySelector('code')).not.toBeNull();
  }finally{await act(async()=>mounted!.destroy());container.remove();}
});
