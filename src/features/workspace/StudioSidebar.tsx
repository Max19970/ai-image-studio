import { useMemo } from 'react';
import { SlotHost } from '../../interface/SlotHost';
import type { SidebarTabContext, WorkspaceTab } from '../../interface/context/workspace/tabs';
import { useI18n } from '../../i18n';
import styles from './StudioSidebar.module.css';

interface Props {
  collapsed: boolean;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onCollapseChange: (collapsed: boolean) => void;
}

function MobileBottomNavigation({ activeTab, onTabChange }: Pick<Props, 'activeTab' | 'onTabChange'>) {
  const { t } = useI18n();
  const context = useMemo<SidebarTabContext>(() => ({
    activeTab,
    variant: 'bottom',
    onTabChange
  }), [activeTab, onTabChange]);

  return (
    <nav className={styles.mobileBottomNav} data-workspace-navigation aria-label={t('nav.sections')}>
      <div className={styles.mobileBottomTabs}>
        <SlotHost<SidebarTabContext> slot="sidebar/main-tabs" context={context} as={null} />
        <SlotHost<SidebarTabContext> slot="sidebar/footer-tabs" context={context} as={null} />
      </div>
    </nav>
  );
}

function DesktopRail({ collapsed, activeTab, onTabChange, onCollapseChange }: Props) {
  const { t } = useI18n();
  const expandedContext = useMemo<SidebarTabContext>(() => ({ activeTab, variant: 'expanded', onTabChange }), [activeTab, onTabChange]);
  const collapsedContext = useMemo<SidebarTabContext>(() => ({ activeTab, variant: 'collapsed', onTabChange }), [activeTab, onTabChange]);

  if (collapsed) {
    return (
      <aside className={`${styles.rail} ${styles.collapsed}`} data-testid="sidebar-rail" data-workspace-navigation aria-label={t('nav.ariaCollapsed')}>
        <button className={styles.railMark} data-testid="sidebar-expand" onClick={() => onCollapseChange(false)} aria-label={t('nav.expand')}>☰</button>
        <SlotHost<SidebarTabContext> slot="sidebar/main-tabs" context={collapsedContext} />
        <div className={styles.railWord}>studio</div>
        <div className={`${styles.footer} ${styles.collapsedFooter}`}>
          <SlotHost<SidebarTabContext> slot="sidebar/footer-tabs" context={collapsedContext} />
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.rail} data-testid="sidebar-rail" data-workspace-navigation aria-label={t('nav.aria')}>
      <header className={styles.head}>
        <div className={styles.projectDot} aria-hidden="true">✓</div>
        <div className={styles.projectCopy}>
          <strong>{t('nav.brand')}</strong>
          <span>{t('nav.workspace')}</span>
        </div>
        <button className={styles.railMark} data-testid="sidebar-collapse" onClick={() => onCollapseChange(true)} aria-label={t('nav.collapse')}>◧</button>
      </header>

      <nav className={styles.tabs} aria-label={t('nav.sections')}>
        <SlotHost<SidebarTabContext> slot="sidebar/main-tabs" context={expandedContext} />
      </nav>

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <SlotHost<SidebarTabContext> slot="sidebar/footer-tabs" context={expandedContext} />
      </div>
    </aside>
  );
}

export function StudioSidebar({ collapsed, activeTab, onTabChange, onCollapseChange }: Props) {
  return (
    <>
      <DesktopRail collapsed={collapsed} activeTab={activeTab} onTabChange={onTabChange} onCollapseChange={onCollapseChange} />
      <MobileBottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
}
