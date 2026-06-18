import { useEffect, useMemo, useState } from 'react';
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

function MobileSidebarDrawer({ activeTab, open, onClose, onTabChange }: Pick<Props, 'activeTab' | 'onTabChange'> & { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const context = useMemo<SidebarTabContext>(() => ({
    activeTab,
    variant: 'mobile',
    onTabChange,
    onAfterSelect: onClose
  }), [activeTab, onTabChange, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        data-testid="mobile-drawer-backdrop"
        data-open="true"
        className={`${styles.backdrop} ${styles.backdropOpen}`}
        aria-label={t('nav.collapse')}
        onClick={onClose}
      />
      <aside className={`${styles.drawer} ${styles.drawerOpen}`} data-testid="mobile-sidebar-drawer" data-open="true" aria-label={t('nav.aria')}>
        <header className={`${styles.head} ${styles.mobileHead}`}>
          <div className={styles.projectDot} aria-hidden="true">✓</div>
          <div className={styles.projectCopy}>
            <strong>{t('nav.brand')}</strong>
            <span>{t('nav.workspace')}</span>
          </div>
          <button type="button" className={styles.railMark} onClick={onClose} aria-label={t('nav.collapse')}>×</button>
        </header>

        <nav className={`${styles.tabs} ${styles.mobileTabs}`} aria-label={t('nav.sections')}>
          <SlotHost<SidebarTabContext> slot="sidebar/main-tabs" context={context} />
          <SlotHost<SidebarTabContext> slot="sidebar/footer-tabs" context={context} />
        </nav>

        <div className={`${styles.mobileCard} glass-panel`}>
          <span className="section-kicker">Image Studio</span>
          <p>{t('nav.workspace')}</p>
        </div>
      </aside>
    </>
  );
}

export function StudioSidebar({ collapsed, activeTab, onTabChange, onCollapseChange }: Props) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);
  const expandedContext = useMemo<SidebarTabContext>(() => ({ activeTab, variant: 'expanded', onTabChange }), [activeTab, onTabChange]);
  const collapsedContext = useMemo<SidebarTabContext>(() => ({ activeTab, variant: 'collapsed', onTabChange }), [activeTab, onTabChange]);

  if (collapsed) {
    return (
      <>
        <aside className={`${styles.rail} ${styles.collapsed}`} data-testid="sidebar-rail" data-workspace-navigation aria-label={t('nav.ariaCollapsed')}>
          <button className={styles.railMark} data-testid="sidebar-expand" onClick={() => onCollapseChange(false)} aria-label={t('nav.expand')}>☰</button>
          <SlotHost<SidebarTabContext> slot="sidebar/main-tabs" context={collapsedContext} />
          <div className={styles.railWord}>studio</div>
          <div className={`${styles.footer} ${styles.collapsedFooter}`}>
            <SlotHost<SidebarTabContext> slot="sidebar/footer-tabs" context={collapsedContext} />
          </div>
        </aside>
        <button
          type="button"
          className={`${styles.mobileTrigger} ${mobileOpen ? styles.mobileTriggerActive : ''}`}
          data-testid="mobile-drawer-trigger"
          aria-label={mobileOpen ? t('nav.collapse') : t('nav.expand')}
          aria-expanded={mobileOpen}
          onClick={mobileOpen ? closeMobile : openMobile}
        >
          <span aria-hidden="true">(=)</span>
        </button>
        <MobileSidebarDrawer activeTab={activeTab} open={mobileOpen} onClose={closeMobile} onTabChange={onTabChange} />
      </>
    );
  }

  return (
    <>
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
      <button
        type="button"
        className={`${styles.mobileTrigger} ${mobileOpen ? styles.mobileTriggerActive : ''}`}
        data-testid="mobile-drawer-trigger"
        aria-label={mobileOpen ? t('nav.collapse') : t('nav.expand')}
        aria-expanded={mobileOpen}
        onClick={mobileOpen ? closeMobile : openMobile}
      >
        <span aria-hidden="true">(=)</span>
      </button>
      <MobileSidebarDrawer activeTab={activeTab} open={mobileOpen} onClose={closeMobile} onTabChange={onTabChange} />
    </>
  );
}
