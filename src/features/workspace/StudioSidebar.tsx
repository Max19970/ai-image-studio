import { useMemo } from 'react';
import { SlotHost } from '../../interface/SlotHost';
import type { SidebarTabContext, WorkspaceTab } from '../../interface/context/workspace/tabs';
import { useI18n } from '../../i18n';
import { ImagesIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from '../../shared/ui';
import styles from './StudioSidebar.module.css';

interface Props {
  collapsed: boolean;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onCollapseChange: (collapsed: boolean) => void;
}

function BrandMark() {
  return <ImagesIcon size={24} strokeWidth={1.7} />;
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return collapsed
    ? <PanelLeftOpenIcon size={20} />
    : <PanelLeftCloseIcon size={20} />;
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
