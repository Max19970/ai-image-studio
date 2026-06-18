import type { ChangeEvent } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import { PopoverSelect } from '../../../../shared/ui';
import type { ComposerActionContext, ComposerLayoutContext } from '../../composerTypes';
import { useI18n } from '../../../../i18n';
import styles from '../../ComposerLayout.module.css';

export function ComposerActionsSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  const { t } = useI18n();
  const { fileInputs } = context.actionContext;

  const addReferencesFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    context.actions.addReferences(Array.from(event.target.files ?? []));
    event.currentTarget.value = '';
  };

  return (
    <div className={styles.actions} data-composer-slot="actions">
      <input ref={fileInputs.target} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => context.actions.setTargetImage(event.target.files?.[0] ?? null)} />
      <input ref={fileInputs.references} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addReferencesFromInput} />
      <input ref={fileInputs.mask} type="file" accept="image/png" onChange={(event) => context.actions.setMask(event.target.files?.[0] ?? null)} />

      <div className={styles.actionsLeft}>
        <div className={styles.modelSelect}>
          <span>{t('composer.model')}</span>
          <PopoverSelect
            value={context.selectedModel?.id ?? ''}
            options={context.modelOptions}
            onChange={context.actions.changeModel}
            ariaLabel={t('composer.model')}
            placeholder={t('detail.notSet')}
            emptyText={t('app.warningNoModel')}
            className={styles.modelPopover}
            matchAnchorWidth={false}
            minWidth={300}
            triggerClassName={styles.modelTrigger}
            panelClassName={styles.modelPanel}
          />
        </div>

        <SlotHost<ComposerActionContext> slot="composer/tools" context={context.actionContext} className={styles.toolCluster} />
      </div>

      <div className={styles.actionsRight}>
        <span className={styles.hint}>{t('composer.shortcut')}</span>
        <button
          type="button"
          className={styles.sendButton}
          data-testid="composer-submit"
          disabled={!context.canSubmit}
          onClick={context.actions.submit}
          aria-label={context.mode === 'generate' ? t('composer.submitGenerate') : t('composer.submitEdit')}
        >
          {context.busy ? t('composer.busy') : t('composer.send')}
        </button>
      </div>
    </div>
  );
}
