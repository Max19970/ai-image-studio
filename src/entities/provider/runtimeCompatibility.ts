import type { StudioSettings } from '../../domain/studioSettings';
import type { ProviderRuntimeCapabilities } from './types';
import { getProviderForModel, toProviderSettings } from '../studio-settings';
import { getProviderAdapterForSettings } from './registry';
import type {
  GenerationDraftCompatibilityShape,
  ProviderCompatibilityChange,
  ProviderCompatibilityResult
} from './compatibilityTypes';
import { uniqueCompatibilityChanges } from './compatibilityTypes';

export function sanitizeGenerationDraftForProviderCapabilities<T extends GenerationDraftCompatibilityShape>(
  draft: T,
  capabilities: ProviderRuntimeCapabilities
): ProviderCompatibilityResult<T> {
  const changes: ProviderCompatibilityChange[] = [];
  const next: GenerationDraftCompatibilityShape = {
    mode: draft.mode,
    targetImage: draft.targetImage,
    referenceImages: draft.referenceImages,
    mask: draft.mask
  };

  if (!capabilities.supportsEdit && next.mode !== 'generate') {
    next.mode = 'generate';
    changes.push('mode');
  }

  const shouldClearImages = !capabilities.supportsEdit || !capabilities.supportsImageAttachments;
  if (shouldClearImages && (next.targetImage || next.referenceImages.length > 0)) {
    next.targetImage = null;
    next.referenceImages = [];
    changes.push('imageAttachments');
  }

  const shouldClearMask = !capabilities.supportsEdit || !capabilities.supportsMask;
  if (shouldClearMask && next.mask) {
    next.mask = null;
    changes.push('mask');
  }

  const normalizedChanges = uniqueCompatibilityChanges(changes);
  if (normalizedChanges.length === 0) return { value: draft, changed: false, changes: [] };
  return { value: { ...draft, ...next }, changed: true, changes: normalizedChanges };
}

export function getProviderRuntimeCapabilitiesForModel(settings: StudioSettings, modelId: string): ProviderRuntimeCapabilities {
  const model = settings.models.find((item) => item.id === modelId) ?? settings.models[0] ?? null;
  const provider = getProviderForModel(settings, model);
  return getProviderAdapterForSettings(toProviderSettings(provider, model)).capabilities;
}

export function sanitizeGenerationDraftForModel<T extends GenerationDraftCompatibilityShape>(
  draft: T,
  settings: StudioSettings,
  modelId: string
): ProviderCompatibilityResult<T> {
  return sanitizeGenerationDraftForProviderCapabilities(
    draft,
    getProviderRuntimeCapabilitiesForModel(settings, modelId)
  );
}
