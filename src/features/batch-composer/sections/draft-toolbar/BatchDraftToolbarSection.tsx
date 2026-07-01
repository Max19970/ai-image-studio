import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { getProviderModeForAttachmentRole, providerModeAllowsImageAttachments, providerModeAllowsMask } from '../../../../entities/provider/attachmentCompatibility';
import { useI18n } from '../../../../i18n';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { BottomSheet, FloatingPopover } from '../../../../shared/ui';
import { RequestPresetManagerDialog, type RequestPresetManagerController } from '../../../request-presets/elements/preset-menu/RequestPresetMenuAction';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { BatchDraftControlsMenu } from './BatchDraftControlsMenu';
import styles from './BatchDraftToolbarSection.module.css';

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
          <BatchDraftControlsMenu context={context} onOpenPresets={openPresets} close={close} />
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
            <BatchDraftControlsMenu context={context} onOpenPresets={openPresets} close={close} />
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
