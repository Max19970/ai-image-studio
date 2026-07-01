import type { IntegrationSettingsPanelDescriptor } from './integrationPanelTypes';
import { TelegramIntegrationPanel } from './TelegramIntegrationPanel';

export const telegramPanel = {
  integrationId: 'telegram',
  Component: TelegramIntegrationPanel
} satisfies IntegrationSettingsPanelDescriptor;
