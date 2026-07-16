import { useCallback, useMemo, useRef, useState } from 'react';
import type { ComposerRequestDraft } from '../../../domain/generationTask';
import { cloneParams } from '../../../domain/generationSnapshots';
import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeId } from '../../../domain/providerMode';
import type { StudioSettings } from '../../../domain/studioSettings';
import { openAiCompatibleImageGenerateModeId } from '../../../entities/generation-params/openai-compatible/modes';
import type { StateSetter } from '../types';
import {
  clearComposerDraftContent,
  createComposerRequestDraft,
  removeComposerDraft,
  replaceComposerDraft,
  selectComposerDraftAfterRemoval
} from './composerSession';

interface ComposerSettingsBridge {
  params: ImageParams;
  setParams: StateSetter<ImageParams>;
  studioSettings: StudioSettings;
  setStudioSettings: StateSetter<StudioSettings>;
}

export interface ComposerWorkspaceState {
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

export function useComposerWorkspaceState(bridge: ComposerSettingsBridge): ComposerWorkspaceState {
  const initialDraftRef = useRef<ComposerRequestDraft | null>(null);
  if (!initialDraftRef.current) {
    initialDraftRef.current = createComposerRequestDraft({
      params: bridge.params,
      selectedModelId: bridge.studioSettings.selectedModelId,
      providerModeId: openAiCompatibleImageGenerateModeId
    });
  }

  const initialDraft = initialDraftRef.current;
  const [activeComposerDraftId, setActiveComposerDraftId] = useState(initialDraft.id);
  const [storedDrafts, setStoredDrafts] = useState<ComposerRequestDraft[]>([initialDraft]);
  const [providerModeId, setProviderModeIdState] = useState<ProviderGenerationModeId>(initialDraft.providerModeId);
  const [compatibilityNotice, setCompatibilityNotice] = useState<string | null>(null);
  const [targetImage, setTargetImageState] = useState<File | null>(initialDraft.targetImage);
  const [referenceImages, setReferenceImagesState] = useState<File[]>(initialDraft.referenceImages);
  const [mask, setMaskState] = useState<File | null>(initialDraft.mask);
  const [composerIntervalSeconds, setComposerIntervalSeconds] = useState(4);
  const [composerParametersDraftId, setComposerParametersDraftId] = useState<string | null>(null);

  const currentDraft = useMemo<ComposerRequestDraft>(() => ({
    id: activeComposerDraftId,
    providerModeId,
    params: bridge.params,
    selectedModelId: bridge.studioSettings.selectedModelId,
    targetImage,
    referenceImages,
    mask
  }), [
    activeComposerDraftId,
    bridge.params,
    bridge.studioSettings.selectedModelId,
    mask,
    providerModeId,
    referenceImages,
    targetImage
  ]);

  const composerDrafts = useMemo(
    () => replaceComposerDraft(storedDrafts, currentDraft),
    [currentDraft, storedDrafts]
  );
  const draftsRef = useRef(composerDrafts);
  const currentDraftRef = useRef(currentDraft);
  draftsRef.current = composerDrafts;
  currentDraftRef.current = currentDraft;

  const applyDraftToCurrent = useCallback((draft: ComposerRequestDraft) => {
    setProviderModeIdState(draft.providerModeId);
    bridge.setParams(cloneParams(draft.params));
    bridge.setStudioSettings((previous) => ({ ...previous, selectedModelId: draft.selectedModelId }));
    setTargetImageState(draft.targetImage);
    setReferenceImagesState([...draft.referenceImages]);
    setMaskState(draft.mask);
    setCompatibilityNotice(null);
  }, [bridge.setParams, bridge.setStudioSettings]);

  const storeCurrentDraft = useCallback((drafts: ComposerRequestDraft[]) => (
    replaceComposerDraft(drafts, currentDraftRef.current)
  ), []);

  const selectComposerDraft = useCallback((id: string) => {
    if (id === currentDraftRef.current.id) return;
    const nextDraft = draftsRef.current.find((draft) => draft.id === id);
    if (!nextDraft) return;
    setStoredDrafts((drafts) => storeCurrentDraft(drafts));
    setActiveComposerDraftId(id);
    applyDraftToCurrent(nextDraft);
  }, [applyDraftToCurrent, storeCurrentDraft]);

  const addComposerDraft = useCallback(() => {
    const current = currentDraftRef.current;
    const nextDraft = createComposerRequestDraft({
      params: current.params,
      selectedModelId: current.selectedModelId,
      providerModeId: current.providerModeId
    }, current, { clearContent: true });
    const nextDrafts = [...replaceComposerDraft(draftsRef.current, current), nextDraft];
    setStoredDrafts(nextDrafts);
    setActiveComposerDraftId(nextDraft.id);
    applyDraftToCurrent(nextDraft);
  }, [applyDraftToCurrent]);

  const duplicateComposerDraft = useCallback((id: string) => {
    const source = draftsRef.current.find((draft) => draft.id === id);
    if (!source) return;
    const nextDraft = createComposerRequestDraft({
      params: source.params,
      selectedModelId: source.selectedModelId,
      providerModeId: source.providerModeId
    }, source);
    const nextDrafts = [...replaceComposerDraft(draftsRef.current, currentDraftRef.current), nextDraft];
    setStoredDrafts(nextDrafts);
    setActiveComposerDraftId(nextDraft.id);
    applyDraftToCurrent(nextDraft);
  }, [applyDraftToCurrent]);

  const removeComposerDraftById = useCallback((id: string) => {
    const synchronized = replaceComposerDraft(draftsRef.current, currentDraftRef.current);
    if (synchronized.length <= 1) {
      const cleared = clearComposerDraftContent(synchronized[0]);
      setStoredDrafts([cleared]);
      setActiveComposerDraftId(cleared.id);
      applyDraftToCurrent(cleared);
      return;
    }
    const replacement = selectComposerDraftAfterRemoval(synchronized, id);
    const nextDrafts = removeComposerDraft(synchronized, id);
    setStoredDrafts(nextDrafts);
    if (id === currentDraftRef.current.id && replacement) {
      setActiveComposerDraftId(replacement.id);
      applyDraftToCurrent(replacement);
    }
  }, [applyDraftToCurrent]);

  const patchComposerDraft = useCallback((id: string, patch: Partial<ComposerRequestDraft>) => {
    if (id === currentDraftRef.current.id) {
      if (patch.providerModeId !== undefined) setProviderModeIdState(patch.providerModeId);
      if (patch.params !== undefined) bridge.setParams(cloneParams(patch.params));
      if (patch.selectedModelId !== undefined) {
        bridge.setStudioSettings((previous) => ({ ...previous, selectedModelId: patch.selectedModelId! }));
      }
      if (patch.targetImage !== undefined) setTargetImageState(patch.targetImage);
      if (patch.referenceImages !== undefined) setReferenceImagesState([...patch.referenceImages]);
      if (patch.mask !== undefined) setMaskState(patch.mask);
      return;
    }
    setStoredDrafts((drafts) => drafts.map((draft) => draft.id === id
      ? {
          ...draft,
          ...patch,
          params: patch.params ? cloneParams(patch.params) : draft.params,
          referenceImages: patch.referenceImages ? [...patch.referenceImages] : draft.referenceImages
        }
      : draft));
  }, [bridge.setParams, bridge.setStudioSettings]);

  const patchComposerDraftParams = useCallback((id: string, patch: Partial<ImageParams>) => {
    if (id === currentDraftRef.current.id) {
      bridge.setParams((current) => ({ ...current, ...patch }));
      return;
    }
    setStoredDrafts((drafts) => drafts.map((draft) => draft.id === id
      ? { ...draft, params: { ...draft.params, ...patch } }
      : draft));
  }, [bridge.setParams]);

  const setComposerDrafts = useCallback<StateSetter<ComposerRequestDraft[]>>((next) => {
    const resolved = resolveStateValue(next, draftsRef.current);
    const safeDrafts = resolved.length > 0
      ? resolved
      : [clearComposerDraftContent(currentDraftRef.current)];
    const nextActive = safeDrafts.find((draft) => draft.id === currentDraftRef.current.id) ?? safeDrafts[0];
    setStoredDrafts(safeDrafts);
    if (nextActive.id !== currentDraftRef.current.id || nextActive !== currentDraftRef.current) {
      setActiveComposerDraftId(nextActive.id);
      applyDraftToCurrent(nextActive);
    }
  }, [applyDraftToCurrent]);

  const setProviderModeId = useCallback<StateSetter<ProviderGenerationModeId>>((next) => {
    setProviderModeIdState((current) => resolveStateValue(next, current));
  }, []);
  const setTargetImage = useCallback<StateSetter<File | null>>((next) => {
    setTargetImageState((current) => resolveStateValue(next, current));
  }, []);
  const setReferenceImages = useCallback<StateSetter<File[]>>((next) => {
    setReferenceImagesState((current) => [...resolveStateValue(next, current)]);
  }, []);
  const setMask = useCallback<StateSetter<File | null>>((next) => {
    setMaskState((current) => resolveStateValue(next, current));
  }, []);

  return {
    providerModeId,
    setProviderModeId,
    compatibilityNotice,
    setCompatibilityNotice,
    targetImage,
    setTargetImage,
    referenceImages,
    setReferenceImages,
    mask,
    setMask,
    composerDrafts,
    setComposerDrafts,
    activeComposerDraftId,
    selectComposerDraft,
    addComposerDraft,
    duplicateComposerDraft,
    removeComposerDraft: removeComposerDraftById,
    patchComposerDraft,
    patchComposerDraftParams,
    composerIntervalSeconds,
    setComposerIntervalSeconds,
    composerParametersDraftId,
    setComposerParametersDraftId
  };
}
