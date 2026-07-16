import type { ComposerRequestDraft } from '../../../domain/generationTask';
import { cloneParams } from '../../../domain/generationSnapshots';
import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeId } from '../../../domain/providerMode';

export interface ComposerDraftSeed {
  params: ImageParams;
  selectedModelId: string;
  providerModeId: ProviderGenerationModeId;
}

export function createComposerRequestDraft(
  seed: ComposerDraftSeed,
  source?: Partial<ComposerRequestDraft>,
  options: { clearContent?: boolean } = {}
): ComposerRequestDraft {
  const inheritedParams = cloneParams(source?.params ?? seed.params);
  return {
    id: crypto.randomUUID(),
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
