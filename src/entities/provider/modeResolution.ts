import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import type {
  ProviderAttachmentPolicy,
  ProviderAttachmentRole,
  ProviderGenerationModeDefinition,
  ProviderGenerationModeId,
  ProviderSubmitTransportDefinition
} from '../../domain/providerMode';
import { getProviderForModel, toProviderSettings } from '../studio-settings';
import { getProviderAdapterForSettings } from './registry';
import type { ProviderAdapterDefinition, ProviderRuntimeCapabilities } from './types';

export interface ProviderGenerationModeResolutionInput {
  settings: StudioSettings;
  modelId: string;
  providerModeId?: ProviderGenerationModeId | null;
  legacyMode?: WorkMode | null;
  models?: readonly GenerationModel[];
  providers?: readonly GenerationProvider[];
}

export interface ProviderGenerationModeResolution {
  provider: GenerationProvider | null;
  providerSettings: ProviderSettings;
  model: GenerationModel | null;
  adapter: ProviderAdapterDefinition;
  modes: ProviderGenerationModeDefinition[];
  defaultMode: ProviderGenerationModeDefinition;
  activeMode: ProviderGenerationModeDefinition;
}

export interface ProviderGenerationModeRestoreInput {
  settings: StudioSettings;
  modelId: string;
  snapshotProviderModeId?: ProviderGenerationModeId | null;
  snapshotLegacyMode?: WorkMode | null;
}

const legacyProviderSubmitPath = '/api/provider/submit';
const legacyGenerateTransport: ProviderSubmitTransportDefinition = { kind: 'json', operation: 'generate', path: legacyProviderSubmitPath };
const legacyEditTransport: ProviderSubmitTransportDefinition = { kind: 'multipart', operation: 'edit', path: legacyProviderSubmitPath };

function attachmentPolicyForGenerate(): ProviderAttachmentPolicy {
  return {
    allowedRoles: [],
    requiredRoles: [],
    maxCounts: {},
    clearOnSwitch: 'all-disallowed'
  };
}

function attachmentPolicyForEdit(capabilities: ProviderRuntimeCapabilities): ProviderAttachmentPolicy {
  const allowedRoles: ProviderAttachmentRole[] = [];
  const requiredRoles: ProviderAttachmentRole[] = [];
  const maxCounts: Partial<Record<ProviderAttachmentRole, number>> = {};

  if (capabilities.supportsImageAttachments) {
    allowedRoles.push('targetImage', 'referenceImage');
    requiredRoles.push('targetImage');
    maxCounts.targetImage = 1;
  }

  if (capabilities.supportsMask) {
    allowedRoles.push('mask');
    maxCounts.mask = 1;
  }

  return {
    allowedRoles,
    requiredRoles,
    maxCounts,
    clearOnSwitch: 'all-disallowed'
  };
}

function createLegacyFallbackMode(adapter: ProviderAdapterDefinition, mode: WorkMode): ProviderGenerationModeDefinition {
  const isGenerate = mode === 'generate';
  return {
    id: `${adapter.id}.${isGenerate ? 'legacy-generate' : 'legacy-edit'}`,
    labelKey: isGenerate ? 'providerModes.legacy.generate.label' : 'providerModes.legacy.edit.label',
    descriptionKey: isGenerate ? 'providerModes.legacy.generate.description' : 'providerModes.legacy.edit.description',
    isDefault: isGenerate,
    legacyWorkMode: mode,
    attachmentPolicy: isGenerate ? attachmentPolicyForGenerate() : attachmentPolicyForEdit(adapter.capabilities),
    generationSurfaceId: adapter.generationSurface.id,
    detailSurfaceId: adapter.detailDescriptor.id,
    submit: isGenerate ? legacyGenerateTransport : legacyEditTransport
  };
}

export function listProviderGenerationModes(adapter: ProviderAdapterDefinition): ProviderGenerationModeDefinition[] {
  if (adapter.generationModes?.length) return [...adapter.generationModes];

  const modes: ProviderGenerationModeDefinition[] = [];
  if (adapter.capabilities.supportsGenerate) modes.push(createLegacyFallbackMode(adapter, 'generate'));
  if (adapter.capabilities.supportsEdit) modes.push(createLegacyFallbackMode(adapter, 'edit'));

  if (modes.length > 0) return modes;
  return [createLegacyFallbackMode(adapter, 'generate')];
}

export function getDefaultProviderGenerationMode(adapter: ProviderAdapterDefinition): ProviderGenerationModeDefinition {
  const modes = listProviderGenerationModes(adapter);
  return modes.find((mode) => mode.isDefault) ?? modes[0];
}

export function findProviderGenerationMode(
  adapter: ProviderAdapterDefinition,
  providerModeId: ProviderGenerationModeId | null | undefined
): ProviderGenerationModeDefinition | null {
  if (!providerModeId) return null;
  return listProviderGenerationModes(adapter).find((mode) => mode.id === providerModeId) ?? null;
}

