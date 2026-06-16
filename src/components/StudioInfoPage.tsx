import type { ProviderProbeReport, ProviderSettings, WorkMode } from '../domain/types';
import { useI18n } from '../i18n';

interface Props {
  mode: WorkMode;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  onOpenSettings: () => void;
}

function ProviderStatus({ report }: { report: ProviderProbeReport | null }) {
  const { t } = useI18n();
  if (!report) return <>{t('info.notChecked')}</>;
  return <>{t('info.checkedAt', { date: new Date(report.createdAt).toLocaleString() })}</>;
}

export function StudioInfoPage({ mode, provider, capabilityReport, onOpenSettings }: Props) {
  const { t } = useI18n();
  const endpoint = mode === 'generate' ? provider.generationEndpoint : provider.editEndpoint;
  const guides = ['generate', 'edit', 'batch', 'details', 'providers', 'probe'];

  return (
    <section className="workspace-info-page">
      <header className="workspace-info-hero glass-panel">
        <p className="section-kicker">{t('info.kicker')}</p>
        <h2>{t('info.title')}</h2>
        <p>{t('info.text')}</p>
        <div className="workspace-info-actions">
          <button type="button" className="btn-primary" onClick={onOpenSettings}>{t('info.openSettings')}</button>
          <span className="status-pill neutral">{t(`gallery.mode.${mode}`)}</span>
        </div>
      </header>

      <div className="workspace-info-grid">
        <article className="detail-card workspace-info-card">
          <span className="section-kicker">{t('info.provider')}</span>
          <h3>{provider.modelId || t('info.noModel')}</h3>
          <div className="detail-grid">
            <div className="detail-row"><span>{t('info.activeEndpoint')}</span><strong>{endpoint || t('info.notSet')}</strong></div>
            <div className="detail-row"><span>{t('info.capabilities')}</span><strong><ProviderStatus report={capabilityReport} /></strong></div>
          </div>
        </article>

        <article className="detail-card workspace-info-card">
          <span className="section-kicker">{t('info.attachmentRoles')}</span>
          <h3>{t('info.attachmentTitle')}</h3>
          <p className="muted-copy">{t('info.attachmentText')}</p>
        </article>

        <article className="detail-card workspace-info-card">
          <span className="section-kicker">{t('info.flow')}</span>
          <h3>{t('info.flowTitle')}</h3>
          <p className="muted-copy">{t('info.flowText')}</p>
        </article>
      </div>

      <section className="workspace-guides-section glass-panel">
        <div className="workspace-guides-head">
          <p className="section-kicker">{t('info.guidesKicker')}</p>
          <h3>{t('info.guidesTitle')}</h3>
          <p>{t('info.guidesText')}</p>
        </div>

        <div className="workspace-guides-grid workspace-guides-grid-desktop">
          {guides.map((guide) => (
            <article className="info-guide-card" key={guide}>
              <span className="info-guide-number">{String(guides.indexOf(guide) + 1).padStart(2, '0')}</span>
              <div>
                <h4>{t(`info.guide.${guide}.title`)}</h4>
                <p>{t(`info.guide.${guide}.text`)}</p>
              </div>
              <ol>
                <li>{t(`info.guide.${guide}.step1`)}</li>
                <li>{t(`info.guide.${guide}.step2`)}</li>
                <li>{t(`info.guide.${guide}.step3`)}</li>
              </ol>
            </article>
          ))}
        </div>

        <div className="mobile-guide-list">
          {guides.map((guide, index) => (
            <details className="mobile-guide-details" key={guide} open={index === 0}>
              <summary>
                <span className="info-guide-number">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{t(`info.guide.${guide}.title`)}</strong>
                  <small>{t(`info.guide.${guide}.text`)}</small>
                </span>
              </summary>
              <ol>
                <li>{t(`info.guide.${guide}.step1`)}</li>
                <li>{t(`info.guide.${guide}.step2`)}</li>
                <li>{t(`info.guide.${guide}.step3`)}</li>
              </ol>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
