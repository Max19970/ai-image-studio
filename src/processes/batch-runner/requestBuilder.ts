import type { GenerationRequestSnapshot } from '../../domain/generationTask';
import { hasProviderModeRequiredAttachments } from '../../entities/provider/compatibility';
import {
  getLegacyWorkModeForProviderMode,
  resolveProviderGenerationModeForModelContext
} from '../../entities/provider/modeResolution';
import { buildImagePayload, explainPayloadWarnings, validateCustomSize } from '../../entities/provider/request';
import { providerContextForModel } from '../../entities/studio-settings';
import { captureRequestSnapshot } from '../generation-runner/requestSnapshots';
import type { BatchGenerationRunInput, PreparedBatchItem } from './types';

export function prepareBatchItems(args: BatchGenerationRunInput): PreparedBatchItem[] {
  const { drafts, settings, selectedModelId, capabilityReport, t } = args;
  return drafts.flatMap((draft, index) => {
    const { model, generationProvider, provider } = providerContextForModel(settings, draft.selectedModelId);
    if (!model) return [];
    if (!draft.params.prompt.trim()) return [];

    const modeResolution = resolveProviderGenerationModeForModelContext(settings, model, draft.providerModeId);
    const providerMode = modeResolution.activeMode;
    const mode = getLegacyWorkModeForProviderMode(providerMode);

    if (!hasProviderModeRequiredAttachments({
      targetImage: draft.targetImage,
      referenceImages: draft.referenceImages,
      mask: draft.mask
    }, providerMode)) return [];

    try {
      const payload = buildImagePayload(draft.params, provider, mode, providerMode);
      const warnings = explainPayloadWarnings(
        payload,
        provider,
        mode,
        draft.selectedModelId === selectedModelId ? capabilityReport : null,
        providerMode
      );
      if (draft.params.sizeMode === 'custom') warnings.push(...validateCustomSize(draft.params.width, draft.params.height));
      const snapshot = captureRequestSnapshot({
        mode,
        providerMode,
        providerModeLabel: t(providerMode.labelKey),
        params: draft.params,
        provider,
        activeProvider: generationProvider,
        activeModel: model,
        payload,
        warnings,
        targetImage: draft.targetImage,
        referenceImages: draft.referenceImages,
        mask: draft.mask,
        fallbackProviderLabel: t('app.localProvider')
      });
      return [{ draft, index, provider, providerMode, payload, snapshot }];
    } catch {
      return [];
    }
  });
}

export function createAggregateSnapshot(args: {
  prepared: PreparedBatchItem[];
  intervalMs: number;
  createdAt: number;
  t: BatchGenerationRunInput['t'];
}): GenerationRequestSnapshot {
  const { prepared, intervalMs, createdAt, t } = args;
  return {
    createdAt,
    mode: prepared[0].snapshot.mode,
    providerModeId: prepared.length === 1 ? prepared[0].snapshot.providerModeId : 'mixed',
    providerModeLabel: Array.from(new Set(prepared.map((item) => item.snapshot.providerModeLabel).filter(Boolean))).join(', '),
    transportOperation: 'provider-submit',
    prompt: t('batch.aggregatePrompt', { count: prepared.length }),
    endpoint: 'multi',
    providerLabel: t('batch.multiProviderLabel'),
    model: prepared.map((item) => item.snapshot.model).filter(Boolean).join(', '),
    modelLabel: prepared.map((item) => item.snapshot.modelLabel).filter(Boolean).join(', '),
    payload: {
      type: 'multi_generation',
      intervalMs,
      intervalMode: 'between_sends',
      requests: prepared.map((item) => item.snapshot.payload)
    },
    warnings: prepared.flatMap((item) => item.snapshot.warnings),
    aggregate: {
      kind: 'batch',
      itemCount: prepared.length,
      intervalMs
    },
    attachments: prepared.flatMap((item) => item.snapshot.attachments),
    params: {}
  };
}
