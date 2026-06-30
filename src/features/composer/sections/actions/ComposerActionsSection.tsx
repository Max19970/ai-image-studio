import type { ChangeEvent } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { ComposerActionContext, ComposerLayoutContext } from '../../composerTypes';
import { useI18n } from '../../../../i18n';
import { providerModeAllowsImageAttachments, providerModeAllowsMask } from '../../../../entities/provider/attachmentCompatibility';
import { getProviderModeSubmitActionLabelKey } from '../../../../entities/provider/modeIntent';
import styles from '../../ComposerLayout.module.css';

export function ComposerActionsSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  const { t } = useI18n();
  const { fileInputs } = context.actionContext;

  const addAttachmentsFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (providerModeAllowsImageAttachments(context.providerMode)) context.actions.addAttachments(Array.from(event.target.files ?? []));
    event.currentTarget.value = '';
  };

  const addMaskFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (providerModeAllowsMask(context.providerMode)) context.actionContext.actions.setMask(event.target.files?.[0] ?? null);
    event.currentTarget.value = '';
  };

  return (
    <div className={styles.actions} data-composer-slot="actions">
      <input ref={fileInputs.attachments} data-testid="composer-attachments-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addAttachmentsFromInput} />
      <input ref={fileInputs.mask} data-testid="composer-mask-input" type="file" accept="image/png" onChange={addMaskFromInput} />

      <div className={styles.actionsLeft}>
        <SlotHost<ComposerActionContext> slot="composer/tools" context={context.actionContext} className={styles.toolCluster} />
      </div>

      <div className={styles.actionsRight}>
        <button
          type="button"
          className={styles.sendButton}
          data-testid="composer-submit"
          disabled={!context.canSubmit}
          onClick={context.actions.submit}
          aria-label={t(getProviderModeSubmitActionLabelKey(context.providerMode))}
        >
          {t('composer.send')}
        </button>
      </div>
    </div>
  );
}
