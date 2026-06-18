import { ParameterPanel } from './ParameterPanel';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { useI18n } from '../../i18n';
import { Button, IconButton } from '../../shared/ui';
import styles from './ParametersModal.module.css';

interface Props {
  open: boolean;
  mode: WorkMode;
  params: ImageParams;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  warnings: string[];
  onClose: () => void;
  onChange: (params: ImageParams) => void;
}

export function ParametersModal({ open, mode, params, provider, capabilityReport, warnings, onClose, onChange }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  const summarySize = params.sizeMode === 'custom'
    ? `${params.width}×${params.height}`
    : params.sizeMode === 'preset'
      ? params.sizePreset
      : 'auto';

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <section className={styles.shell} data-testid="parameters-modal">
        <header className={styles.topbar}>
          <div>
            <p className="section-kicker">{t('params.kicker')}</p>
            <h2 className="section-title">{t('params.title')}</h2>
            <p className={styles.subcopy}>{t('params.summary', { mode: t(`gallery.mode.${mode}`), size: summarySize, n: params.n })}</p>
          </div>
          <IconButton data-testid="parameters-modal-close" onClick={onClose} aria-label={t('attachment.close')}>×</IconButton>
        </header>

        {warnings.length > 0 && (
          <div className={`warning-strip compact ${styles.warningStack}`}>
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}

        <div className={styles.body}>
          <ParameterPanel mode={mode} params={params} provider={provider} capabilityReport={capabilityReport} onChange={onChange} />
        </div>

        <footer className={styles.footer}>
          <Button variant="primary" onClick={onClose}>{t('params.done')}</Button>
        </footer>
      </section>
    </div>
  );
}
