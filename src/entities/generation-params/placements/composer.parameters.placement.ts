import type { GenerationParamFieldPlacement } from '../types';

export const placements: GenerationParamFieldPlacement[] = [
  { id: 'composer.params.frame.size', slot: 'composer/parameters/frame', use: 'generationParams.size', order: 10 },
  { id: 'composer.params.frame.n', slot: 'composer/parameters/frame', use: 'generationParams.n', order: 20, requiresCapability: 'n' },

  { id: 'composer.params.render.quality', slot: 'composer/parameters/render', use: 'generationParams.quality', order: 10, requiresCapability: 'quality' },
  { id: 'composer.params.render.background', slot: 'composer/parameters/render', use: 'generationParams.background', order: 20, requiresCapability: 'background' },
  { id: 'composer.params.render.moderation', slot: 'composer/parameters/render', use: 'generationParams.moderation', order: 30, requiresCapability: 'moderation' },
  { id: 'composer.params.render.style', slot: 'composer/parameters/render', use: 'generationParams.style', order: 40, requiresCapability: 'style' },
  { id: 'composer.params.render.inputFidelity', slot: 'composer/parameters/render', use: 'generationParams.inputFidelity', order: 50, mode: 'edit', requiresCapability: 'input_fidelity' },

  { id: 'composer.params.output.format', slot: 'composer/parameters/output', use: 'generationParams.outputFormat', order: 10, requiresCapability: 'output_format' },
  { id: 'composer.params.output.compression', slot: 'composer/parameters/output', use: 'generationParams.outputCompression', order: 20, requiresCapability: 'output_compression' },
  { id: 'composer.params.output.stream', slot: 'composer/parameters/output', use: 'generationParams.stream', order: 30, requiresCapability: 'stream' },
  { id: 'composer.params.output.partialImages', slot: 'composer/parameters/output', use: 'generationParams.partialImages', order: 40, requiresCapability: 'partial_images' },

  { id: 'composer.params.service.responseFormat', slot: 'composer/parameters/service', use: 'generationParams.responseFormat', order: 10, requiresCapability: 'response_format' },
  { id: 'composer.params.service.user', slot: 'composer/parameters/service', use: 'generationParams.user', order: 20, requiresCapability: 'user' },
  { id: 'composer.params.service.includeModel', slot: 'composer/parameters/service', use: 'generationParams.includeModel', order: 30 },
  { id: 'composer.params.service.rawJson', slot: 'composer/parameters/service', use: 'generationParams.rawJson', order: 40 },

  { id: 'composer.params.retry.policy', slot: 'composer/parameters/retry', use: 'generationParams.retryPolicy', order: 10 }
];
