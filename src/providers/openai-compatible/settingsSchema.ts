import type { ProviderAdapterSettingsField } from '../../entities/provider/types';

export const openAiCompatibleSettingsFields: ProviderAdapterSettingsField[] = [
  {
    key: 'timeoutMs', label: 'Timeout', kind: 'number', section: 'core', infoKey: 'settings.info.timeout',
    min: 1000, max: 900000, required: true
  },
  {
    key: 'generationEndpoint', label: 'Generation endpoint', kind: 'endpoint', section: 'endpoints',
    infoKey: 'settings.info.generationEndpoint', operation: 'generate', required: true, wide: true
  },
  {
    key: 'editEndpoint', label: 'Edit endpoint', kind: 'endpoint', section: 'endpoints',
    infoKey: 'settings.info.editEndpoint', operation: 'edit', required: true, wide: true
  },
  {
    key: 'responsesEndpoint', label: 'Responses endpoint', kind: 'endpoint', section: 'endpoints',
    infoKey: 'settings.info.responsesEndpoint', operation: 'responses', required: false, wide: true
  },
  {
    key: 'apiKey', label: 'API key', kind: 'secret', section: 'auth', infoKey: 'settings.info.apiKey',
    placeholder: 'sk-...', required: false, sensitive: true, wide: true
  },
  {
    key: 'authHeaderName', label: 'Auth header', kind: 'text', section: 'auth', infoKey: 'settings.info.authHeader',
    placeholder: 'Authorization', required: true
  },
  {
    key: 'authScheme', label: 'Auth scheme', kind: 'text', section: 'auth', infoKey: 'settings.info.authScheme',
    placeholder: 'Bearer', required: false
  },
  {
    key: 'persistApiKey', label: 'Persist API key locally', kind: 'boolean', section: 'auth',
    infoKey: 'settings.info.persistApiKey', required: false, wide: true
  },
  {
    key: 'customHeadersJson', label: 'Custom headers JSON', kind: 'json', section: 'advanced',
    infoKey: 'settings.info.customHeaders', placeholder: '{ "OpenAI-Organization": "org_..." }', required: false, wide: true
  }
];
