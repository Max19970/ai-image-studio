import { useRef, type ReactNode } from 'react';
import type { ProviderProbeReport } from '../../../domain/providerProbe';
import { useI18n } from '../../../i18n';
import { FloatingPopover } from '../../../shared/ui';
import styles from './SettingsControls.module.css';

export function ProbeState({ report, probing, error }: { report: ProviderProbeReport | null; probing: boolean; error: string | null }) {
  const { t } = useI18n();

  if (probing) return <div className="info-strip">{t('settings.probeRunning')}</div>;
  if (error) return <div className="error-strip">{error}</div>;
  if (!report) return <div className="info-strip">{t('settings.probeEmpty')}</div>;

  const acceptedGenerate = Object.values(report.generation).filter((entry) => entry?.supported).length;
  const acceptedEdit = Object.values(report.edit).filter((entry) => entry?.supported).length;

  return (
    <div className="probe-state ok">
      <div className="font-medium">{t('settings.probeFound')}</div>
      <div className="mt-1">
        {t('settings.probeStats', {
          date: new Date(report.createdAt).toLocaleString(),
          generation: acceptedGenerate,
          edit: acceptedEdit
        })}
      </div>
      {report.caveat && <div className="mt-2">{report.caveat}</div>}
    </div>
  );
}

export function InfoTip({ id, text, activeId, onToggle }: { id: string; text: string; activeId: string | null; onToggle: (id: string | null) => void }) {
  const { t } = useI18n();
  const active = activeId === id;
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = `${id.replace(/[^a-zA-Z0-9_-]/g, '-')}-info-popover`;

  return (
    <span className={styles.infoWrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.infoButton} ${active ? styles.active : ''}`}
        aria-label={t('settings.infoButton')}
        aria-expanded={active}
        aria-controls={active ? popoverId : undefined}
        aria-describedby={active ? popoverId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(active ? null : id);
        }}
      >
        i
      </button>
      <FloatingPopover
        open={active}
        anchorRef={buttonRef}
        id={popoverId}
        role="tooltip"
        className={styles.infoPopover}
        placement="auto"
        offset={8}
        minWidth={220}
        onDismiss={() => onToggle(null)}
      >
        {text}
      </FloatingPopover>
    </span>
  );
}

export function FieldShell({ id, label, info, activeInfo, setActiveInfo, children, wide = false }: { id: string; label: string; info: string; activeInfo: string | null; setActiveInfo: (id: string | null) => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ''}`}>
      <div className={styles.fieldHead}>
        <span className="field-label">{label}</span>
        <InfoTip id={id} text={info} activeId={activeInfo} onToggle={setActiveInfo} />
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.emptyCard}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
