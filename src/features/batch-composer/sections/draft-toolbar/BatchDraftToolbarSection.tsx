import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { BottomSheet, FloatingPopover } from '../../../../shared/ui';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { getProviderModeForAttachmentRole, providerModeAllowsImageAttachments, providerModeAllowsMask } from '../../../../entities/provider/attachmentCompatibility';
import { ProviderModelPicker } from '../../../../entities/provider/ui';
import { RequestPresetManagerDialog, type RequestPresetManagerController } from '../../../request-presets/elements/preset-menu/RequestPresetMenuAction';
import { useI18n } from '../../../../i18n';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import styles from './BatchDraftToolbarSection.module.css';
import menuStyles from './BatchDraftControlsMenu.module.css';

function getDefaultDraftName(context: BatchDraftLayoutContext) {
  const prompt = context.draft.params.prompt.trim().replace(/\s+/g, ' ');
  if (prompt) return prompt.length > 52 ? `${prompt.slice(0, 49)}…` : prompt;
  return context.selectedModel?.name || context.selectedModel?.modelId || '';
}

function createDraftPresetManagerController(context: BatchDraftLayoutContext): RequestPresetManagerController {
  return {
    requestPresets: context.requestPresets,
    defaultName: getDefaultDraftName(context),
    saveCurrent: context.actions.savePreset,
    applyPreset: context.actions.applyPreset,
    updatePreset: context.actions.updatePreset,
    deletePreset: context.actions.deletePreset
  };
}

