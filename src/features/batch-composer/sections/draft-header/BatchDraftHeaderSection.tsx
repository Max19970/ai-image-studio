import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import styles from './BatchDraftHeaderSection.module.css';

export function BatchDraftHeaderSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();

  return (
    <header className={styles.draftHeader}>
      <div>
        <span className="section-kicker">{t('batch.requestLabel', { index: context.index + 1 })}</span>
        <strong>{context.draft.params.prompt.trim() || t('batch.emptyPrompt')}</strong>
      </div>
      <div className={styles.headerActions}>
        <Button size="micro" className={styles.headerIconButton} onClick={context.actions.duplicateDraft}>{t('batch.duplicate')}</Button>
        {context.canRemove && <Button size="micro" tone="danger" className={`${styles.headerIconButton} ${styles.headerIconButtonDanger}`} onClick={context.actions.removeDraft}>{t('batch.remove')}</Button>}
      </div>
    </header>
  );
}
