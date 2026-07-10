import type express from 'express';
import type { IntegrationRegistryPort } from '../integrations/registry';

export function registerIntegrationContributedRoutes(app: express.Express, registry: IntegrationRegistryPort) {
  for (const adapter of registry.list()) {
    for (const route of adapter.routes ?? []) {
      route.register(app);
    }
  }
}
