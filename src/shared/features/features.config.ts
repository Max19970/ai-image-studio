import { featureDescriptorFallbackModules } from './features.generated';
import type { AppFeatureDescriptor } from './types';

export type { AppFeatureDescriptor } from './types';

type FeatureDescriptorModule = Record<string, unknown>;
type ImportMetaWithGlob = ImportMeta & {
  glob?: (pattern: string, options: { eager: true }) => Record<string, FeatureDescriptorModule>;
};

const discoveredFeatureModules = (import.meta as ImportMetaWithGlob).glob?.('./descriptors/*.feature.ts', { eager: true }) ?? {};
const featureModules = {
  ...featureDescriptorFallbackModules,
  ...discoveredFeatureModules
} as Record<string, FeatureDescriptorModule>;

function isAppFeatureDescriptor(value: unknown): value is AppFeatureDescriptor {
  const candidate = value as Partial<AppFeatureDescriptor> | null;
  return Boolean(candidate?.id && typeof candidate.enabled === 'boolean');
}

export const appFeatureDescriptors: AppFeatureDescriptor[] = Object.entries(featureModules)
  .flatMap(([sourcePath, module]) =>
    Object.values(module)
      .filter(isAppFeatureDescriptor)
      .map((descriptor) => ({ descriptor, sourcePath }))
  )
  .sort((a, b) => a.descriptor.id.localeCompare(b.descriptor.id) || a.sourcePath.localeCompare(b.sourcePath))
  .map(({ descriptor }) => descriptor);

export const appFeatures: Record<string, boolean> = Object.fromEntries(appFeatureDescriptors.map((descriptor) => [descriptor.id, descriptor.enabled]));

export type AppFeature = string & {};
export type FeatureRequirement = AppFeature | AppFeature[] | string | string[];

export function isFeatureEnabled(requirement?: FeatureRequirement): boolean {
  if (!requirement) return true;
  const requirements = Array.isArray(requirement) ? requirement : [requirement];
  return requirements.every((feature) => appFeatures[feature] !== false);
}
