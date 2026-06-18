import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import layoutStyles from '../../../batch-composer/MultiImageComposer.module.css';
import styles from './BatchComposerHeaderSection.module.css';

export function BatchComposerHeaderSection({ context }: ElementDefinitionProps<BatchComposerLayoutContext>) {
  const { t } = useI18n();

  return (
    <header className={styles.topbar}>
      <div>
        <span className="section-kicker">{t('batch.kicker')}</span>
        <h2><span className={layoutStyles.titleFull}>{t('batch.title')}</span><span className={layoutStyles.titleMobile}>{t('batch.mobileTitle')}</span></h2>
        <p>{t('batch.subtitle')}</p>
      </div>
      <button type="button" className={`btn-secondary ${styles.closeButton}`} data-testid="batch-composer-close" onClick={context.actions.cancel}>
        <span className={layoutStyles.actionFull}>{t('batch.close')}</span><span className={layoutStyles.actionMobile}>{t('batch.mobileClose')}</span>
      </button>
    </header>
  );
}
