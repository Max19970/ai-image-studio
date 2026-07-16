import type { ComposerRequestDraft } from '../../../domain/generationTask';
import type { StudioSettings } from '../../../domain/studioSettings';
import { hasProviderModeRequiredAttachments } from '../../../entities/provider/attachmentCompatibility';
import {
  getLegacyWorkModeForProviderMode,
  resolveProviderGenerationModeForModelContext
} from '../../../entities/provider/modeResolution';
import { buildImagePayload } from '../../../entities/provider/request';
import { providerContextForModel } from '../../../entities/studio-settings';

export type ComposerDraftIssue =
  | 'missing-model'
  | 'missing-prompt'
  | 'missing-attachments'
  | 'invalid-parameters'
  | null;

export interface ComposerDraftReadiness {
  draftId: string;
  ready: boolean;
  issue: ComposerDraftIssue;
  attachmentCount: number;
  expectedImageCount: number;
}

export interface ComposerQueueSummary {
  totalCount: number;
  readyCount: number;
  invalidCount: number;
  totalExpectedImages: number;
}

export function evaluateComposerDraftReadiness(
  draft: ComposerRequestDraft,
  settings: StudioSettings
): ComposerDraftReadiness {
  const attachmentCount = (draft.targetImage ? 1 : 0) + draft.referenceImages.length + (draft.mask ? 1 : 0);
  const expectedImageCount = Math.max(1, Number(draft.params.n || 1));
  const { model, provider } = providerContextForModel(settings, draft.selectedModelId);

  let issue: ComposerDraftIssue = null;
  if (!model) {
    issue = 'missing-model';
  } else if (!draft.params.prompt.trim()) {
    issue = 'missing-prompt';
  } else {
    const providerMode = resolveProviderGenerationModeForModelContext(
      settings,
      model,
      draft.providerModeId
    ).activeMode;
    if (!hasProviderModeRequiredAttachments({
      targetImage: draft.targetImage,
      referenceImages: draft.referenceImages,
      mask: draft.mask
    }, providerMode)) {
      issue = 'missing-attachments';
    } else {
      try {
        buildImagePayload(
          draft.params,
          provider,
          getLegacyWorkModeForProviderMode(providerMode),
          providerMode
        );
      } catch {
        issue = 'invalid-parameters';
      }
    }
  }

  return {
    draftId: draft.id,
    ready: issue === null,
    issue,
    attachmentCount,
    expectedImageCount
  };
}

export function summarizeComposerQueue(readiness: ComposerDraftReadiness[]): ComposerQueueSummary {
  let readyCount = 0;
  let totalExpectedImages = 0;
  for (const item of readiness) {
    if (item.ready) readyCount += 1;
    totalExpectedImages += item.expectedImageCount;
  }
  return {
    totalCount: readiness.length,
    readyCount,
    invalidCount: readiness.length - readyCount,
    totalExpectedImages
  };
}
