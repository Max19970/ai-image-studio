import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProviderGenerationModeDefinition } from '../src/domain/providerMode';
import type { ProviderAdapterDefinition } from '../src/entities/provider/types';
import {
  getDefaultProviderGenerationMode,
  listProviderGenerationModes,
  mapLegacyWorkModeToProviderMode,
  normalizeProviderGenerationMode,
  resolveProviderGenerationModeForRestore
} from '../src/entities/provider/modeResolution';
import {
  getProviderModeAttachmentRequirements,
  getProviderModePromptPlaceholderKey,
  getProviderModeSubmitActionLabelKey,
  getProviderModeUiIntent,
  isProviderModeEditLike,
  isProviderModeGenerateLike
} from '../src/entities/provider/modeIntent';
import { defaultImageParams, defaultProviderSettings, defaultStudioSettings } from '../src/domain/defaults';
import { comfyUiProviderDefinition } from '../src/providers/comfyui/definition';
import {
  comfyUiHiresFixModeId,
  comfyUiTextToImageModeId
} from '../src/entities/generation-params/comfyui/modes';
import {
  openAiCompatibleImageEditMode,
  openAiCompatibleImageEditModeId,
  openAiCompatibleImageGenerateMode,
  openAiCompatibleImageGenerateModeId
} from '../src/entities/generation-params/openai-compatible/modes';
import { openAiCompatibleProviderDefinition } from '../src/providers/openai-compatible/definition';
import {
  buildOpenAiCompatibleImagePayload,
  createOpenAiCompatibleSubmitProxyRequest
} from '../src/providers/openai-compatible/requestAdapter';
import { buildComfyUiImagePayload, createComfyUiSubmitProxyRequest } from '../src/providers/comfyui/requestAdapter';

const customComfyMode: ProviderGenerationModeDefinition = {
  id: 'comfyui.custom-mode',
  labelKey: 'providerModes.comfyui.custom.label',
  descriptionKey: 'providerModes.comfyui.custom.description',
  isDefault: true,
  attachmentPolicy: {
    allowedRoles: ['targetImage'],
    requiredRoles: ['targetImage'],
    maxCounts: { targetImage: 1 },
    clearOnSwitch: 'all-disallowed'
  },
  generationSurfaceId: 'comfyui.custom-surface',
  detailSurfaceId: 'comfyui.custom-detail',
  submit: { kind: 'multipart', operation: 'provider-submit', path: '/api/provider/submit' }
};

test('OpenAI-compatible provider declares generate/edit as provider-owned modes', () => {
  const modes = listProviderGenerationModes(openAiCompatibleProviderDefinition);

  assert.deepEqual(modes.map((mode) => mode.legacyWorkMode), ['generate', 'edit']);
  assert.equal(modes[0].id, openAiCompatibleImageGenerateModeId);
  assert.equal(modes[0].isDefault, true);
  assert.equal(modes[0].submit.kind, 'json');
  assert.equal(modes[0].submit.operation, 'generate');
  assert.deepEqual(modes[0].attachmentPolicy.allowedRoles, []);

  assert.equal(modes[1].id, openAiCompatibleImageEditModeId);
  assert.equal(modes[1].submit.kind, 'multipart');
  assert.equal(modes[1].submit.operation, 'edit');
  assert.deepEqual(modes[1].attachmentPolicy.allowedRoles, ['targetImage', 'referenceImage', 'mask']);
  assert.deepEqual(modes[1].attachmentPolicy.requiredRoles, []);
  assert.equal(modes[1].attachmentPolicy.maxCounts?.targetImage, 1);
  assert.equal(modes[1].attachmentPolicy.maxCounts?.mask, 1);
});

test('OpenAI-compatible provider mode payload builder preserves legacy payload parity', () => {
  const params = {
    ...defaultImageParams,
    prompt: '  fox in a neon room  '
  };

  const legacyGeneratePayload = buildOpenAiCompatibleImagePayload(params, defaultProviderSettings, 'generate');
  const providerGeneratePayload = buildOpenAiCompatibleImagePayload(
    params,
    defaultProviderSettings,
    'edit',
    openAiCompatibleImageGenerateMode
  );
  assert.deepEqual(providerGeneratePayload, legacyGeneratePayload);

  const legacyEditPayload = buildOpenAiCompatibleImagePayload(params, defaultProviderSettings, 'edit');
  const providerEditPayload = buildOpenAiCompatibleImagePayload(
    params,
    defaultProviderSettings,
    'generate',
    openAiCompatibleImageEditMode
  );
  assert.deepEqual(providerEditPayload, legacyEditPayload);
});

function formFieldNames(body: BodyInit | null | undefined): string[] {
  assert.ok(body instanceof FormData);
  return Array.from(body.keys());
}

