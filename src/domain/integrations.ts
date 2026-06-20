export type KnownIntegrationId = 'telegram';
export type IntegrationId = KnownIntegrationId | (string & {});

export type IntegrationKind = 'messaging' | 'automation' | 'storage' | 'webhook' | (string & {});
export type IntegrationRuntimeState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
export type IntegrationActionKind = 'config' | 'runtime' | 'diagnostic' | (string & {});

export interface IntegrationSecretDefinition {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface IntegrationActionDefinition {
  id: string;
  label: string;
  description?: string;
  kind: IntegrationActionKind;
  requiresConfiguredSecret?: boolean;
  requiresRuntime?: boolean;
}

export interface IntegrationCapabilities {
  supportsRuntime: boolean;
  supportsSecrets: boolean;
  supportsMiniApp: boolean;
  supportsActions: boolean;
  actions: readonly IntegrationActionDefinition[];
  secrets?: readonly IntegrationSecretDefinition[];
}

export interface IntegrationDefinition {
  id: IntegrationId;
  label: string;
  description: string;
  kind: IntegrationKind;
  order: number;
  capabilities: IntegrationCapabilities;
}

export interface IntegrationSecretState {
  configured: boolean;
  preview?: string;
  updatedAt?: number | null;
}

export type IntegrationPublicConfigValues = Record<string, unknown>;

export interface IntegrationPublicConfig {
  id: IntegrationId;
  enabled: boolean;
  values: IntegrationPublicConfigValues;
  secrets: Record<string, IntegrationSecretState>;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface IntegrationSecretValuePatch {
  value?: string;
  clear?: boolean;
}

export interface IntegrationSecretPatch {
  secrets: Record<string, IntegrationSecretValuePatch>;
}

export interface IntegrationConfigPatch {
  enabled?: boolean;
  values?: IntegrationPublicConfigValues;
  secretPatch?: IntegrationSecretPatch;
}

export interface IntegrationRuntimeStatus {
  id: IntegrationId;
  state: IntegrationRuntimeState;
  startedAt: number | null;
  updatedAt: number;
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationConfigSnapshot {
  definition: IntegrationDefinition;
  config: IntegrationPublicConfig;
  status: IntegrationRuntimeStatus;
}

export interface IntegrationActionRequest {
  actionId: string;
  payload?: Record<string, unknown>;
}

export interface IntegrationActionResult {
  ok: boolean;
  message: string;
  status?: IntegrationRuntimeStatus;
  data?: Record<string, unknown>;
}

export const telegramIntegrationDefinition = {
  id: 'telegram',
  label: 'Телеграм',
  description: 'Бот и Mini App, открывающее Image Studio внутри Telegram.',
  kind: 'messaging',
  order: 10,
  capabilities: {
    supportsRuntime: true,
    supportsSecrets: true,
    supportsMiniApp: true,
    supportsActions: true,
    secrets: [
      {
        id: 'botToken',
        label: 'Токен бота',
        description: 'Секретный токен Telegram Bot API. Хранится только на сервере.',
        required: true
      }
    ],
    actions: [
      {
        id: 'validate-token',
        label: 'Проверить токен',
        description: 'Проверяет сохранённый токен через Bot API без раскрытия секрета в UI.',
        kind: 'diagnostic',
        requiresConfiguredSecret: true
      },
      {
        id: 'apply-menu-button',
        label: 'Настроить кнопку меню',
        description: 'Привязывает кнопку открытия Mini App к меню Telegram-бота.',
        kind: 'config',
        requiresConfiguredSecret: true
      },
      {
        id: 'start-runtime',
        label: 'Запустить бота',
        description: 'Запускает серверный runtime интеграции.',
        kind: 'runtime',
        requiresConfiguredSecret: true
      },
      {
        id: 'stop-runtime',
        label: 'Остановить бота',
        description: 'Останавливает серверный runtime интеграции.',
        kind: 'runtime'
      },
      {
        id: 'send-test-message',
        label: 'Отправить тестовое сообщение',
        description: 'Отправляет диагностическое сообщение с Web App-кнопкой в указанный chat id.',
        kind: 'diagnostic',
        requiresConfiguredSecret: true
      }
    ]
  }
} satisfies IntegrationDefinition;

export const integrationDefinitions = [telegramIntegrationDefinition] satisfies IntegrationDefinition[];
export const integrationDefinitionsById = new Map<IntegrationId, IntegrationDefinition>(
  integrationDefinitions.map((definition) => [definition.id, definition])
);

export function listIntegrationDefinitions(): IntegrationDefinition[] {
  return [...integrationDefinitions].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function isKnownIntegrationId(id: string | null | undefined): id is IntegrationId {
  return Boolean(id && integrationDefinitionsById.has(id));
}

export function getIntegrationDefinition(id: string | null | undefined): IntegrationDefinition | null {
  if (!id) return null;
  return integrationDefinitionsById.get(id) ?? null;
}

export function requireIntegrationDefinition(id: string | null | undefined): IntegrationDefinition {
  const definition = getIntegrationDefinition(id);
  if (!definition) throw new Error(`Unknown integration: ${id || 'empty id'}`);
  return definition;
}
