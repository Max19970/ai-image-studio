import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

type WorkspaceTab = 'images' | 'info' | 'settings';

interface Props {
  collapsed: boolean;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onCollapseChange: (collapsed: boolean) => void;
}

const tabs: Array<{ id: WorkspaceTab; icon: string; labelKey: string }> = [
  { id: 'images', icon: '▧', labelKey: 'nav.images' },
  { id: 'info', icon: 'i', labelKey: 'nav.info' },
  { id: 'settings', icon: '⚙', labelKey: 'nav.settings' }
];

function MobileSidebarDrawer({ activeTab, open, onClose, onTabChange }: Pick<Props, 'activeTab' | 'onTabChange'> & { open: boolean; onClose: () => void }) {
  const { t } = useI18n();

  const selectTab = (tab: WorkspaceTab) => {
    onTabChange(tab);
    onClose();
  };

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
        className="mobile-drawer-backdrop open"
        aria-label={t('nav.collapse')}
        onClick={onClose}
      />
      <aside className="mobile-sidebar-drawer open" aria-label={t('nav.aria')}>
        <header className="sidebar-head mobile-sidebar-head">
          <div className="project-dot" aria-hidden="true">✓</div>
          <div className="project-copy">
            <strong>{t('nav.brand')}</strong>
            <span>{t('nav.workspace')}</span>
          </div>
          <button type="button" className="rail-mark" onClick={onClose} aria-label={t('nav.collapse')}>×</button>
        </header>

        <nav className="sidebar-tabs mobile-sidebar-tabs" aria-label={t('nav.sections')}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              type="button"
              onClick={() => selectTab(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>

        <div className="mobile-sidebar-card glass-panel">
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

  if (collapsed) {
    return (
      <>
        <aside className="sidebar-rail collapsed" aria-label={t('nav.ariaCollapsed')}>
          <button className="rail-mark" onClick={() => onCollapseChange(false)} aria-label={t('nav.expand')}>☰</button>
          <button className={`rail-icon ${activeTab === 'images' ? 'active' : ''}`} onClick={() => onTabChange('images')} title={t('nav.images')}>▧</button>
          <button className={`rail-icon ${activeTab === 'info' ? 'active' : ''}`} onClick={() => onTabChange('info')} title={t('nav.info')}>i</button>
          <div className="rail-word">studio</div>
          <div className="sidebar-footer collapsed-footer">
            <button className={`rail-icon ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => onTabChange('settings')} title={t('nav.settings')}>⚙</button>
          </div>
        </aside>
        <button
          type="button"
          className={`mobile-drawer-trigger ${mobileOpen ? 'active' : ''}`}
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
      <aside className="sidebar-rail" aria-label={t('nav.aria')}>
        <header className="sidebar-head">
          <div className="project-dot" aria-hidden="true">✓</div>
          <div className="project-copy">
            <strong>{t('nav.brand')}</strong>
            <span>{t('nav.workspace')}</span>
          </div>
          <button className="rail-mark" onClick={() => onCollapseChange(true)} aria-label={t('nav.collapse')}>◧</button>
        </header>

        <nav className="sidebar-tabs" aria-label={t('nav.sections')}>
          <button className={activeTab === 'images' ? 'active' : ''} type="button" onClick={() => onTabChange('images')}>
            <span>▧</span> {t('nav.images')}
          </button>
          <button className={activeTab === 'info' ? 'active' : ''} type="button" onClick={() => onTabChange('info')}>
            <span>i</span> {t('nav.info')}
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <button
            type="button"
            className={`sidebar-settings-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => onTabChange('settings')}
          >
            <span>⚙</span>
            <strong>{t('nav.settings')}</strong>
          </button>
        </div>
      </aside>
      <button
        type="button"
        className={`mobile-drawer-trigger ${mobileOpen ? 'active' : ''}`}
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