test('OpenAI-compatible provider modes route through provider-submit transport and preserve attachments', () => {
  const payload = { prompt: 'fox', output_format: 'webp', stream: false };
  const targetImage = new File(['target'], 'target.png', { type: 'image/png' });
  const referenceImage = new File(['reference'], 'reference.png', { type: 'image/png' });
  const mask = new File(['mask'], 'mask.png', { type: 'image/png' });

  const legacyGenerate = createOpenAiCompatibleSubmitProxyRequest({
    provider: defaultProviderSettings,
    payload,
    mode: 'generate'
  });
  const providerGenerate = createOpenAiCompatibleSubmitProxyRequest({
    provider: defaultProviderSettings,
    payload,
    mode: 'edit',
    providerMode: openAiCompatibleImageGenerateMode
  });

  assert.equal(providerGenerate.path, legacyGenerate.path);
  assert.equal(providerGenerate.path, '/api/provider/submit');
  assert.equal(providerGenerate.init.method, 'POST');
  assert.deepEqual(providerGenerate.init.headers, { 'Content-Type': 'application/json' });
  assert.equal(providerGenerate.init.body, legacyGenerate.init.body);
  assert.equal(providerGenerate.fallbackFormat, 'webp');

  const legacyEdit = createOpenAiCompatibleSubmitProxyRequest({
    provider: defaultProviderSettings,
    payload,
    mode: 'edit',
    targetImage,
    referenceImages: [referenceImage],
    mask
  });
  const providerEdit = createOpenAiCompatibleSubmitProxyRequest({
    provider: defaultProviderSettings,
    payload,
    mode: 'generate',
    providerMode: openAiCompatibleImageEditMode,
    targetImage,
    referenceImages: [referenceImage],
    mask
  });

  assert.equal(providerEdit.path, legacyEdit.path);
  assert.equal(providerEdit.path, '/api/provider/submit');
  assert.equal(providerEdit.init.method, 'POST');
  assert.deepEqual(formFieldNames(providerEdit.init.body), formFieldNames(legacyEdit.init.body));
  assert.deepEqual(formFieldNames(providerEdit.init.body), ['provider', 'payload', 'providerModeId', 'transport', 'image_target', 'image_reference', 'mask']);
  assert.equal(providerEdit.fallbackFormat, 'webp');
});

test('ComfyUI declares text-to-image and Hires Fix as provider-owned modes', () => {
  const modes = listProviderGenerationModes(comfyUiProviderDefinition);

  assert.equal(modes.length, 2);
  assert.equal(modes[0].id, comfyUiTextToImageModeId);
  assert.equal(modes[0].legacyWorkMode, 'generate');
  assert.equal(modes[0].submit.kind, 'json');
  assert.equal(modes[0].submit.operation, 'provider-submit');
  assert.equal(modes[0].generationSurfaceId, comfyUiProviderDefinition.generationSurface.id);
  assert.equal(modes[0].detailSurfaceId, comfyUiProviderDefinition.detailDescriptor.id);
  assert.deepEqual(modes[0].attachmentPolicy.allowedRoles, []);

  assert.equal(modes[1].id, comfyUiHiresFixModeId);
  assert.equal(modes[1].legacyWorkMode, undefined);
  assert.equal(modes[1].submit.kind, 'multipart');
  assert.equal(modes[1].submit.operation, 'provider-submit');
  assert.deepEqual(modes[1].attachmentPolicy.allowedRoles, ['targetImage']);
  assert.deepEqual(modes[1].attachmentPolicy.requiredRoles, ['targetImage']);
  assert.equal(modes[1].attachmentPolicy.maxCounts?.targetImage, 1);
});

test('ComfyUI submit request keeps throttled previews in Telegram Mini App runtime', () => {
  const previousWindow = globalThis.window;
  (globalThis as typeof globalThis & { window: unknown }).window = {
    Telegram: { WebApp: {} },
    navigator: { userAgent: 'Telegram Android' },
    location: { search: '?tgWebAppData=test', hash: '' },
    matchMedia: () => ({ matches: true }),
    localStorage: { getItem: () => null }
  };

  try {
    const request = createComfyUiSubmitProxyRequest({
      provider: { ...defaultProviderSettings, adapterId: 'comfyui', modelId: 'sdxl.safetensors' },
      payload: { prompt: 'fox' },
      mode: 'generate',
      providerMode: listProviderGenerationModes(comfyUiProviderDefinition)[0]
    });

    assert.equal((request.init.headers as Record<string, string>)['X-Image-Studio-ComfyUI-Preview-Stream'], 'throttled');
  } finally {
    if (previousWindow) (globalThis as typeof globalThis & { window: unknown }).window = previousWindow;
    else delete (globalThis as typeof globalThis & { window?: unknown }).window;
  }
});

