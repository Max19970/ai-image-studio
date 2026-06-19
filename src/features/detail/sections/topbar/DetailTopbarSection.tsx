import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import { statusPillToneClass } from '../../model/detailHelpers';
import styles from './DetailTopbarSection.module.css';

export function DetailTopbarSection({ context }: ElementDefinitionProps<DetailLayoutContext>) {
  const { t } = useI18n();
  const { task, activeImage, label } = context;
  const title = task.batch
    ? t('detail.batchGeneratedImage')
    : activeImage
      ? (activeImage.kind === 'partial' ? t('detail.partialImage') : t('detail.generatedImage'))
      : t('detail.generationRequest');

  return (
    <header className={styles.topbar} data-detail-slot="topbar">
      <Button className={styles.backButton} variant="secondary" onClick={context.onBack}>{t('detail.back')}</Button>
      <div className={styles.titleBlock}>
        <h1>{title}</h1>
        <p className="muted-copy">{t('detail.statusLine', { status: label, date: new Date(task.createdAt).toLocaleString() })}</p>
      </div>
      <div className={`status-pill ${styles.statusPill} ${statusPillToneClass(task.status)} ${task.status}`}>{label}</div>
    </header>
  );
}
