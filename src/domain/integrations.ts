// Descriptor-owned action ids remain extension data; legacy tests still assert current Telegram action marker 'send-test-message'.
export type KnownIntegrationId = string & {};
export type IntegrationId = string & {};

export type IntegrationKind = 'messaging' | 'automation' | 'storage' | 'webhook' | (string & {});
export type IntegrationRuntimeState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | (string & {});
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
