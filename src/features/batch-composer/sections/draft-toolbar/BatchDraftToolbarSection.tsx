import type { ChangeEvent } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { Button, PopoverSelect } from '../../../../shared/ui';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import styles from './BatchDraftToolbarSection.module.css';

export function BatchDraftToolbarSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();

  const addReferencesFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    context.actions.addReferences(Array.from(event.target.files ?? []));
    event.currentTarget.value = '';
  };

  return (
    <div className={styles.toolbar}>
      <input ref={context.fileInputs.target} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { context.actions.patchDraft({ targetImage: event.target.files?.[0] ?? null, mode: 'edit' }); event.currentTarget.value = ''; }} />
      <input ref={context.fileInputs.references} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addReferencesFromInput} />
      <input ref={context.fileInputs.mask} type="file" accept="image/png" onChange={(event) => { context.actions.patchDraft({ mask: event.target.files?.[0] ?? null, mode: 'edit' }); event.currentTarget.value = ''; }} />

      <div className={styles.modelSelect}>
        <span>{t('composer.model')}</span>
        <PopoverSelect
          value={context.selectedModel?.id ?? ''}
          options={context.modelOptions}
          onChange={(modelId) => context.actions.patchDraft({ selectedModelId: modelId })}
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

      <Button size="micro" className={styles.toolbarButton} onClick={() => context.fileInputs.target.current?.click()}>{t('composer.target')}</Button>
      <Button size="micro" className={styles.toolbarButton} onClick={() => context.fileInputs.references.current?.click()}>{t('composer.refs')}</Button>
      <Button size="micro" className={styles.toolbarButton} onClick={() => context.fileInputs.mask.current?.click()}>{t('composer.mask')}</Button>
      {context.attachmentsCount > 0 && <Button size="micro" tone="danger" className={`${styles.toolbarButton} ${styles.toolbarWideButton}`} onClick={context.actions.clearAttachments}>× {t('composer.clearAttachments')}</Button>}
      <Button size="micro" tone="accent" className={`${styles.toolbarButton} ${styles.toolbarWideButton}`} onClick={context.actions.openParameters}>{t('composer.params')}</Button>
    </div>
  );
}
