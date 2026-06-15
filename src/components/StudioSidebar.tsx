import { useI18n } from '../i18n';

type WorkspaceTab = 'images' | 'info' | 'settings';

interface Props {
  collapsed: boolean;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onCollapseChange: (collapsed: boolean) => void;
}

export function StudioSidebar({ collapsed, activeTab, onTabChange, onCollapseChange }: Props) {
  const { t } = useI18n();

  if (collapsed) {
    return (
      <aside className="sidebar-rail collapsed" aria-label={t('nav.ariaCollapsed')}>
        <button className="rail-mark" onClick={() => onCollapseChange(false)} aria-label={t('nav.expand')}>☰</button>
        <button className={`rail-icon ${activeTab === 'images' ? 'active' : ''}`} onClick={() => onTabChange('images')} title={t('nav.images')}>▧</button>
        <button className={`rail-icon ${activeTab === 'info' ? 'active' : ''}`} onClick={() => onTabChange('info')} title={t('nav.info')}>i</button>
        <div className="rail-word">studio</div>
        <div className="sidebar-footer collapsed-footer">
          <button className={`rail-icon ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => onTabChange('settings')} title={t('nav.settings')}>⚙</button>
        </div>
      </aside>
    );
  }

  return (
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
  );
}
