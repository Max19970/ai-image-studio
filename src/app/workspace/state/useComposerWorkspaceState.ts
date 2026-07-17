import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ComposerRequestDraft } from '../../../domain/generationTask';
import { cloneParams } from '../../../domain/generationSnapshots';
import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeId } from '../../../domain/providerMode';
import type { StudioSettings } from '../../../domain/studioSettings';
import { openAiCompatibleImageGenerateModeId } from '../../../entities/generation-params/openai-compatible/modes';
import type { StateSetter } from '../types';
import {
  composerSessionReducer,
  createComposerSessionState,
  type ComposerSessionState
} from './composerSession';

interface ComposerSettingsBridge {
  params: ImageParams;
  setParams: StateSetter<ImageParams>;
  studioSettings: StudioSettings;
  setStudioSettings: StateSetter<StudioSettings>;
}

export interface ComposerWorkspaceState {
  params: ImageParams;
  setParams: StateSetter<ImageParams>;
  studioSettings: StudioSettings;
  setStudioSettings: StateSetter<StudioSettings>;
  providerModeId: ProviderGenerationModeId;
  setProviderModeId: StateSetter<ProviderGenerationModeId>;
  compatibilityNotice: string | null;
  setCompatibilityNotice: StateSetter<string | null>;
  targetImage: File | null;
  setTargetImage: StateSetter<File | null>;
  referenceImages: File[];
  setReferenceImages: StateSetter<File[]>;
  mask: File | null;
  setMask: StateSetter<File | null>;
  composerDrafts: ComposerRequestDraft[];
  setComposerDrafts: StateSetter<ComposerRequestDraft[]>;
  activeComposerDraftId: string;
  selectComposerDraft: (id: string) => void;
  addComposerDraft: () => void;
  duplicateComposerDraft: (id: string) => void;
  removeComposerDraft: (id: string) => void;
  patchComposerDraft: (id: string, patch: Partial<ComposerRequestDraft>) => void;
  patchComposerDraftParams: (id: string, patch: Partial<ImageParams>) => void;
  composerIntervalSeconds: number;
  setComposerIntervalSeconds: StateSetter<number>;
  composerParametersDraftId: string | null;
  setComposerParametersDraftId: StateSetter<string | null>;
}

function resolveStateValue<T>(next: React.SetStateAction<T>, current: T): T {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next;
}

function activeDraftFor(session: ComposerSessionState): ComposerRequestDraft {
  return session.drafts.find((draft) => draft.id === session.activeDraftId) ?? session.drafts[0];
}

