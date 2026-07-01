import type { IntegrationDefinition } from '../../domain/integrations';

export const telegramIntegrationDefinition = {
  id: 'telegram',
  label: '\u0422\u0435\u043b\u0435\u0433\u0440\u0430\u043c',
  description: 'Bot runtime and Mini App host for opening Image Studio inside Telegram.',
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
        label: 'Bot token',
        description: 'Secret Telegram Bot API token. Stored only on the server.',
        required: true
      }
    ],
    actions: [
      {
        id: 'validate-token',
        label: 'Validate token',
        description: 'Checks the saved token through Bot API without exposing it in the UI.',
        kind: 'diagnostic',
        requiresConfiguredSecret: true
      },
      {
        id: 'apply-menu-button',
        label: 'Configure menu button',
        description: 'Links the Telegram bot menu button to the Mini App.',
        kind: 'config',
        requiresConfiguredSecret: true
      },
      {
        id: 'start-runtime',
        label: 'Start bot',
        description: 'Starts the server-side integration runtime.',
        kind: 'runtime',
        requiresConfiguredSecret: true
      },
      {
        id: 'stop-runtime',
        label: 'Stop bot',
        description: 'Stops the server-side integration runtime.',
        kind: 'runtime'
      },
      {
        id: 'send-test-message',
        label: 'Send test message',
        description: 'Sends a diagnostic message with a Web App button to the selected chat id.',
        kind: 'diagnostic',
        requiresConfiguredSecret: true
      }
    ]
  }
} satisfies IntegrationDefinition;

export const integrationDefinition = telegramIntegrationDefinition;
