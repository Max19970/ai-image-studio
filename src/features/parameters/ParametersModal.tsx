import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ParameterPanel } from './ParameterPanel';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
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
  studioSettings?: StudioSettings;
  warnings: string[];
  onClose: () => void;
  onChange: (params: ImageParams) => void;
}

export function ParametersModal({ open, mode, params, provider, capabilityReport, studioSettings, warnings, onClose, onChange }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const summarySize = params.sizeMode === 'custom'
    ? `${params.width}×${params.height}`
    : params.sizeMode === 'preset'
      ? params.sizePreset
      : 'auto';

  return createPortal(
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.shell} data-testid="parameters-modal" role="dialog" aria-modal="true" aria-labelledby="parameters-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.topbar}>
          <div>
            <p className="section-kicker">{t('params.kicker')}</p>
            <h2 id="parameters-modal-title" className="section-title">{t('params.title')}</h2>
            <p className={styles.subcopy}>{t('params.summary', { mode: t(`gallery.mode.${mode}`), size: summarySize, n: params.n })}</p>
          </div>
          <IconButton className={styles.closeButton} data-testid="parameters-modal-close" onClick={onClose} aria-label={t('attachment.close')}>×</IconButton>
        </header>

        {warnings.length > 0 && (
          <div className={`warning-strip compact ${styles.warningStack}`}>
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}

        <div className={styles.body}>
          <ParameterPanel mode={mode} params={params} provider={provider} capabilityReport={capabilityReport} studioSettings={studioSettings} onChange={onChange} />
        </div>

        <footer className={styles.footer}>
          <Button className={styles.doneButton} variant="primary" size="compact" onClick={onClose}>{t('params.done')}</Button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
