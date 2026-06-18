import type { GenerationParamTabDefinition } from './types';

export const generationParamTabs = [
  { id: 'frame', slot: 'composer/parameters/frame', labelKey: 'params.frame', hintKey: 'params.frameHint' },
  { id: 'render', slot: 'composer/parameters/render', labelKey: 'params.render', hintKey: 'params.renderHint' },
  { id: 'output', slot: 'composer/parameters/output', labelKey: 'params.formatStreaming', hintKey: 'params.outputHint' },
  { id: 'service', slot: 'composer/parameters/service', labelKey: 'params.service', hintKey: 'params.serviceHint' },
  { id: 'retry', slot: 'composer/parameters/retry', labelKey: 'params.retry', hintKey: 'params.retryHint', panelClassKey: 'retryTabPanel' }
] satisfies GenerationParamTabDefinition[];

export const generationParamTabsById = new Map(generationParamTabs.map((tab) => [tab.id, tab]));
