import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultProviderSettings } from '../src/domain/defaults';
import { defineGenerationParam } from '../src/entities/generation-params/defineParam';
import {
  generationParamSetIncludes,
  resolveGenerationParamProfileAvailability
} from '../src/entities/generation-params/availability';
import { isGenerationParamAvailableForProvider } from '../src/entities/generation-params/providerAvailability';
import {
  buildOpenAiCompatibleParamPayload,
  captureGenerationRequestParamsSnapshot,
  logicalGenerationParamDefinitions
} from '../src/entities/generation-params/logicalRegistry';
import type { GenerationParamDefinition, ProviderGenerationParamProfile } from '../src/entities/generation-params/types';
import enParams from '../src/shared/i18n/locales/en/params.json' with { type: 'json' };
import ruParams from '../src/shared/i18n/locales/ru/params.json' with { type: 'json' };

test('generation parameter modules declare UI, placement and i18n ownership', () => {
  const fieldIds = logicalGenerationParamDefinitions.map((definition) => definition.fieldDefinitionId);
  assert.equal(new Set(fieldIds).size, fieldIds.length);

  for (const definition of logicalGenerationParamDefinitions) {
    assert.match(definition.id, /^generationParam\./);
    assert.match(definition.fieldDefinitionId, /^generationParams\./);
    assert.ok(definition.placementIds.length > 0, `${definition.id} should own at least one UI placement`);
    assert.match(definition.i18nNamespace, /^params\./);
    assert.ok(definition.stateKeys.every((key) => key in defaultImageParams), `${definition.id} owns unknown ImageParams key`);
    assert.ok((definition.snapshotKeys ?? []).every((key) => definition.stateKeys.includes(key)), `${definition.id} has snapshot keys outside stateKeys`);
    if (definition.includeKey) {
      assert.ok(definition.stateKeys.includes(definition.includeKey), `${definition.id} includeKey should be one of stateKeys`);
      assert.ok((definition.payloadKeys ?? []).length > 0, `${definition.id} includeKey should map to payloadKeys`);
    }
  }
});

test('generation parameter copy and option keys exist in supported dictionaries', () => {
  const dictionaries = [enParams, ruParams] as const;
  for (const definition of logicalGenerationParamDefinitions) {
    const keys = [
      ...Object.values(definition.copy ?? {}).flatMap((copy) => [copy.labelKey, copy.descriptionKey, copy.ariaLabelKey].filter(Boolean)),
      ...Object.values(definition.options ?? {}).flatMap((options) => options.flatMap((option) => option.labelKey ? [option.labelKey] : []))
    ];

    for (const key of keys) {
      for (const dictionary of dictionaries) {
        assert.ok(key in dictionary, `${definition.id} references missing i18n key ${key}`);
      }
    }
  }
});

test('defineGenerationParam keeps fake plugin modules explicit and predictable', () => {
  const fakeParam = defineGenerationParam({
    id: 'generationParam.fakeSeed',
    fieldDefinitionId: 'generationParams.fakeSeed',
    placementIds: ['composer.params.service.fakeSeed'],
    i18nNamespace: 'params.fakeSeed',
    stateKeys: ['rawJson'],
    copy: { rawJson: { labelKey: 'params.rawJson', descriptionKey: 'params.rawJson.description' } },
    snapshotKeys: ['rawJson'],
    openAiCompatiblePayload: ({ params }) => params.rawJson ? { fake_seed_passthrough: params.rawJson } : {}
  } satisfies GenerationParamDefinition);

  assert.equal(fakeParam.fieldDefinitionId, 'generationParams.fakeSeed');
  assert.deepEqual(fakeParam.placementIds, ['composer.params.service.fakeSeed']);
  assert.deepEqual(fakeParam.openAiCompatiblePayload?.({ params: { ...defaultImageParams, rawJson: '123' }, provider: defaultProviderSettings, mode: 'generate' }), {
    fake_seed_passthrough: '123'
  });
});

test('raw JSON remains last-write-wins for OpenAI-compatible payloads', () => {
  const payload = buildOpenAiCompatibleParamPayload(
    {
      ...defaultImageParams,
      includeModel: true,
      includeN: true,
      includeOutputFormat: true,
      n: 2,
      outputFormat: 'jpeg',
      rawJson: '{"n":7,"output_format":"webp","custom_flag":true}'
    },
    { ...defaultProviderSettings, modelId: 'model-from-provider' },
    'generate'
  );

  assert.equal(payload.model, 'model-from-provider');
  assert.equal(payload.n, 7);
  assert.equal(payload.output_format, 'webp');
  assert.equal(payload.custom_flag, true);
});

test('all snapshot participants capture only keys they own', () => {
  const snapshot = captureGenerationRequestParamsSnapshot(defaultImageParams);
  const expectedSnapshotKeys = new Set(logicalGenerationParamDefinitions.flatMap((definition) => definition.snapshotKeys ?? []));

  assert.deepEqual(new Set(Object.keys(snapshot)), expectedSnapshotKeys);
});


test('provider generation parameter profiles can allow, hide and model-override logical params', () => {
  const sizeParam = logicalGenerationParamDefinitions.find((definition) => definition.id === 'generationParam.size');
  const qualityParam = logicalGenerationParamDefinitions.find((definition) => definition.id === 'generationParam.quality');
  assert.ok(sizeParam);
  assert.ok(qualityParam);

  const profile = {
    id: 'test-profile',
    include: ['generationParam.size', 'generationParam.quality'],
    modelRules: [
      { modelIdIncludes: ['fast'], exclude: ['generationParam.quality'] }
    ]
  } satisfies ProviderGenerationParamProfile;

  assert.equal(generationParamSetIncludes('all', 'generationParam.anything'), true);
  assert.equal(resolveGenerationParamProfileAvailability(profile, sizeParam, {
    provider: { ...defaultProviderSettings, modelId: 'slow-model' },
    mode: 'generate',
    capabilityReport: null
  }), true);
  assert.equal(resolveGenerationParamProfileAvailability(profile, qualityParam, {
    provider: { ...defaultProviderSettings, modelId: 'fast-preview-model' },
    mode: 'generate',
    capabilityReport: null
  }), false);
});

test('OpenAI-compatible profile currently exposes the existing logical parameter set', () => {
  for (const definition of logicalGenerationParamDefinitions) {
    assert.equal(isGenerationParamAvailableForProvider(definition, {
      provider: defaultProviderSettings,
      mode: 'generate',
      params: defaultImageParams
    }), true, `${definition.id} should be available for the OpenAI-compatible profile`);
  }
});
