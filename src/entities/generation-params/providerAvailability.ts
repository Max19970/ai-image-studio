import type { ImageParams } from '../../domain/imageParams';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { getProviderAdapterForSettings } from '../provider/registry';
import { getGenerationParamCopyLabelKey, resolveGenerationParamProfileAvailability } from './availability';
import type { GenerationParamDefinition } from './types';

export function isGenerationParamAvailableForProvider(
  definition: GenerationParamDefinition,
  context: {
    provider: ProviderSettings;
    mode: WorkMode;
    capabilityReport?: ProviderProbeReport | null;
    params?: ImageParams;
  }
): boolean {
  const profile = getProviderAdapterForSettings(context.provider).generationParams;
  return resolveGenerationParamProfileAvailability(profile, definition, context);
}

export function getUnavailableProviderGenerationParams(
  definitions: readonly GenerationParamDefinition[],
  context: {
    provider: ProviderSettings;
    mode: WorkMode;
    capabilityReport?: ProviderProbeReport | null;
    params?: ImageParams;
  }
): GenerationParamDefinition[] {
  return definitions.filter((definition) => !isGenerationParamAvailableForProvider(definition, context));
}

export function getUnavailableProviderGenerationParamLabelKeys(
  definitions: readonly GenerationParamDefinition[],
  context: {
    provider: ProviderSettings;
    mode: WorkMode;
    capabilityReport?: ProviderProbeReport | null;
    params?: ImageParams;
  }
): string[] {
  return getUnavailableProviderGenerationParams(definitions, context).map(getGenerationParamCopyLabelKey);
}
