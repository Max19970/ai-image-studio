import type { ComposerRequestDraft } from '../../../domain/generationTask';
import { cloneParams } from '../../../domain/generationSnapshots';
import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeId } from '../../../domain/providerMode';

export interface ComposerDraftSeed {
  params: ImageParams;
  selectedModelId: string;
  providerModeId: ProviderGenerationModeId;
}

export interface ComposerSessionState {
  drafts: ComposerRequestDraft[];
  activeDraftId: string;
  revision: number;
  composerIntervalSeconds: number;
  composerParametersDraftId: string | null;
  compatibilityNotice: string | null;
}

export type ComposerSessionAction =
  | { type: 'selectDraft'; id: string }
  | { type: 'addDraft'; id: string }
  | { type: 'duplicateDraft'; id: string; newId: string }
  | { type: 'removeDraft'; id: string }
  | { type: 'replaceDrafts'; drafts: ComposerRequestDraft[] }
  | { type: 'patchDraft'; id: string; patch: Partial<ComposerRequestDraft> }
  | { type: 'patchDraftParams'; id: string; patch: Partial<ImageParams> }
  | { type: 'clearLastDraft' }
  | { type: 'setInterval'; seconds: number }
  | { type: 'setParametersDraft'; id: string | null }
  | { type: 'setCompatibilityNotice'; notice: string | null }
  | { type: 'seedUntouchedSession'; seed: ComposerDraftSeed };

export function createComposerRequestDraft(
  seed: ComposerDraftSeed,
  source?: Partial<ComposerRequestDraft>,
  options: { clearContent?: boolean; id?: string } = {}
): ComposerRequestDraft {
  const inheritedParams = cloneParams(source?.params ?? seed.params);
  return {
    id: options.id ?? crypto.randomUUID(),
    providerModeId: source?.providerModeId ?? seed.providerModeId,
    params: {
      ...inheritedParams,
      ...(options.clearContent ? { prompt: '' } : {})
    },
    selectedModelId: source?.selectedModelId ?? seed.selectedModelId,
    targetImage: options.clearContent ? null : source?.targetImage ?? null,
    referenceImages: options.clearContent ? [] : [...(source?.referenceImages ?? [])],
    mask: options.clearContent ? null : source?.mask ?? null
  };
}

export function cloneComposerDraft(draft: ComposerRequestDraft): ComposerRequestDraft {
  return {
    ...draft,
    params: cloneParams(draft.params),
    referenceImages: [...draft.referenceImages]
  };
}

export function replaceComposerDraft(
  drafts: ComposerRequestDraft[],
  draft: ComposerRequestDraft
): ComposerRequestDraft[] {
  return drafts.map((item) => item.id === draft.id ? draft : item);
}

export function selectComposerDraftAfterRemoval(
  drafts: ComposerRequestDraft[],
  removedId: string
): ComposerRequestDraft | null {
  const removedIndex = drafts.findIndex((draft) => draft.id === removedId);
  if (removedIndex < 0) return drafts[0] ?? null;
  return drafts[removedIndex + 1] ?? drafts[removedIndex - 1] ?? null;
}

export function removeComposerDraft(
  drafts: ComposerRequestDraft[],
  removedId: string
): ComposerRequestDraft[] {
  if (drafts.length <= 1) return drafts;
  return drafts.filter((draft) => draft.id !== removedId);
}

export function clearComposerDraftContent(draft: ComposerRequestDraft): ComposerRequestDraft {
  return {
    ...draft,
    params: { ...cloneParams(draft.params), prompt: '' },
    targetImage: null,
    referenceImages: [],
    mask: null
  };
}

export function createComposerSessionState(
  seed: ComposerDraftSeed,
  options: { id?: string; intervalSeconds?: number } = {}
): ComposerSessionState {
  const draft = createComposerRequestDraft(seed, undefined, { id: options.id });
  return {
    drafts: [draft],
    activeDraftId: draft.id,
    revision: 0,
    composerIntervalSeconds: options.intervalSeconds ?? 4,
    composerParametersDraftId: null,
    compatibilityNotice: null
  };
}

function patchDraftValue(
  draft: ComposerRequestDraft,
  patch: Partial<ComposerRequestDraft>
): ComposerRequestDraft {
  return {
    ...draft,
    ...patch,
    id: draft.id,
    params: patch.params ? cloneParams(patch.params) : draft.params,
    referenceImages: patch.referenceImages ? [...patch.referenceImages] : draft.referenceImages
  };
}

function withUserRevision(
  state: ComposerSessionState,
  patch: Partial<ComposerSessionState>
): ComposerSessionState {
  return { ...state, ...patch, revision: state.revision + 1 };
}

