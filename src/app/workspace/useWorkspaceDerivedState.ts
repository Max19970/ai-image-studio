import { useMemo } from 'react';
import { getStatusText } from '../../domain/generationSnapshots';
import { buildImagePayload, explainPayloadWarnings, validateCustomSize } from '../../entities/provider/request';
import {
  getActiveModel,
  getEffectiveProviderSettings,
  getProviderForModel,
  providerContextForModel
} from '../../entities/studio-settings';
import {
  getLegacyWorkModeForProviderMode,
  resolveProviderGenerationMode,
  resolveProviderGenerationModeForModelContext
} from '../../entities/provider/modeResolution';
import {
  getProviderModeAttachmentStatusText,
  hasProviderModeRequiredAttachments
} from '../../entities/provider/compatibility';
import type { TranslateFn } from '../commands/types';
import type { WorkspaceDerivedState, WorkspaceState } from './types';

export function useWorkspaceDerivedState(state: WorkspaceState, t: TranslateFn): WorkspaceDerivedState {
  const activeModel = useMemo(() => getActiveModel(state.studioSettings), [state.studioSettings]);
  const activeProvider = useMemo(
    () => getProviderForModel(state.studioSettings, activeModel),
    [state.studioSettings, activeModel]
  );
  const provider = useMemo(() => getEffectiveProviderSettings(state.studioSettings), [state.studioSettings]);
  const providerModeResolution = useMemo(
    () => resolveProviderGenerationMode({
      settings: state.studioSettings,
      modelId: state.studioSettings.selectedModelId,
      providerModeId: state.providerModeId
    }),
    [state.providerModeId, state.studioSettings]
  );
  const providerMode = providerModeResolution.activeMode;
  const providerModes = providerModeResolution.modes;
  const mode = getLegacyWorkModeForProviderMode(providerMode);

  const { payload, rawJsonError } = useMemo(() => {
    try {
      return {
        payload: buildImagePayload(state.params, provider, mode, providerMode),
        rawJsonError: null as string | null
      };
    } catch (e) {
      return {
        payload: { prompt: state.params.prompt },
        rawJsonError: e instanceof Error ? e.message : String(e)
      };
    }
  }, [state.params, provider, mode, providerMode]);

  const attachmentStatusText = useMemo(() => getProviderModeAttachmentStatusText({
    draft: {
      targetImage: state.targetImage,
      referenceImages: state.referenceImages,
      mask: state.mask
    },
    providerMode,
    t
  }), [state.targetImage, state.referenceImages, state.mask, providerMode, t]);

  const warnings = useMemo(() => {
    const payloadWarnings = explainPayloadWarnings(payload, provider, mode, state.capabilityReport, providerMode);
    if (state.params.sizeMode === 'custom') {
      payloadWarnings.push(...validateCustomSize(state.params.width, state.params.height, provider, providerMode));
    }
    if (attachmentStatusText) payloadWarnings.push(attachmentStatusText);
    if (!activeModel) {
      payloadWarnings.push(t('app.warningNoModel'));
    }
    return payloadWarnings;
  }, [
    payload,
    provider,
    mode,
    state.capabilityReport,
    providerMode,
    state.params.sizeMode,
    state.params.width,
    state.params.height,
    attachmentStatusText,
    activeModel,
    t
  ]);

  const canSubmit = Boolean(activeModel) &&
    !rawJsonError &&
    state.params.prompt.trim().length > 0 &&
    hasProviderModeRequiredAttachments({
      targetImage: state.targetImage,
      referenceImages: state.referenceImages,
      mask: state.mask
    }, providerMode);

  const selectedTask = state.selectedTaskId
    ? state.tasks.find((task) => task.id === state.selectedTaskId) ?? null
    : null;
  const selectedImage = selectedTask && state.selectedImageId
    ? selectedTask.images.find((image) => image.id === state.selectedImageId) ?? null
    : null;
  const currentTask = state.tasks[0] ?? null;
  const activeBatchDraft = state.batchParametersDraftId
    ? state.batchDrafts.find((draft) => draft.id === state.batchParametersDraftId) ?? null
    : null;

  const batchCanSubmit = useMemo(() => {
    if (state.batchDrafts.length === 0) return false;
    return state.batchDrafts.some((draft) => {
      const { model, provider: draftProvider } = providerContextForModel(state.studioSettings, draft.selectedModelId);
      if (!model) return false;
      if (!draft.params.prompt.trim()) return false;
      const draftModeResolution = resolveProviderGenerationModeForModelContext(
        state.studioSettings,
        model,
        draft.providerModeId
      );
      const draftProviderMode = draftModeResolution.activeMode;
      const draftMode = getLegacyWorkModeForProviderMode(draftProviderMode);
      if (!hasProviderModeRequiredAttachments({
        targetImage: draft.targetImage,
        referenceImages: draft.referenceImages,
        mask: draft.mask
      }, draftProviderMode)) return false;
      try {
        buildImagePayload(draft.params, draftProvider, draftMode, draftProviderMode);
        return true;
      } catch {
        return false;
      }
    });
  }, [state.batchDrafts, state.studioSettings]);

  const batchWarnings = useMemo(() => {
    if (!activeBatchDraft) return [];
    const { model: draftModel, provider: draftProvider } = providerContextForModel(state.studioSettings, activeBatchDraft.selectedModelId);
    const draftModeResolution = resolveProviderGenerationModeForModelContext(
      state.studioSettings,
      draftModel,
      activeBatchDraft.providerModeId
    );
    const draftProviderMode = draftModeResolution.activeMode;
    const draftMode = getLegacyWorkModeForProviderMode(draftProviderMode);
    try {
      const draftPayload = buildImagePayload(activeBatchDraft.params, draftProvider, draftMode, draftProviderMode);
      const draftWarnings = explainPayloadWarnings(
        draftPayload,
        draftProvider,
        draftMode,
        activeBatchDraft.selectedModelId === state.studioSettings.selectedModelId ? state.capabilityReport : null,
        draftProviderMode
      );
      if (activeBatchDraft.params.sizeMode === 'custom') {
        draftWarnings.push(...validateCustomSize(activeBatchDraft.params.width, activeBatchDraft.params.height, draftProvider, draftProviderMode));
      }
      const attachmentStatusText = getProviderModeAttachmentStatusText({
        draft: {
          targetImage: activeBatchDraft.targetImage,
          referenceImages: activeBatchDraft.referenceImages,
          mask: activeBatchDraft.mask
        },
        providerMode: draftProviderMode,
        t
      });
      if (attachmentStatusText) draftWarnings.push(attachmentStatusText);
      return draftWarnings;
    } catch (e) {
      return [e instanceof Error ? e.message : String(e)];
    }
  }, [activeBatchDraft, state.studioSettings, state.capabilityReport, t]);

  const taskStatusText = currentTask?.status === 'succeeded' ? null : getStatusText(currentTask, t);
  const composerStatusText = rawJsonError || taskStatusText || state.compatibilityNotice || attachmentStatusText;

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
    activeBatchDraft,
    batchCanSubmit,
    batchWarnings,
    statusText: composerStatusText
  };
}
