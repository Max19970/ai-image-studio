import { useI18n } from '../../../../i18n';
import type { ComposerLayoutContext } from '../../composerTypes';
import styles from './ComposerContextSection.module.css';

function describeOutput(context: ComposerLayoutContext) {
  const { params } = context;
  const size = params.sizeMode === 'custom'
    ? `${params.width}×${params.height}`
    : params.sizePreset || params.sizeMode;
  return `${size} · ${Math.max(1, Number(params.n || 1))}`;
}

export function ComposerContextSection({ context }: { context: ComposerLayoutContext }) {
  const { t } = useI18n();
  const openControls = () => context.actionContext.setOpenPopover('composer.controls');

  return (
    <div className={styles.row} data-testid="composer-context-row">
      <div className={styles.summary}>
        <button type="button" className={styles.contextButton} onClick={openControls}>
          <span className={styles.label}>{t('composer.model')}</span>
          <strong>{context.selectedModel?.name ?? t('detail.notSet')}</strong>
        </button>
        {context.providerModes.length > 1 && (
          <button type="button" className={styles.contextButton} onClick={openControls}>
            <span className={styles.label}>{t('composer.mode')}</span>
            <strong>{t(context.providerMode.labelKey)}</strong>
          </button>
        )}
        <button type="button" className={styles.contextButton} onClick={context.actionContext.actions.openParameters}>
          <span className={styles.label}>{t('composer.outputSummary')}</span>
          <strong>{describeOutput(context)}</strong>
        </button>
        {context.queueSummary.totalCount > 1 && (
          <label className={styles.intervalControl}>
            <span>{t('composer.interval')}</span>
            <input
              type="number"
              min={0}
              max={3600}
              step={1}
              value={context.intervalSeconds}
              onChange={(event) => context.actions.setIntervalSeconds(Number(event.target.value))}
              aria-label={t('composer.intervalSeconds')}
            />
            <small>{t('composer.secondsShort')}</small>
          </label>
        )}
      </div>
    </div>
  );
}
