import { useMemo } from 'react';
import { getStatusText } from '../../domain/generationSnapshots';
import { getProviderModeAttachmentStatusText } from '../../entities/provider/attachmentCompatibility';
import { summarizeComposerQueue } from '../../features/composer/model/composerDraftReadiness';
import {
  analyzeComposerDraft,
  explainComposerDraftAnalysisWarnings
} from '../../processes/generation-request/analyzeComposerDraft';
import type { TranslateFn } from '../commands/types';
import type { WorkspaceDerivedState, WorkspaceState } from './types';

export function useWorkspaceDerivedState(state: WorkspaceState, t: TranslateFn): WorkspaceDerivedState {
  const activeComposerDraft = state.composerDrafts.find((draft) => draft.id === state.activeComposerDraftId)
    ?? state.composerDrafts[0];
  const composerDraftAnalyses = useMemo(
    () => state.composerDrafts.map((draft) => analyzeComposerDraft(draft, state.studioSettings)),
    [state.composerDrafts, state.studioSettings]
  );
  const activeAnalysis = composerDraftAnalyses.find((analysis) => analysis.draftId === activeComposerDraft.id)
    ?? analyzeComposerDraft(activeComposerDraft, state.studioSettings);
  const activeModel = activeAnalysis.model;
  const activeProvider = activeAnalysis.generationProvider;
  const provider = activeAnalysis.provider;
  const providerMode = activeAnalysis.providerMode;
  const providerModes = activeAnalysis.providerModes;
  const mode = activeAnalysis.mode;
  const payload = activeAnalysis.payload ?? { prompt: activeComposerDraft.params.prompt };
  const rawJsonError = activeAnalysis.issue === 'invalid-parameters' ? activeAnalysis.error : null;

  const attachmentStatusText = useMemo(() => getProviderModeAttachmentStatusText({
    draft: activeComposerDraft,
    providerMode,
    t
  }), [activeComposerDraft, providerMode, t]);

  const warnings = useMemo(() => explainComposerDraftAnalysisWarnings({
    analysis: activeAnalysis,
    capabilityReport: state.capabilityReport,
    t
  }), [activeAnalysis, state.capabilityReport, t]);

  const composerDraftReadiness = useMemo(
    () => composerDraftAnalyses.map((analysis) => ({
      draftId: analysis.draftId,
      ready: analysis.ready,
      issue: analysis.issue,
      attachmentCount: analysis.attachmentCount,
      expectedImageCount: analysis.expectedImageCount
    })),
    [composerDraftAnalyses]
  );
  const composerQueueSummary = useMemo(
    () => summarizeComposerQueue(composerDraftReadiness),
    [composerDraftReadiness]
  );
  const canSubmit = activeAnalysis.ready;

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
  const activeBatchAnalysis = activeBatchDraft
    ? composerDraftAnalyses.find((analysis) => analysis.draftId === activeBatchDraft.id) ?? null
    : null;

  const batchWarnings = useMemo(() => {
    if (!activeBatchAnalysis) return [];
    return explainComposerDraftAnalysisWarnings({
      analysis: activeBatchAnalysis,
      capabilityReport: activeBatchAnalysis.draft.selectedModelId === activeComposerDraft.selectedModelId
        ? state.capabilityReport
        : null,
      t
    });
  }, [activeBatchAnalysis, activeComposerDraft.selectedModelId, state.capabilityReport, t]);

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
