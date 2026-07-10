import type express from 'express';

export type IntegrationId = string;
export type IntegrationRuntimeState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface IntegrationRuntimeStatus {
  id: IntegrationId;
  state: IntegrationRuntimeState;
  startedAt: number | null;
  updatedAt: number;
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationSecretPatch {
  secrets: Record<string, { value?: string; clear?: boolean }>;
}

export interface IntegrationConfigPatch {
  enabled?: boolean;
  values?: Record<string, unknown>;
  secretPatch?: IntegrationSecretPatch;
}

export interface IntegrationRuntimeConfig {
  id: IntegrationId;
  enabled: boolean;
  values: Record<string, unknown>;
  secrets: Record<string, string | undefined>;
}

export interface IntegrationActionContext {
  config: IntegrationRuntimeConfig;
  payload?: Record<string, unknown>;
}

export interface IntegrationActionResult {
  ok: boolean;
  message: string;
  status?: IntegrationRuntimeStatus;
  data?: Record<string, unknown>;
}

export interface IntegrationAdapterMetadata {
  id: IntegrationId;
  label: string;
  description: string;
  supportsRuntime: boolean;
}

export interface IntegrationRouteContribution {
  id: string;
  register(app: express.Express): void;
}

export interface IntegrationRuntimeAdapter extends IntegrationAdapterMetadata {
  routes?: readonly IntegrationRouteContribution[];
  getStatus(): IntegrationRuntimeStatus;
  start(config: IntegrationRuntimeConfig): Promise<IntegrationActionResult>;
  stop(): Promise<IntegrationActionResult>;
  runAction(actionId: string, context: IntegrationActionContext): Promise<IntegrationActionResult>;
}
