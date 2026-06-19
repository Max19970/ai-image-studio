import type {
  IntegrationActionRequest,
  IntegrationActionResult,
  IntegrationConfigPatch,
  IntegrationConfigSnapshot,
  IntegrationDefinition,
  IntegrationId,
  IntegrationRuntimeStatus
} from '../../entities/integrations';

export const integrationsApiBasePath = '/api/integrations';

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Preserve raw text for non-JSON errors.
  }

  if (!response.ok) {
    const message = describeIntegrationApiError(data, text || response.statusText || `HTTP ${response.status}`);
    throw new Error(message);
  }

  return data as T;
}

function describeIntegrationApiError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const root = data as { error?: unknown; message?: unknown };
    const error = root.error ?? root;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    if (typeof root.message === 'string') return root.message;
  }
  return fallback;
}

async function fetchIntegrationApi<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await readJsonOrThrow<T>(await fetch(path, init));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
}

export function integrationConfigPath(id: IntegrationId): string {
  return `${integrationsApiBasePath}/${encodeURIComponent(id)}/config`;
}

export function integrationStatusPath(id: IntegrationId): string {
  return `${integrationsApiBasePath}/${encodeURIComponent(id)}/status`;
}

export function integrationActionPath(id: IntegrationId, actionId: string): string {
  return `${integrationsApiBasePath}/${encodeURIComponent(id)}/actions/${encodeURIComponent(actionId)}`;
}

export async function listIntegrations(): Promise<IntegrationDefinition[]> {
  const response = await fetchIntegrationApi<{ integrations: IntegrationDefinition[] }>(integrationsApiBasePath);
  return response.integrations;
}

export async function loadIntegrationConfig(id: IntegrationId): Promise<IntegrationConfigSnapshot> {
  return fetchIntegrationApi<IntegrationConfigSnapshot>(integrationConfigPath(id));
}

export async function saveIntegrationConfig(id: IntegrationId, patch: IntegrationConfigPatch): Promise<IntegrationConfigSnapshot> {
  return fetchIntegrationApi<IntegrationConfigSnapshot>(integrationConfigPath(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
}

export async function loadIntegrationStatus(id: IntegrationId): Promise<IntegrationRuntimeStatus> {
  return fetchIntegrationApi<IntegrationRuntimeStatus>(integrationStatusPath(id));
}

export async function startIntegration(id: IntegrationId): Promise<IntegrationActionResult> {
  return runIntegrationAction(id, { actionId: 'start-runtime' });
}

export async function stopIntegration(id: IntegrationId): Promise<IntegrationActionResult> {
  return runIntegrationAction(id, { actionId: 'stop-runtime' });
}

export async function runIntegrationAction(
  id: IntegrationId,
  request: IntegrationActionRequest
): Promise<IntegrationActionResult> {
  return fetchIntegrationApi<IntegrationActionResult>(integrationActionPath(id, request.actionId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: request.payload ?? {} })
  });
}
