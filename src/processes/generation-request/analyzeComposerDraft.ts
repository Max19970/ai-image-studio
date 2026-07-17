import type { ComposerRequestDraft } from '../../domain/generationTask';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { getProviderModeAttachmentStatusText, hasProviderModeRequiredAttachments } from '../../entities/provider/attachmentCompatibility';
import {
  getLegacyWorkModeForProviderMode,
  resolveProviderGenerationModeForModelContext
} from '../../entities/provider/modeResolution';
import { buildImagePayload, explainPayloadWarnings, validateCustomSize } from '../../entities/provider/request';
import { providerContextForModel } from '../../entities/studio-settings';

export type ComposerDraftIssue =
  | 'missing-model'
  | 'missing-prompt'
  | 'missing-attachments'
  | 'invalid-parameters';

interface ComposerDraftAnalysisBase {
  draftId: string;
  draft: ComposerRequestDraft;
  attachmentCount: number;
  expectedImageCount: number;
  model: GenerationModel | null;
  generationProvider: GenerationProvider | null;
  provider: ProviderSettings;
  providerMode: ProviderGenerationModeDefinition;
  providerModes: ProviderGenerationModeDefinition[];
  mode: WorkMode;
}

export type ComposerDraftAnalysis =
  | (ComposerDraftAnalysisBase & {
      ready: true;
      issue: null;
      error: null;
      payload: Record<string, unknown>;
    })
  | (ComposerDraftAnalysisBase & {
      ready: false;
      issue: ComposerDraftIssue;
      error: string | null;
      payload: null;
    });

export type ComposerDraftTranslate = (
  key: string,
  vars?: Record<string, string | number | boolean | null | undefined>
) => string;

function analysisBase(draft: ComposerRequestDraft, settings: StudioSettings): ComposerDraftAnalysisBase {
  const attachmentCount = (draft.targetImage ? 1 : 0) + draft.referenceImages.length + (draft.mask ? 1 : 0);
  const expectedImageCount = Math.max(1, Number(draft.params.n || 1));
  const { model, generationProvider, provider } = providerContextForModel(settings, draft.selectedModelId);
  const modeResolution = resolveProviderGenerationModeForModelContext(
    settings,
    model,
    draft.providerModeId
  );
  const providerMode = modeResolution.activeMode;
  return {
    draftId: draft.id,
    draft,
    attachmentCount,
    expectedImageCount,
    model,
    generationProvider,
    provider,
    providerMode,
    providerModes: modeResolution.modes,
    mode: getLegacyWorkModeForProviderMode(providerMode)
  };
}

function notReady(
  base: ComposerDraftAnalysisBase,
  issue: ComposerDraftIssue,
  error: string | null = null
): ComposerDraftAnalysis {
  return { ...base, ready: false, issue, error, payload: null };
}

export function analyzeComposerDraft(
  draft: ComposerRequestDraft,
  settings: StudioSettings
): ComposerDraftAnalysis {
  const base = analysisBase(draft, settings);
  if (!base.model) return notReady(base, 'missing-model');
  if (!draft.params.prompt.trim()) return notReady(base, 'missing-prompt');
  if (!hasProviderModeRequiredAttachments({
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  }, base.providerMode)) {
    return notReady(base, 'missing-attachments');
  }

  try {
    return {
      ...base,
      ready: true,
      issue: null,
      error: null,
      payload: buildImagePayload(draft.params, base.provider, base.mode, base.providerMode)
    };
  } catch (error) {
    return notReady(base, 'invalid-parameters', error instanceof Error ? error.message : String(error));
  }
}

export function explainComposerDraftAnalysisWarnings(args: {
  analysis: ComposerDraftAnalysis;
  capabilityReport: ProviderProbeReport | null;
  t: ComposerDraftTranslate;
}): string[] {
  const { analysis, capabilityReport, t } = args;
  const warnings = analysis.payload
    ? explainPayloadWarnings(
        analysis.payload,
        analysis.provider,
        analysis.mode,
        capabilityReport,
        analysis.providerMode
      )
    : [];

  if (analysis.draft.params.sizeMode === 'custom') {
    warnings.push(...validateCustomSize(
      analysis.draft.params.width,
      analysis.draft.params.height,
      analysis.provider,
      analysis.providerMode
    ));
  }

  const attachmentStatus = getProviderModeAttachmentStatusText({
    draft: analysis.draft,
    providerMode: analysis.providerMode,
    t
  });
  if (attachmentStatus) warnings.push(attachmentStatus);
  if (!analysis.model) warnings.push(t('app.warningNoModel'));
  if (analysis.issue === 'invalid-parameters' && analysis.error) warnings.push(analysis.error);
  return warnings;
}
