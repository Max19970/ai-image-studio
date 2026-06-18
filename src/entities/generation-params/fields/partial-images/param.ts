import { defineGenerationParam } from '../../defineParam';

export const partialImagesParam = defineGenerationParam({
  id: 'generationParam.partialImages',
  fieldDefinitionId: 'generationParams.partialImages',
  placementIds: ['composer.params.output.partialImages'],
  i18nNamespace: 'params.partialImages',
  stateKeys: ['partialImages', 'includePartialImages'],
  copy: { partialImages: { labelKey: 'params.partialImages', descriptionKey: 'params.partialImages.description' } },
  capability: 'partial_images',
  includeKey: 'includePartialImages',
  payloadKeys: ['partial_images'],
  snapshotKeys: ['partialImages'],
  normalize: ({ current, defaults }) => ({ partialImages: Math.max(0, Math.min(3, Math.round(Number(current.partialImages ?? defaults.partialImages) || 0))) }),
  openAiCompatiblePayload: ({ params }) => params.includePartialImages && params.stream ? { partial_images: params.partialImages } : {}
});
