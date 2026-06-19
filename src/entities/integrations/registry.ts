import type { IntegrationDefinition, IntegrationId } from './types';

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
