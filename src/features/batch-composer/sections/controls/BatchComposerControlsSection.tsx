import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { BatchComposerLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import layoutStyles from '../../../batch-composer/MultiImageComposer.module.css';
import styles from './BatchComposerControlsSection.module.css';

export function BatchComposerControlsSection({ context }: ElementDefinitionProps<BatchComposerLayoutContext>) {
  const { t } = useI18n();

  return (
    <div className={styles.controls}>
      <label className={styles.intervalField}>
        <span><span className={layoutStyles.actionFull}>{t('batch.interval')}</span><span className={layoutStyles.actionMobile}>{t('batch.mobileInterval')}</span></span>
        <input
          type="number"
          min={0}
          max={3600}
          step={1}
          value={context.intervalSeconds}
          onChange={(event) => context.actions.changeIntervalSeconds(Math.max(0, Number(event.target.value) || 0))}
        />
        <small>{t('batch.intervalHint')}</small>
      </label>
      <div className={styles.summaryCard}>
        <span>{t('batch.summary')}</span>
        <strong>
          <span className={layoutStyles.actionFull}>{t('batch.summaryValue', { requests: context.drafts.length, valid: context.validDrafts, images: context.totalImages })}</span>
          <span className={layoutStyles.actionMobile}>{t('batch.mobileSummaryValue', { requests: context.drafts.length, valid: context.validDrafts, images: context.totalImages })}</span>
        </strong>
      </div>
    </div>
  );
}
