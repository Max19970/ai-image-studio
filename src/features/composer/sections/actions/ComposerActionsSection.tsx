import type { ChangeEvent } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { ComposerActionContext, ComposerLayoutContext } from '../../composerTypes';
import { useI18n } from '../../../../i18n';
import { ArrowUpIcon, CircleAlertIcon, ListChecksIcon } from '../../../../shared/ui';
import { providerModeAllowsImageAttachments, providerModeAllowsMask } from '../../../../entities/provider/attachmentCompatibility';
import styles from '../../ComposerLayout.module.css';

const queuePopoverId = 'composer.queue';

export function ComposerActionsSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  const { t } = useI18n();
  const { fileInputs } = context.actionContext;
  const queueOpen = context.actionContext.openPopover === queuePopoverId;
  const queueCount = context.queueSummary.totalCount;
  const queueHasIssues = queueCount > 1 && context.queueSummary.invalidCount > 0;
  const canSubmitAny = context.queueSummary.readyCount > 0;

  const addAttachmentsFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (providerModeAllowsImageAttachments(context.providerMode)) context.actions.addAttachments(Array.from(event.target.files ?? []));
    event.currentTarget.value = '';
  };

  const addMaskFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (providerModeAllowsMask(context.providerMode)) context.actionContext.actions.setMask(event.target.files?.[0] ?? null);
    event.currentTarget.value = '';
  };

  const submitLabel = queueCount > 1
    ? t('composer.submitQueueLabel', {
        ready: context.queueSummary.readyCount,
        total: queueCount,
        invalid: context.queueSummary.invalidCount
      })
    : t('composer.submitCurrentLabel');

  return (
    <div className={styles.actions} data-composer-slot="actions">
      <input ref={fileInputs.attachments} data-testid="composer-attachments-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addAttachmentsFromInput} />
      <input ref={fileInputs.mask} data-testid="composer-mask-input" type="file" accept="image/png" onChange={addMaskFromInput} />

      <div className={styles.actionsLeft}>
        <SlotHost<ComposerActionContext> slot="composer/tools" context={context.actionContext} className={styles.toolCluster} />
      </div>

      <button
        type="button"
        className={styles.queueButton}
        data-testid="composer-queue-toggle"
        data-open={queueOpen ? 'true' : 'false'}
        onClick={() => context.actionContext.setOpenPopover((value) => value === queuePopoverId ? null : queuePopoverId)}
        aria-label={queueOpen ? t('composer.hideQueue') : t('composer.showQueue')}
        aria-expanded={queueOpen}
      >
        <ListChecksIcon className={styles.queueIcon} size={19} />
        {queueCount > 1 && <span className={styles.queueCount}>{queueCount}</span>}
      </button>

      <div className={styles.actionsRight}>
        <button
          type="button"
          className={styles.sendButton}
          data-testid="composer-submit"
          disabled={!canSubmitAny}
          onClick={context.actions.submit}
          aria-label={submitLabel}
          aria-describedby={!canSubmitAny && context.blockedReason && context.prompt.trim() ? 'composer-submit-blocked-reason' : undefined}
          title={!canSubmitAny && context.blockedReason ? context.blockedReason : submitLabel}
        >
          <ArrowUpIcon className={styles.sendArrow} size={19} strokeWidth={2.2} />
          {queueCount > 1 && (
            <span className={styles.sendCount} data-warning={queueHasIssues ? 'true' : 'false'}>
              {queueCount}
              {queueHasIssues && <CircleAlertIcon size={10} strokeWidth={2.4} />}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
