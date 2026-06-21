import { memo, useMemo } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { BatchComposerDraft } from '../../../../domain/generationTask';
import type { ProviderGenerationModeDefinition } from '../../../../domain/providerMode';
import type { BatchComposerLayoutContext, BatchDraftLayoutContext } from '../../batchComposerTypes';
import type { I18nContextValue } from '../../../../shared/i18n/types';
import { useI18n } from '../../../../i18n';
import { getProviderModelOptions } from '../../../../entities/provider/modelOptions';
import { addImageFilesToProviderModeDraft, hasProviderModeRequiredAttachments } from '../../../../entities/provider/compatibility';
import { resolveProviderControlSurface } from '../../../../entities/provider/controlSurface';
import { resolveProviderGenerationModeForModelContext } from '../../../../entities/provider/modeResolution';
import { toProviderSettings } from '../../../../entities/studio-settings';
import styles from './BatchDraftListSection.module.css';
import queueStyles from './BatchQueueRail.module.css';
import editorStyles from './BatchSelectedEditor.module.css';

function getAttachmentCount(draft: BatchComposerDraft) {
  return (draft.targetImage ? 1 : 0) + draft.referenceImages.length + (draft.mask ? 1 : 0);
}

function isDraftReady(draft: BatchComposerDraft, providerMode: ProviderGenerationModeDefinition) {
  const hasPrompt = Boolean(draft.params.prompt.trim());
  return hasPrompt && hasProviderModeRequiredAttachments({
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  }, providerMode);
}

function getDraftIssue(draft: BatchComposerDraft, providerMode: ProviderGenerationModeDefinition, t: I18nContextValue['t']) {
  if (!draft.params.prompt.trim()) return t('batch.needsPrompt');
  if (!hasProviderModeRequiredAttachments({
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  }, providerMode)) return t('batch.needsImages');
  return t('batch.ready');
}

interface BatchQueueItemProps {
  draft: BatchComposerDraft;
  providerMode: ProviderGenerationModeDefinition;
  index: number;
  selected: boolean;
  t: I18nContextValue['t'];
  onSelectDraft: (id: string) => void;
}

const BatchQueueItem = memo(function BatchQueueItem({ draft, providerMode, index, selected, t, onSelectDraft }: BatchQueueItemProps) {
  const ready = isDraftReady(draft, providerMode);
  const prompt = draft.params.prompt.trim() || t('batch.emptyPrompt');
  const attachments = getAttachmentCount(draft);
  const expectedImages = Math.max(1, Number(draft.params.n || 1));

  return (
    <li>
      <button
        type="button"
        className={`${queueStyles.queueItem} ${selected ? queueStyles.queueItemSelected : ''} ${ready ? queueStyles.queueItemReady : queueStyles.queueItemNeedsWork}`}
        onClick={() => onSelectDraft(draft.id)}
        aria-current={selected ? 'true' : undefined}
      >
        <span className={queueStyles.queueIndex}>{index + 1}</span>
        <span className={queueStyles.queueCopy}>
          <strong>{prompt}</strong>
          <span>{getDraftIssue(draft, providerMode, t)}</span>
        </span>
        <span className={queueStyles.queueMeta}>
          <span>{t(providerMode.labelKey)}</span>
          <span>{t('batch.queueImagesValue', { count: expectedImages })}</span>
          <span>{t('batch.queueAttachmentsValue', { count: attachments })}</span>
        </span>
      </button>
    </li>
  );
});

