import type { ComposerRequestDraft } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import { normalizeImageParams } from '../image-params';
import { createStorageUid } from '../studio-settings';
import type { CreateRequestPresetInput, RequestPreset, RequestPresetDisplayMeta, RequestPresetSnapshot, UpdateRequestPresetInput } from './types';

export type { CreateRequestPresetInput, RequestPreset, RequestPresetDisplayMeta, RequestPresetSnapshot, UpdateRequestPresetInput } from './types';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeMeta(value: unknown): RequestPresetDisplayMeta {
  const object = asObject(value);
  if (!object) return {};
  return {
    providerId: normalizeString(object.providerId) || undefined,
    providerLabel: normalizeString(object.providerLabel) || undefined,
    modelId: normalizeString(object.modelId) || undefined,
    modelLabel: normalizeString(object.modelLabel) || undefined,
    providerModeLabel: normalizeString(object.providerModeLabel) || undefined
  };
}

export function normalizeRequestPresetSnapshot(value: unknown): RequestPresetSnapshot | null {
  const object = asObject(value);
  if (!object) return null;
  const selectedModelId = normalizeString(object.selectedModelId);
  const providerModeId = normalizeString(object.providerModeId);
  if (!selectedModelId || !providerModeId) return null;
  return {
    selectedModelId,
    providerModeId,
    params: normalizeImageParams(object.params as Partial<ImageParams>)
  };
}

export function buildPresetName(snapshot: RequestPresetSnapshot, meta?: RequestPresetDisplayMeta): string {
  const prompt = snapshot.params.prompt.trim().replace(/\s+/g, ' ');
  if (prompt) return prompt.length > 46 ? `${prompt.slice(0, 43)}…` : prompt;
  return meta?.modelLabel || 'Untitled preset';
}

export function normalizeRequestPreset(value: unknown): RequestPreset | null {
  const object = asObject(value);
  if (!object) return null;
  const snapshot = normalizeRequestPresetSnapshot(object.snapshot);
  if (!snapshot) return null;
  const now = Date.now();
  const meta = normalizeMeta(object.meta);
  const createdAt = normalizeTimestamp(object.createdAt, now);
  return {
    id: normalizeString(object.id) || createStorageUid('request-preset'),
    name: normalizeString(object.name) || buildPresetName(snapshot, meta),
    note: normalizeString(object.note),
    createdAt,
    updatedAt: normalizeTimestamp(object.updatedAt, createdAt),
    snapshot,
    meta
  };
}

export function normalizeRequestPresets(value: unknown): RequestPreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeRequestPreset(item))
    .filter((item): item is RequestPreset => item !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createRequestPreset(input: CreateRequestPresetInput): RequestPreset {
  const now = input.now ?? Date.now();
  const snapshot = normalizeRequestPresetSnapshot(input.snapshot) ?? input.snapshot;
  const meta = input.meta ?? {};
  return {
    id: createStorageUid('request-preset'),
    name: input.name?.trim() || buildPresetName(snapshot, meta),
    note: input.note?.trim() ?? '',
    createdAt: now,
    updatedAt: now,
    snapshot,
    meta
  };
}

export function updateRequestPreset(preset: RequestPreset, input: UpdateRequestPresetInput): RequestPreset {
  const snapshot = input.snapshot ? (normalizeRequestPresetSnapshot(input.snapshot) ?? input.snapshot) : preset.snapshot;
  const meta = input.meta ?? preset.meta;
  return {
    ...preset,
    name: input.name === undefined ? preset.name : input.name.trim() || buildPresetName(snapshot, meta),
    note: input.note === undefined ? preset.note : input.note.trim(),
    snapshot,
    meta,
    updatedAt: input.now ?? Date.now()
  };
}

export function applyRequestPresetToDraft(draft: ComposerRequestDraft, preset: RequestPreset): ComposerRequestDraft {
  return {
    ...draft,
    providerModeId: preset.snapshot.providerModeId,
    selectedModelId: preset.snapshot.selectedModelId,
    params: preset.snapshot.params,
    targetImage: null,
    referenceImages: [],
    mask: null
  };
}
