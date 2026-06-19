import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { SlotHost } from '../interface/SlotHost';
import type { WorkspaceComposerDockContext, WorkspaceModalsContext } from '../interface/context/workspace/composerDock';
import type { WorkspaceMainContext } from '../interface/context/workspace/main';
import type { WorkspaceSidebarContext } from '../interface/context/workspace/sidebar';
import { useWorkspaceViewModel } from './workspace/useWorkspaceViewModel';

const ImageDetailPage = lazy(() =>
  import('../features/detail/ImageDetailPage').then((module) => ({ default: module.ImageDetailPage }))
);

export function App() {
  const { t } = useI18n();
  const workspace = useWorkspaceViewModel(t);
  const { state, derived, commands, contexts } = workspace;
  const [motionLock, setMotionLock] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const mountedRef = useRef(false);


  useEffect(() => {
    const syncVisibility = () => setDocumentHidden(document.visibilityState === 'hidden');
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    setMotionLock(true);
    const timer = window.setTimeout(() => setMotionLock(false), 260);
    return () => window.clearTimeout(timer);
  }, [state.workspaceTab, state.sidebarCollapsed, state.batchComposerOpen]);

  if (derived.selectedTask) {
    return (
      <Suspense fallback={null}>
        <ImageDetailPage
          task={derived.selectedTask}
          image={derived.selectedImage}
          commands={commands.detail}
        />
      </Suspense>
    );
  }

  return (
    <main
      className={`studio-app ${state.sidebarCollapsed ? 'sidebar-is-collapsed' : ''} ${state.batchComposerOpen ? 'batch-composer-is-open' : ''} ${motionLock ? 'motion-is-transitioning' : ''} ${documentHidden ? 'motion-is-backgrounded' : ''}`}
      data-theme={state.studioSettings.interfaceTheme}
    >
      <div className="studio-noise" aria-hidden="true" />

      <SlotHost<WorkspaceSidebarContext>
        slot="workspace/sidebar"
        context={contexts.sidebar}
        as={null}
      />

      <section className="studio-main" data-ui-slot-region="workspace/main">
        <SlotHost<WorkspaceMainContext>
          slot="workspace/main"
          context={contexts.main}
          as={null}
        />
      </section>

      <SlotHost<WorkspaceComposerDockContext>
        slot="workspace/dock"
        context={contexts.dock}
        as={null}
      />

      <SlotHost<WorkspaceModalsContext>
        slot="workspace/modals"
        context={contexts.modals}
        as={null}
      />
    </main>
  );
}
