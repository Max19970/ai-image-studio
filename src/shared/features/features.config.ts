export const appFeatures = {
  apiAutomation: true,
  batchComposer: true,
  encryptedStorage: true,
  galleryClear: true,
  galleryDelete: true,
  galleryHistory: true,
  providerProbing: true,
  settings: true,
  studioInfo: true
} satisfies Record<string, boolean>;

export type AppFeature = keyof typeof appFeatures;
export type FeatureRequirement = AppFeature | AppFeature[] | string | string[];

export function isFeatureEnabled(requirement?: FeatureRequirement): boolean {
  if (!requirement) return true;
  const features: Record<string, boolean | undefined> = appFeatures;
  const requirements = Array.isArray(requirement) ? requirement : [requirement];
  return requirements.every((feature) => features[feature] !== false);
}
