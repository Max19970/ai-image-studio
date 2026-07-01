import { providerModeAllowsImageAttachments, providerModeAllowsMask } from '../../../../entities/provider/attachmentCompatibility';
import { ProviderModelPicker } from '../../../../entities/provider/ui';
import { useI18n } from '../../../../i18n';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import menuStyles from './BatchDraftControlsMenu.module.css';

interface BatchDraftControlsMenuProps {
  context: BatchDraftLayoutContext;
  onOpenPresets: () => void;
  close: () => void;
}

function runAndClose(action: () => void, close: () => void) {
  action();
  close();
}

export function BatchDraftControlsMenu({ context, onOpenPresets, close }: BatchDraftControlsMenuProps) {
  const { t } = useI18n();
  const canUseImages = providerModeAllowsImageAttachments(context.providerMode);
  const canUseMask = providerModeAllowsMask(context.providerMode);

  return (
    <div className={menuStyles.menu} data-control-surface={context.controlSurface.id}>
      {context.providerModes.length > 1 && (
        <div className={menuStyles.group}>
          <span className={menuStyles.groupTitle}>{t('composer.mode')}</span>
          <div className={menuStyles.modeGrid}>
            {context.providerModes.map((mode) => (
              <button key={mode.id} type="button" className={menuStyles.modeButton} data-active={context.providerMode.id === mode.id} onClick={() => runAndClose(() => context.actions.patchDraft({ providerModeId: mode.id }), close)}>
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
          <button type="button" className={menuStyles.action} onClick={() => runAndClose(() => context.fileInputs.attachments.current?.click(), close)}>
            <span className={menuStyles.icon} aria-hidden="true">＋</span>
            <span className={menuStyles.copy}>
              <strong>{t('composer.addImages')}</strong>
              <small>{t('composer.addImagesDescription')}</small>
            </span>
          </button>
        )}
        {canUseMask && (
          <button type="button" className={menuStyles.action} onClick={() => runAndClose(() => context.fileInputs.mask.current?.click(), close)}>
            <span className={menuStyles.icon} aria-hidden="true">◌</span>
            <span className={menuStyles.copy}>
              <strong>{context.draft.mask ? t('composer.replaceMask') : t('composer.addMask')}</strong>
              <small>{t('composer.addMaskDescription')}</small>
            </span>
          </button>
        )}
        {canUseMask && context.draft.mask && (
          <button type="button" className={menuStyles.action} onClick={() => runAndClose(() => context.actions.patchDraft({ mask: null }), close)}>
            <span className={menuStyles.icon} aria-hidden="true">−</span>
            <span className={menuStyles.copy}>
              <strong>{t('composer.clearMask')}</strong>
              <small>{t('composer.clearMaskDescription')}</small>
            </span>
          </button>
        )}
        {context.controlSurface.showParameters && (
          <button type="button" className={menuStyles.action} data-testid="batch-draft-parameters" onClick={() => runAndClose(context.actions.openParameters, close)}>
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
        <button type="button" className={menuStyles.action} onClick={() => runAndClose(context.actions.duplicateDraft, close)}>
          <span className={menuStyles.icon} aria-hidden="true">⧉</span>
          <span className={menuStyles.copy}>
            <strong>{t('batch.duplicate')}</strong>
            <small>{t('batch.requestLabel', { index: context.index + 1 })}</small>
          </span>
        </button>
        {context.canRemove && (
          <button type="button" className={`${menuStyles.action} ${menuStyles.danger}`} onClick={() => runAndClose(context.actions.removeDraft, close)}>
            <span className={menuStyles.icon} aria-hidden="true">×</span>
            <span className={menuStyles.copy}>
              <strong>{t('batch.remove')}</strong>
              <small>{t('batch.requestLabel', { index: context.index + 1 })}</small>
            </span>
          </button>
        )}
        {(canUseImages || canUseMask) && context.attachmentsCount > 0 && (
          <button type="button" className={`${menuStyles.action} ${menuStyles.danger}`} onClick={() => runAndClose(context.actions.clearAttachments, close)}>
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
