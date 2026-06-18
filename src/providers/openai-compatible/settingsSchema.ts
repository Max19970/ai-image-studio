import type { ProviderAdapterSettingsField } from '../../entities/provider/types';

export const openAiCompatibleSettingsFields: ProviderAdapterSettingsField[] = [
  {
    key: 'generationEndpoint',
    label: 'Generation endpoint',
    kind: 'endpoint',
    operation: 'generate',
    required: true
  },
  {
    key: 'editEndpoint',
    label: 'Edit endpoint',
    kind: 'endpoint',
    operation: 'edit',
    required: true
  },
  {
    key: 'responsesEndpoint',
    label: 'Responses endpoint',
    kind: 'endpoint',
    operation: 'responses',
    required: false
  },
  {
    key: 'apiKey',
    label: 'API key',
    kind: 'secret',
    required: false,
    sensitive: true
  },
  {
    key: 'authHeaderName',
    label: 'Auth header',
    kind: 'text',
    required: true
  },
  {
    key: 'authScheme',
    label: 'Auth scheme',
    kind: 'text',
    required: false
  },
  {
    key: 'customHeadersJson',
    label: 'Custom headers JSON',
    kind: 'json',
    required: false
  },
  {
    key: 'timeoutMs',
    label: 'Timeout',
    kind: 'number',
    required: true
  }
];
