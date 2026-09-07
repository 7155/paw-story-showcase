import { useEffect } from 'react';
import { usePawDesktopApi } from '../runtime/desktop-context';
import { createHandsOnGuide, handsOnPlans } from './hands-on-guide';
import './hands-on-guide.css';

export function PawHandsOnGuide({ guideId }: { guideId: string }) {
  const api = usePawDesktopApi();
  useEffect(() => {
    const plan = handsOnPlans[guideId];
    if (!plan) return;
    const parentOrigin = document.referrer ? new URL(document.referrer).origin : window.location.origin;
    const instanceId = new URLSearchParams(window.location.search).get('showcaseInstance') || '';
    let active = window.parent === window;
    let due = 0;
    let lastStep = 0;
    let ready = false;
    const cursor = document.createElement('div');
    cursor.className = 'paw-demo-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.textContent = '➤';
    document.body.append(cursor);
    const guide = createHandsOnGuide(document, plan, state => {
      ready = state.found && !state.complete;
      if (state.step !== lastStep) { lastStep = state.step; due = Date.now() + 2600; }
      window.parent.postMessage({ channel: 'paw.hands-on', version: 1, guideId, instanceId, ...state }, parentOrigin);
    });
    const onControl = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parentOrigin || event.data?.channel !== 'paw.hands-on-control' || event.data.instanceId !== instanceId) return;
      const next = event.data.playing === true;
      if (next !== active) due = Date.now() + 2600;
      active = next;
      guide.refresh(true);
    };
    window.addEventListener('message', onControl);
    const timer = window.setInterval(() => {
      guide.refresh();
      const target = document.querySelector<HTMLElement>('.paw-hands-on-target');
      cursor.hidden = !active || !ready || !target || document.hidden;
      if (!cursor.hidden && target) {
        const box = target.getBoundingClientRect();
        cursor.style.left = `${box.left + box.width / 2}px`;
        cursor.style.top = `${box.top + box.height / 2}px`;
        if (Date.now() >= due) {
          if (guide.clickCurrent()) cursor.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(.75)' }, { transform: 'scale(1)' }], { duration: 280 });
          due = Date.now() + 2600;
        }
      }
    }, 200);
    let frame = 0;
    const seenWindows = new Set<string>();
    const maximize = () => {
      const state = api.getState();
      const id = state.activeWindowId;
      if (id && !seenWindows.has(id)) {
        seenWindows.add(id);
        if (state.windows[id]?.placement !== 'maximized') state.toggleMaximize(id);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; guide.refresh(); }); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-expanded', 'aria-selected', 'aria-checked', 'hidden'] });
    const unsubscribe = api.subscribe(maximize);
    document.addEventListener('click', schedule);
    window.addEventListener('resize', schedule);
    maximize(); schedule();
    return () => { clearInterval(timer); cursor.remove(); window.removeEventListener('message', onControl); cancelAnimationFrame(frame); observer.disconnect(); unsubscribe(); guide.destroy(); document.removeEventListener('click', schedule); window.removeEventListener('resize', schedule); };
  }, [api, guideId]);
  return null;
}
