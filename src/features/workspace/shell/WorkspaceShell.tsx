import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n';
import { useWorkspaceSidebarLayout } from './useWorkspaceSidebarLayout';
import styles from './WorkspaceShell.module.css';

interface WorkspaceShellProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  sidebar: ReactNode;
  main: ReactNode;
  dock: ReactNode;
}

export function WorkspaceShell({ collapsed, onCollapsedChange, sidebar, main, dock }: WorkspaceShellProps) {
  const { t } = useI18n();
  const sidebarLayout = useWorkspaceSidebarLayout({ collapsed, onCollapsedChange });

  return (
    <div
      ref={sidebarLayout.shellRef}
      className={styles.shell}
      data-testid="workspace-shell"
      data-sidebar-collapsed={collapsed ? 'true' : 'false'}
      data-sidebar-resizing={sidebarLayout.resizing ? 'true' : 'false'}
    >
      <div className={styles.sidebarFrame}>
        {sidebar}
        <div
          ref={sidebarLayout.resizeHandleRef}
          className={styles.resizeHandle}
          data-testid="sidebar-resize-handle"
          role="separator"
          tabIndex={0}
          aria-label={t('nav.resizeSidebar')}
          aria-orientation="vertical"
          aria-valuemin={72}
          aria-valuemax={480}
          aria-valuenow={Math.round(sidebarLayout.ariaSize)}
          onPointerDown={sidebarLayout.onResizePointerDown}
          onPointerMove={sidebarLayout.onResizePointerMove}
          onPointerUp={sidebarLayout.onResizePointerUp}
          onPointerCancel={sidebarLayout.onResizePointerCancel}
          onLostPointerCapture={sidebarLayout.onResizePointerLostCapture}
          onKeyDown={sidebarLayout.onResizeKeyDown}
          onDoubleClick={sidebarLayout.resetSize}
        />
      </div>
      <div className={styles.mainFrame}>
        <section className={`studio-main ${styles.mainScrollRegion}`} data-ui-slot-region="workspace/main">
          {main}
        </section>
        <div className={styles.dockLayer} data-ui-slot-region="workspace/dock">
          {dock}
        </div>
      </div>
    </div>
  );
}