export function useComposerWorkspaceState(bridge: ComposerSettingsBridge): ComposerWorkspaceState {
  const [session, dispatch] = useReducer(
    composerSessionReducer,
    undefined,
    () => createComposerSessionState({
      params: bridge.params,
      selectedModelId: bridge.studioSettings.selectedModelId,
      providerModeId: openAiCompatibleImageGenerateModeId
    })
  );
  const sessionRef = useRef(session);
  const bridgeRef = useRef(bridge);
  sessionRef.current = session;
  bridgeRef.current = bridge;

  const activeDraft = activeDraftFor(session);

  useEffect(() => {
    dispatch({
      type: 'seedUntouchedSession',
      seed: {
        params: bridge.params,
        selectedModelId: bridge.studioSettings.selectedModelId,
        providerModeId: activeDraft.providerModeId
      }
    });
  }, [bridge.params, bridge.studioSettings.selectedModelId]);

  useEffect(() => {
    if (session.revision === 0) return;
    bridge.setParams(cloneParams(activeDraft.params));
    bridge.setStudioSettings((current) => current.selectedModelId === activeDraft.selectedModelId
      ? current
      : { ...current, selectedModelId: activeDraft.selectedModelId });
  }, [
    activeDraft.params,
    activeDraft.selectedModelId,
    bridge.setParams,
    bridge.setStudioSettings,
    session.revision
  ]);

  const patchActiveDraft = useCallback((patch: Partial<ComposerRequestDraft>) => {
    const current = activeDraftFor(sessionRef.current);
    dispatch({ type: 'patchDraft', id: current.id, patch });
  }, []);

  const setParams = useCallback<StateSetter<ImageParams>>((next) => {
    const current = activeDraftFor(sessionRef.current);
    const value = resolveStateValue(next, current.params);
    dispatch({ type: 'patchDraft', id: current.id, patch: { params: cloneParams(value) } });
  }, []);

  const setStudioSettings = useCallback<StateSetter<StudioSettings>>((next) => {
    const currentDraft = activeDraftFor(sessionRef.current);
    const currentBridge = bridgeRef.current;
    const currentSettings = {
      ...currentBridge.studioSettings,
      selectedModelId: currentDraft.selectedModelId
    };
    const value = resolveStateValue(next, currentSettings);
    currentBridge.setStudioSettings(value);
    if (value.selectedModelId !== currentDraft.selectedModelId) {
      dispatch({
        type: 'patchDraft',
        id: currentDraft.id,
        patch: { selectedModelId: value.selectedModelId }
      });
    }
  }, []);

  const setProviderModeId = useCallback<StateSetter<ProviderGenerationModeId>>((next) => {
    const current = activeDraftFor(sessionRef.current);
    patchActiveDraft({ providerModeId: resolveStateValue(next, current.providerModeId) });
  }, [patchActiveDraft]);

  const setTargetImage = useCallback<StateSetter<File | null>>((next) => {
    const current = activeDraftFor(sessionRef.current);
    patchActiveDraft({ targetImage: resolveStateValue(next, current.targetImage) });
  }, [patchActiveDraft]);

  const setReferenceImages = useCallback<StateSetter<File[]>>((next) => {
    const current = activeDraftFor(sessionRef.current);
    patchActiveDraft({ referenceImages: [...resolveStateValue(next, current.referenceImages)] });
  }, [patchActiveDraft]);

  const setMask = useCallback<StateSetter<File | null>>((next) => {
    const current = activeDraftFor(sessionRef.current);
    patchActiveDraft({ mask: resolveStateValue(next, current.mask) });
  }, [patchActiveDraft]);

  const setComposerDrafts = useCallback<StateSetter<ComposerRequestDraft[]>>((next) => {
    const current = sessionRef.current;
    dispatch({
      type: 'replaceDrafts',
      drafts: resolveStateValue(next, current.drafts)
    });
  }, []);

  const setCompatibilityNotice = useCallback<StateSetter<string | null>>((next) => {
    const current = sessionRef.current.compatibilityNotice;
    dispatch({ type: 'setCompatibilityNotice', notice: resolveStateValue(next, current) });
  }, []);

  const setComposerIntervalSeconds = useCallback<StateSetter<number>>((next) => {
    const current = sessionRef.current.composerIntervalSeconds;
    dispatch({ type: 'setInterval', seconds: resolveStateValue(next, current) });
  }, []);

  const setComposerParametersDraftId = useCallback<StateSetter<string | null>>((next) => {
    const current = sessionRef.current.composerParametersDraftId;
    dispatch({ type: 'setParametersDraft', id: resolveStateValue(next, current) });
  }, []);

  const patchComposerDraft = useCallback((id: string, patch: Partial<ComposerRequestDraft>) => {
    dispatch({ type: 'patchDraft', id, patch });
  }, []);

  const patchComposerDraftParams = useCallback((id: string, patch: Partial<ImageParams>) => {
    dispatch({ type: 'patchDraftParams', id, patch });
  }, []);

  const studioSettings = useMemo<StudioSettings>(() => ({
    ...bridge.studioSettings,
    selectedModelId: activeDraft.selectedModelId
  }), [activeDraft.selectedModelId, bridge.studioSettings]);

  return {
    params: activeDraft.params,
    setParams,
    studioSettings,
    setStudioSettings,
    providerModeId: activeDraft.providerModeId,
    setProviderModeId,
    compatibilityNotice: session.compatibilityNotice,
    setCompatibilityNotice,
    targetImage: activeDraft.targetImage,
    setTargetImage,
    referenceImages: activeDraft.referenceImages,
    setReferenceImages,
    mask: activeDraft.mask,
    setMask,
    composerDrafts: session.drafts,
    setComposerDrafts,
    activeComposerDraftId: session.activeDraftId,
    selectComposerDraft: (id) => dispatch({ type: 'selectDraft', id }),
    addComposerDraft: () => dispatch({ type: 'addDraft', id: crypto.randomUUID() }),
    duplicateComposerDraft: (id) => dispatch({ type: 'duplicateDraft', id, newId: crypto.randomUUID() }),
    removeComposerDraft: (id) => dispatch({ type: 'removeDraft', id }),
    patchComposerDraft,
    patchComposerDraftParams,
    composerIntervalSeconds: session.composerIntervalSeconds,
    setComposerIntervalSeconds,
    composerParametersDraftId: session.composerParametersDraftId,
    setComposerParametersDraftId
  };
}
