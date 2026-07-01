import type { ProviderAdapterSettingsField } from '../../entities/provider/types';

export const comfyUiSettingsFields: ProviderAdapterSettingsField[] = [
  {
    key: 'timeoutMs',
    label: 'Timeout, ms',
    kind: 'number',
    section: 'core',
    infoKey: 'settings.info.timeout',
    min: 1000,
    max: 1800000
  },
  {
    key: 'generationEndpoint',
    label: 'ComfyUI base URL',
    kind: 'endpoint',
    section: 'endpoints',
    infoKey: 'settings.info.generationEndpoint',
    operation: 'generate',
    required: true,
    wide: true
  },
  {
    key: 'customHeadersJson',
    label: 'Custom headers JSON',
    kind: 'json',
    section: 'advanced',
    infoKey: 'settings.info.customHeaders',
    placeholder: '{ "X-Custom": "..." }',
    wide: true
  }
];