export function composerSessionReducer(
  state: ComposerSessionState,
  action: ComposerSessionAction
): ComposerSessionState {
  const activeDraft = state.drafts.find((draft) => draft.id === state.activeDraftId) ?? state.drafts[0];

  switch (action.type) {
    case 'selectDraft': {
      if (action.id === state.activeDraftId || !state.drafts.some((draft) => draft.id === action.id)) return state;
      return withUserRevision(state, { activeDraftId: action.id, compatibilityNotice: null });
    }
    case 'addDraft': {
      const nextDraft = createComposerRequestDraft({
        params: activeDraft.params,
        selectedModelId: activeDraft.selectedModelId,
        providerModeId: activeDraft.providerModeId
      }, activeDraft, { clearContent: true, id: action.id });
      return withUserRevision(state, {
        drafts: [...state.drafts, nextDraft],
        activeDraftId: nextDraft.id,
        compatibilityNotice: null
      });
    }
    case 'duplicateDraft': {
      const source = state.drafts.find((draft) => draft.id === action.id);
      if (!source) return state;
      const duplicate = createComposerRequestDraft({
        params: source.params,
        selectedModelId: source.selectedModelId,
        providerModeId: source.providerModeId
      }, source, { id: action.newId });
      return withUserRevision(state, {
        drafts: [...state.drafts, duplicate],
        activeDraftId: duplicate.id,
        compatibilityNotice: null
      });
    }
    case 'removeDraft': {
      const removedIndex = state.drafts.findIndex((draft) => draft.id === action.id);
      if (removedIndex < 0) return state;
      if (state.drafts.length === 1) {
        const cleared = clearComposerDraftContent(state.drafts[0]);
        return withUserRevision(state, {
          drafts: [cleared],
          activeDraftId: cleared.id,
          compatibilityNotice: null
        });
      }
      const drafts = state.drafts.filter((draft) => draft.id !== action.id);
      const activeDraftId = action.id === state.activeDraftId
        ? (state.drafts[removedIndex + 1] ?? state.drafts[removedIndex - 1]).id
        : state.activeDraftId;
      return withUserRevision(state, {
        drafts,
        activeDraftId,
        compatibilityNotice: action.id === state.activeDraftId ? null : state.compatibilityNotice
      });
    }
    case 'replaceDrafts': {
      const drafts = action.drafts.length > 0
        ? action.drafts.map(cloneComposerDraft)
        : [clearComposerDraftContent(activeDraft)];
      const nextActive = drafts.find((draft) => draft.id === state.activeDraftId) ?? drafts[0];
      return withUserRevision(state, {
        drafts,
        activeDraftId: nextActive.id,
        composerParametersDraftId: state.composerParametersDraftId && drafts.some((draft) => draft.id === state.composerParametersDraftId)
          ? state.composerParametersDraftId
          : null,
        compatibilityNotice: null
      });
    }
    case 'patchDraft': {
      if (!state.drafts.some((draft) => draft.id === action.id)) return state;
      return withUserRevision(state, {
        drafts: state.drafts.map((draft) => draft.id === action.id ? patchDraftValue(draft, action.patch) : draft)
      });
    }
    case 'patchDraftParams': {
      if (!state.drafts.some((draft) => draft.id === action.id)) return state;
      return withUserRevision(state, {
        drafts: state.drafts.map((draft) => draft.id === action.id
          ? { ...draft, params: { ...cloneParams(draft.params), ...action.patch } }
          : draft)
      });
    }
    case 'clearLastDraft': {
      if (state.drafts.length !== 1) return state;
      return withUserRevision(state, {
        drafts: [clearComposerDraftContent(state.drafts[0])],
        compatibilityNotice: null
      });
    }
    case 'setInterval':
      return withUserRevision(state, { composerIntervalSeconds: Math.max(0, action.seconds) });
    case 'setParametersDraft':
      return withUserRevision(state, {
        composerParametersDraftId: action.id && state.drafts.some((draft) => draft.id === action.id) ? action.id : null
      });
    case 'setCompatibilityNotice':
      return withUserRevision(state, { compatibilityNotice: action.notice });
    case 'seedUntouchedSession': {
      if (state.revision !== 0) return state;
      const seeded = {
        ...activeDraft,
        params: cloneParams(action.seed.params),
        selectedModelId: action.seed.selectedModelId,
        providerModeId: action.seed.providerModeId
      };
      return { ...state, drafts: replaceComposerDraft(state.drafts, seeded) };
    }
  }
}
