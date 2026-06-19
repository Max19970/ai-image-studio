import { captureRequestSnapshot, providerContextForModel } from '../../domain/generationSnapshots';
import type { GenerationRequestSnapshot } from '../../domain/generationTask';
import { buildImagePayload, explainPayloadWarnings, validateCustomSize } from '../../entities/provider/request';
import type { BatchGenerationRunInput, PreparedBatchItem } from './types';

export function prepareBatchItems(args: BatchGenerationRunInput): PreparedBatchItem[] {
  const { drafts, settings, selectedModelId, capabilityReport, t } = args;
  return drafts.flatMap((draft, index) => {
    const { model, generationProvider, provider } = providerContextForModel(settings, draft.selectedModelId);
    if (!model) return [];
    if (!draft.params.prompt.trim()) return [];
    if (draft.mode === 'edit' && !draft.targetImage && draft.referenceImages.length === 0 && !draft.mask) return [];
    try {
      const payload = buildImagePayload(draft.params, provider, draft.mode);
      const warnings = explainPayloadWarnings(payload, provider, draft.mode, draft.selectedModelId === selectedModelId ? capabilityReport : null);
      if (draft.params.sizeMode === 'custom') warnings.push(...validateCustomSize(draft.params.width, draft.params.height));
      const snapshot = captureRequestSnapshot({
        mode: draft.mode,
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
      return [{ draft, index, provider, payload, snapshot }];
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
    attachments: prepared.flatMap((item) => item.snapshot.attachments),
    params: prepared[0].snapshot.params
  };
}
