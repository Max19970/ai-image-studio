import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ParameterPanel } from './ParameterPanel';
import { defaultImageParams } from '../../domain/defaults';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { useI18n } from '../../i18n';
import { Button, IconButton } from '../../shared/ui';
import { useModalDialog } from '../../shared/hooks/useModalDialog';
import styles from './ParametersModal.module.css';

interface Props {
  open: boolean;
  mode: WorkMode;
  providerMode: ProviderGenerationModeDefinition;
  params: ImageParams;
  provider: ProviderSettings;
  capabilityReport: ProviderProbeReport | null;
  studioSettings?: StudioSettings;
  warnings: string[];
  onClose: () => void;
  onChange: (params: ImageParams) => void;
}

export function ParametersModal({ open, mode, providerMode, params, provider, capabilityReport, studioSettings, warnings, onClose, onChange }: Props) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalDialog({ open, rootRef, dialogRef, onClose });

  if (!open || typeof document === 'undefined') return null;

  const resetParams = () => onChange({ ...defaultImageParams, prompt: params.prompt });
  const summarySize = params.sizeMode === 'custom'
    ? `${params.width}×${params.height}`
    : params.sizeMode === 'preset'
      ? params.sizePreset
      : 'auto';

  return createPortal(
    <div ref={rootRef} className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className={styles.shell} data-testid="parameters-modal" role="dialog" aria-modal="true" aria-labelledby="parameters-modal-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.topbar}>
          <div>
            <p className="section-kicker">{t('params.kicker')}</p>
            <h2 id="parameters-modal-title" className="section-title">{t('params.title')}</h2>
            <p className={styles.subcopy}>{t('params.summary', { mode: t(providerMode.labelKey), size: summarySize, n: params.n })}</p>
          </div>
          <IconButton className={styles.closeButton} data-testid="parameters-modal-close" onClick={onClose} aria-label={t('attachment.close')}>×</IconButton>
        </header>

        {warnings.length > 0 && (
          <div className={`warning-strip compact ${styles.warningStack}`}>
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}

        <div className={styles.body}>
          <ParameterPanel mode={mode} providerMode={providerMode} params={params} provider={provider} capabilityReport={capabilityReport} studioSettings={studioSettings} onChange={onChange} />
        </div>

        <footer className={styles.footer}>
          <Button className={styles.resetButton} variant="ghost" size="compact" onClick={resetParams}>{t('params.resetAll')}</Button>
          <Button className={styles.doneButton} variant="primary" size="compact" onClick={onClose}>{t('params.done')}</Button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
