import { getIntegrationAdapter, registerIntegrationAdapter } from './registry';
import { telegramIntegrationAdapter } from './telegram';

export function registerBuiltInIntegrationAdapters(): void {
  if (!getIntegrationAdapter(telegramIntegrationAdapter.id)) {
    registerIntegrationAdapter(telegramIntegrationAdapter);
  }
}