test('ComfyUI Hires Fix payload is provider-mode scoped and single-image oriented', () => {
  const params = {
    ...defaultImageParams,
    prompt: 'refine details',
    providerParams: {
      comfyui: {
        width: 1536,
        height: 1024,
        batchSize: 4,
        hiresUpscaleMode: 'ai',
        hiresUpscaleModel: '4x-ultrasharp.pth'
      }
    }
  };
  const hiresMode = listProviderGenerationModes(comfyUiProviderDefinition)[1];
  const payload = buildComfyUiImagePayload(params, { ...defaultProviderSettings, adapterId: 'comfyui', modelId: 'sdxl.safetensors' }, 'generate', hiresMode);

  assert.equal(payload.provider_mode, comfyUiHiresFixModeId);
  assert.equal(payload.batch_size, 1);
  assert.equal(payload.hires_upscale_mode, 'ai');
  assert.equal(payload.hires_upscale_model, '4x-ultrasharp.pth');
});

test('provider mode UI intent is derived from transport and attachments, not legacyWorkMode checks', () => {
  const comfyHiresMode = listProviderGenerationModes(comfyUiProviderDefinition)[1];

  assert.equal(getProviderModeUiIntent(openAiCompatibleImageGenerateMode), 'generate-like');
  assert.equal(isProviderModeGenerateLike(openAiCompatibleImageGenerateMode), true);
  assert.equal(getProviderModePromptPlaceholderKey(openAiCompatibleImageGenerateMode), 'composer.placeholder.generate');
  assert.equal(getProviderModeSubmitActionLabelKey(openAiCompatibleImageGenerateMode), 'composer.submitGenerate');

  assert.equal(getProviderModeUiIntent(openAiCompatibleImageEditMode), 'edit-like');
  assert.equal(isProviderModeEditLike(openAiCompatibleImageEditMode), true);
  assert.equal(getProviderModePromptPlaceholderKey(openAiCompatibleImageEditMode, { compact: true }), 'composer.placeholder.editCompact');
  assert.equal(getProviderModeSubmitActionLabelKey(openAiCompatibleImageEditMode), 'composer.submitEdit');

  assert.equal(comfyHiresMode.legacyWorkMode, undefined);
  assert.equal(getProviderModeUiIntent(comfyHiresMode), 'edit-like');
  assert.equal(getProviderModePromptPlaceholderKey(comfyHiresMode), 'composer.placeholder.edit');
  assert.deepEqual(getProviderModeAttachmentRequirements(comfyHiresMode).requiredRoles, ['targetImage']);
});

test('provider mode restore helper prefers stored provider mode and falls back to legacy snapshots', () => {
  const restoredProviderMode = resolveProviderGenerationModeForRestore({
    settings: defaultStudioSettings,
    modelId: defaultStudioSettings.selectedModelId,
    snapshotProviderModeId: openAiCompatibleImageEditModeId,
    snapshotLegacyMode: 'generate'
  });
  assert.equal(restoredProviderMode.id, openAiCompatibleImageEditModeId);

  const restoredLegacyMode = resolveProviderGenerationModeForRestore({
    settings: defaultStudioSettings,
    modelId: defaultStudioSettings.selectedModelId,
    snapshotLegacyMode: 'edit'
  });
  assert.equal(restoredLegacyMode.legacyWorkMode, 'edit');
});

test('provider mode resolver normalizes selected and legacy modes safely', () => {
  assert.equal(getDefaultProviderGenerationMode(openAiCompatibleProviderDefinition).legacyWorkMode, 'generate');
  assert.equal(mapLegacyWorkModeToProviderMode(openAiCompatibleProviderDefinition, 'edit').legacyWorkMode, 'edit');
  assert.equal(mapLegacyWorkModeToProviderMode(comfyUiProviderDefinition, 'edit').legacyWorkMode, 'generate');

  const selectedEdit = normalizeProviderGenerationMode(openAiCompatibleProviderDefinition, openAiCompatibleImageEditModeId);
  assert.equal(selectedEdit.legacyWorkMode, 'edit');

  const unsupportedSelected = normalizeProviderGenerationMode(openAiCompatibleProviderDefinition, 'missing-mode', 'edit');
  assert.equal(unsupportedSelected.legacyWorkMode, 'edit');

  const unsupportedWithoutLegacy = normalizeProviderGenerationMode(openAiCompatibleProviderDefinition, 'missing-mode');
  assert.equal(unsupportedWithoutLegacy.legacyWorkMode, 'generate');
});

test('provider definitions can declare provider-owned modes without fallback semantics', () => {
  const adapter = {
    ...comfyUiProviderDefinition,
    generationModes: [customComfyMode]
  } satisfies ProviderAdapterDefinition;

  const modes = listProviderGenerationModes(adapter);

  assert.equal(modes.length, 1);
  assert.equal(modes[0].id, customComfyMode.id);
  assert.equal(modes[0].legacyWorkMode, undefined);
  assert.equal(modes[0].submit.operation, 'provider-submit');
  assert.deepEqual(modes[0].attachmentPolicy.requiredRoles, ['targetImage']);
});