function createDraftContext(
  context: BatchComposerLayoutContext,
  draft: BatchComposerDraft,
  index: number,
  modelOptions: BatchDraftLayoutContext['modelOptions']
): BatchDraftLayoutContext {
  const controlContext = resolveProviderControlSurface({
    settings: context.studioSettings,
    modelId: draft.selectedModelId,
    models: context.models,
    providers: context.providers
  });
  const modeResolution = resolveProviderGenerationModeForModelContext(
    context.studioSettings,
    controlContext.model,
    draft.providerModeId
  );

  return {
    draft,
    index,
    canRemove: context.drafts.length > 1,
    models: context.models,
    providers: context.providers,
    provider: toProviderSettings(controlContext.provider, controlContext.model),
    providerMode: modeResolution.activeMode,
    providerModes: modeResolution.modes,
    studioSettings: context.studioSettings,
    controlSurface: controlContext.surface,
    selectedModel: controlContext.model,
    modelOptions,
    requestPresets: context.requestPresets,
    attachments: [],
    attachmentsCount: 0,
    fileInputs: {
      attachments: { current: null },
      mask: { current: null }
    },
    actions: {
      patchDraft: (patch) => context.actions.changeDraft(draft.id, patch),
      patchParams: (patch) => context.actions.changeDraftParams(draft.id, { ...draft.params, ...patch }),
      duplicateDraft: () => context.actions.duplicateDraft(draft.id),
      removeDraft: () => context.actions.removeDraft(draft.id),
      openParameters: () => context.actions.openParameters(draft.id),
      addAttachments: (files) => context.actions.changeDraft(draft.id, addImageFilesToProviderModeDraft(draft, modeResolution.activeMode, files)),
      removeAttachment: () => undefined,
      clearAttachments: () => context.actions.changeDraft(draft.id, { targetImage: null, referenceImages: [], mask: null }),
      savePreset: (name, note) => context.actions.requestPresets.saveBatchDraft(draft.id, name, note),
      updatePreset: (presetId, patch) => context.actions.requestPresets.updatePreset(presetId, {
        name: patch.name,
        note: patch.note,
        ...(patch.captureCurrent ? { captureBatchDraftId: draft.id } : {})
      }),
      deletePreset: context.actions.requestPresets.deletePreset,
      applyPreset: (presetId) => context.actions.requestPresets.applyPresetToBatchDraft(draft.id, presetId)
    }
  };
}

export function BatchDraftListSection({ context }: ElementDefinitionProps<BatchComposerLayoutContext>) {
  const { t } = useI18n();
  const selectedDraft = useMemo(
    () => context.drafts.find((draft) => draft.id === context.selectedDraftId) ?? context.drafts[0] ?? null,
    [context.drafts, context.selectedDraftId]
  );
  const selectedIndex = useMemo(
    () => selectedDraft ? context.drafts.findIndex((draft) => draft.id === selectedDraft.id) : -1,
    [context.drafts, selectedDraft]
  );
  const modelOptions = useMemo(() => getProviderModelOptions(context.models, context.providers), [context.models, context.providers]);
  const selectedDraftContext = useMemo(
    () => selectedDraft ? createDraftContext(context, selectedDraft, selectedIndex, modelOptions) : null,
    [
      context.actions,
      context.drafts.length,
      context.models,
      context.providers,
      context.studioSettings,
      selectedDraft,
      selectedIndex,
      modelOptions
    ]
  );

  if (!selectedDraft || !selectedDraftContext) {
    return (
      <div className={styles.emptyQueue}>
        <strong>{t('batch.emptyQueueTitle')}</strong>
        <p>{t('batch.emptyQueueText')}</p>
      </div>
    );
  }

  const selectedProviderMode = selectedDraftContext.providerMode;

  return (
    <div className={styles.workbench} data-testid="batch-queue-workbench">
      <aside className={queueStyles.queueRail} aria-label={t('batch.queueLabel')}>
        <div className={queueStyles.queueHeader}>
          <div>
            <span className="section-kicker">{t('batch.queueKicker')}</span>
            <strong>{t('batch.queueTitle')}</strong>
          </div>
          <span>{context.validDrafts}/{context.drafts.length}</span>
        </div>

        <ol className={queueStyles.queueList}>
          {context.drafts.map((draft, index) => (
            <BatchQueueItem
              key={draft.id}
              draft={draft}
              providerMode={resolveProviderGenerationModeForModelContext(context.studioSettings, context.models.find((model) => model.id === draft.selectedModelId) ?? null, draft.providerModeId).activeMode}
              index={index}
              selected={draft.id === selectedDraft.id}
              t={t}
              onSelectDraft={context.actions.selectDraft}
            />
          ))}
        </ol>
      </aside>

      <section className={editorStyles.selectedEditor} aria-label={t('batch.selectedEditorLabel')}>
        <header className={editorStyles.selectedHeader}>
          <div>
            <span className="section-kicker">{t('batch.selectedKicker')}</span>
            <h3>{t('batch.requestLabel', { index: selectedIndex + 1 })}</h3>
          </div>
          <span className={isDraftReady(selectedDraft, selectedProviderMode) ? editorStyles.readyPill : editorStyles.issuePill}>{getDraftIssue(selectedDraft, selectedProviderMode, t)}</span>
        </header>
        <SlotHost<BatchDraftLayoutContext>
          key={selectedDraft.id}
          slot="batch-composer/draft/card"
          context={selectedDraftContext}
          as={null}
        />
      </section>
    </div>
  );
}