function MenuContent({ context, onOpenPresets, close }: { context: BatchDraftLayoutContext; onOpenPresets: () => void; close: () => void }) {
  const { t } = useI18n();

  const chooseProviderMode = (providerModeId: string) => {
    context.actions.patchDraft({ providerModeId });
    close();
  };
  const canUseImages = providerModeAllowsImageAttachments(context.providerMode);
  const canUseMask = providerModeAllowsMask(context.providerMode);

  const openImages = () => {
    context.fileInputs.attachments.current?.click();
    close();
  };

  const openMask = () => {
    context.fileInputs.mask.current?.click();
    close();
  };

  const clearMask = () => {
    context.actions.patchDraft({ mask: null });
    close();
  };

  const openParameters = () => {
    context.actions.openParameters();
    close();
  };

  const duplicateDraft = () => {
    context.actions.duplicateDraft();
    close();
  };

  const removeDraft = () => {
    context.actions.removeDraft();
    close();
  };

  const clearAttachments = () => {
    context.actions.clearAttachments();
    close();
  };

  return (
    <div className={menuStyles.menu} data-control-surface={context.controlSurface.id}>
      {context.providerModes.length > 1 && (
        <div className={menuStyles.group}>
          <span className={menuStyles.groupTitle}>{t('composer.mode')}</span>
          <div className={menuStyles.modeGrid}>
            {context.providerModes.map((mode) => (
              <button key={mode.id} type="button" className={menuStyles.modeButton} data-active={context.providerMode.id === mode.id} onClick={() => chooseProviderMode(mode.id)}>
                <strong>{t(mode.labelKey)}</strong>
                {mode.descriptionKey && <small>{t(mode.descriptionKey)}</small>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={menuStyles.group}>
        <span className={menuStyles.groupTitle}>{t('composer.model')}</span>
        <ProviderModelPicker
          value={context.selectedModel?.id ?? ''}
          models={context.models}
          providers={context.providers}
          onChange={(modelId) => context.actions.patchDraft({ selectedModelId: modelId })}
          ariaLabel={t('composer.model')}
          placeholder={t('detail.notSet')}
          emptyText={t('app.warningNoModel')}
          className={menuStyles.menuModelSelect}
          triggerClassName={menuStyles.menuModelTrigger}
          panelClassName={menuStyles.menuModelPanel}
          minWidth={340}
          testId="batch-draft-model-picker"
        />
      </div>

      <div className={menuStyles.group}>
        <span className={menuStyles.groupTitle}>{t('composer.actions')}</span>
        {canUseImages && (
          <button type="button" className={menuStyles.action} onClick={openImages}>
            <span className={menuStyles.icon} aria-hidden="true">＋</span>
            <span className={menuStyles.copy}>
              <strong>{t('composer.addImages')}</strong>
              <small>{t('composer.addImagesDescription')}</small>
            </span>
          </button>
        )}
        {canUseMask && (
          <button type="button" className={menuStyles.action} onClick={openMask}>
            <span className={menuStyles.icon} aria-hidden="true">◌</span>
            <span className={menuStyles.copy}>
              <strong>{context.draft.mask ? t('composer.replaceMask') : t('composer.addMask')}</strong>
              <small>{t('composer.addMaskDescription')}</small>
            </span>
          </button>
        )}
        {canUseMask && context.draft.mask && (
          <button type="button" className={menuStyles.action} onClick={clearMask}>
            <span className={menuStyles.icon} aria-hidden="true">−</span>
            <span className={menuStyles.copy}>
              <strong>{t('composer.clearMask')}</strong>
              <small>{t('composer.clearMaskDescription')}</small>
            </span>
          </button>
        )}
        {context.controlSurface.showParameters && (
          <button type="button" className={menuStyles.action} data-testid="batch-draft-parameters" onClick={openParameters}>
            <span className={menuStyles.icon} aria-hidden="true">⚙</span>
            <span className={menuStyles.copy}>
              <strong>{t('composer.paramsTitle')}</strong>
              <small>{t('composer.paramsDescription')}</small>
            </span>
          </button>
        )}
        <button type="button" className={menuStyles.action} data-testid="batch-request-presets-open" onClick={onOpenPresets}>
          <span className={menuStyles.icon} aria-hidden="true">✦</span>
          <span className={menuStyles.copy}>
            <strong>{t('requestPresets.open')}</strong>
            <small>{t('requestPresets.applyToDraft')}</small>
          </span>
        </button>
        <button type="button" className={menuStyles.action} onClick={duplicateDraft}>
          <span className={menuStyles.icon} aria-hidden="true">⧉</span>
          <span className={menuStyles.copy}>
            <strong>{t('batch.duplicate')}</strong>
            <small>{t('batch.requestLabel', { index: context.index + 1 })}</small>
          </span>
        </button>
        {context.canRemove && (
          <button type="button" className={`${menuStyles.action} ${menuStyles.danger}`} onClick={removeDraft}>
            <span className={menuStyles.icon} aria-hidden="true">×</span>
            <span className={menuStyles.copy}>
              <strong>{t('batch.remove')}</strong>
              <small>{t('batch.requestLabel', { index: context.index + 1 })}</small>
            </span>
          </button>
        )}
        {(canUseImages || canUseMask) && context.attachmentsCount > 0 && (
          <button type="button" className={`${menuStyles.action} ${menuStyles.danger}`} onClick={clearAttachments}>
            <span className={menuStyles.icon} aria-hidden="true">×</span>
            <span className={menuStyles.copy}>
              <strong>{t('composer.clearAttachments')}</strong>
              <small>{t('composer.clearAttachmentsDescription')}</small>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function BatchDraftToolbarSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 860px)');
  const close = () => setOpen(false);
  const openPresets = () => {
    close();
    setPresetsOpen(true);
  };
  const presetController = createDraftPresetManagerController(context);

  const canUseImages = providerModeAllowsImageAttachments(context.providerMode);
  const canUseMask = providerModeAllowsMask(context.providerMode);

  const addAttachmentsFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (canUseImages) context.actions.addAttachments(Array.from(event.target.files ?? []));
    event.currentTarget.value = '';
  };

  const addMaskFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (canUseMask) context.actions.patchDraft({ mask: event.target.files?.[0] ?? null, providerModeId: getProviderModeForAttachmentRole(context.studioSettings, context.draft.selectedModelId, context.draft.providerModeId, 'mask').id });
    event.currentTarget.value = '';
  };

  return (
    <div className={styles.wrapper} data-slot-contribution="batch-draft-controls">
      <input ref={context.fileInputs.attachments} data-testid="batch-draft-attachments-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addAttachmentsFromInput} />
      <input ref={context.fileInputs.mask} data-testid="batch-draft-mask-input" type="file" accept="image/png" onChange={addMaskFromInput} />

      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        data-testid="batch-draft-controls"
        data-open={open ? 'true' : 'false'}
        aria-label={t('composer.controls')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">⋯</span>
        {context.attachmentsCount > 0 && <em>{context.attachmentsCount}</em>}
      </button>

      {!isMobile && (
        <FloatingPopover
          open={open}
          anchorRef={buttonRef}
          className={`${styles.popoverPanel} composer-inline-popover`}
          placement="auto"
          offset={10}
          minWidth={310}
          onDismiss={close}
        >
          <MenuContent context={context} onOpenPresets={openPresets} close={close} />
        </FloatingPopover>
      )}

      {isMobile && (
        <BottomSheet
          open={open}
          title={t('composer.controls')}
          description={t('composer.controlsDescription')}
          size="content"
          onClose={close}
        >
          <div className={styles.sheetBody}>
            <MenuContent context={context} onOpenPresets={openPresets} close={close} />
          </div>
        </BottomSheet>
      )}

      <RequestPresetManagerDialog
        open={presetsOpen}
        controller={presetController}
        onClose={() => setPresetsOpen(false)}
        testId="batch-request-presets-dialog"
      />
    </div>
  );
}
