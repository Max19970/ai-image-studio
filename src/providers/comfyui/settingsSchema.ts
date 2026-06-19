import type { ProviderAdapterSettingsField } from '../../entities/provider/types';

export const comfyUiSettingsFields: ProviderAdapterSettingsField[] = [
  {
    key: 'generationEndpoint',
    label: 'ComfyUI base URL',
    kind: 'endpoint',
    operation: 'generate',
    required: true
  },
  {
    key: 'customHeadersJson',
    label: 'Custom headers JSON',
    kind: 'json'
  },
  {
    key: 'timeoutMs',
    label: 'Timeout, ms',
    kind: 'number'
  }
];
