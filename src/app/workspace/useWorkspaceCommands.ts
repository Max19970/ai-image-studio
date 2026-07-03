import { useMemo } from 'react';
import { normalizeSelectedModel } from '../../entities/studio-settings';
import { createAppCommands } from '../commands/appCommands';
import type { TranslateFn } from '../commands/types';
import type { WorkspaceDerivedState, WorkspaceState } from './types';

export function useWorkspaceCommands(state: WorkspaceState, derived: WorkspaceDerivedState, t: TranslateFn) {
  return useMemo(() => {
    const composerCompatibility = {
      t,
      providerModeId: state.providerModeId,
      studioSettings: state.studioSettings,
      targetImage: state.targetImage,
      referenceImages: state.referenceImages,
      mask: state.mask,
      setProviderModeId: state.setProviderModeId,
      setCompatibilityNotice: state.setCompatibilityNotice,
      setTargetImage: state.setTargetImage,
      setReferenceImages: state.setReferenceImages,
      setMask: state.setMask
    };

    const galleryNavigation = {
      setSelectedTaskId: state.setSelectedTaskId,
      setSelectedImageId: state.setSelectedImageId,
      setBatchComposerOpen: state.setBatchComposerOpen
    };

    const hiresFix = {
      t,
      params: state.params,
      studioSettings: state.studioSettings,
      setStudioSettings: state.setStudioSettings,
      setProviderModeId: state.setProviderModeId,
      setParams: state.setParams,
      setTargetImage: state.setTargetImage,
      setReferenceImages: state.setReferenceImages,
      setMask: state.setMask,
      setBatchComposerOpen: state.setBatchComposerOpen,
      setWorkspaceTab: state.setWorkspaceTab,
      setSelectedTaskId: state.setSelectedTaskId,
      setSelectedImageId: state.setSelectedImageId,
      setCompatibilityNotice: state.setCompatibilityNotice
    };

    const providerProbe = {
      setCapabilityReport: state.setCapabilityReport,
      setProbeError: state.setProbeError,
      setProbingProviderId: state.setProbingProviderId,
      setQuickCheckingProviderId: state.setQuickCheckingProviderId,
      setQuickCheckResults: state.setQuickCheckResults
    };

    return createAppCommands({
      workspace: {
        setWorkspaceTab: state.setWorkspaceTab,
        setSidebarCollapsed: state.setSidebarCollapsed
      },
      composer: {
        ...composerCompatibility,
        mode: derived.mode,
        providerMode: derived.providerMode,
        params: state.params,
        provider: derived.provider,
        activeProvider: derived.activeProvider,
        activeModel: derived.activeModel,
        payload: derived.payload,
        warnings: derived.warnings,
        canSubmit: derived.canSubmit,
        activeGalleryPath: state.activeGalleryPath,
        setParams: state.setParams,
        setStudioSettings: state.setStudioSettings,
        setParametersOpen: state.setParametersOpen,
        setWorkspaceTab: state.setWorkspaceTab,
        taskHistory: state.taskHistory,
        setBusy: state.setBusy,
        setServerSubmission: state.setServerSubmission,
        setBatchComposerOpen: state.setBatchComposerOpen,
        setBatchDrafts: state.setBatchDrafts,
        normalizeSettings: normalizeSelectedModel
      },
      batchComposer: {
        t,
        providerModeId: state.providerModeId,
        params: state.params,
        studioSettings: state.studioSettings,
        capabilityReport: state.capabilityReport,
        activeGalleryPath: state.activeGalleryPath,
        batchCanSubmit: derived.batchCanSubmit,
        batchDrafts: state.batchDrafts,
        batchIntervalSeconds: state.batchIntervalSeconds,
        setBusy: state.setBusy,
        setBatchComposerOpen: state.setBatchComposerOpen,
        setBatchDrafts: state.setBatchDrafts,
        setBatchIntervalSeconds: state.setBatchIntervalSeconds,
        setBatchParametersDraftId: state.setBatchParametersDraftId
      },
      gallery: {
        activeGalleryPath: state.activeGalleryPath,
        galleryFolders: state.galleryFolders,
        galleryPins: state.galleryPins,
        galleryTagRecords: state.galleryTagRecords,
        selectedTaskId: state.selectedTaskId,
        taskHistory: state.taskHistory,
        navigation: galleryNavigation,
        hiresFix,
        setSelectedTaskId: state.setSelectedTaskId,
        setSelectedImageId: state.setSelectedImageId,
        setActiveGalleryPath: state.setActiveGalleryPath,
        createGalleryFolder: state.createGalleryFolder,
        deleteGalleryFolder: state.deleteGalleryFolder,
        moveGalleryItem: state.moveGalleryItem,
        pasteGalleryItems: state.pasteGalleryItems,
        setGalleryItemPinned: state.setGalleryItemPinned,
        setGalleryItemTags: state.setGalleryItemTags
      },
      settings: {
        studioSettings: state.studioSettings,
        activeProvider: derived.activeProvider,
        activeModel: derived.activeModel,
        setStudioSettings: state.setStudioSettings,
        normalizeSettings: normalizeSelectedModel,
        composerCompatibility,
        batchCompatibility: {
          setBatchDrafts: state.setBatchDrafts
        },
        providerProbe
      },
      detail: {
        t,
        studioSettings: state.studioSettings,
        hiresFix,
        setProviderModeId: state.setProviderModeId,
        setCompatibilityNotice: state.setCompatibilityNotice,
        setBatchComposerOpen: state.setBatchComposerOpen,
        setParams: state.setParams,
        setStudioSettings: state.setStudioSettings,
        setSelectedTaskId: state.setSelectedTaskId,
        setSelectedImageId: state.setSelectedImageId
      },
      parameters: {
        activeBatchDraft: derived.activeBatchDraft,
        setParametersOpen: state.setParametersOpen,
        setParams: state.setParams,
        setBatchParametersDraftId: state.setBatchParametersDraftId,
        setBatchDrafts: state.setBatchDrafts
      },
      requestPresets: {
        t,
        providerModeId: state.providerModeId,
        providerMode: derived.providerMode,
        params: state.params,
        activeProvider: derived.activeProvider,
        activeModel: derived.activeModel,
        studioSettings: state.studioSettings,
        batchDrafts: state.batchDrafts,
        requestPresets: state.requestPresets,
        setProviderModeId: state.setProviderModeId,
        setCompatibilityNotice: state.setCompatibilityNotice,
        setParams: state.setParams,
        setStudioSettings: state.setStudioSettings,
        setTargetImage: state.setTargetImage,
        setReferenceImages: state.setReferenceImages,
        setMask: state.setMask,
        setBatchDrafts: state.setBatchDrafts,
        setRequestPresets: state.setRequestPresets,
        normalizeSettings: normalizeSelectedModel
      }
    });
  }, [state, derived, t]);
}