export function mapLegacyWorkModeToProviderMode(
  adapter: ProviderAdapterDefinition,
  legacyMode: WorkMode
): ProviderGenerationModeDefinition {
  const modes = listProviderGenerationModes(adapter);
  return modes.find((mode) => mode.legacyWorkMode === legacyMode) ?? getDefaultProviderGenerationMode(adapter);
}

export function normalizeProviderGenerationMode(
  adapter: ProviderAdapterDefinition,
  providerModeId: ProviderGenerationModeId | null | undefined,
  legacyMode?: WorkMode | null
): ProviderGenerationModeDefinition {
  return findProviderGenerationMode(adapter, providerModeId)
    ?? (legacyMode ? mapLegacyWorkModeToProviderMode(adapter, legacyMode) : null)
    ?? getDefaultProviderGenerationMode(adapter);
}

export function resolveProviderGenerationMode(input: ProviderGenerationModeResolutionInput): ProviderGenerationModeResolution {
  const models = input.models ?? input.settings.models;
  const providers = input.providers ?? input.settings.providers;
  const model = models.find((item) => item.id === input.modelId) ?? models[0] ?? null;
  const provider = model
    ? providers.find((item) => item.id === model.providerId) ?? providers[0] ?? null
    : providers[0] ?? null;
  const providerSettings = toProviderSettings(provider, model);
  const adapter = getProviderAdapterForSettings(providerSettings);
  const modes = listProviderGenerationModes(adapter);
  const defaultMode = modes.find((mode) => mode.isDefault) ?? modes[0];
  const activeMode = modes.find((mode) => mode.id === input.providerModeId)
    ?? (input.legacyMode ? modes.find((mode) => mode.legacyWorkMode === input.legacyMode) : null)
    ?? defaultMode;

  return {
    provider,
    providerSettings,
    model,
    adapter,
    modes,
    defaultMode,
    activeMode
  };
}

export function resolveProviderGenerationModeForModel(settings: StudioSettings, modelId: string): ProviderGenerationModeResolution {
  return resolveProviderGenerationMode({ settings, modelId });
}

export function getProviderGenerationModesForSettings(settings: StudioSettings, modelId: string): ProviderGenerationModeDefinition[] {
  return resolveProviderGenerationModeForModel(settings, modelId).modes;
}

export function resolveProviderGenerationModeFromProviderSettings(
  provider: Pick<ProviderSettings, 'adapterId'> | null | undefined,
  providerModeId?: ProviderGenerationModeId | null,
  legacyMode?: WorkMode | null
): ProviderGenerationModeDefinition {
  return normalizeProviderGenerationMode(getProviderAdapterForSettings(provider), providerModeId, legacyMode);
}

export function getProviderGenerationModesForProviderSettings(
  provider: Pick<ProviderSettings, 'adapterId'> | null | undefined
): ProviderGenerationModeDefinition[] {
  return listProviderGenerationModes(getProviderAdapterForSettings(provider));
}

export function getLegacyWorkModeForProviderMode(providerMode: ProviderGenerationModeDefinition): WorkMode {
  return providerMode.legacyWorkMode ?? 'generate';
}

export function resolveProviderGenerationModeForRestore(
  input: ProviderGenerationModeRestoreInput
): ProviderGenerationModeDefinition {
  return resolveProviderGenerationMode({
    settings: input.settings,
    modelId: input.modelId,
    providerModeId: input.snapshotProviderModeId,
    legacyMode: input.snapshotLegacyMode
  }).activeMode;
}

export function findProviderGenerationModeForAttachmentRole(
  adapter: ProviderAdapterDefinition,
  role: ProviderAttachmentRole,
  preferredProviderModeId?: ProviderGenerationModeId | null
): ProviderGenerationModeDefinition | null {
  const modes = listProviderGenerationModes(adapter);
  const preferred = modes.find((mode) => mode.id === preferredProviderModeId);
  if (preferred?.attachmentPolicy.allowedRoles.includes(role)) return preferred;
  return modes.find((mode) => mode.attachmentPolicy.allowedRoles.includes(role)) ?? null;
}

export function resolveProviderGenerationModeForModelContext(
  settings: StudioSettings,
  model: GenerationModel | null,
  providerModeId?: ProviderGenerationModeId | null,
  legacyMode?: WorkMode | null
): ProviderGenerationModeResolution {
  const provider = getProviderForModel(settings, model);
  const providerSettings = toProviderSettings(provider, model);
  const adapter = getProviderAdapterForSettings(providerSettings);
  const modes = listProviderGenerationModes(adapter);
  const defaultMode = modes.find((mode) => mode.isDefault) ?? modes[0];
  const activeMode = modes.find((mode) => mode.id === providerModeId)
    ?? (legacyMode ? modes.find((mode) => mode.legacyWorkMode === legacyMode) : null)
    ?? defaultMode;

  return {
    provider,
    providerSettings,
    model,
    adapter,
    modes,
    defaultMode,
    activeMode
  };
}
