import type express from 'express';
import {
  getIntegrationDefinition,
  listIntegrationDefinitions,
  requireIntegrationDefinition,
  type IntegrationDefinition
} from '../../src/entities/integrations';
import { sendServerError } from '../http/errors';
import { runIntegrationRuntimeAction } from '../integrations/actionDispatcher';
import { defaultIntegrationRegistry, type IntegrationRegistryPort } from '../integrations/registry';
import type { IntegrationActionResult, IntegrationRuntimeStatus } from '../integrations/types';
import { HttpError } from '../providers/types';
import {
  loadIntegrationRuntimeConfig,
  loadIntegrationSettings,
  patchIntegrationSettings,
  sanitizeIntegrationSettingsForClient
} from '../storage/integrationSettingsStore';

export function registerIntegrationRoutes(app: express.Express, registry: IntegrationRegistryPort = defaultIntegrationRegistry) {
  app.get('/api/integrations', (_req, res) => {
    try {
      res.json({ integrations: listIntegrationDefinitions() });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/integrations/:id/config', (req, res) => {
    try {
      res.json(loadIntegrationConfigSnapshot(req.params.id, registry));
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.put('/api/integrations/:id/config', (req, res) => {
    try {
      const definition = requireKnownIntegrationDefinition(req.params.id);
      patchIntegrationSettings(definition.id, req.body ?? {}, secretIdsForDefinition(definition));
      res.json(loadIntegrationConfigSnapshot(definition.id, registry));
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/integrations/:id/status', (req, res) => {
    try {
      const definition = requireKnownIntegrationDefinition(req.params.id);
      res.json(loadIntegrationStatus(definition.id, registry));
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/integrations/:id/start', async (req, res) => {
    try {
      const definition = requireKnownIntegrationDefinition(req.params.id);
      const result = await runRuntimeAction(registry, definition.id, 'start-runtime', req.body?.payload ?? {});
      res.json(result);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/integrations/:id/stop', async (req, res) => {
    try {
      const definition = requireKnownIntegrationDefinition(req.params.id);
      const result = await runRuntimeAction(registry, definition.id, 'stop-runtime', req.body?.payload ?? {});
      res.json(result);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/integrations/:id/actions/:action', async (req, res) => {
    try {
      const definition = requireKnownIntegrationDefinition(req.params.id);
      const result = await runRuntimeAction(registry, definition.id, req.params.action, req.body?.payload ?? {});
      res.json(result);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}

export function loadIntegrationConfigSnapshot(
  id: string,
  registry: IntegrationRegistryPort = defaultIntegrationRegistry
) {
  const definition = requireKnownIntegrationDefinition(id);
  const loaded = loadIntegrationSettings();
  return {
    definition,
    config: sanitizeIntegrationSettingsForClient(definition.id, loaded.value, secretIdsForDefinition(definition)),
    status: loadIntegrationStatus(definition.id, registry)
  };
}

export function loadIntegrationStatus(
  id: string,
  registry: IntegrationRegistryPort = defaultIntegrationRegistry
): IntegrationRuntimeStatus {
  const definition = requireKnownIntegrationDefinition(id);
  const adapter = registry.get(definition.id);
  if (adapter) return adapter.getStatus();
  return {
    id: definition.id,
    state: 'stopped',
    startedAt: null,
    updatedAt: Date.now(),
    message: 'Runtime adapter is not registered yet.'
  };
}

function requireKnownIntegrationDefinition(id: string | undefined): IntegrationDefinition {
  const definition = getIntegrationDefinition(id);
  if (!definition) throw new HttpError(`Unknown integration: ${id || 'empty id'}`, 404);
  return requireIntegrationDefinition(definition.id);
}

function secretIdsForDefinition(definition: IntegrationDefinition): readonly string[] {
  return definition.capabilities.secrets?.map((secret) => secret.id) ?? [];
}

async function runRuntimeAction(
  registry: IntegrationRegistryPort,
  id: string,
  actionId: string,
  payload: Record<string, unknown>
): Promise<IntegrationActionResult> {
  const adapter = registry.get(id);
  if (!adapter) {
    throw new HttpError(`Integration runtime adapter is not registered: ${id}`, 501);
  }

  const config = loadIntegrationRuntimeConfig(id);
  const result = await runIntegrationRuntimeAction({ adapter, actionId, config, payload });
  return redactIntegrationActionResult(result, Object.values(config.secrets).filter(isNonEmptyString));
}

function redactIntegrationActionResult(
  result: IntegrationActionResult,
  secretValues: readonly string[]
): IntegrationActionResult {
  return redactSecretValues(result, secretValues) as IntegrationActionResult;
}

function redactSecretValues(value: unknown, secretValues: readonly string[]): unknown {
  if (typeof value === 'string') {
    return secretValues.reduce((text, secret) => text.split(secret).join('••••'), value);
  }
  if (Array.isArray(value)) return value.map((item) => redactSecretValues(item, secretValues));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        /token|secret|password|authorization|api[-_]?key|apikey/i.test(key)
          ? '••••'
          : redactSecretValues(child, secretValues)
      ])
    );
  }
  return value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
