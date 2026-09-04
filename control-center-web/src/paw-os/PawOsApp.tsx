import { useEffect, useMemo } from 'react';
import { usePawOsAppearance } from '@/design/paw-os-themes';
import { pawAppForPath } from './runtime/app-registry';
import { PawDesktopProvider, usePawDesktopApi } from './runtime/desktop-context';
import type { PawDesktopStore } from './runtime/desktop-store';
import { PawMemoryFlowShowcaseDirector } from './showcase/PawMemoryFlowShowcaseDirector';
import { PawRoomFlowShowcaseDirector } from './showcase/PawRoomFlowShowcaseDirector';
import { PawTraceFlowShowcaseDirector } from './showcase/PawTraceFlowShowcaseDirector';
import { isPawMemoryFlowShowcase } from './showcase/memory-flow-script';
import { isPawRoomFlowShowcase } from './showcase/room-flow-script';
import { isPawTraceFlowShowcase } from './showcase/trace-flow-script';
import { PawDesktop } from './shell/PawDesktop';
import './styles/paw-os.css';
import './styles/paw-os-motion.css';
import './styles/paw-os-webmodel-v1.css';
import './styles/paw-os-shell-migrated-v1.css';
import './styles/paw-os-controls.css';
import './styles/paw-os-showcase.css';

export function PawOsApp() {
  const { theme } = usePawOsAppearance();
  const initialRoute = useMemo(() => currentHashRoute(), []);
  const initialApp = useMemo(() => pawAppForPath(initialRoute), [initialRoute]);
  const roomFlowShowcase = useMemo(() => isPawRoomFlowShowcase(), []);
  const memoryFlowShowcase = useMemo(() => isPawMemoryFlowShowcase(), []);
  const traceFlowShowcase = useMemo(() => isPawTraceFlowShowcase(), []);
  const showcaseId = useMemo(() => currentShowcaseId(), []);
  const contextShowcase = showcaseId.startsWith('context-');
  const persistenceKey = showcaseId
    ? `pawos.desktop.showcase.${showcaseId}.v1`
    : undefined;
  return (
    <PawDesktopProvider
      initialAppId={initialApp?.id}
      initialRoute={initialRoute}
      persistenceKey={persistenceKey}
    >
      <PawOsRouteBridge />
      <div
        className="paw-desktop-root"
        data-context-showcase={contextShowcase || undefined}
        data-paw-theme={theme}
        data-room-flow-showcase={roomFlowShowcase || undefined}
        data-testid="paw-os-product-root"
      >
        <PawDesktop />
        {memoryFlowShowcase ? <PawMemoryFlowShowcaseDirector /> : null}
        {roomFlowShowcase ? <PawRoomFlowShowcaseDirector /> : null}
        {traceFlowShowcase ? <PawTraceFlowShowcaseDirector /> : null}
      </div>
    </PawDesktopProvider>
  );
}

function PawOsRouteBridge() {
  const api = usePawDesktopApi();
  useEffect(() => {
    const sync = () => syncPawOsRoute(api);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [api]);
  return null;
}

export function syncPawOsRoute(api: PawDesktopStore) {
  const route = currentHashRoute();
  const app = pawAppForPath(route);
  if (!app) {
    api.getState().showWayfinder();
    return;
  }
  if (app.id === 'agent') {
    const currentTarget = api.getState().windows.agent?.target;
    const requestedTarget = agentRouteTarget(route);
    if (
      (currentTarget?.kind === 'session' || currentTarget?.kind === 'room')
      && (
        !requestedTarget
        || requestedTarget.kind !== currentTarget.kind
        || requestedTarget.id !== currentTarget.id
      )
    ) {
      // A bound target is stronger than initialRoute inside PawAgentApp. Drop
      // that stale binding before applying a different deep link; the App will
      // bind the newly loaded Session or Room back after catalog resolution.
      api.getState().bindAgentMain('agent');
    }
  }
  const windowId = api.getState().openApp(app.id, { initialRoute: route });
  if (
    currentShowcaseId().startsWith('context-')
    && api.getState().windows[windowId]?.placement !== 'maximized'
  ) {
    api.getState().toggleMaximize(windowId);
  }
}

function agentRouteTarget(route: string): { kind: 'session' | 'room'; id: string } | null {
  const query = new URLSearchParams(route.split('?', 2)[1] ?? '');
  const roomId = query.get('room')?.trim();
  if (roomId) return { kind: 'room', id: roomId };
  const sessionId = (query.get('session') || query.get('sessionId'))?.trim();
  return sessionId ? { kind: 'session', id: sessionId } : null;
}

function currentHashRoute(): string {
  if (typeof window === 'undefined') return '/project-field';
  return window.location.hash.replace(/^#/, '') || '/project-field';
}

function currentShowcaseId(): string {
  if (typeof window === 'undefined') return '';
  const value = new URLSearchParams(window.location.search).get('showcase')?.trim() ?? '';
  return /^[a-z0-9-]+$/u.test(value) ? value : '';
}
