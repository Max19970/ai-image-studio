import { lazy, Suspense, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { SlotHost } from '../interface/SlotHost';
import type { WorkspaceComposerDockContext, WorkspaceModalsContext } from '../interface/context/workspace/composerDock';
import type { WorkspaceMainContext } from '../interface/context/workspace/main';
import type { WorkspaceSidebarContext } from '../interface/context/workspace/sidebar';
import { useHostEnvironment } from '../infrastructure/host-environment';
import { WorkspaceShell } from '../features/workspace/shell/WorkspaceShell';
import { useWorkspaceViewModel } from './workspace/useWorkspaceViewModel';

const ImageDetailPage = lazy(() =>
  import('../features/detail/ImageDetailPage').then((module) => ({ default: module.ImageDetailPage }))
);

export function App() {
  const { t } = useI18n();
  const hostEnvironment = useHostEnvironment();
  const workspace = useWorkspaceViewModel(t);
  const { state, derived, commands, contexts } = workspace;
  const [documentHidden, setDocumentHidden] = useState(false);


  useEffect(() => {
    const syncVisibility = () => setDocumentHidden(document.visibilityState === 'hidden');
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

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
      className={`studio-app ${state.batchComposerOpen ? 'batch-composer-is-open' : ''} ${documentHidden ? 'motion-is-backgrounded' : ''} ${(hostEnvironment.decorations.classNames ?? []).join(' ')}`}
      data-theme={state.studioSettings.interfaceTheme}
      {...hostEnvironment.decorations.dataAttributes}
    >
      <div className="studio-noise" aria-hidden="true" />

      <WorkspaceShell
        collapsed={state.sidebarCollapsed}
        onCollapsedChange={contexts.sidebar.commands.setSidebarCollapsed}
        sidebar={(
          <SlotHost<WorkspaceSidebarContext>
            slot="workspace/sidebar"
            context={contexts.sidebar}
            as={null}
          />
        )}
        main={(
          <SlotHost<WorkspaceMainContext>
            slot="workspace/main"
            context={contexts.main}
            as={null}
          />
        )}
        dock={(
          <SlotHost<WorkspaceComposerDockContext>
            slot="workspace/dock"
            context={contexts.dock}
            as={null}
          />
        )}
      />

      <SlotHost<WorkspaceModalsContext>
        slot="workspace/modals"
        context={contexts.modals}
        as={null}
      />
    </main>
  );
}
