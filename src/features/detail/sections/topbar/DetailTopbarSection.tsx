import { useState } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import { isTerminalGenerationStatus } from '../../../../domain/generationStatus';
import { statusPillToneClass } from '../../model/detailHelpers';
import styles from './DetailTopbarSection.module.css';

export function DetailTopbarSection({ context }: ElementDefinitionProps<DetailLayoutContext>) {
  const { t } = useI18n();
  const { task, activeImage, label } = context;
  const [cancelling, setCancelling] = useState(false);
  const progressPercent = typeof task.progress?.percent === 'number' ? Math.round(task.progress.percent) : null;
  const statusLabel = progressPercent !== null && !isTerminalGenerationStatus(task.status) ? `${progressPercent}% · ${label}` : label;
  const title = task.batch
    ? t('detail.batchGeneratedImage')
    : activeImage
      ? (activeImage.kind === 'partial' ? t('detail.partialImage') : t('detail.generatedImage'))
      : t('detail.generationRequest');
  const canCancel = !isTerminalGenerationStatus(task.status) && Boolean(context.onCancelTask);
  const cancelTask = () => {
    if (!context.onCancelTask || cancelling) return;
    setCancelling(true);
    void context.onCancelTask(task.id).finally(() => setCancelling(false));
  };

  return (
    <header className={styles.topbar} data-detail-slot="topbar">
      <Button className={styles.backButton} variant="secondary" onClick={context.onBack}>{t('detail.back')}</Button>
      <div className={styles.titleBlock}>
        <h1>{title}</h1>
        <p className="muted-copy">{t('detail.statusLine', { status: label, date: new Date(task.createdAt).toLocaleString() })}</p>
      </div>
      <div className={styles.statusActions}>
        {canCancel && (
          <Button className={styles.cancelButton} variant="secondary" onClick={cancelTask} disabled={cancelling}>
            {cancelling ? t('detail.cancelTaskPending') : t('detail.cancelTask')}
          </Button>
        )}
        <div className={`status-pill ${styles.statusPill} ${statusPillToneClass(task.status)} ${task.status}`}>{statusLabel}</div>
      </div>
    </header>
  );
}
