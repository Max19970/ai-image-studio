import { defaultImageParams } from '../../domain/defaults';
import type { GenerationRequestSnapshot } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import type {
  GenerationParamCopyDescriptor,
  GenerationParamCopyKey,
  GenerationParamDefinition,
  GenerationParamOptionDescriptor,
  GenerationParamOptionGroup
} from './types';
import { resolveGenerationParamProfileAvailability } from './availability';
import type { ProviderGenerationParamProfile } from './types';
import { normalizeProviderParamBucket } from './providerState';
import { sizeParam } from './fields/size/param';
import { nParam } from './fields/n/param';
import { qualityParam } from './fields/quality/param';
import { backgroundParam } from './fields/background/param';
import { moderationParam } from './fields/moderation/param';
import { styleParam } from './fields/style/param';
import { inputFidelityParam } from './fields/input-fidelity/param';
import { outputFormatParam } from './fields/output-format/param';
import { outputCompressionParam } from './fields/output-compression/param';
import { streamParam } from './fields/stream/param';
import { partialImagesParam } from './fields/partial-images/param';
import { responseFormatParam } from './fields/response-format/param';
import { userParam } from './fields/user/param';
import { includeModelParam } from './fields/include-model/param';
import { rawJsonParam } from './fields/raw-json/param';
import { retryPolicyParam } from './fields/retry-policy/param';

export const logicalGenerationParamDefinitions: readonly GenerationParamDefinition[] = [
  includeModelParam,
  sizeParam,
  nParam,
  qualityParam,
  backgroundParam,
  moderationParam,
  styleParam,
  inputFidelityParam,
  outputFormatParam,
  outputCompressionParam,
  streamParam,
  partialImagesParam,
  responseFormatParam,
  userParam,
  retryPolicyParam,
  rawJsonParam
];

export const logicalGenerationParamDefinitionsById = new Map(
  logicalGenerationParamDefinitions.map((definition) => [definition.id, definition])
);

export const generationParamCopy = mergeParamRecords('copy') as Record<GenerationParamCopyKey, GenerationParamCopyDescriptor>;
export const generationParamOptions = mergeParamRecords('options') as Record<GenerationParamOptionGroup, readonly GenerationParamOptionDescriptor[]>;

export function buildOpenAiCompatibleParamPayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode, profile?: ProviderGenerationParamProfile, providerMode?: ProviderGenerationModeDefinition | null): Record<string, unknown> {
  return logicalGenerationParamDefinitions.reduce<Record<string, unknown>>((payload, definition) => {
    if (!definition.openAiCompatiblePayload) return payload;
    if (profile && !resolveGenerationParamProfileAvailability(profile, definition, { provider, mode, providerMode, params })) return payload;
    return {
      ...payload,
      ...definition.openAiCompatiblePayload({ params, provider, mode, providerMode })
    };
  }, {});
}

export function normalizeImageParamsFromDefinitions(value: Partial<ImageParams> | null | undefined): ImageParams {
  let current: ImageParams = {
    ...defaultImageParams,
    ...(value ?? {}),
    providerParams: normalizeProviderParamBucket((value as Partial<ImageParams> | null | undefined)?.providerParams)
  };

  for (const definition of logicalGenerationParamDefinitions) {
    if (!definition.normalize) continue;
    current = {
      ...current,
      ...definition.normalize({ value, current, defaults: defaultImageParams })
    };
  }

  return current;
}

export function captureGenerationRequestParamsSnapshot(params: ImageParams, provider?: ProviderSettings, mode?: WorkMode, profile?: ProviderGenerationParamProfile, providerMode?: ProviderGenerationModeDefinition | null): GenerationRequestSnapshot['params'] {
  const snapshot: Partial<GenerationRequestSnapshot['params']> = {};
  for (const definition of logicalGenerationParamDefinitions) {
    if (provider && mode && profile && !resolveGenerationParamProfileAvailability(profile, definition, { provider, mode, providerMode, params })) continue;
    for (const key of definition.snapshotKeys ?? []) {
      (snapshot as Record<string, unknown>)[key] = params[key as keyof ImageParams];
    }
  }
  return snapshot as GenerationRequestSnapshot['params'];
}

export function sanitizeGenerationRequestParamsSnapshot(snapshot: Partial<GenerationRequestSnapshot['params']> | null | undefined): GenerationRequestSnapshot['params'] {
  return captureGenerationRequestParamsSnapshot(normalizeImageParamsFromDefinitions(snapshot as Partial<ImageParams> | null | undefined));
}

export function restoreImageParamsFromRequestSnapshot(previous: ImageParams, snapshot: GenerationRequestSnapshot): ImageParams {
  const sent = snapshot.payload ?? {};
  let next = normalizeImageParamsFromDefinitions({
    ...previous,
    prompt: snapshot.prompt,
    ...(snapshot.params ?? {}),
    providerParams: {
      ...normalizeProviderParamBucket(previous.providerParams),
      ...(snapshot.providerParams ? { [snapshot.surfaceId || 'openai-compatible']: snapshot.providerParams } : {})
    }
  } as Partial<ImageParams>);

  for (const definition of logicalGenerationParamDefinitions) {
    const restored = definition.restore?.({ previous: next, snapshot }) ?? {};
    next = { ...next, ...restored };

    if (definition.includeKey && definition.payloadKeys) {
      next = {
        ...next,
        [definition.includeKey]: definition.payloadKeys.some((payloadKey) => payloadKey in sent)
      } as ImageParams;
    }
  }

  return next;
}

function mergeParamRecords<TKey extends 'copy' | 'options'>(key: TKey) {
  return logicalGenerationParamDefinitions.reduce<Record<string, unknown>>((acc, definition) => ({
    ...acc,
    ...(definition[key] ?? {})
  }), {});
}
