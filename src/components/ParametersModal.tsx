import { ParameterPanel } from './ParameterPanel';
import type { ImageParams, ProviderProbeReport, WorkMode } from '../domain/types';
import { useI18n } from '../i18n';

interface Props {
  open: boolean;
  mode: WorkMode;
  params: ImageParams;
  capabilityReport: ProviderProbeReport | null;
  warnings: string[];
  onClose: () => void;
  onChange: (params: ImageParams) => void;
}

export function ParametersModal({ open, mode, params, capabilityReport, warnings, onClose, onChange }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  const summarySize = params.sizeMode === 'custom'
    ? `${params.width}×${params.height}`
    : params.sizeMode === 'preset'
      ? params.sizePreset
      : 'auto';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="settings-panel parameters-modal-shell glass-panel">
        <header className="modal-topbar">
          <div>
            <p className="section-kicker">{t('params.kicker')}</p>
            <h2 className="section-title">{t('params.title')}</h2>
            <p className="modal-subcopy">{t('params.summary', { mode: t(`gallery.mode.${mode}`), size: summarySize, n: params.n })}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t('attachment.close')}>×</button>
        </header>

        {warnings.length > 0 && (
          <div className="warning-strip compact modal-warning-stack">
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}

        <div className="parameters-modal-body">
          <ParameterPanel mode={mode} params={params} capabilityReport={capabilityReport} onChange={onChange} />
        </div>

        <footer className="modal-footer">
          <button className="btn-primary" onClick={onClose}>{t('params.done')}</button>
        </footer>
      </section>
    </div>
  );
}
