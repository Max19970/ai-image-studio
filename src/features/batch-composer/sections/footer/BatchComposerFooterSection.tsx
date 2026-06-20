import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import layoutStyles from '../../../batch-composer/MultiImageComposer.module.css';
import styles from './BatchComposerFooterSection.module.css';

export function BatchComposerFooterSection({ context }: ElementDefinitionProps<BatchComposerLayoutContext>) {
  const { t } = useI18n();

  return (
    <footer className={styles.footer}>
      <button type="button" className="btn-secondary" onClick={context.actions.addDraft}>＋ <span>{t('batch.addRequest')}</span></button>
      <button type="button" className={`btn-primary ${styles.submitButton}`} disabled={!context.canSubmit} onClick={context.actions.submit}>
        <span className={layoutStyles.actionFull}>{t('batch.submit')}</span>
        <span className={layoutStyles.actionMobile}>{t('batch.mobileSubmit')}</span>
      </button>
    </footer>
  );
}
