import { useMemo } from 'react';
import { normalizeSelectedModel } from '../../entities/studio-settings';
import { createAppCommands } from '../commands/appCommands';
import type { TranslateFn } from '../commands/types';
import type { WorkspaceDerivedState, WorkspaceState } from './types';

export function useWorkspaceCommands(state: WorkspaceState, derived: WorkspaceDerivedState, t: TranslateFn) {
  return useMemo(() => createAppCommands({
    t,
    mode: state.mode,
    params: state.params,
    provider: derived.provider,
    activeProvider: derived.activeProvider,
    activeModel: derived.activeModel,
    payload: derived.payload,
    warnings: derived.warnings,
    targetImage: state.targetImage,
    referenceImages: state.referenceImages,
    mask: state.mask,
    canSubmit: derived.canSubmit,
    batchCanSubmit: derived.batchCanSubmit,
    batchDrafts: state.batchDrafts,
    batchIntervalSeconds: state.batchIntervalSeconds,
    activeBatchDraft: derived.activeBatchDraft,
    studioSettings: state.studioSettings,
    capabilityReport: state.capabilityReport,
    selectedTaskId: state.selectedTaskId,
    taskHistory: state.taskHistory,
    providerProbeState: {
      setCapabilityReport: state.setCapabilityReport,
      setProbeError: state.setProbeError,
      setProbingProviderId: state.setProbingProviderId,
      setQuickCheckingProviderId: state.setQuickCheckingProviderId,
      setQuickCheckResults: state.setQuickCheckResults
    },
    setMode: state.setMode,
    setCompatibilityNotice: state.setCompatibilityNotice,
    setParams: state.setParams,
    setStudioSettings: state.setStudioSettings,
    setParametersOpen: state.setParametersOpen,
    setWorkspaceTab: state.setWorkspaceTab,
    setSidebarCollapsed: state.setSidebarCollapsed,
    setTargetImage: state.setTargetImage,
    setReferenceImages: state.setReferenceImages,
    setMask: state.setMask,
    setSelectedTaskId: state.setSelectedTaskId,
    setSelectedImageId: state.setSelectedImageId,
    setBusy: state.setBusy,
    setBatchComposerOpen: state.setBatchComposerOpen,
    setBatchDrafts: state.setBatchDrafts,
    setBatchIntervalSeconds: state.setBatchIntervalSeconds,
    setBatchParametersDraftId: state.setBatchParametersDraftId,
    normalizeSettings: normalizeSelectedModel
  }), [state, derived, t]);
}
