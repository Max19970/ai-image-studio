import { useEffect, useRef, useState } from 'react';
import { ImageDetailPage } from '../features/detail/ImageDetailPage';
import { useI18n } from '../i18n';
import { SlotHost } from '../interface/SlotHost';
import type { WorkspaceComposerDockContext, WorkspaceModalsContext } from '../interface/context/workspace/composerDock';
import type { WorkspaceMainContext } from '../interface/context/workspace/main';
import type { WorkspaceSidebarContext } from '../interface/context/workspace/sidebar';
import { useWorkspaceViewModel } from './workspace/useWorkspaceViewModel';

export function App() {
  const { t } = useI18n();
  const workspace = useWorkspaceViewModel(t);
  const { state, derived, commands, contexts } = workspace;
  const [motionLock, setMotionLock] = useState(false);
  const mountedRef = useRef(false);

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
      <ImageDetailPage
        task={derived.selectedTask}
        image={derived.selectedImage}
        commands={commands.detail}
      />
    );
  }

  return (
    <main
      className={`studio-app ${state.sidebarCollapsed ? 'sidebar-is-collapsed' : ''} ${state.batchComposerOpen ? 'batch-composer-is-open' : ''} ${motionLock ? 'motion-is-transitioning' : ''}`}
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
