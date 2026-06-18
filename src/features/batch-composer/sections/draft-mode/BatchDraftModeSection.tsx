import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import styles from './BatchDraftModeSection.module.css';

export function BatchDraftModeSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();

  return (
    <div className={styles.modeRow} role="group" aria-label={t('composer.modeAria')}>
      <button type="button" className={`${styles.modePill} ${context.draft.mode === 'generate' ? styles.modePillActive : ''}`} onClick={() => context.actions.patchDraft({ mode: 'generate' })}>{t('composer.generate')}</button>
      <button type="button" className={`${styles.modePill} ${context.draft.mode === 'edit' ? styles.modePillActive : ''}`} onClick={() => context.actions.patchDraft({ mode: 'edit' })}>{t('composer.edit')}</button>
      <span className={styles.attachmentsCounter}>{t('batch.attachmentsCount', { count: context.attachmentsCount })}</span>
    </div>
  );
}
