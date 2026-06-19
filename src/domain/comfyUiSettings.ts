import type { ProviderResourceEntry, ProviderResourceKind, ProviderResourceList } from '../entities/provider/types';
import type { StudioSettings } from './studioSettings';

export const comfyUiAdapterDataKey = 'comfyui';

export interface ComfyUiLoraRegistration {
  id: string;
  displayName: string;
  loraName: string;
  notes: string;
  defaultStrengthModel: number;
  defaultStrengthClip: number;
}

export interface ComfyUiResourceCacheEntry {
  providerId: string;
  kind: ProviderResourceKind;
  providerLabel: string;
  createdAt: number;
  items: ProviderResourceEntry[];
  warning?: string;
}

export interface ComfyUiSettingsData {
  loras: ComfyUiLoraRegistration[];
  resourceCache: Record<string, ComfyUiResourceCacheEntry>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Number(value);
  const finite = Number.isFinite(numeric) ? numeric : fallback;
  return Math.min(max, Math.max(min, finite));
}

function normalizeResourceItem(value: unknown): ProviderResourceEntry | null {
  if (!isPlainRecord(value)) return null;
  const id = stringValue(value.id).trim();
  const name = stringValue(value.name).trim();
  if (!id && !name) return null;
  return {
    id: id || name,
    name: name || id,
    ...(typeof value.nativeName === 'string' ? { nativeName: value.nativeName } : {}),
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(isPlainRecord(value.metadata) ? { metadata: value.metadata } : {})
  };
}

function normalizeResourceCacheEntry(value: unknown): ComfyUiResourceCacheEntry | null {
  if (!isPlainRecord(value)) return null;
  const providerId = stringValue(value.providerId).trim();
  const kind = stringValue(value.kind).trim() as ProviderResourceKind;
  if (!providerId || !kind) return null;
  return {
    providerId,
    kind,
    providerLabel: stringValue(value.providerLabel, 'ComfyUI'),
    createdAt: numberValue(value.createdAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    items: Array.isArray(value.items) ? value.items.map(normalizeResourceItem).filter((item): item is ProviderResourceEntry => Boolean(item)) : [],
    ...(typeof value.warning === 'string' ? { warning: value.warning } : {})
  };
}

export function normalizeComfyUiSettingsData(value: unknown): ComfyUiSettingsData {
  const source = isPlainRecord(value) ? value : {};
  const loras = Array.isArray(source.loras) ? source.loras.flatMap((item): ComfyUiLoraRegistration[] => {
    if (!isPlainRecord(item)) return [];
    const loraName = stringValue(item.loraName ?? item.lora_name).trim();
    const displayName = stringValue(item.displayName ?? item.name, loraName || 'LoRA').trim();
    if (!loraName && !displayName) return [];
    const strengthModel = numberValue(item.defaultStrengthModel ?? item.strengthModel ?? item.strength_model, 1, -10, 10);
    return [{
      id: stringValue(item.id).trim() || `lora-${loraName || displayName}`,
      displayName: displayName || loraName,
      loraName: loraName || displayName,
      notes: stringValue(item.notes),
      defaultStrengthModel: strengthModel,
      defaultStrengthClip: numberValue(item.defaultStrengthClip ?? item.strengthClip ?? item.strength_clip, strengthModel, -10, 10)
    }];
  }) : [];

  const rawCache = isPlainRecord(source.resourceCache) ? source.resourceCache : {};
  const resourceCache = Object.fromEntries(
    Object.entries(rawCache)
      .map(([key, entry]) => [key, normalizeResourceCacheEntry(entry)] as const)
      .filter((entry): entry is readonly [string, ComfyUiResourceCacheEntry] => Boolean(entry[1]))
  );

  return { loras, resourceCache };
}

export function readComfyUiSettingsData(settings: Pick<StudioSettings, 'adapterData'>): ComfyUiSettingsData {
  return normalizeComfyUiSettingsData(settings.adapterData?.[comfyUiAdapterDataKey]);
}

export function writeComfyUiSettingsData(settings: StudioSettings, data: ComfyUiSettingsData): StudioSettings {
  return {
    ...settings,
    adapterData: {
      ...(settings.adapterData ?? {}),
      [comfyUiAdapterDataKey]: normalizeComfyUiSettingsData(data)
    }
  };
}

export function cacheKeyForComfyUiResources(providerId: string, kind: ProviderResourceKind): string {
  return `${providerId}:${kind}`;
}

export function toComfyUiResourceCacheEntry(providerId: string, list: ProviderResourceList): ComfyUiResourceCacheEntry {
  return {
    providerId,
    kind: list.kind,
    providerLabel: list.providerLabel,
    createdAt: list.createdAt,
    items: list.items.map((item) => ({ ...item })),
    ...(list.warning ? { warning: list.warning } : {})
  };
}

export function updateComfyUiResourceCache(settings: StudioSettings, providerId: string, list: ProviderResourceList): StudioSettings {
  const data = readComfyUiSettingsData(settings);
  const nextData: ComfyUiSettingsData = {
    ...data,
    resourceCache: {
      ...data.resourceCache,
      [cacheKeyForComfyUiResources(providerId, list.kind)]: toComfyUiResourceCacheEntry(providerId, list)
    }
  };
  return writeComfyUiSettingsData(settings, nextData);
}
