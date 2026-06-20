import type {
  GenerationParamDefinition,
  ProviderGenerationParamProfile,
  ProviderGenerationParamSet
} from './types';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ImageParams } from '../../domain/imageParams';

export function generationParamSetIncludes(set: ProviderGenerationParamSet | undefined, paramId: string): boolean {
  if (!set) return true;
  if (set === 'all') return true;
  return set.includes(paramId);
}

export function resolveGenerationParamProfileAvailability(
  profile: ProviderGenerationParamProfile,
  definition: Pick<GenerationParamDefinition, 'id'>,
  context: {
    provider: ProviderSettings;
    mode: WorkMode;
    providerMode?: ProviderGenerationModeDefinition | null;
    capabilityReport?: ProviderProbeReport | null;
    params?: ImageParams;
  }
): boolean {
  let available = generationParamSetIncludes(profile.include, definition.id);
  const effectiveMode = context.providerMode?.legacyWorkMode ?? context.mode;

  const modeSet = profile.byMode?.[effectiveMode];
  if (modeSet) available = available && generationParamSetIncludes(modeSet, definition.id);

  if (profile.exclude?.includes(definition.id)) available = false;

  for (const rule of profile.modelRules ?? []) {
    const modelId = context.provider.modelId.toLowerCase();
    const matches = rule.modelIdIncludes.some((needle) => modelId.includes(needle.toLowerCase()));
    if (!matches) continue;

    if (rule.include) available = generationParamSetIncludes(rule.include, definition.id);
    if (rule.exclude?.includes(definition.id)) available = false;
  }

  if (profile.isAvailable) {
    available = profile.isAvailable({
      provider: context.provider,
      mode: effectiveMode,
      providerMode: context.providerMode ?? null,
      capabilityReport: context.capabilityReport ?? null,
      params: context.params,
      definition: definition as GenerationParamDefinition,
      current: available
    });
  }

  return available;
}

export function getGenerationParamPrimaryLabelKey(definition: GenerationParamDefinition): string {
  const descriptor = Object.values(definition.copy ?? {})[0];
  return descriptor?.labelKey ?? `params.${definition.id.replace(/^generationParam\./, '')}`;
}

export function getGenerationParamCopyLabelKey(definition: GenerationParamDefinition): string {
  const descriptor = Object.values(definition.copy ?? {})[0];
  return descriptor?.labelKey ?? getGenerationParamPrimaryLabelKey(definition);
}
