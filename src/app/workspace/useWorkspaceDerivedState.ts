import { useMemo } from 'react';
import { getStatusText } from '../../domain/generationSnapshots';
import { buildImagePayload, explainPayloadWarnings, validateCustomSize } from '../../entities/provider/request';
import { providerContextForModel } from '../../entities/studio-settings';
import {
  getLegacyWorkModeForProviderMode,
  resolveProviderGenerationModeForModelContext
} from '../../entities/provider/modeResolution';
import { getProviderModeAttachmentStatusText } from '../../entities/provider/attachmentCompatibility';
import {
  evaluateComposerDraftReadiness,
  summarizeComposerQueue
} from '../../features/composer/model/composerDraftReadiness';
import type { TranslateFn } from '../commands/types';
import type { WorkspaceDerivedState, WorkspaceState } from './types';

export function useWorkspaceDerivedState(state: WorkspaceState, t: TranslateFn): WorkspaceDerivedState {
  const activeComposerDraft = state.composerDrafts.find((draft) => draft.id === state.activeComposerDraftId)
    ?? state.composerDrafts[0];
  const activeContext = useMemo(
    () => providerContextForModel(state.studioSettings, activeComposerDraft.selectedModelId),
    [activeComposerDraft.selectedModelId, state.studioSettings]
  );
  const activeModel = activeContext.model;
  const activeProvider = activeContext.generationProvider;
  const provider = activeContext.provider;
  const providerModeResolution = useMemo(
    () => resolveProviderGenerationModeForModelContext(
      state.studioSettings,
      activeModel,
      activeComposerDraft.providerModeId
    ),
    [activeComposerDraft.providerModeId, activeModel, state.studioSettings]
  );
  const providerMode = providerModeResolution.activeMode;
  const providerModes = providerModeResolution.modes;
  const mode = getLegacyWorkModeForProviderMode(providerMode);

  const { payload, rawJsonError } = useMemo(() => {
    try {
      return {
        payload: buildImagePayload(activeComposerDraft.params, provider, mode, providerMode),
        rawJsonError: null as string | null
      };
    } catch (error) {
      return {
        payload: { prompt: activeComposerDraft.params.prompt },
        rawJsonError: error instanceof Error ? error.message : String(error)
      };
    }
  }, [activeComposerDraft.params, mode, provider, providerMode]);

  const attachmentStatusText = useMemo(() => getProviderModeAttachmentStatusText({
    draft: {
      targetImage: activeComposerDraft.targetImage,
      referenceImages: activeComposerDraft.referenceImages,
      mask: activeComposerDraft.mask
    },
    providerMode,
    t
  }), [activeComposerDraft.mask, activeComposerDraft.referenceImages, activeComposerDraft.targetImage, providerMode, t]);

  const warnings = useMemo(() => {
    const payloadWarnings = explainPayloadWarnings(payload, provider, mode, state.capabilityReport, providerMode);
    if (activeComposerDraft.params.sizeMode === 'custom') {
      payloadWarnings.push(...validateCustomSize(
        activeComposerDraft.params.width,
        activeComposerDraft.params.height,
        provider,
        providerMode
      ));
    }
    if (attachmentStatusText) payloadWarnings.push(attachmentStatusText);
    if (!activeModel) payloadWarnings.push(t('app.warningNoModel'));
    return payloadWarnings;
  }, [
    activeComposerDraft.params.height,
    activeComposerDraft.params.sizeMode,
    activeComposerDraft.params.width,
    activeModel,
    attachmentStatusText,
    mode,
    payload,
    provider,
    providerMode,
    state.capabilityReport,
    t
  ]);

  const composerDraftReadiness = useMemo(
    () => state.composerDrafts.map((draft) => evaluateComposerDraftReadiness(draft, state.studioSettings)),
    [state.composerDrafts, state.studioSettings]
  );
  const composerQueueSummary = useMemo(
    () => summarizeComposerQueue(composerDraftReadiness),
    [composerDraftReadiness]
  );
  const activeReadiness = composerDraftReadiness.find((item) => item.draftId === activeComposerDraft.id);
  const canSubmit = Boolean(activeReadiness?.ready);

  const selectedTask = state.selectedTaskId
    ? state.tasks.find((task) => task.id === state.selectedTaskId) ?? null
    : null;
  const selectedImage = selectedTask && state.selectedImageId
    ? selectedTask.images.find((image) => image.id === state.selectedImageId) ?? null
    : null;
  const currentTask = state.tasks[0] ?? null;
  const activeBatchDraft = state.composerParametersDraftId
    ? state.composerDrafts.find((draft) => draft.id === state.composerParametersDraftId) ?? null
    : null;

  const batchWarnings = useMemo(() => {
    if (!activeBatchDraft) return [];
    const draftContext = providerContextForModel(state.studioSettings, activeBatchDraft.selectedModelId);
    const draftModeResolution = resolveProviderGenerationModeForModelContext(
      state.studioSettings,
      draftContext.model,
      activeBatchDraft.providerModeId
    );
    const draftProviderMode = draftModeResolution.activeMode;
    const draftMode = getLegacyWorkModeForProviderMode(draftProviderMode);
    try {
      const draftPayload = buildImagePayload(activeBatchDraft.params, draftContext.provider, draftMode, draftProviderMode);
      const draftWarnings = explainPayloadWarnings(
        draftPayload,
        draftContext.provider,
        draftMode,
        activeBatchDraft.selectedModelId === activeComposerDraft.selectedModelId ? state.capabilityReport : null,
        draftProviderMode
      );
      if (activeBatchDraft.params.sizeMode === 'custom') {
        draftWarnings.push(...validateCustomSize(
          activeBatchDraft.params.width,
          activeBatchDraft.params.height,
          draftContext.provider,
          draftProviderMode
        ));
      }
      const draftAttachmentStatus = getProviderModeAttachmentStatusText({
        draft: activeBatchDraft,
        providerMode: draftProviderMode,
        t
      });
      if (draftAttachmentStatus) draftWarnings.push(draftAttachmentStatus);
      return draftWarnings;
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }, [activeBatchDraft, activeComposerDraft.selectedModelId, state.capabilityReport, state.studioSettings, t]);

  const taskStatusText = currentTask?.status === 'succeeded' ? null : getStatusText(currentTask, t);
  const serverSubmissionText = state.serverSubmission.phase === 'submitting'
    ? t('composer.submitting')
    : state.serverSubmission.phase === 'waiting-for-event'
      ? t('composer.waitingForGeneration')
      : state.serverSubmission.phase === 'failed'
        ? t('composer.submitFailed', { error: state.serverSubmission.error ?? t('composer.unknownError') })
        : null;
  const composerStatusText = rawJsonError || serverSubmissionText || taskStatusText || state.compatibilityNotice || attachmentStatusText;

  return {
    activeModel,
    activeProvider,
    provider,
    providerMode,
    providerModes,
    mode,
    payload,
    rawJsonError,
    warnings,
    canSubmit,
    selectedTask,
    selectedImage,
    currentTask,
    activeComposerDraft,
    composerDraftReadiness,
    composerQueueSummary,
    activeBatchDraft,
    batchCanSubmit: composerQueueSummary.readyCount > 0,
    batchWarnings,
    statusText: composerStatusText
  };
}
