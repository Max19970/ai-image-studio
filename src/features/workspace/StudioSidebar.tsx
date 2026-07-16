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

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="3.25" y="4.25" width="14.5" height="14.5" rx="3" />
      <path d="m6.5 15 3.15-3.45 2.3 2.15 2.85-3.2" />
      <circle cx="13.9" cy="8.35" r="1.15" />
      <path d="M8 20.25h9.25a3.5 3.5 0 0 0 3.5-3.5V8" />
    </svg>
  );
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className={collapsed ? styles.toggleIconCollapsed : undefined} viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <rect x="2.75" y="3.25" width="14.5" height="13.5" rx="2.5" />
      <path d="M7 3.75v12.5" />
      <path d="m12.25 7.75-2.25 2.25 2.25 2.25" />
    </svg>
  );
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
  const context = useMemo<SidebarTabContext>(() => ({
    activeTab,
    variant: collapsed ? 'collapsed' : 'expanded',
    onTabChange
  }), [activeTab, collapsed, onTabChange]);
  const toggleLabel = collapsed ? t('nav.expand') : t('nav.collapse');

  const toggleSidebar = () => onCollapseChange(!collapsed);

  return (
    <aside
      className={`${styles.rail} ${collapsed ? styles.collapsed : ''}`}
      data-testid="sidebar-rail"
      data-workspace-navigation
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label={collapsed ? t('nav.ariaCollapsed') : t('nav.aria')}
    >
      <header className={styles.head}>
        <div className={styles.projectMark} aria-hidden="true">
          <BrandMark />
        </div>
        <div className={styles.projectCopy}>
          <strong>{t('nav.brand')}</strong>
          <span>{t('nav.workspace')}</span>
        </div>
        <button
          className={styles.railToggle}
          data-testid={collapsed ? 'sidebar-expand' : 'sidebar-collapse'}
          type="button"
          onClick={toggleSidebar}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          title={toggleLabel}
        >
          <SidebarToggleIcon collapsed={collapsed} />
        </button>
      </header>

      <nav className={styles.tabs} aria-label={t('nav.sections')}>
        <SlotHost<SidebarTabContext> slot="sidebar/main-tabs" context={context} />
      </nav>

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <SlotHost<SidebarTabContext> slot="sidebar/footer-tabs" context={context} />
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
