import type { GenerationRequestSnapshot } from '../../domain/generationTask';
import {
  analyzeComposerDraft,
  explainComposerDraftAnalysisWarnings
} from '../generation-request/analyzeComposerDraft';
import { captureRequestSnapshot } from '../generation-runner/requestSnapshots';
import type { BatchGenerationRunInput, PreparedBatchItem } from './types';

export function prepareBatchItems(args: BatchGenerationRunInput): PreparedBatchItem[] {
  const { drafts, settings, selectedModelId, capabilityReport, t } = args;
  return drafts.flatMap((draft, index) => {
    const analysis = analyzeComposerDraft(draft, settings);
    if (!analysis.ready) return [];

    const warnings = explainComposerDraftAnalysisWarnings({
      analysis,
      capabilityReport: draft.selectedModelId === selectedModelId ? capabilityReport : null,
      t
    });
    const snapshot = captureRequestSnapshot({
      mode: analysis.mode,
      providerMode: analysis.providerMode,
      providerModeLabel: t(analysis.providerMode.labelKey),
      params: draft.params,
      provider: analysis.provider,
      activeProvider: analysis.generationProvider,
      activeModel: analysis.model,
      payload: analysis.payload,
      warnings,
      targetImage: draft.targetImage,
      referenceImages: draft.referenceImages,
      mask: draft.mask,
      fallbackProviderLabel: t('app.localProvider')
    });
    return [{
      draft,
      index,
      provider: analysis.provider,
      providerMode: analysis.providerMode,
      payload: analysis.payload,
      snapshot
    }];
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
