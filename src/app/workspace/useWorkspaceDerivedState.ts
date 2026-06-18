import { useMemo } from 'react';
import { getStatusText, providerContextForModel } from '../../domain/generationSnapshots';
import { buildImagePayload, explainPayloadWarnings, validateCustomSize } from '../../entities/provider/request';
import {
  getActiveModel,
  getEffectiveProviderSettings,
  getProviderForModel
} from '../../entities/studio-settings';
import type { TranslateFn } from '../commands/types';
import type { WorkspaceDerivedState, WorkspaceState } from './types';

export function useWorkspaceDerivedState(state: WorkspaceState, t: TranslateFn): WorkspaceDerivedState {
  const activeModel = useMemo(() => getActiveModel(state.studioSettings), [state.studioSettings]);
  const activeProvider = useMemo(
    () => getProviderForModel(state.studioSettings, activeModel),
    [state.studioSettings, activeModel]
  );
  const provider = useMemo(() => getEffectiveProviderSettings(state.studioSettings), [state.studioSettings]);


  const { payload, rawJsonError } = useMemo(() => {
    try {
      return {
        payload: buildImagePayload(state.params, provider, state.mode),
        rawJsonError: null as string | null
      };
    } catch (e) {
      return {
        payload: { prompt: state.params.prompt },
        rawJsonError: e instanceof Error ? e.message : String(e)
      };
    }
  }, [state.params, provider, state.mode]);

  const warnings = useMemo(() => {
    const payloadWarnings = explainPayloadWarnings(payload, provider, state.mode, state.capabilityReport);
    if (state.params.sizeMode === 'custom') {
      payloadWarnings.push(...validateCustomSize(state.params.width, state.params.height));
    }
    if (state.mode === 'edit' && !state.targetImage) {
      payloadWarnings.push(t('app.warningEditNeedsTarget'));
    }
    if (!activeModel) {
      payloadWarnings.push(t('app.warningNoModel'));
    }
    return payloadWarnings;
  }, [
    payload,
    provider,
    state.mode,
    state.capabilityReport,
    state.params.sizeMode,
    state.params.width,
    state.params.height,
    state.targetImage,
    activeModel,
    t
  ]);

  const canSubmit = !state.busy &&
    Boolean(activeModel) &&
    !rawJsonError &&
    state.params.prompt.trim().length > 0 &&
    (state.mode === 'generate' || Boolean(state.targetImage));

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
    if (state.busy || state.batchDrafts.length === 0) return false;
    return state.batchDrafts.some((draft) => {
      const { model, provider: draftProvider } = providerContextForModel(state.studioSettings, draft.selectedModelId);
      if (!model) return false;
      if (!draft.params.prompt.trim()) return false;
      if (draft.mode === 'edit' && !draft.targetImage) return false;
      try {
        buildImagePayload(draft.params, draftProvider, draft.mode);
        return true;
      } catch {
        return false;
      }
    });
  }, [state.busy, state.batchDrafts, state.studioSettings]);

  const batchWarnings = useMemo(() => {
    if (!activeBatchDraft) return [];
    const { provider: draftProvider } = providerContextForModel(state.studioSettings, activeBatchDraft.selectedModelId);
    try {
      const draftPayload = buildImagePayload(activeBatchDraft.params, draftProvider, activeBatchDraft.mode);
      const draftWarnings = explainPayloadWarnings(
        draftPayload,
        draftProvider,
        activeBatchDraft.mode,
        activeBatchDraft.selectedModelId === state.studioSettings.selectedModelId ? state.capabilityReport : null
      );
      if (activeBatchDraft.params.sizeMode === 'custom') {
        draftWarnings.push(...validateCustomSize(activeBatchDraft.params.width, activeBatchDraft.params.height));
      }
      if (activeBatchDraft.mode === 'edit' && !activeBatchDraft.targetImage) {
        draftWarnings.push(t('app.warningEditNeedsTarget'));
      }
      return draftWarnings;
    } catch (e) {
      return [e instanceof Error ? e.message : String(e)];
    }
  }, [activeBatchDraft, state.studioSettings, state.capabilityReport, t]);

  return {
    activeModel,
    activeProvider,
    provider,
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
    statusText: rawJsonError || getStatusText(currentTask, t)
  };
}
